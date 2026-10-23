/** Desktop menu portraits: native pixels + transparent padding, never sprite atlases. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage, writeImage, bbox, cut } from './ingest.mjs';
const names = [
  'heavy',
  'soft',
  'glam',
  'dominant',
  'elder',
  'sick',
  'veteran',
  'classic',
  'nocturne',
  'mixed',
];
const dir = resolve(root, 'apps/client/public/assets/team-previews');
mkdirSync(dir, { recursive: true });
const assets = {};
for (const name of names) {
  const source = readImage(resolve(root, `docs/design/concepts/comic-menu-v2/teams/${name}.png`));
  const b = bbox({
    ...source,
    data: Buffer.from(source.data.map((v, i) => (i % 4 === 3 && v < 4 ? 0 : v))),
  });
  const crop = cut(source, b.x, b.y, b.w, b.h);
  const art = {
    w: crop.w + 16,
    h: crop.h + 16,
    data: Buffer.alloc((crop.w + 16) * (crop.h + 16) * 4),
  };
  for (let y = 0; y < crop.h; y++)
    crop.data.copy(art.data, ((y + 8) * art.w + 8) * 4, y * crop.w * 4, (y + 1) * crop.w * 4);
  writeImage(resolve(dir, `${name}.png`), art);
  assets[`menu/team-preview/${name}`] = {
    file: `${name}.png`,
    w: art.w / 4,
    h: art.h / 4,
    pixelW: art.w,
    pixelH: art.h,
    sampling: 'linear',
  };
}
writeFileSync(
  resolve(dir, 'manifest.json'),
  JSON.stringify({ version: 1, style: 'painted', assets }, null, 2) + '\n',
);
