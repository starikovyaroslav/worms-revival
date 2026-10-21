/** Supplemental pack. Reuses the established deterministic DB32/alpha processing primitives. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { snap } from '../../packages/render/src/palette.ts';
import {
  root,
  readImage,
  resizeNearest,
  reduce,
  cut,
  bbox,
  fit,
  writeImage,
  validate,
  countIslands,
} from './ingest.mjs';

export const sources = JSON.parse(readFileSync(new URL('./arsenal-sources.json', import.meta.url)));
export const output = resolve(root, 'apps/client/public/assets/arsenal');
export const repairs = JSON.parse(readFileSync(new URL('./arsenal-repairs.json', import.meta.url)));

function iconCanvas(fitted, cell) {
  const result = { w: cell.w, h: cell.h, data: Buffer.alloc(cell.w * cell.h * 4) };
  const x = Math.floor((cell.w - fitted.w) / 2),
    y = Math.floor((cell.h - fitted.h) / 2);
  for (let line = 0; line < fitted.h; line++)
    fitted.data.copy(
      result.data,
      ((y + line) * cell.w + x) * 4,
      line * fitted.w * 4,
      (line + 1) * fitted.w * 4,
    );
  return result;
}

/** Explicit reviewed row/column boundaries compensate for generator layout drift, not sprite loss. */
export function split(im, source) {
  if (im.w !== 128 || im.h !== 128) throw new Error('Expected a 128x128 reduced sheet');
  if (source.cells.length !== 16) throw new Error('Expected exactly 16 cells');
  const { rows, columns } = source.grid;
  const edgeList = (edges) =>
    edges.length === 5 &&
    edges[0] === 0 &&
    edges[4] === 128 &&
    edges.every((v, i) => Number.isInteger(v) && (i === 0 || v > edges[i - 1]));
  if (!edgeList(rows) || columns.length !== 4 || !columns.every(edgeList))
    throw new Error('Invalid reviewed sheet grid');
  return source.cells.map((cell, i) => {
    const row = Math.floor(i / 4),
      col = i % 4;
    const crop = [
      columns[row][col],
      rows[row],
      columns[row][col + 1] - columns[row][col],
      rows[row + 1] - rows[row],
    ];
    const art = cut(im, ...crop);
    const b = bbox(art);
    if (b.x === 0 || b.y === 0 || b.x + b.w === art.w || b.y + b.h === art.h)
      throw new Error(`${cell.id}: crop cuts artwork; review boundaries or repair generation`);
    const cropped = cut(art, b.x, b.y, b.w, b.h);
    const fitted = fit(cropped, cell.w, cell.h);
    if (cell.id === 'weapons/icon/minestrike') {
      // Area reduction retains the small grey domes; quantize straight back to binary DB32.
      for (let y = 0; y < fitted.h; y++)
        for (let x = 0; x < fitted.w; x++) {
          const x0 = (x * cropped.w) / fitted.w,
            x1 = ((x + 1) * cropped.w) / fitted.w;
          const y0 = (y * cropped.h) / fitted.h,
            y1 = ((y + 1) * cropped.h) / fitted.h;
          const rgb = [0, 0, 0];
          let alpha = 0;
          for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++)
            for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
              const weight =
                (Math.min(x1, sx + 1) - Math.max(x0, sx)) *
                (Math.min(y1, sy + 1) - Math.max(y0, sy));
              const i = (sy * cropped.w + sx) * 4;
              const a = (cropped.data[i + 3] / 255) * weight;
              alpha += a;
              for (let c = 0; c < 3; c++) rgb[c] += cropped.data[i + c] * a;
            }
          const average = rgb.map((c) => (alpha ? c / alpha : 0));
          // The source's navy-grey domes disappear on the inventory's black tile.
          // Lift only neutral material tones, leaving the purple outline and red arrow intact.
          if (Math.max(...average) - Math.min(...average) < 28 && average[0] > 38)
            for (let c = 0; c < 3; c++) average[c] = Math.min(255, average[c] * 1.8);
          const color =
            alpha / ((x1 - x0) * (y1 - y0)) < 0.5 ? 0 : ((snap(...average) << 8) | 255) >>> 0;
          fitted.data.writeUInt32BE(color, (y * fitted.w + x) * 4);
        }
    }
    let result = fitted;
    if (cell.id.startsWith('weapons/icon/')) {
      result = iconCanvas(fitted, cell);
    }
    return { id: cell.id, im: result, crop, bbox: b };
  });
}

