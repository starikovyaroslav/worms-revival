// Turns smooth SVG art into retro pixel art: renders at the target pixel size, hard-thresholds the
// edges, snaps every colour to a fixed palette and redraws a clean 1px outline.
// Runs inside the browser page (needs <canvas>), so it is exported as source text.

/** DawnBringer's 32-colour palette: a well-known public palette that reads as "classic 16-bit". */
export const PALETTE = [
  '#000000',
  '#222034',
  '#45283c',
  '#663931',
  '#8f563b',
  '#df7126',
  '#d9a066',
  '#eec39a',
  '#fbf236',
  '#99e550',
  '#6abe30',
  '#37946e',
  '#4b692f',
  '#524b24',
  '#323c39',
  '#3f3f74',
  '#306082',
  '#5b6ee1',
  '#639bff',
  '#5fcde4',
  '#cbdbfc',
  '#ffffff',
  '#9badb7',
  '#847e87',
  '#696a6a',
  '#595652',
  '#76428a',
  '#ac3232',
  '#d95763',
  '#d77bba',
  '#8f974a',
  '#8a6f30',
];

/**
 * Source of `pixelize(uri, px, opts) → Promise<{ url, w, h }>` for the page. The art is cropped to
 * its content (when `opts.crop`) and scaled so its longer side is `px` pixels.
 */
export const PIXELIZE_SOURCE = `
async function pixelize(uri, px, opts) {
  const palette = opts.palette.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const img = new Image();
  img.src = uri;
  await img.decode();
  const iw = img.naturalWidth, ih = img.naturalHeight;
  // Content bounds, measured on a 4x render.
  let bx = 0, by = 0, bw = iw, bh = ih;
  if (opts.crop) {
    const m = document.createElement('canvas');
    m.width = iw * 4; m.height = ih * 4;
    const mg = m.getContext('2d', { willReadFrequently: true });
    mg.drawImage(img, 0, 0, m.width, m.height);
    const md = mg.getImageData(0, 0, m.width, m.height).data;
    let x0 = m.width, y0 = m.height, x1 = -1, y1 = -1;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      if (md[(y * m.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 >= 0) { bx = x0 / 4; by = y0 / 4; bw = (x1 - x0 + 1) / 4; bh = (y1 - y0 + 1) / 4; }
  }
  const k = px / Math.max(bw, bh);
  const w = Math.max(1, Math.round(bw * k)), h = Math.max(1, Math.round(bh * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, bx, by, bw, bh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h);
  const a = new Uint8Array(w * h);
  const idx = new Int16Array(w * h).fill(-1);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (d.data[o + 3] < (opts.alphaCut ?? 110)) continue;
    a[i] = 1;
    const r = d.data[o], gg = d.data[o + 1], b = d.data[o + 2];
    let best = 0, bd = 1e9;
    for (let p = 0; p < palette.length; p++) {
      const dr = r - palette[p][0], dg = gg - palette[p][1], db = b - palette[p][2];
      const dist = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (dist < bd) { bd = dist; best = p; }
    }
    idx[i] = best;
  }
  // Clean 1px outline: every solid pixel touching empty space becomes the outline colour.
  const out = idx.slice();
  const outline = opts.outline ?? 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!a[i]) continue;
    const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= w || yy >= h || !a[yy * w + xx];
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) out[i] = outline;
  }
  const o = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    if (out[i] < 0) continue;
    const p = palette[out[i]];
    o.data[i * 4] = p[0]; o.data[i * 4 + 1] = p[1]; o.data[i * 4 + 2] = p[2]; o.data[i * 4 + 3] = 255;
  }
  g.clearRect(0, 0, w, h);
  g.putImageData(o, 0, 0);
  return { url: c.toDataURL('image/png'), w, h };
}
`;
