import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage } from './ingest.mjs';
import { validate } from './rgba.mjs';
import { paintedGrid } from './painted-grid.mjs';

const base = resolve(root, 'apps/client/public/assets');
test('all painted biome materials have native density and exact repeat seams', () => {
  for (const theme of ['desert', 'arctic', 'hell']) {
    const dir = resolve(base, `painted-${theme}`),
      m = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
    assert.equal(Object.keys(m.assets).length, 10);
    for (const [id, a] of Object.entries(m.assets)) {
      const im = readImage(resolve(dir, a.file));
      assert.ok(Math.min(im.w / a.w, im.h / a.h) >= 4, id);
      assert.equal(a.sampling, 'linear');
      for (let y = 0; y < im.h; y++)
        assert.deepEqual(
          im.data.subarray(y * im.w * 4, y * im.w * 4 + 4),
          im.data.subarray((y * im.w + im.w - 1) * 4, (y * im.w + im.w) * 4),
          id,
        );
      if (id.endsWith('/fill'))
        assert.deepEqual(
          im.data.subarray(0, im.w * 4),
          im.data.subarray((im.h - 1) * im.w * 4),
          id,
        );
    }
  }
});
test('shared painted PNGs are registered and preserve colour depth and soft alpha', () => {
  const dir = resolve(base, 'painted-common'),
    m = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  const seen = new Set();
  for (const [id, a] of Object.entries(m.assets)) {
    assert.ok(id.startsWith('painted/common/'));
    assert.equal(a.sampling, 'linear');
    const path = resolve(dir, a.file),
      im = readImage(path);
    assert.deepEqual([im.w, im.h], [a.pixelW, a.pixelH], id);
    assert.ok(Math.min(im.w / a.w, im.h / a.h) >= 4, id);
    if (seen.has(path)) continue;
    seen.add(path);
    const stats = validate(im);
    assert.ok(stats.colors > 256, id);
    if (!id.includes('/materials/') && !id.includes('/terrain/') && !id.endsWith('/sky'))
      assert.ok(stats.alphaLevels > 2, id);
  }
  assert.equal(JSON.parse(readFileSync(resolve(dir, 'generation.json'))).partial, false);
});
test('inventory gutter extraction retains multi-part symbols without counting components as icons', () => {
  const w = 64,
    h = 64,
    data = Buffer.alloc(w * h * 4);
  for (let cell = 0; cell < 4; cell++)
    for (const dx of [0, 8])
      for (let y = 6; y < 20; y++)
        for (let x = 6; x < 10; x++) {
          const i = ((Math.floor(cell / 2) * 32 + y) * w + (cell % 2) * 32 + x + dx) * 4;
          data[i] = 120;
          data[i + 3] = 210;
        }
  const cells = paintedGrid({ w, h, data }, 2);
  assert.equal(cells.length, 4);
  for (const cell of cells) {
    assert.equal(cell.touchesSourceEdge, false);
    assert.ok(cell.art.data.includes(210));
  }
});
