/** Review compositions only; does not wire the assets into the game. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, outputRoot, specs, readImage, validate, seamError } from './ingest.mjs';

const previews = resolve(root, 'assets-in/previews');
const magick = (args) => execFileSync('magick', args, { maxBuffer: 32 * 1024 * 1024 });

export function audit() {
  const manifest = JSON.parse(readFileSync(resolve(outputRoot, 'manifest.json'), 'utf8'));
  const expected = specs.flatMap((s) =>
    s.sheet
      ? s.sheet.map((name) => `${s.folder}/${name}`)
      : s.strips
        ? ['rim', 'scorch', 'under'].map((name) => `terrain/${s.strips}/${name}`)
        : [s.id, ...(s.derivatives ?? []).map((d) => d.id)],
  );
  const missing = expected.filter((id) => !manifest.assets[id]);
  if (missing.length) throw new Error(`Missing assets: ${missing.join(', ')}`);
  if (Object.keys(manifest.assets).length !== expected.length)
    throw new Error(`Expected exactly ${expected.length} manifest entries`);
  for (const id of expected) {
    const record = manifest.assets[id];
    const im = readImage(resolve(outputRoot, record.file));
    if (im.w !== record.w || im.h !== record.h)
      throw new Error(`Manifest dimensions differ: ${id}`);
    validate(im);
    const spec = specs.find(
      (s) =>
        s.id === id ||
        s.derivatives?.some((d) => d.id === id) ||
        s.sheet?.some((name) => `${s.folder}/${name}` === id) ||
        (s.strips && id.startsWith(`terrain/${s.strips}/`)),
    );
    const colors = new Set();
    for (let i = 0; i < im.data.length; i += 4)
      if (im.data[i + 3]) colors.add(im.data.readUInt32BE(i) >>> 8);
    if ([...colors].some((c) => !spec.palette.includes(c)))
      throw new Error(`Outside prompt palette: ${id}`);
    for (const axis of spec.tile ?? '')
      if (seamError(im, axis) !== 0) throw new Error(`Unhealed ${axis} seam: ${id}`);
  }
  return expected.length;
}

export function review() {
  const count = audit();
  mkdirSync(previews, { recursive: true });
  const asset = (id) => resolve(outputRoot, `${id}.png`);
  const preview = (name) => resolve(previews, `${name}.png`);
  for (const theme of ['meadow', 'arctic', 'desert', 'hell']) {
    // Farther layers have a higher baseline; leave the final 58 pixels for terrain.
    const args = ['-size', '640x360', `tile:${asset(`bg/${theme}/sky`)}`];
    for (const [layer, baseline] of [
      ['far', 274],
      ['mid', 292],
      ['near', 306],
    ]) {
      const file = asset(`bg/${theme}/${layer}`),
        im = readImage(file);
      args.push(
        '(',
        '-compose',
        'copy',
        '-size',
        `640x${im.h}`,
        `tile:${file}`,
        ')',
        '-geometry',
        `+0+${baseline - im.h}`,
        '-compose',
        'over',
        '-composite',
      );
    }
    args.push(
      '(',
      '-compose',
      'copy',
      '-size',
      '640x58',
      `tile:${asset(`terrain/${theme}/fill`)}`,
      ')',
      '-geometry',
      '+0+302',
      '-compose',
      'over',
      '-composite',
    );
    args.push(
      '(',
      '-compose',
      'copy',
      '-size',
      '640x16',
      `tile:${asset(`terrain/${theme}/rim`)}`,
      ')',
      '-geometry',
      '+0+294',
      '-compose',
      'over',
      '-composite',
    );
    args.push(preview(`${theme}-640x360`));
    magick(args);
    const composed = readImage(preview(`${theme}-640x360`));
    const allowed = new Set(
      specs.filter((s) => s.source.startsWith(`${theme}/`)).flatMap((s) => s.palette),
    );
    if (validate(composed).transparent) throw new Error(`Transparent holes in ${theme} preview`);
    for (let i = 0; i < composed.data.length; i += 4)
      if (!allowed.has(composed.data.readUInt32BE(i) >>> 8))
        throw new Error(`Unexpected compositing colour in ${theme} preview`);
    magick([
      preview(`${theme}-640x360`),
      '-filter',
      'point',
      '-resize',
      '200%',
      preview(`${theme}-1280x720`),
    ]);
    for (const [id, both] of [
      [`terrain/${theme}/fill`, true],
      ...['rim', 'scorch', 'under'].map((n) => [`terrain/${theme}/${n}`, false]),
      ...['sky', 'far', 'mid', 'near'].map((n) => [`bg/${theme}/${n}`, false]),
    ]) {
      const file = asset(id);
      const args = [file, file, '+append'];
      if (both) args.push('(', '+clone', ')', '-append');
      args.push(
        '-background',
        '#847e87',
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-filter',
        'point',
        '-resize',
        '200%',
        preview(id.replaceAll('/', '-')),
      );
      magick(args);
    }
  }
  for (const folder of ['creatures', 'objects']) {
    const spec = specs.find((s) => s.folder === folder);
    const files = spec.sheet.map((name) => asset(`${folder}/${name}`));
    if (files.some((file) => !existsSync(file))) throw new Error(`Missing ${folder} sprite`);
    const cells = resolve(previews, 'cells');
    mkdirSync(cells, { recursive: true });
    const framed = files.map((file, i) => {
      const target = resolve(cells, `${folder}-${spec.sheet[i]}.png`);
      magick([
        file,
        '-background',
        '#847e87',
        '-gravity',
        'center',
        '-extent',
        '32x32',
        '-filter',
        'point',
        '-resize',
        '400%',
        target,
      ]);
      return target;
    });
    magick([
      'montage',
      ...framed,
      '-background',
      '#847e87',
      '-geometry',
      '+12+12',
      '-tile',
      '4x4',
      preview(`${folder}-contact`),
    ]);
  }
  magick([
    'montage',
    ...['meadow', 'arctic', 'desert', 'hell'].map((t) => preview(`${t}-640x360`)),
    '-geometry',
    '640x360+8+8',
    '-tile',
    '2x2',
    '-background',
    '#222034',
    preview('themes-contact'),
  ]);
  magick([
    asset('ui/logo'),
    '-background',
    '#639bff',
    '-alpha',
    'remove',
    '-alpha',
    'off',
    '-filter',
    'point',
    '-resize',
    '400%',
    preview('logo-x4'),
  ]);
  console.log(`Validated ${count} assets. Review images: ${previews}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  throw new Error('Historical DB32 review disabled. Use npm run art:review.');
