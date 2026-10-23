import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage } from './ingest.mjs';
import { validate } from './rgba.mjs';
import { glyphContours } from './glyph-contours.mjs';

test('all cosmetic classes have native staged preview illustrations with smooth alpha', () => {
  const dir = resolve(root, 'apps/client/public/assets/team-previews');
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  assert.equal(Object.keys(manifest.assets).length, 10);
  for (const entry of Object.values(manifest.assets)) {
    const im = readImage(resolve(dir, entry.file)),
      stats = validate(im);
    assert.deepEqual([im.w, im.h], [entry.pixelW, entry.pixelH]);
    assert.ok(im.w >= 1500 && im.h >= 500);
    assert.ok(stats.colors > 256 && stats.alphaLevels > 2 && stats.partialAlpha > 0);
    assert.equal(im.w / entry.w, 4);
    assert.equal(im.h / entry.h, 4);
    for (let x = 0; x < im.w; x++)
      for (const y of [0, im.h - 1]) assert.equal(im.data[(y * im.w + x) * 4 + 3], 0);
  }
});

test('original TrueType font covers Cyrillic, Latin, digits, punctuation and unicase mapping', () => {
  const font = readFileSync(resolve(root, 'apps/client/public/fonts/revival-brush-bold.ttf'));
  const count = font.readUInt16BE(4),
    tables = {};
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    tables[font.toString('ascii', at, at + 4)] = font.readUInt32BE(at + 8);
  }
  assert.equal(font.readUInt16BE(tables.head + 18), 1000);
  const cmap = tables.cmap,
    records = font.readUInt16BE(cmap + 2);
  let table;
  for (let i = 0; i < records; i++) {
    const at = cmap + 4 + i * 8,
      offset = cmap + font.readUInt32BE(at + 4);
    if (font.readUInt16BE(offset) === 4) table = offset;
  }
  assert.ok(table);
  const n = font.readUInt16BE(table + 6) / 2;
  const glyph = (code) => {
    for (let i = 0; i < n; i++) {
      const end = font.readUInt16BE(table + 14 + 2 * i),
        start = font.readUInt16BE(table + 16 + 2 * n + 2 * i);
      if (code < start || code > end) continue;
      const delta = font.readInt16BE(table + 16 + 4 * n + 2 * i),
        rangeAt = table + 16 + 6 * n + 2 * i;
      const range = font.readUInt16BE(rangeAt);
      if (!range) return (code + delta) & 65535;
      const id = font.readUInt16BE(rangeAt + range + 2 * (code - start));
      return id ? (id + delta) & 65535 : 0;
    }
    return 0;
  };
  for (const char of 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?+-/()[]') {
    assert.ok(glyph(char.codePointAt(0)), char);
    if (char.toLowerCase() !== char)
      assert.equal(glyph(char.toLowerCase().codePointAt(0)), glyph(char.codePointAt(0)), char);
  }
  const web = readFileSync(resolve(root, 'apps/client/public/fonts/revival-brush-bold.woff2'));
  assert.equal(web.toString('ascii', 0, 4), 'wOF2');
  assert.ok(web.length < font.length);
});

test('glyph tracing retains counters as separate opposite-winding contours', () => {
  const im = { w: 12, h: 12, data: Buffer.alloc(12 * 12 * 4) };
  for (let y = 1; y < 11; y++)
    for (let x = 1; x < 11; x++)
      if (!(x >= 4 && x < 8 && y >= 4 && y < 8)) im.data[(y * 12 + x) * 4 + 3] = 255;
  const contours = glyphContours(im);
  assert.equal(contours.length, 2);
  const area = (points) =>
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0);
  assert.ok(area(contours[0]) * area(contours[1]) < 0);
});