export function build() {
  const manifest = { version: 2, style: 'pixel', assets: {} };
  const acceptance = {};
  for (const source of sources) {
    const raw = readImage(resolve(root, 'assets-in', source.source));
    if (Math.abs(raw.w / raw.h - 1) > 0.01) throw new Error(`Non-square source: ${source.source}`);
    const reduced = reduce(resizeNearest(raw, 1024, 1024), { w: 128, h: 128 });
    for (const entry of split(reduced, source)) {
      const file = `${entry.id}.png`;
      const stats = validate(entry.im);
      manifest.assets[entry.id] = { file, w: entry.im.w, h: entry.im.h };
      acceptance[entry.id] = {
        source: `assets-in/${source.source}`,
        raw: [raw.w, raw.h],
        normalized: [1024, 1024],
        reduced: [128, 128],
        crop: entry.crop,
        bbox: entry.bbox,
        ...stats,
        islands: countIslands(entry.im),
        ...(entry.id === 'weapons/icon/minestrike'
          ? { resampling: 'area average, alpha threshold 0.5, neutral midtones x1.8, DB32' }
          : {}),
      };
      writeImage(resolve(output, file), entry.im);
    }
  }
  for (const repair of repairs.filter((r) => r.status === 'selected')) {
    const id = `weapons/icon/${repair.id}`;
    if (!manifest.assets[id]) throw new Error(`Unknown repair target ${id}`);
    const raw = readImage(resolve(root, 'assets-in', repair.source));
    if (Math.abs(raw.w / raw.h - 1) > 0.01) throw new Error(`Non-square repair ${id}`);
    const im = reduce(resizeNearest(raw, 1024, 1024), { w: 128, h: 128 });
    const b = bbox(im);
    const result = iconCanvas(fit(cut(im, b.x, b.y, b.w, b.h), 14, 14), { w: 14, h: 14 });
    acceptance[id] = {
      source: `assets-in/${repair.source}`,
      raw: [raw.w, raw.h],
      normalized: [1024, 1024],
      reduced: [128, 128],
      bbox: b,
      ...validate(result),
      islands: countIslands(result),
      replaces: acceptance[id].source,
    };
    writeImage(resolve(output, manifest.assets[id].file), result);
  }
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(resolve(output, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
  console.log(`Built ${Object.keys(manifest.assets).length} supplemental assets`);
  review();
}

export function review() {
  const manifest = JSON.parse(readFileSync(resolve(output, 'manifest.json')));
  const expected = sources.flatMap((s) => s.cells);
  if (Object.keys(manifest.assets).length !== expected.length)
    throw new Error('Unexpected pack size');
  for (const cell of expected) {
    const record = manifest.assets[cell.id];
    if (!record) throw new Error(`Missing ${cell.id}`);
    const im = readImage(resolve(output, record.file));
    if (im.w !== record.w || im.h !== record.h || im.w > cell.w || im.h > cell.h)
      throw new Error(`Bad dimensions: ${cell.id}`);
    validate(im);
  }
  const preview = resolve(root, 'assets-in/previews/arsenal');
  mkdirSync(preview, { recursive: true });
  for (const [name, cells] of [
    ['icons', expected.filter((c) => c.id.startsWith('weapons/icon/'))],
    ['world', expected.filter((c) => !c.id.startsWith('weapons/icon/'))],
  ]) {
    const args = cells.flatMap((c) => [
      '(',
      resolve(output, `${c.id}.png`),
      '-background',
      '#323c39',
      '-gravity',
      'center',
      '-extent',
      '32x32',
      ')',
    ]);
    execFileSync('magick', [
      'montage',
      ...args,
      '-background',
      '#222034',
      '-tile',
      '8x',
      '-geometry',
      '32x32+2+2',
      resolve(preview, `${name}.png`),
    ]);
    execFileSync('magick', [
      resolve(preview, `${name}.png`),
      '-filter',
      'point',
      '-resize',
      '800%',
      resolve(preview, `${name}-x8.png`),
    ]);
  }
  console.log(`Validated ${expected.length} assets; previews: ${preview}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--review')) review();
  else build();
}
