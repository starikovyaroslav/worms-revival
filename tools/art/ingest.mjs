/** Deterministic image ingestion. Requires Node >=22.18 and ImageMagick 7. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snap, DB32 } from '../../packages/render/src/palette.ts';

export const root = resolve(import.meta.dirname, '../..');
export const outputRoot = resolve(root, 'apps/client/public/assets/generated');
const creatures = [
  'sheep_0',
  'sheep_1',
  'supersheep_0',
  'supersheep_1',
  'pigeon_0',
  'pigeon_1',
  'mole_0',
  'mole_1',
  'cow',
  'oldwoman',
  'donkey',
  'skunk',
  'banana_0',
  'banana_1',
  'stink',
  'donkey_fall',
];
const props = [
  'grave_cross',
  'grave_round',
  'grave_slab',
  'grave_skull',
  'crate_weapon',
  'crate_health',
  'crate_utility',
  'crate_open',
  'barrel',
  'barrel_burning',
  'mine_off',
  'mine_armed',
  'parachute',
  'crate_broken',
  'dynamite',
  'canister',
];
export const specs = [];
for (const theme of ['meadow', 'arctic', 'desert', 'hell']) {
  for (const layer of ['sky', 'far', 'mid', 'near'])
    specs.push({
      source: `${theme}/bg-${layer}.png`,
      w: layer === 'sky' ? 256 : 384,
      h: layer === 'sky' ? 384 : 256,
      block: 4,
      opaque: layer === 'sky',
      maxH: { sky: 384, far: 160, mid: 128, near: 96 }[layer],
      id: `bg/${theme}/${layer}`,
      tile: 'x',
    });
  specs.push({
    source: `${theme}/terrain-fill.png`,
    w: 64,
    h: 64,
    block: 16,
    opaque: true,
    id: `terrain/${theme}/fill`,
    tile: 'xy',
  });
  specs.push({
    source: `${theme}/terrain-strips.png`,
    w: 96,
    h: 64,
    block: 16,
    strips: theme,
    tile: 'x',
  });
}
specs.push({
  source: 'logo/logo.png',
  w: 384,
  h: 256,
  block: 4,
  id: 'ui/logo',
  crop: true,
  derivatives: [{ id: 'ui/logo-menu', w: 159, h: 74 }],
});
specs.push({
  source: 'sheets/creatures.png',
  w: 128,
  h: 128,
  block: 8,
  sheet: creatures,
  folder: 'creatures',
});
specs.push({
  source: 'sheets/props.png',
  w: 128,
  h: 128,
  block: 8,
  sheet: props,
  folder: 'objects',
});

// Keep each asset within its prompt's subset of DB32 (prevents noisy extra hues).
const promptDocument = readFileSync(resolve(root, 'docs/design/chatgpt-art-prompts.md'), 'utf8');
for (const spec of specs) {
  let section;
  if (spec.sheet)
    section = promptDocument.split(spec.folder === 'creatures' ? '## 8.' : '## 9.')[1];
  else if (spec.id === 'ui/logo') section = promptDocument.split('### 7.2')[1];
  else {
    const [theme, file] = spec.source.split('/');
    const prefix = { meadow: 'M', arctic: 'A', desert: 'D', hell: 'H' }[theme];
    const kind = file
      .replace(/^(bg|terrain)-/, '')
      .replace('.png', '')
      .toUpperCase();
    section = promptDocument.split(`**${prefix}-${kind}`)[1];
  }
  const code = section?.match(/```\n([\s\S]*?)```/)?.[1];
  const palette = code?.match(/Use ONLY(?: these colours)?:([\s\S]*)/i)?.[1];
  if (!palette) throw new Error(`Missing prompt palette: ${spec.source}`);
  spec.palette = [
    ...new Set((palette.match(/#[\da-f]{6}/gi) ?? []).map((c) => Number.parseInt(c.slice(1), 16))),
  ].filter((c) => DB32.includes(c));
  if (!spec.palette.length) throw new Error(`Empty DB32 prompt palette: ${spec.source}`);
}

function snapForSpec(r, g, b, spec) {
  const c = snap(r, g, b);
  if (!spec.palette || spec.palette.includes(c)) return c;
  let best = spec.palette[0],
    distance = Infinity;
  for (const p of spec.palette) {
    const d =
      0.3 * (r - (p >>> 16)) ** 2 +
      0.59 * (g - ((p >>> 8) & 255)) ** 2 +
      0.11 * (b - (p & 255)) ** 2;
    if (d < distance) {
      best = p;
      distance = d;
    }
  }
  return best;
}

export function readImage(path) {
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', path], {
    encoding: 'utf8',
  })
    .trim()
    .split(' ')
    .map(Number);
  const data = execFileSync('magick', [path, '-alpha', 'on', '-depth', '8', 'rgba:-'], {
    maxBuffer: 128 * 1024 * 1024,
  });
  if (data.length !== w * h * 4) throw new Error(`Expected a single RGBA image: ${path}`);
  return { w, h, data };
}
export function writeImage(path, im) {
  mkdirSync(dirname(path), { recursive: true });
  execFileSync(
    'magick',
    [
      '-size',
      `${im.w}x${im.h}`,
      '-depth',
      '8',
      'rgba:-',
      '-strip',
      '-define',
      'png:exclude-chunks=date,time',
      '-define',
      'png:color-type=6',
      path,
    ],
    { input: im.data },
  );
}
const pixel = (data, i, opaque) => {
  const [r, g, b, a] = data.subarray(i, i + 4);
  if (!opaque && (a < 128 || (r >= 215 && g <= 40 && b >= 215))) return 0;
  if (opaque && a < 255) throw new Error('Opaque sky/fill contains transparent pixels');
  return ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
};
export function reduce(im, spec) {
  const block = im.w / spec.w;
  if (!Number.isInteger(block) || block < 1 || im.h !== spec.h * block)
    throw new Error(
      `Incompatible dimensions ${im.w}x${im.h}; expected integer scale of ${spec.w}x${spec.h}`,
    );
  const data = Buffer.alloc(spec.w * spec.h * 4);
  for (let y = 0; y < spec.h; y++)
    for (let x = 0; x < spec.w; x++) {
      const counts = new Map();
      for (let by = 0; by < block; by++)
        for (let bx = 0; bx < block; bx++) {
          const c = pixel(im.data, ((y * block + by) * im.w + x * block + bx) * 4, spec.opaque);
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
      let best = 0,
        n = -1;
      for (const [c, count] of counts)
        if (count > n) {
          best = c;
          n = count;
        }
      const color =
        best === 0
          ? 0
          : ((snapForSpec(best >>> 24, (best >>> 16) & 255, (best >>> 8) & 255, spec) << 8) |
              255) >>>
            0;
      data.writeUInt32BE(color, (y * spec.w + x) * 4);
    }
  return { w: spec.w, h: spec.h, data };
}
export function cut(im, x, y, w, h) {
  const data = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++)
    im.data.copy(data, row * w * 4, ((y + row) * im.w + x) * 4, ((y + row) * im.w + x + w) * 4);
  return { w, h, data };
}
export function bbox(im) {
  let x0 = im.w,
    y0 = im.h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (im.data[(y * im.w + x) * 4 + 3]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error('Empty artwork');
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
export function fit(im, w, h) {
  const scale = Math.min(w / im.w, h / im.h);
  const ow = Math.max(1, Math.round(im.w * scale)),
    oh = Math.max(1, Math.round(im.h * scale));
  const data = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++) {
      const i =
        (Math.min(im.h - 1, Math.floor(y / scale)) * im.w +
          Math.min(im.w - 1, Math.floor(x / scale))) *
        4;
      im.data.copy(data, (y * ow + x) * 4, i, i + 4);
    }
  return { w: ow, h: oh, data };
}
export function resizeNearest(im, w, h) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (Math.floor((y * im.h) / h) * im.w + Math.floor((x * im.w) / w)) * 4;
      im.data.copy(data, (y * w + x) * 4, i, i + 4);
    }
  return { w, h, data };
}
export function stripBands(im) {
  const bands = [];
  for (let y = 0; y < im.h; y++) {
    let occupied = false;
    for (let x = 0; x < im.w; x++)
      if (im.data[(y * im.w + x) * 4 + 3]) {
        occupied = true;
        break;
      }
    if (!occupied) continue;
    const previous = bands.at(-1);
    if (previous && previous.y + previous.h === y) previous.h++;
    else bands.push({ y, h: 1 });
  }
  if (bands.length !== 3)
    throw new Error(`Expected 3 separated terrain bands, found ${bands.length}; repair source`);
  return bands.map((b) => resizeNearest(cut(im, 0, b.y, im.w, b.h), 96, 16));
}
export function seamError(im, axis) {
  let sum = 0;
  const count = axis === 'x' ? im.h : im.w;
  for (let i = 0; i < count; i++) {
    const a = axis === 'x' ? i * im.w * 4 : i * 4;
    const b = axis === 'x' ? a + (im.w - 1) * 4 : ((im.h - 1) * im.w + i) * 4;
    for (let c = 0; c < 4; c++) sum += Math.abs(im.data[a + c] - im.data[b + c]);
  }
  return sum / (count * 4 * 255);
}
// Symmetric short edge blend; blend premultiplied RGB to avoid magenta/black fringes.
export function healSeam(im, axis) {
  const length = axis === 'x' ? im.w : im.h,
    count = axis === 'x' ? im.h : im.w;
  const band = Math.min(24, Math.floor(length / 4));
  const original = Buffer.from(im.data);
  for (let i = 0; i < count; i++)
    for (let j = 0; j < band; j++) {
      const a = axis === 'x' ? (i * im.w + j) * 4 : (j * im.w + i) * 4;
      const b = axis === 'x' ? (i * im.w + length - 1 - j) * 4 : ((length - 1 - j) * im.w + i) * 4;
      const t = (1 - j / band) * 0.5;
      for (const [dst, other] of [
        [a, b],
        [b, a],
      ]) {
        const alpha = original[dst + 3] * (1 - t) + original[other + 3] * t;
        if (alpha < 128) {
          im.data.fill(0, dst, dst + 4);
          continue;
        }
        const rgb = [0, 1, 2].map(
          (c) =>
            (original[dst + c] * original[dst + 3] * (1 - t) +
              original[other + c] * original[other + 3] * t) /
            alpha,
        );
        im.data.writeUInt32BE(((snap(...rgb) << 8) | 255) >>> 0, dst);
      }
    }
}
export function validate(im) {
  const colors = new Set();
  let transparent = 0;
  for (let i = 0; i < im.data.length; i += 4) {
    const a = im.data[i + 3];
    if (a === 0) {
      transparent++;
      continue;
    }
    if (a !== 255) throw new Error('Non-binary alpha');
    const c = (im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2];
    if (!DB32.includes(c)) throw new Error(`Non-DB32 colour: ${c.toString(16)}`);
    colors.add(c);
  }
  return { colors: colors.size, transparent };
}
export function countIslands(im) {
  const visited = new Uint8Array(im.w * im.h);
  let count = 0;
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || !im.data[start * 4 + 3]) continue;
    count++;
    const stack = [start];
    visited[start] = 1;
    while (stack.length) {
      const i = stack.pop(),
        x = i % im.w,
        y = Math.floor(i / im.w);
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * im.w + nx;
        if (nx < 0 || nx >= im.w || ny < 0 || ny >= im.h || visited[n] || !im.data[n * 4 + 3])
          continue;
        visited[n] = 1;
        stack.push(n);
      }
    }
  }
  return count;
}
export function splitSheet(im, spec) {
  return spec.sheet.map((name, i) => {
    let cell = cut(im, (i % 4) * 32, Math.floor(i / 4) * 32, 32, 32);
    const box = bbox(cell);
    if (box.x === 0 || box.y === 0 || box.x + box.w === 32 || box.y + box.h === 32)
      throw new Error(`${name} touches its cell boundary; repair sheet`);
    if (spec.folder === 'objects') {
      cell = cut(cell, box.x, box.y, box.w, box.h);
      const size = name.startsWith('grave')
        ? [11, 15]
        : name.startsWith('crate')
          ? [16, 15]
          : name.startsWith('barrel')
            ? [13, 14]
            : name.startsWith('mine')
              ? [8, 5]
              : name === 'parachute'
                ? [20, 19]
                : [20, 20];
      cell = fit(cell, ...size);
    }
    return { id: `${spec.folder}/${name}`, im: cell };
  });
}
export function ingest(spec, inputRoot, out = outputRoot, options = {}) {
  const source = resolve(inputRoot, spec.source),
    raw = readImage(source);
  let input = raw;
  const normalizations = [];
  if (
    options.normalize &&
    (!Number.isInteger(raw.w / spec.w) || raw.h !== spec.h * (raw.w / spec.w))
  ) {
    if (Math.abs(raw.w / raw.h - spec.w / spec.h) > 0.01)
      throw new Error(`Wrong source aspect ratio: ${spec.source}`);
    input = resizeNearest(raw, spec.w * spec.block, spec.h * spec.block);
    normalizations.push(
      `Canvas ${raw.w}x${raw.h} -> ${input.w}x${input.h} (nearest neighbour); original retained`,
    );
  }
  const rawColors = new Set();
  for (let i = 0; i < raw.data.length; i += 4)
    if (raw.data[i + 3]) rawColors.add(raw.data.readUInt32BE(i) >>> 8);
  const im = reduce(input, spec);
  let entries;
  if (spec.sheet) entries = splitSheet(im, spec);
  else if (spec.strips) {
    if (!options.normalize) {
      for (const y of [
        ...Array.from({ length: 8 }, (_, i) => i + 16),
        ...Array.from({ length: 8 }, (_, i) => i + 40),
      ])
        for (let x = 0; x < im.w; x++)
          if (im.data[(y * im.w + x) * 4 + 3])
            throw new Error(
              `${spec.source}: shifted terrain band; repair source or use --normalize`,
            );
    }
    const bands = options.normalize ? stripBands(im) : null;
    if (bands) normalizations.push('Terrain bands detected by occupied rows and resized to 96x16');
    entries = ['rim', 'scorch', 'under'].map((name, i) => ({
      id: `terrain/${spec.strips}/${name}`,
      im: bands ? bands[i] : cut(im, 0, i * 24, 96, 16),
    }));
  } else {
    let result = im;
    if (spec.crop) {
      const b = bbox(im);
      result = cut(im, b.x, b.y, b.w, b.h);
    }
    if (spec.maxH && !spec.opaque) {
      const b = bbox(im);
      if ((b.h > spec.maxH || b.y + b.h !== im.h) && !options.normalize)
        throw new Error(
          `${spec.source}: artwork must be bottom-aligned and at most ${spec.maxH}px tall; repair source`,
        );
      result = cut(im, 0, b.y, im.w, b.h);
      if (options.normalize && b.h > spec.maxH) {
        result = resizeNearest(result, result.w, spec.maxH);
        normalizations.push(`Layer height ${b.h} -> ${spec.maxH}; width preserved`);
      }
      if (options.normalize && b.y + b.h !== im.h)
        normalizations.push('Removed transparent bottom margin');
    }
    entries = [{ id: spec.id, im: result }];
    for (const derivative of spec.derivatives ?? [])
      entries.push({ id: derivative.id, im: fit(result, derivative.w, derivative.h) });
  }
  const report = [];
  for (const entry of entries) {
    const seams = {};
    for (const axis of spec.tile ?? '') {
      const before = seamError(entry.im, axis);
      if (before > 0) healSeam(entry.im, axis);
      seams[axis] = { before, after: seamError(entry.im, axis), repaired: before > 0 };
    }
    for (let i = 0; i < entry.im.data.length; i += 4)
      if (entry.im.data[i + 3]) {
        const c = snapForSpec(entry.im.data[i], entry.im.data[i + 1], entry.im.data[i + 2], spec);
        entry.im.data.writeUInt32BE(((c << 8) | 255) >>> 0, i);
      }
    const stats = validate(entry.im);
    writeImage(resolve(out, `${entry.id}.png`), entry.im);
    report.push({
      id: entry.id,
      file: `${entry.id}.png`,
      w: entry.im.w,
      h: entry.im.h,
      ...stats,
      islands: countIslands(entry.im),
      rawColors: rawColors.size,
      seams,
      source: relative(root, source),
      raw: [raw.w, raw.h],
      normalizations,
    });
  }
  return report;
}
export function main(args) {
  const all = args.includes('--all'),
    selected = args.filter((a) => !a.startsWith('--'));
  if (!all && !selected.length)
    throw new Error('Usage: node tools/art/ingest.mjs --all | meadow/bg-mid.png [...]');
  const unknownFlags = args.filter(
    (a) => a.startsWith('--') && !['--all', '--normalize'].includes(a),
  );
  if (unknownFlags.length) throw new Error(`Unknown flags: ${unknownFlags.join(', ')}`);
  const unknown = selected.filter((s) => !specs.some((spec) => spec.source === s));
  if (unknown.length) throw new Error(`Unknown inputs: ${unknown.join(', ')}`);
  const wanted = all ? specs : specs.filter((s) => selected.includes(s.source));
  // Missing batch inputs are an error, not an apparently successful partial batch.
  for (const spec of wanted)
    if (!existsSync(resolve(root, 'assets-in', spec.source)))
      throw new Error(`Missing assets-in/${spec.source}`);
  const manifestPath = resolve(outputRoot, 'manifest.json');
  const reportPath = resolve(outputRoot, 'acceptance.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { version: 2, style: 'pixel', assets: {} };
  const reports = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : {};
  mkdirSync(outputRoot, { recursive: true });
  for (const spec of wanted) {
    for (const row of ingest(spec, resolve(root, 'assets-in'), outputRoot, {
      normalize: args.includes('--normalize'),
    })) {
      manifest.assets[row.id] = { file: row.file, w: row.w, h: row.h };
      reports[row.id] = row;
      console.log(
        `${row.id}: ${row.w}x${row.h}, ${row.colors} colours; seams ${JSON.stringify(row.seams)}`,
      );
      for (const note of row.normalizations) console.warn(`${row.id}: NORMALIZED: ${note}`);
    }
    // Preserve completed inputs if a later source needs repair.
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(reportPath, JSON.stringify(reports, null, 2) + '\n');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
