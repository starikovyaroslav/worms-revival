/** Native-resolution RGBA export. No resizing, palette reduction or alpha thresholding. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, writeImage, root } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';

const source = 'docs/design/concepts/painted-hud-v1/hud-master.png';
const output = resolve(root, 'apps/client/public/assets/painted-hud');
const names = ['timer', 'wind', 'team', 'weapon'];
const cells = skinCells(readImage(resolve(root, source)), 2);
const assets = {};
mkdirSync(output, { recursive: true });
for (const [i, name] of names.entries()) {
  const { art, touchesSourceEdge } = cells[i];
  if (touchesSourceEdge) throw new Error(`Clipped HUD panel: ${name}`);
  writeImage(resolve(output, `${name}.png`), art);
  assets[`painted/hud/${name}`] = {
    file: `${name}.png`,
    w: art.w / 4,
    h: art.h / 4,
    pixelW: art.w,
    pixelH: art.h,
    sampling: 'linear',
  };
}
writeFileSync(
  resolve(output, 'manifest.json'),
  JSON.stringify({ version: 1, assets }, null, 2) + '\n',
);
console.log('Exported four native RGBA HUD housings from', source);
