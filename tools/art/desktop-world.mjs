/** Full-density replacements from native masters, never from the old small exported PNGs. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, specs, readImage, writeImage, cut, bbox, resizeNearest } from './ingest.mjs';
import { healSeam, validate } from './rgba.mjs';

export const publicRoot = resolve(root, 'apps/client/public/assets');
const masterCache = new Map();
export function master(path, palette) {
  const key = path + JSON.stringify(palette ?? []);
  if (!masterCache.has(key)) {
    const raw = readImage(resolve(root, 'assets-in', path));
    // Historical environment sheets used a magenta chroma key, not real transparency.
    // This removes only that key; it never snaps foreground RGB or thresholds source alpha.
    if (!path.startsWith('desktop/'))
      for (let i = 0; i < raw.data.length; i += 4) {
        const [r, g, b] = raw.data.subarray(i, i + 3);
        if (
          (r >= 215 && g <= 40 && b >= 215) ||
          (Math.min(r, b) >= 60 && g < Math.min(r, b) * 0.25 && Math.abs(r - b) < 50)
        )
          raw.data.fill(0, i, i + 4);
      }
    masterCache.set(key, raw);
  }
  return masterCache.get(key);
}
export const empty = (w, h) => ({ w, h, data: Buffer.alloc(w * h * 4) });
export function blit(dst, src, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++) {
      if (x + i < 0 || y + j < 0 || x + i >= dst.w || y + j >= dst.h) continue;
      const a = (j * src.w + i) * 4,
        b = ((y + j) * dst.w + x + i) * 4;
      const sa = src.data[a + 3] / 255,
        da = dst.data[b + 3] / 255;
      const alpha = sa + da * (1 - sa);
      if (!sa) continue;
      for (let c = 0; c < 3; c++)
        dst.data[b + c] = Math.round(
          (src.data[a + c] * sa + dst.data[b + c] * da * (1 - sa)) / alpha,
        );
      dst.data[b + 3] = Math.round(alpha * 255);
    }
  return dst;
}
export function cropArt(im) {
  const b = bbox(im);
  return cut(im, b.x, b.y, b.w, b.h);
}
export function fitArt(im, w, h) {
  const art = cropArt(im),
    k = Math.min(w / art.w, h / art.h);
  return resizeNearest(art, Math.max(1, Math.round(art.w * k)), Math.max(1, Math.round(art.h * k)));
}
export function canvas(im, w, h, padding = 0, bottom = false) {
  padding = Math.min(padding, Math.max(0, Math.floor((Math.min(w, h) - 2) / 4)));
  const art = fitArt(im, w - padding * 2, h - padding * 2);
  return blit(empty(w, h), art, (w - art.w) / 2, bottom ? h - padding - art.h : (h - art.h) / 2);
}
/** Pick transparent gutters near expected boundaries; generator rows need not be perfectly uniform. */
function cuts(im, axis, lo = 0, hi = axis === 'x' ? im.h : im.w, count = 4) {
  const length = axis === 'x' ? im.w : im.h,
    result = [0];
  for (let n = 1; n < count; n++) {
    const target = (n * length) / count,
      margin = (length / count) * 0.46;
    let best = Math.round(target),
      cost = Infinity;
    for (let a = Math.round(target - margin); a < Math.round(target + margin); a++) {
      let occupied = 0;
      for (let b = lo; b < hi; b++) {
        const x = axis === 'x' ? a : b,
          y = axis === 'x' ? b : a;
        if (im.data[(y * im.w + x) * 4 + 3] >= 128) occupied++;
      }
      const score = occupied * 1000 + Math.abs(a - target);
      if (score < cost) {
        cost = score;
        best = a;
      }
    }
    result.push(best);
  }
  return [...result, length];
}
export function sheet(path, palette) {
  const im = master(path, palette),
    rows = cuts(im, 'y');
  return Array.from({ length: 16 }, (_, i) => {
    const row = Math.floor(i / 4),
      col = i % 4,
      columns = cuts(im, 'x', rows[row], rows[row + 1]);
    return cut(
      im,
      columns[col],
      rows[row],
      columns[col + 1] - columns[col],
      rows[row + 1] - rows[row],
    );
  });
}
export function densityFor(id, a) {
  return id.startsWith('weapons/icon/') ? 6 : Math.max(4, Math.ceil(64 / Math.max(a.w, a.h)));
}
export function writer(pack) {
  const dir = resolve(publicRoot, pack),
    manifestPath = resolve(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  const reports = {};
  return {
    manifest,
    reports,
    put(id, im, a, source, operations = []) {
      const file = a.file ?? `${id}.png`;
      writeImage(resolve(dir, file), im);
      manifest.assets[id] = { ...a, file, pixelW: im.w, pixelH: im.h };
      reports[id] = {
        source,
        operations,
        display: [a.w, a.h],
        pixels: [im.w, im.h],
        ...validate(im),
      };
    },
    finish() {
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      writeFileSync(
        resolve(dir, pack ? 'acceptance.json' : 'desktop-acceptance.json'),
        JSON.stringify(reports, null, 2) + '\n',
      );
      console.log(
        `${pack || 'legacy'}: ${Object.keys(reports).length} native-master desktop exports`,
      );
    },
  };
}
export function buildGenerated() {
  const out = writer('generated');
  const boxes = JSON.parse(readFileSync(new URL('./desktop-display-boxes.json', import.meta.url)));
  for (const spec of specs) {
    const source = master(spec.source, spec.palette);
    const entries = Object.entries(out.manifest.assets).filter(([id]) =>
      spec.sheet
        ? id.startsWith(`${spec.folder}/`)
        : spec.strips
          ? id.startsWith(`terrain/${spec.strips}/`) && !id.endsWith('/fill')
          : id === spec.id || spec.derivatives?.some((d) => d.id === id),
    );
    const cells = spec.sheet ? sheet(spec.source, spec.palette) : null;
    let bands;
    if (spec.strips) {
      bands = [];
      for (let y = 0; y < source.h; y++) {
        let count = 0;
        for (let x = 0; x < source.w; x++)
          if (source.data[(y * source.w + x) * 4 + 3] >= 128) count++;
        if (count < source.w * 0.02) continue;
        const last = bands.at(-1);
        if (last && y - (last.y + last.h) < 4) last.h = y - last.y + 1;
        else bands.push({ y, h: 1 });
      }
      bands = bands.filter((b) => b.h > source.h * 0.03);
      if (bands.length !== 3)
        throw new Error(`${spec.source}: expected 3 native bands, found ${bands.length}`);
    }
    for (const [id, a] of entries) {
      const density = id.startsWith('bg/') || id.startsWith('ui/') ? 3 : densityFor(id, a);
      let art = source,
        im;
      if (spec.sheet) art = cells[spec.sheet.indexOf(id.split('/').at(-1))];
      else if (spec.strips) {
        const b = bands[['rim', 'scorch', 'under'].indexOf(id.split('/').at(-1))];
        art = cut(source, 0, b.y, source.w, b.h);
      } else if ((spec.maxH && !spec.opaque) || spec.crop) art = cropArt(source);
      if (boxes[id]) {
        const box = boxes[id],
          fitted = fitArt(art, box.w * density, box.h * density);
        im = blit(
          empty(a.w * density, a.h * density),
          fitted,
          box.x * density + (box.w * density - fitted.w) / 2,
          box.y * density + (box.h * density - fitted.h) / 2,
        );
      } else if (spec.sheet || spec.crop) im = canvas(art, a.w * density, a.h * density, density);
      else im = resizeNearest(art, a.w * density, a.h * density);
      for (const axis of spec.tile ?? '') healSeam(im, axis);
      out.put(id, im, a, `assets-in/${spec.source}`, [
        'native crop',
        `density ${density}`,
        'source RGB and continuous alpha preserved',
        ...(spec.tile ? ['seam healing'] : []),
      ]);
    }
  }
  out.finish();
}
export function buildArsenal() {
  const sources = JSON.parse(readFileSync(new URL('./arsenal-sources.json', import.meta.url)));
  const out = writer('arsenal');
  for (const spec of sources) {
    const path = `desktop/${spec.name}.png`,
      cells = sheet(path);
    spec.cells.forEach((cell, i) => {
      const a = out.manifest.assets[cell.id],
        density = densityFor(cell.id, a);
      out.put(
        cell.id,
        canvas(cells[i], a.w * density, a.h * density, density),
        a,
        `assets-in/${path}`,
        ['new detailed master', 'native cell crop', `density ${density}`],
      );
    });
  }
  out.finish();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ?? 'all';
  if (target === 'generated' || target === 'all') buildGenerated();
  if (target === 'arsenal' || target === 'all') buildArsenal();
}
