import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, root } from './ingest.mjs';
import { validate } from './rgba.mjs';

const dir = resolve(root, 'apps/client/public/assets/painted-meadow');
const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
test('painted exports preserve colour depth and continuous source alpha', () => {
  assert.equal(manifest.style, 'painted');
  assert.equal(Object.keys(manifest.assets).length, 26);
  for (const [id, entry] of Object.entries(manifest.assets)) {
    const im = readImage(resolve(dir, entry.file)),
      stats = validate(im);
    assert.equal(entry.sampling, 'linear');
    assert.deepEqual([im.w, im.h], [entry.pixelW, entry.pixelH]);
    assert.ok(stats.colors > 256, `${id}: not a 32/256-colour quantized palette`);
    if (!id.endsWith('/sky') && !id.endsWith('/fill')) {
      assert.ok(stats.alphaLevels > 2, `${id}: soft alpha retained`);
      assert.ok(stats.partialAlpha > 0, `${id}: antialiased edges retained`);
    }
  }
});
test('repeating layers have matching RGBA seams; flipbooks have transparent canvas borders', () => {
  for (const [id, entry] of Object.entries(manifest.assets)) {
    const im = readImage(resolve(dir, entry.file));
    if (id.includes('/vfx/')) {
      for (let x = 0; x < im.w; x++)
        for (const y of [0, im.h - 1]) assert.equal(im.data[(y * im.w + x) * 4 + 3], 0, id);
      for (let y = 0; y < im.h; y++)
        for (const x of [0, im.w - 1]) assert.equal(im.data[(y * im.w + x) * 4 + 3], 0, id);
    } else {
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
