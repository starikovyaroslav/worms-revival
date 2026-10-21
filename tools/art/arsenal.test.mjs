import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sources, split, output } from './arsenal.mjs';
import { validate, readImage } from './ingest.mjs';
import { validate as validateRgba } from './rgba.mjs';

const empty = () => ({ w: 128, h: 128, data: Buffer.alloc(128 * 128 * 4) });
const set = (im, x, y) => im.data.writeUInt32BE(0x5fcde4ff, (y * im.w + x) * 4);

test('reviewed sheet boundaries retain complete silhouettes and center 14px icons', () => {
  const source = sources[0],
    im = empty();
  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 4),
      col = i % 4;
    const x = source.grid.columns[row][col] + 4,
      y = source.grid.rows[row] + 4;
    for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 6; dx++) set(im, x + dx, y + dy);
  }
  const entries = split(im, source);
  assert.equal(entries.length, 16);
  for (const { im } of entries) {
    assert.equal(im.w, 14);
    assert.equal(im.h, 14);
    assert.ok(validate(im).transparent > 0);
  }
  const first = entries[0].im;
  assert.equal(first.data[(3 * first.w + 1) * 4 + 3], 255);
});

test('rejects empty cells, clipped art and malformed grids instead of silently shipping them', () => {
  assert.throws(() => split(empty(), sources[0]), /Empty/);
  const clipped = empty();
  set(clipped, 0, 4);
  assert.throws(() => split(clipped, sources[0]), /crop cuts/);
  assert.throws(() => split(empty(), { ...sources[0], cells: [] }), /16 cells/);
  assert.throws(
    () => split(empty(), { ...sources[0], grid: { rows: [0, 128], columns: [] } }),
    /grid/,
  );
});

test('all exported files exist and retain nonempty RGBA art', () => {
  const manifest = JSON.parse(readFileSync(resolve(output, 'manifest.json')));
  const expected = sources.flatMap((s) => s.cells.map((c) => c.id));
  assert.equal(new Set(expected).size, 48);
  assert.deepEqual(Object.keys(manifest.assets).sort(), expected.sort());
  for (const [id, record] of Object.entries(manifest.assets)) {
    const file = resolve(output, record.file);
    assert.ok(existsSync(file), id);
    const im = readImage(file);
    assert.deepEqual([im.w, im.h], [record.pixelW ?? record.w, record.pixelH ?? record.h], id);
    const stats = validateRgba(im);
    assert.ok(stats.transparent > 0 && stats.transparent < im.w * im.h, id);
  }
});
