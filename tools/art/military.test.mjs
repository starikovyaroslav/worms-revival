import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { output } from './military.mjs';
import { readImage, validate } from './ingest.mjs';
import { MILITARY_CLIPS } from '../../packages/render/src/vfxCatalog.ts';

test('all military frames are complete, animated, transparent DB32 sprites on fixed canvases', () => {
  const manifest = JSON.parse(readFileSync(resolve(output, 'manifest.json')));
  assert.equal(Object.keys(manifest.assets).length, 16);
  for (const [name, clip] of Object.entries(MILITARY_CLIPS)) {
    const unique = new Set();
    for (let i = 0; i < clip.frames; i++) {
      const asset = manifest.assets[`vfx/${name}_${i}`];
      const im = readImage(resolve(output, asset.file));
      assert.deepEqual([im.w, im.h], [clip.w, clip.h]);
      validate(im);
      assert.ok(im.data.some((value, index) => index % 4 === 3 && value === 0));
      unique.add(im.data.toString('base64'));
    }
    assert.ok(unique.size > 1, name);
  }
});
