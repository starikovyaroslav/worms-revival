// Cuts an AI-generated sprite sheet into individual pixel-art sprites.
//   node tools/art/slice.mjs [sheet-spec.json ...]      (default: every spec in tools/art/sheets)
// For each spec: removes the background colour, finds every object as a connected blob (no fixed
// coordinates needed), orders them rows-then-columns, scales, snaps to the DB32 palette, adds a 1px
// outline and writes PNGs plus manifest entries into apps/client/public/assets.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { PALETTE, PIXELIZE_SOURCE } from './pixelize.mjs';

const OUT = 'apps/client/public/assets';

/** Runs in the page. */
const SLICE_SOURCE = `
async function sliceSheet(uri, spec) {
  const img = new Image(); img.src = uri; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H);
  const px = (x, y) => (y * W + x) * 4;
  // Background colour: given, or the median of the four corners.
  let bg;
  if (spec.bg && spec.bg !== 'auto') bg = [1, 3, 5].map((i) => parseInt(spec.bg.slice(i, i + 2), 16));
  else {
    const cs = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([x, y]) => [d.data[px(x, y)], d.data[px(x, y) + 1], d.data[px(x, y) + 2]]);
    bg = [0, 1, 2].map((k) => cs.map((v) => v[k]).sort((a, b) => a - b)[1]);
  }
  const thr = spec.threshold ?? 70;
  const dist = (i) => Math.hypot(d.data[i] - bg[0], d.data[i + 1] - bg[1], d.data[i + 2] - bg[2]);
  const solid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = px(x, y);
    if (d.data[i + 3] > 40 && dist(i) > thr) solid[y * W + x] = 1;
  }
  // Join the parts of one sprite (eyes, hands, bandana tails) by dilating before labelling.
  const R = Math.max(2, Math.round(W * (spec.join ?? 0.006)));
  const dil = new Uint8Array(W * H);
  const rows = new Int32Array(H + 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) {
    const y0 = Math.max(0, y - R), y1 = Math.min(H - 1, y + R), x0 = Math.max(0, x - R), x1 = Math.min(W - 1, x + R);
    for (let yy = y0; yy <= y1; yy++) { const o = yy * W; for (let xx = x0; xx <= x1; xx++) dil[o + xx] = 1; }
  }
  const label = new Int32Array(W * H);
  const boxes = [];
  const stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!dil[s] || label[s]) continue;
    const id = boxes.length + 1;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
    stack.push(s); label[s] = id;
    while (stack.length) {
      const p = stack.pop(); const x = p % W, y = (p - x) / W;
      if (solid[p]) { area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (dil[n] && !label[n]) { label[n] = id; stack.push(n); }
      }
    }
    boxes.push({ id, x0, y0, x1, y1, area });
  }
  const minArea = W * H * (spec.minArea ?? 0.0004);
  const found = boxes.filter((b) => b.area >= minArea);
  const want = spec.cols * spec.rows;
  if (found.length !== want) {
    return { error: 'expected ' + want + ' sprites, found ' + found.length, boxes: found.map((b) => [b.x0, b.y0, b.x1, b.y1]), size: [W, H] };
  }
  // Order: split into rows by vertical position, then left to right.
  found.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const ordered = [];
  for (let r = 0; r < spec.rows; r++) {
    const row = found.slice(r * spec.cols, (r + 1) * spec.cols).sort((a, b) => a.x0 - b.x0);
    ordered.push(...row);
  }
  // Cut each sprite: pixels of its own blob only, background made transparent.
  const tint = spec.tintKey ? [1, 3, 5].map((i) => parseInt(spec.tintKey.slice(i, i + 2), 16)) : null;
  const sprites = ordered.map((b) => {
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const body = document.createElement('canvas'); body.width = w; body.height = h;
    const band = document.createElement('canvas'); band.width = w; band.height = h;
    const bg2 = body.getContext('2d'), bnd = band.getContext('2d');
    const bo = bg2.createImageData(w, h), ba = bnd.createImageData(w, h);
    let hasBand = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = b.x0 + x, gy = b.y0 + y, gi = px(gx, gy), o = (y * w + x) * 4;
      if (!solid[gy * W + gx] || label[gy * W + gx] !== b.id) continue;
      const r = d.data[gi], gg = d.data[gi + 1], bb = d.data[gi + 2];
      if (tint && Math.hypot(r - tint[0], gg - tint[1], bb - tint[2]) < (spec.tintRadius ?? 110)) {
        // Team-colour layer: keep only brightness so the game can tint it.
        const lum = Math.round(0.3 * r + 0.59 * gg + 0.11 * bb);
        ba.data[o] = ba.data[o + 1] = ba.data[o + 2] = Math.min(255, lum * 1.15); ba.data[o + 3] = 255; hasBand = true;
      } else { bo.data[o] = r; bo.data[o + 1] = gg; bo.data[o + 2] = bb; bo.data[o + 3] = 255; }
    }
    bg2.putImageData(bo, 0, 0); bnd.putImageData(ba, 0, 0);
    return { w, h, body: body.toDataURL(), band: hasBand ? band.toDataURL() : null };
  });
  return { sprites };
}
`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<body></body>');
await page.addScriptTag({
  content: `${PIXELIZE_SOURCE}\n${SLICE_SOURCE};window.pixelize=pixelize;window.sliceSheet=sliceSheet;`,
});

