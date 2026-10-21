import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  reduce,
  splitSheet,
  healSeam,
  seamError,
  validate,
  writeImage,
  ingest,
  specs,
  readImage,
  stripBands,
  resizeNearest,
} from './ingest.mjs';

function solid(w, h, c = 0x37946eff) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.writeUInt32BE(c, i);
  return { w, h, data };
}
test('block mode, magenta removal, native alpha and DB32', () => {
  const im = solid(4, 4);
  im.data.writeUInt32BE(0xff00ffff, 0);
  const reduced = reduce(im, { w: 2, h: 2 });
  assert.equal(reduced.data.readUInt32BE(0), 0x37946eff);
  assert.equal(validate(reduced).colors, 1);
  assert.equal(reduce(solid(2, 2, 0xff00ffff), { w: 1, h: 1 }).data.readUInt32BE(0), 0);
  assert.equal(reduce(solid(2, 2, 0xffffff00), { w: 1, h: 1 }).data.readUInt32BE(0), 0);
  assert.throws(() => reduce(im, { w: 3, h: 3 }), /Incompatible/);
  assert.throws(() => reduce(solid(2, 2, 0xffffff00), { w: 1, h: 1, opaque: true }), /transparent/);
});
test('fixed sheet grid preserves detached details and stable creature frames', () => {
  const sheet = solid(128, 128, 0);
  for (let n = 0; n < 16; n++) {
    const x = (n % 4) * 32 + 5,
      y = Math.floor(n / 4) * 32 + 6;
    sheet.data.writeUInt32BE(0xffffffff, (y * 128 + x) * 4);
    sheet.data.writeUInt32BE(0xffffffff, ((y + 4) * 128 + x) * 4);
  }
  const spec = specs.find((s) => s.folder === 'creatures');
  const entries = splitSheet(sheet, spec);
  assert.equal(entries.length, 16);
  assert.equal(entries[0].id, 'creatures/sheep_0');
  assert.equal(entries[15].id, 'creatures/donkey_fall');
  assert.ok(
    entries.every((e) => e.im.w === 32 && e.im.h === 32 && validate(e.im).transparent === 1022),
  );
  sheet.data.fill(0, 0, sheet.data.length);
  assert.throws(() => splitSheet(sheet, spec), /Empty/);
});
test('seam healing matches both axes and retains binary alpha / DB32', () => {
  const im = solid(64, 64);
  for (let y = 0; y < 64; y++) im.data.writeUInt32BE(0x306082ff, y * 64 * 4);
  assert.ok(seamError(im, 'x') > 0);
  healSeam(im, 'x');
  healSeam(im, 'y');
  assert.equal(seamError(im, 'x'), 0);
  assert.equal(seamError(im, 'y'), 0);
  validate(im);
});
test('PNG round trip and repeated ingestion are deterministic', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'worm-art-test-'));
  try {
    const source = resolve(dir, 'meadow/terrain-fill.png');
    writeImage(source, solid(64, 64));
    assert.equal(readImage(source).w, 64);
    const spec = specs.find((s) => s.source === 'meadow/terrain-fill.png');
    const out = resolve(dir, 'out');
    const first = ingest(spec, dir, out);
    const bytes = readFileSync(resolve(out, first[0].file));
    assert.equal(bytes.includes(Buffer.from('date:create')), false);
    assert.equal(bytes.includes(Buffer.from('date:modify')), false);
    assert.equal(bytes.includes(Buffer.from('date:timestamp')), false);
    assert.deepEqual(ingest(spec, dir, out), first);
    assert.deepEqual(readFileSync(resolve(out, first[0].file)), bytes);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every production input has a prompt palette and mid uses only its four colours', () => {
  assert.equal(specs.length, 27);
  assert.ok(specs.every((s) => s.palette.length > 0));
  const spec = specs.find((s) => s.source === 'meadow/bg-mid.png');
  assert.equal(spec.palette.length, 4);
  const im = reduce(solid(384, 256, 0xff0000ff), spec);
  const c = im.data.readUInt32BE(0) >>> 8;
  assert.ok(spec.palette.includes(c));
});

test('shifted terrain strips retain all three complete bands during normalization', () => {
  const im = solid(96, 64, 0);
  for (const [start, height, color] of [
    [7, 14, 0x6abe30ff],
    [27, 13, 0x222034ff],
    [46, 15, 0x663931ff],
  ]) {
    for (let y = start; y < start + height; y++)
      for (let x = 0; x < 96; x++) im.data.writeUInt32BE(color, (y * 96 + x) * 4);
  }
  const bands = stripBands(im);
  assert.equal(bands.length, 3);
  assert.ok(bands.every((b) => b.w === 96 && b.h === 16));
  assert.equal(bands[0].data.readUInt32BE(0), 0x6abe30ff);
  assert.equal(bands[2].data.readUInt32BE(0), 0x663931ff);
  assert.throws(() => stripBands(solid(96, 64)), /Expected 3/);
  assert.equal(resizeNearest(im, 96, 16).h, 16);
});

test('explicit normalization accepts square noninteger source size and preserves raw input', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'worm-art-normalize-'));
  try {
    const spec = specs.find((s) => s.source === 'meadow/terrain-fill.png');
    const source = resolve(dir, spec.source),
      out = resolve(dir, 'out');
    writeImage(source, solid(65, 65));
    const before = readFileSync(source);
    assert.throws(() => ingest(spec, dir, out), /Incompatible dimensions/);
    const rows = ingest(spec, dir, out, { normalize: true });
    assert.equal(rows[0].w, 64);
    assert.equal(rows[0].h, 64);
    assert.equal(rows[0].normalizations.length, 1);
    assert.deepEqual(readFileSync(source), before);
    writeImage(source, solid(65, 80));
    assert.throws(() => ingest(spec, dir, out, { normalize: true }), /aspect ratio/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
