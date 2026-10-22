/** Shared native-density art overlay. Leaves every legacy file and runtime identity intact. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';
import { paintedGrid } from './painted-grid.mjs';
import { empty, blit } from './desktop-world.mjs';
import { healSeam, validate } from './rgba.mjs';
import { VFX_CLIPS } from '../../packages/render/src/vfxCatalog.ts';

const partial = process.argv.includes('--partial');
const dir = resolve(root, 'apps/client/public/assets/painted-common');
mkdirSync(dir, { recursive: true });
const jobs = JSON.parse(
  readFileSync(resolve(root, 'tools/art/painted-expansion-prompts.json')),
).filter((j) => j.grid || ['materials', 'logo'].includes(j.id));
const baseline = Object.assign(
  {},
  ...['', 'generated', 'arsenal', 'vfx', 'military', 'skins'].map(
    (p) =>
      JSON.parse(
        readFileSync(resolve(root, `apps/client/public/assets/${p ? p + '/' : ''}manifest.json`)),
      ).assets,
  ),
);
const manifest = { version: 2, style: 'painted', assets: {} },
  report = {},
  masters = {};
const prefix = 'painted/common/';
function save(id, image, size, source) {
  const file = id.replaceAll('/', '--') + '.png';
  writeImage(resolve(dir, file), image);
  manifest.assets[prefix + id] = {
    file,
    w: size.w,
    h: size.h,
    pixelW: image.w,
    pixelH: image.h,
    sampling: 'linear',
  };
  report[id] = {
    source,
    pixels: [image.w, image.h],
    display: [size.w, size.h],
    ...validate(image),
  };
}
function alias(id, target) {
  const entry = manifest.assets[prefix + target];
  if (!entry) return;
  const size = baseline[id] ?? entry;
  if (Math.min(entry.pixelW / size.w, entry.pixelH / size.h) < 4) {
    const original = readImage(resolve(dir, entry.file));
    const padded = empty(
      Math.max(original.w, Math.ceil(size.w * 4)),
      Math.max(original.h, Math.ceil(size.h * 4)),
    );
    blit(padded, original, (padded.w - original.w) / 2, (padded.h - original.h) / 2);
    save(id, padded, size, `native padded alias of ${target}`);
    return;
  }
  manifest.assets[prefix + id] = { ...entry, w: size.w, h: size.h };
}
for (const job of jobs) {
  const input =
    job.id === 'icons-3' &&
    existsSync(resolve(root, 'assets-in/painted-expansion/icons-3-repair.png'))
      ? 'assets-in/painted-expansion/icons-3-repair.png'
      : job.output;
  const path = resolve(root, input);
  if (!existsSync(path)) {
    if (partial) continue;
    throw new Error(`Missing master ${job.output}`);
  }
  const raw = readImage(path);
  masters[job.id] = {
    path: input,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    prompt:
      job.id === 'icons-3' && input !== job.output
        ? 'tools/art/painted-icons-3-repair.prompt.txt'
        : `tools/art/painted-expansion-prompts.json#${job.id}`,
  };
  if (job.id === 'materials') {
    for (const [i, name] of ['rock', 'steel', 'ash', 'clay'].entries()) {
      const x = Math.round(((i % 2) * raw.w) / 2),
        y = Math.round((Math.floor(i / 2) * raw.h) / 2);
      const im = cut(
        raw,
        x,
        y,
        Math.round((((i % 2) + 1) * raw.w) / 2) - x,
        Math.round(((Math.floor(i / 2) + 1) * raw.h) / 2) - y,
      );
      healSeam(im, 'x');
      healSeam(im, 'y');
      save(`materials/${name}`, im, { w: 128, h: 128 }, input);
    }
    continue;
  }
  if (job.id === 'logo') {
    const b = bbox(raw),
      im = cut(raw, b.x, b.y, b.w, b.h);
    // Preserve the native wordmark aspect ratio, not the old pixel logo's box.
    save('ui/logo-menu', im, { w: 240, h: (240 * im.h) / im.w }, input);
    alias('ui/logo', 'ui/logo-menu');
    continue;
  }
  const cells = job.id === 'icons-3' ? paintedGrid(raw, job.grid) : skinCells(raw, job.grid);
  if (cells.length !== job.cells.length) throw new Error(`${job.id}: wrong count`);
  if (cells.some((c) => c.touchesSourceEdge))
    throw new Error(`${job.id}: clipped silhouette requires repair`);
  for (let index = 0; index < cells.length; index++) {
    const cell = job.cells[index],
      id = cell.id;
    const clipName = id.startsWith('vfx/') ? id.split('/')[1].replace(/_\d+$/, '') : null;
    const clip = clipName ? VFX_CLIPS[clipName] : null;
    const size = baseline[id] ?? clip ?? cell;
    if (!size.w || !size.h) throw new Error(`${id}: missing world dimensions`);
    const group = clip
      ? cells.filter((_, i) => job.cells[i].id.startsWith(`vfx/${clipName}_`))
      : [cells[index]];
    const density = Math.max(
      4,
      Math.ceil(Math.max(...group.map((c) => Math.max(c.art.w / size.w, c.art.h / size.h))) / 0.9),
    );
    const image = empty(Math.ceil(size.w * density), Math.ceil(size.h * density));
    const art = cells[index].art;
    // No rescale, quantization or thresholding: copy the isolated source texels unchanged.
    blit(
      image,
      art,
      (image.w - art.w) / 2,
      clip?.anchor[1] === 1 ? image.h - art.h - 2 : (image.h - art.h) / 2,
    );
    save(id, image, size, `${input}#cell-${index + 1}`);
  }
}
for (const [id, target] of Object.entries({
  'objects/crate-weapon': 'objects/crate_weapon',
  'objects/crate-health': 'objects/crate_health',
  'objects/mine': 'objects/mine_armed',
  'objects/tombstone': 'objects/grave_cross',
  'proj/sheep': 'creatures/sheep_0',
  'proj/supersheep': 'creatures/supersheep_0',
  'proj/pigeon': 'creatures/pigeon_0',
  'proj/letter': 'vfx/letter_0',
  'vfx/rocket_0': 'vfx/missile_0',
  'vfx/rocket_1': 'vfx/missile_1',
  'skins/weapons/bat': 'weapons/icon/bat',
  'skins/weapons/axe': 'weapons/icon/axe',
  'skins/weapons/grenade': 'proj/grenade',
  'skins/weapons/cluster': 'proj/cluster',
  'skins/weapons/banana': 'creatures/banana_0',
  'skins/weapons/hhg': 'proj/hhg',
  'skins/weapons/dynamite': 'objects/dynamite',
  'skins/weapons/mine': 'objects/mine_armed',
  'skins/weapons/arrow': 'proj/arrow',
  'skins/weapons/madcow': 'creatures/cow',
  'skins/weapons/mortar': 'weapons/icon/mortar',
}))
  alias(id, target);
for (const plane of ['cargo', 'mailplane'])
  for (let i = 0; i < 4; i++) alias(`vfx/${plane}_${i}`, `vfx/gunship_${i}`);
for (const [name, count] of [
  ['dynamite', 2],
  ['sheep', 3],
  ['sheepwalk', 3],
])
  for (let i = 0; i < count; i++)
    alias(
      `proj/${name}_${i}`,
      name === 'dynamite' ? 'objects/dynamite' : `creatures/sheep_${i % 2}`,
    );
// One shared painted smoke/fire/blast family, not four duplicate biome exports.
const meadow = JSON.parse(
  readFileSync(resolve(root, 'apps/client/public/assets/painted-meadow/manifest.json')),
);
for (const [id, a] of Object.entries(meadow.assets)) {
  if (id.startsWith('painted/vfx/'))
    manifest.assets[prefix + id.slice('painted/'.length)] = {
      ...a,
      file: '../painted-meadow/' + a.file,
    };
  if (id.startsWith('painted/bg/') || id.startsWith('painted/terrain/'))
    manifest.assets[prefix + id.slice('painted/'.length)] = {
      ...a,
      file: '../painted-meadow/' + a.file,
    };
}
for (const theme of ['desert', 'arctic', 'hell']) {
  const path = resolve(root, `apps/client/public/assets/painted-${theme}/manifest.json`);
  if (!existsSync(path)) {
    if (partial) continue;
    throw new Error(`Missing exported biome ${theme}`);
  }
  const pack = JSON.parse(readFileSync(path));
  for (const [id, a] of Object.entries(pack.assets))
    if (id.startsWith('painted/bg/') || id.startsWith('painted/terrain/'))
      manifest.assets[prefix + id.slice('painted/'.length)] = {
        ...a,
        file: `../painted-${theme}/${a.file}`,
      };
}
for (let i = 0; i < 2; i++) alias(`fx/flame_${i}`, `vfx/fire_${i}`);
writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(dir, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(
  resolve(dir, 'generation.json'),
  JSON.stringify(
    {
      mode: 'built-in imagegen',
      prompts: 'tools/art/painted-expansion-prompts.json',
      masters,
      export: 'tools/art/painted-common.mjs',
      processing: {
        sprites: 'native isolated RGBA copied without resize',
        materials: 'native quarters with premultiplied seam healing',
        aliases: 'shared PNGs or native padding',
        paletteQuantization: false,
        binaryAlpha: false,
      },
      partial,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `${Object.keys(report).length} native images; ${Object.keys(manifest.assets).length} reversible overlay entries; partial=${partial}`,
);