const specs = process.argv.slice(2);
if (!specs.length)
  for (const f of readdirSync('tools/art/sheets'))
    if (f.endsWith('.json')) specs.push(join('tools/art/sheets', f));

const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { version: 2, style: 'pixel', assets: {} };
let failed = false;

for (const specFile of specs) {
  const spec = JSON.parse(readFileSync(specFile, 'utf8'));
  const file = resolve(spec.file);
  if (!existsSync(file)) {
    console.log(`skip ${spec.id}: ${spec.file} not found`);
    continue;
  }
  const png = readFileSync(file).toString('base64');
  const res = await page.evaluate(
    ([uri, s]) => window.sliceSheet(uri, s),
    [`data:image/png;base64,${png}`, spec],
  );
  if (res.error) {
    console.error(`FAIL ${spec.id}: ${res.error} (image ${res.size.join('x')})`);
    console.error('  detected boxes:', JSON.stringify(res.boxes));
    failed = true;
    continue;
  }
  // Common scale so every sprite of a fixed-canvas sheet keeps its relative size.
  const maxSide = Math.max(...res.sprites.map((s) => Math.max(s.w, s.h)));
  for (let i = 0; i < res.sprites.length; i++) {
    const id = spec.sprites[i];
    const s = res.sprites[i];
    for (const layer of ['body', 'band']) {
      if (!s[layer]) continue;
      const name = layer === 'band' ? `${id}_band` : id;
      const out = await page.evaluate(
        async ([uri, w, h, maxSide, canvasPx, pal, outline]) => {
          const img = new Image();
          img.src = uri;
          await img.decode();
          let src = uri;
          let px = Math.round(Math.max(w, h) * (canvasPx ? canvasPx / maxSide : 1));
          if (canvasPx) {
            // Place on a square canvas, feet (bottom centre) anchored, at a shared scale.
            const K = 8;
            const side = canvasPx * K;
            const c = document.createElement('canvas');
            c.width = c.height = side;
            const g = c.getContext('2d');
            g.imageSmoothingQuality = 'high';
            const k = ((canvasPx - 2) * K) / maxSide;
            const dw = w * k,
              dh = h * k;
            g.drawImage(img, (side - dw) / 2, side - K - dh, dw, dh);
            src = c.toDataURL();
            px = canvasPx;
          }
          return window.pixelize(src, px, {
            palette: pal,
            crop: !canvasPx,
            outline: outline ? 1 : -1,
          });
        },
        [s[layer], s.w, s.h, maxSide, spec.canvas ?? 0, PALETTE, spec.outline !== false],
      );
      const dest = join(OUT, `${name}.png`);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(out.url.split(',')[1], 'base64'));
      manifest.assets[name] = { file: `${name}.png`, w: out.w, h: out.h };
    }
  }
  console.log(`sliced ${spec.id}: ${res.sprites.length} sprites`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
await browser.close();
if (failed) process.exit(1);
