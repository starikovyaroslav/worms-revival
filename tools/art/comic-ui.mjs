/** Native RGBA brush export, reusing the atlas silhouette splitter. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, writeImage, root, bbox, cut } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';
const dir = resolve(root, 'apps/client/public/assets/comic-ui');
const cells = skinCells(
  readImage(resolve(root, 'docs/design/concepts/combat-comic-ui-v1/production/brush-master.png')),
  2,
);
const assets = {};
mkdirSync(dir, { recursive: true });
for (const [index, name] of ['ink', 'timer', 'action', 'underline'].entries()) {
  const { art, touchesSourceEdge } = cells[index];
  if (touchesSourceEdge) throw new Error(`Clipped brush ${name}`);
  writeImage(resolve(dir, `${name}.png`), art);
  assets[`comic/ui/${name}`] = {
    file: `${name}.png`,
    w: art.w / 4,
    h: art.h / 4,
    pixelW: art.w,
    pixelH: art.h,
    sampling: 'linear',
  };
}
const logoSource = readImage(
  resolve(root, 'docs/design/concepts/combat-comic-ui-v1/production/logo-master.png'),
);
const box = bbox(logoSource);
const logo = cut(logoSource, box.x, box.y, box.w, box.h);
writeImage(resolve(dir, 'logo.png'), logo);
assets['comic/ui/logo'] = {
  file: 'logo.png',
  w: logo.w / 4,
  h: logo.h / 4,
  pixelW: logo.w,
  pixelH: logo.h,
  sampling: 'linear',
};
writeFileSync(
  resolve(dir, 'manifest.json'),
  JSON.stringify({ version: 1, style: 'painted', assets }, null, 2) + '\n',
);
