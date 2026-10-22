/** Native RGBA biome exports. No palette mapping; existing simulation masks remain authoritative. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox, resizeNearest } from './ingest.mjs';
import { healSeam, validate } from './rgba.mjs';

for (const theme of process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['desert', 'arctic', 'hell']) {
  if (!['desert', 'arctic', 'hell'].includes(theme)) throw new Error(`Unknown biome ${theme}`);
  const dir = resolve(root, `apps/client/public/assets/painted-${theme}`);
  mkdirSync(dir, { recursive: true });
  const manifest = { version: 2, style: 'painted', assets: {} },
    report = {},
    masters = {};
  const source = (name) => {
    const path = `assets-in/painted-expansion/${theme}-${name}.png`;
    masters[name] = {
      path,
      sha256: createHash('sha256')
        .update(readFileSync(resolve(root, path)))
        .digest('hex'),
    };
    return readImage(resolve(root, path));
  };
  const save = (id, name, image, w, h, seam) => {
    if (seam) {
      healSeam(image, 'x');
      if (seam === 'xy') healSeam(image, 'y');
    }
    writeImage(resolve(dir, name + '.png'), image);
    manifest.assets[id] = {
      file: name + '.png',
      w,
      h,
      pixelW: image.w,
      pixelH: image.h,
      sampling: 'linear',
    };
    report[id] = { ...validate(image), pixels: [image.w, image.h], display: [w, h], seam };
  };
  for (const name of ['sky', 'far', 'mid', 'near']) {
    const image = source(name);
    save(`painted/bg/${theme}/${name}`, name, image, image.w / 4, image.h / 4, 'x');
  }
  save(`painted/terrain/${theme}/fill`, 'soil', source('soil'), 256, 256, 'xy');
  save(`painted/water/${theme}`, 'water', source('water'), 256, 80, 'x');
  const edges = source('edges'),
    rows = [0];
  for (let n = 1; n < 4; n++) {
    let best = Math.round((edges.h * n) / 4),
      cost = Infinity;
    for (let y = Math.round((edges.h * (n - 0.32)) / 4); y < (edges.h * (n + 0.32)) / 4; y++) {
      let occupied = 0;
      for (let x = 0; x < edges.w; x++)
        if (edges.data[(y * edges.w + x) * 4 + 3] >= 128) occupied++;
      const score = occupied * 1000 + Math.abs(y - (edges.h * n) / 4);
      if (score < cost) {
        cost = score;
        best = y;
      }
    }
    if (cost >= 1000) throw new Error(`${theme}: ribbon ${n} has no transparent gutter`);
    rows.push(best);
  }
  rows.push(edges.h);
  for (const [i, name] of ['rim', 'under', 'scorch', 'rock'].entries()) {
    const row = cut(edges, 0, rows[i], edges.w, rows[i + 1] - rows[i]);
    const seed = {
      ...row,
      data: Buffer.from(row.data.map((v, p) => (p % 4 === 3 && v < 128 ? 0 : v))),
    };
    const b = bbox(seed),
      top = Math.max(0, b.y - 4),
      bottom = Math.min(row.h, b.y + b.h + 4);
    save(
      `painted/terrain/${theme}/${name}`,
      name,
      resizeNearest(cut(row, 0, top, row.w, bottom - top), row.w, 128),
      256,
      16,
      'x',
    );
  }
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(resolve(dir, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(
    resolve(dir, 'generation.json'),
    JSON.stringify(
      {
        mode: 'built-in imagegen',
        reference: 'docs/design/concepts/visual-pilot-v2/meadow-pilot-v1.png',
        prompts: 'tools/art/painted-expansion-prompts.json',
        masters,
        export: 'tools/art/painted-biomes.mjs',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`${theme}: ${Object.keys(manifest.assets).length} painted environment assets`);
}
