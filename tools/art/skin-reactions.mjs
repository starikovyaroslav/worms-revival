/** Preserve every source RGBA pixel; use one canvas and one scale across all reaction frames. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';
import { empty, blit } from './desktop-world.mjs';
const source = 'docs/design/concepts/combat-motion-v1/brutal-reactions.png';
const cells = skinCells(readImage(resolve(root, source)));
const names = [
  'blast_0',
  'blast_1',
  'blast_2',
  'blast_3',
  'land-hard_0',
  'land-hard_1',
  'land-hard_2',
  'land-hard_3',
  'hit-light_0',
  'hit-light_1',
  'hit-heavy_0',
  'hit-heavy_1',
  'water_0',
  'water_1',
  'water_2',
  'water_3',
];
const frame = 384,
  logical = 40;
const atlas = empty(frame * 4, frame * 4);
const manifest = { version: 2, style: 'painted', assets: {} };
const output = resolve(root, 'apps/client/public/assets/reactions');
mkdirSync(output, { recursive: true });
for (const [i, cell] of cells.entries()) {
  if (cell.touchesSourceEdge || cell.art.w > frame - 12 || cell.art.h > (frame * 29) / 32 - 8)
    throw new Error(`Reaction ${names[i]} has clipped or oversized bounds`);
  const x = (i % 4) * frame,
    y = Math.floor(i / 4) * frame;
  blit(
    atlas,
    cell.art,
    x + Math.round((frame - cell.art.w) / 2),
    y + Math.round((frame * 29) / 32 - cell.art.h),
  );
  manifest.assets[`reactions/brutal/${names[i]}`] = {
    file: 'brutal.png',
    w: logical,
    h: logical,
    pixelW: frame,
    pixelH: frame,
    frame: { x, y, w: frame, h: frame },
    sampling: 'linear',
  };
}
writeImage(resolve(output, 'brutal.png'), atlas);
const armCells = skinCells(
  readImage(resolve(root, 'docs/design/concepts/combat-motion-v1/arm-parts.png')),
);
for (const [i, cell] of armCells.entries()) {
  if (cell.touchesSourceEdge) throw new Error(`Arm part ${i} is clipped`);
  const material = ['orange', 'leather', 'pale', 'elder'][Math.floor(i / 4)];
  const part = ['upper', 'forearm', 'grip', 'support'][i % 4];
  const file = `${material}-${part}.png`;
  writeImage(resolve(output, file), cell.art);
  manifest.assets[`rig/${material}/${part}`] = {
    file,
    w: cell.art.w / 8,
    h: cell.art.h / 8,
    pixelW: cell.art.w,
    pixelH: cell.art.h,
    sampling: 'linear',
  };
}
const jobs = JSON.parse(
  readFileSync(resolve(root, 'docs/design/concepts/combat-motion-v1/weapon-body-jobs.json')),
);
for (const job of jobs) {
  const bodies = skinCells(readImage(resolve(root, job.output)), job.grid);
  for (const [i, id] of job.members.entries()) {
    const cell = bodies[i];
    if (cell.touchesSourceEdge) throw new Error(`${id}: clipped weapon torso`);
    const old = cut(
      readImage(resolve(root, `apps/client/public/assets/skins/${id}.png`)),
      0,
      0,
      192,
      192,
    );
    const oldBox = bbox({
      ...old,
      data: Buffer.from(old.data.map((v, n) => (n % 4 === 3 && v < 128 ? 0 : v))),
    });
    const size = Math.ceil(Math.max(cell.art.w + 20, (cell.art.h + 16) / (29 / 32)) / 32) * 32;
    const im = empty(size, size);
    blit(
      im,
      cell.art,
      Math.round((size - cell.art.w) / 2),
      Math.round((size * 29) / 32 - cell.art.h),
    );
    const logical = (size * ((oldBox.h / 192) * 32)) / cell.art.h;
    const file = `body-${id}.png`;
    writeImage(resolve(output, file), im);
    manifest.assets[`rig/body/${id}`] = {
      file,
      w: logical,
      h: logical,
      pixelW: size,
      pixelH: size,
      sampling: 'linear',
    };
  }
}
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Exported ${names.length} native reaction drawings for brutal; other identities retain their own fallback art.`,
);
