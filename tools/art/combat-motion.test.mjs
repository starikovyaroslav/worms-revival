import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { root, readImage, cut } from './ingest.mjs';
import { resolve } from 'node:path';
import { skinCells } from './skin-cells.mjs';

test('reaction export preserves all sixteen distinct original RGBA drawings at native size', () => {
  const cells = skinCells(
    readImage(resolve(root, 'docs/design/concepts/combat-motion-v1/brutal-reactions.png')),
  );
  const atlas = readImage(resolve(root, 'apps/client/public/assets/reactions/brutal.png'));
  const hashes = new Set();
  for (const [i, { art, touchesSourceEdge }] of cells.entries()) {
    assert.equal(touchesSourceEdge, false);
    const x = (i % 4) * 384 + Math.round((384 - art.w) / 2);
    const y = Math.floor(i / 4) * 384 + Math.round((384 * 29) / 32 - art.h);
    assert.deepEqual(cut(atlas, x, y, art.w, art.h).data, art.data);
    hashes.add(createHash('sha256').update(art.data).digest('hex'));
  }
  assert.equal(hashes.size, 16);
});

test('all new reaction and anatomical parts have native-density manifest entries', () => {
  const dir = resolve(root, 'apps/client/public/assets/reactions');
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  assert.equal(Object.keys(manifest.assets).length, 68);
  for (const entry of Object.values(manifest.assets)) {
    const im = readImage(resolve(dir, entry.file));
    assert.ok(Math.min(entry.pixelW / entry.w, entry.pixelH / entry.h) >= 8);
    if (!entry.frame) assert.deepEqual([entry.pixelW, entry.pixelH], [im.w, im.h]);
    assert.ok(im.data.some((v, i) => i % 4 === 3 && v > 0 && v < 255));
  }
});
