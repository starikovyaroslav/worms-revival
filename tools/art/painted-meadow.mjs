/** Optional painted biome: native RGBA masters, no palette mapping or alpha threshold export. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox, resizeNearest } from './ingest.mjs';
import { healSeam, validate } from './rgba.mjs';
import { skinCells } from './skin-cells.mjs';
import { empty, blit } from './desktop-world.mjs';

const dir = resolve(root, 'apps/client/public/assets/painted-meadow');
mkdirSync(dir, { recursive: true });
const manifest = { version: 2, style: 'painted', assets: {} },
  report = {};
const masters = {};
const source = (name) => {
  const path = `assets-in/painted-meadow/${name}.png`;
  masters[name] = {
    path,
    sha256: createHash('sha256')
      .update(readFileSync(resolve(root, path)))
      .digest('hex'),
  };
  return readImage(resolve(root, path));
};
function save(id, file, image, w, h, seam) {
  if (seam) {
    healSeam(image, 'x');
    if (seam === 'xy') healSeam(image, 'y');
  }
  writeImage(resolve(dir, file + '.png'), image);
  manifest.assets[id] = {
    file: file + '.png',
    w,
    h,
    pixelW: image.w,
    pixelH: image.h,
    sampling: 'linear',
  };
  report[id] = {
    ...validate(image),
    pixels: [image.w, image.h],
    display: [w, h],
    seam: seam ?? null,
  };
}
for (const name of ['sky', 'far', 'mid', 'near']) {
  const image = source(name);
  save(`painted/bg/meadow/${name}`, name, image, image.w / 4, image.h / 4, 'x');
}
save('painted/terrain/meadow/fill', 'soil', source('soil'), 256, 256, 'xy');
save('painted/water/meadow', 'water', source('water'), 256, 80, 'x');
const edges = source('edges'),
  rows = [0];
for (let n = 1; n < 4; n++) {
  let best = Math.round((edges.h * n) / 4),
    cost = Infinity;
  for (let y = Math.round((edges.h * (n - 0.32)) / 4); y < (edges.h * (n + 0.32)) / 4; y++) {
    let occupied = 0;
    for (let x = 0; x < edges.w; x++) if (edges.data[(y * edges.w + x) * 4 + 3] >= 128) occupied++;
    const score = occupied * 1000 + Math.abs(y - (edges.h * n) / 4);
    if (score < cost) {
      cost = score;
      best = y;
    }
  }
  if (cost >= 1000) throw new Error(`Terrain ribbon ${n} has no transparent gutter`);
  rows.push(best);
}
rows.push(edges.h);
for (const [i, name] of ['rim', 'under', 'scorch', 'rock'].entries()) {
  const row = cut(edges, 0, rows[i], edges.w, rows[i + 1] - rows[i]);
  const visible = {
    ...row,
    data: Buffer.from(row.data.map((v, p) => (p % 4 === 3 && v < 128 ? 0 : v))),
  };
  const b = bbox(visible),
    top = Math.max(0, b.y - 4),
    bottom = Math.min(row.h, b.y + b.h + 4);
  const ribbon = resizeNearest(cut(row, 0, top, row.w, bottom - top), row.w, 128);
  save(`painted/terrain/meadow/${name}`, name, ribbon, 256, 16, 'x');
}
const cells = skinCells(source('effects'));
for (const [row, [name, w, h]] of [
  ['blast', 64, 64],
  ['smoke', 40, 40],
  ['fragment', 64, 64],
  ['fire', 16, 20],
].entries()) {
  const frames = cells.slice(row * 4, row * 4 + 4);
  if (frames.some((f) => f.touchesSourceEdge))
    throw new Error(`${name}: clipped effect requires repair`);
  const k = Math.min(
    (w * 6 * 0.86) / Math.max(...frames.map((f) => f.art.w)),
    (h * 6 * 0.86) / Math.max(...frames.map((f) => f.art.h)),
  );
  for (const [i, f] of frames.entries()) {
    const image = empty(w * 6, h * 6),
      art = resizeNearest(
        f.art,
        Math.max(1, Math.round(f.art.w * k)),
        Math.max(1, Math.round(f.art.h * k)),
      );
    blit(
      image,
      art,
      (image.w - art.w) / 2,
      name === 'fire' ? image.h - art.h - 2 : (image.h - art.h) / 2,
    );
    save(`painted/vfx/${name}_${i}`, `${name}-${i}`, image, w, h);
  }
}
writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(dir, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(
  resolve(dir, 'generation.json'),
  JSON.stringify(
    {
      mode: 'built-in imagegen',
      prompts: 'tools/art/painted-meadow-prompts.json',
      reference: 'docs/design/concepts/visual-pilot-v2/meadow-pilot-v1.png',
      masters,
      export: 'tools/art/painted-meadow.mjs',
      paletteQuantization: false,
      binaryAlphaExport: false,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Painted meadow: ${Object.keys(manifest.assets).length} native RGBA assets, optional pack`,
);
