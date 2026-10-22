import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { skinCells } from './skin-cells.mjs';
import { readImage, cut, root } from './ingest.mjs';
import { validate } from './rgba.mjs';
import { SKINS, SKIN_POSES } from '../../packages/render/src/skins.ts';

test('silhouette extraction preserves source RGBA and detached details without a hard grid crop', () => {
  const im = { w: 80, h: 80, data: Buffer.alloc(80 * 80 * 4) };
  for (let i = 0; i < 4; i++) {
    const ox = (i % 2) * 40 + 10,
      oy = Math.floor(i / 2) * 40 + 10;
    for (let y = oy; y < oy + 10; y++)
      for (let x = ox; x < ox + 10; x++) im.data.set([119 + i, 137, 153, 231], (y * 80 + x) * 4);
    im.data.set([113, 127, 149, 17], (oy * 80 + ox - 1) * 4);
    im.data.set([131, 149, 167, 201], ((oy + 4) * 80 + ox + 12) * 4);
  }
  const before = Buffer.from(im.data),
    cells = skinCells(im, 2);
  assert.equal(cells.length, 4);
  assert.deepEqual(im.data, before);
  for (const [i, cell] of cells.entries()) {
    assert.equal(cell.touchesSourceEdge, false);
    const stats = validate(cell.art);
    assert.ok(stats.partialAlpha >= 102);
    assert.ok(stats.alphaLevels > 2);
    const pixels = [];
    for (let p = 0; p < cell.art.data.length; p += 4)
      if (cell.art.data[p + 3]) pixels.push([...cell.art.data.subarray(p, p + 4)]);
    assert.ok(pixels.some((p) => p[0] === 119 + i && p[3] === 231));
    assert.ok(pixels.some((p) => p[3] === 17));
    assert.ok(pixels.some((p) => p[0] === 131 && p[3] === 201));
  }
});
test('empty or incomplete native sheets fail instead of producing placeholder animations', () => {
  assert.throws(() => skinCells({ w: 32, h: 32, data: Buffer.alloc(32 * 32 * 4) }), /sixteen|16/);
});
test('all shipped painted poses have padding, rich RGB/alpha and one shared display footprint', () => {
  const dir = resolve(root, 'apps/client/public/assets/skins');
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  const cache = new Map();
  let count = 0;
  for (const skin of SKINS) {
    if (manifest.unavailable[skin.id]) continue;
    for (const pose of SKIN_POSES) {
      const a = manifest.assets[`skins/${skin.id}/${pose}`];
      assert.ok(a, `${skin.id}/${pose}`);
      assert.deepEqual([a.w, a.h, a.pixelW, a.pixelH], [32, 32, 192, 192]);
      if (!cache.has(a.file)) cache.set(a.file, readImage(resolve(dir, a.file)));
      const frame = cut(cache.get(a.file), a.frame.x, a.frame.y, a.frame.w, a.frame.h),
        stats = validate(frame);
      assert.ok(
        stats.colors > 32 && stats.alphaLevels > 2 && stats.transparent > 0,
        `${skin.id}/${pose}`,
      );
      for (let x = 0; x < frame.w; x++) {
        assert.equal(frame.data[x * 4 + 3], 0);
        assert.equal(frame.data[((frame.h - 1) * frame.w + x) * 4 + 3], 0);
      }
      count++;
    }
  }
  assert.equal(count, 32 * 16);
  assert.equal(cache.size, 32);
  assert.equal(new Set(Object.values(manifest.assets).map((a) => a.file)).size, 34);
});
test('identities and painted walk phases are not duplicate frames or palette-only placeholders', () => {
  const dir = resolve(root, 'apps/client/public/assets/skins');
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  const identities = new Set();
  const hash = (data) => createHash('sha256').update(data).digest('hex');
  for (const skin of SKINS) {
    if (manifest.unavailable[skin.id]) continue;
    const image = readImage(resolve(dir, `${skin.id}.png`));
    const idle = manifest.assets[`skins/${skin.id}/idle`].frame;
    // Alpha silhouettes must differ too, so merely recoloring an existing character cannot pass.
    const silhouette = Buffer.from(
      cut(image, idle.x, idle.y, idle.w, idle.h).data.filter((_, i) => i % 4 === 3),
    );
    assert.ok(!identities.has(hash(silhouette)), `${skin.id}: duplicate idle silhouette`);
    identities.add(hash(silhouette));
    const phases = new Set();
    for (const pose of ['walk_0', 'walk_1', 'walk_2', 'walk_3']) {
      const f = manifest.assets[`skins/${skin.id}/${pose}`].frame;
      phases.add(hash(cut(image, f.x, f.y, f.w, f.h).data));
    }
    assert.equal(phases.size, 4, `${skin.id}: four distinct painted walk phases`);
  }
  assert.equal(identities.size, 32);
});
