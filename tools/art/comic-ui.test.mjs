import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, root, bbox, cut } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';
import { validate } from './rgba.mjs';

test('comic UI keeps native colours, smooth alpha and reproducible source pixels', () => {
  const dir = resolve(root, 'apps/client/public/assets/comic-ui');
  const master = resolve(root, 'docs/design/concepts/combat-comic-ui-v1/production');
  const cells = skinCells(readImage(resolve(master, 'brush-master.png')), 2);
  const logo = readImage(resolve(master, 'logo-master.png'));
  const b = bbox(logo);
  const originals = [...cells.map((c) => c.art), cut(logo, b.x, b.y, b.w, b.h)];
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
  assert.equal(Object.keys(manifest.assets).length, 5);
  for (const [index, [id, entry]] of Object.entries(manifest.assets).entries()) {
    const im = readImage(resolve(dir, entry.file));
    const stats = validate(im);
    assert.deepEqual(im.data, originals[index].data, `${id}: untouched native RGBA`);
    assert.deepEqual([im.w, im.h], [entry.pixelW, entry.pixelH]);
    assert.equal(im.w / entry.w, 4);
    assert.equal(im.h / entry.h, 4);
    assert.ok(stats.alphaLevels > 2 && stats.partialAlpha > 0);
    assert.ok(stats.colors > 32);
  }
  assert.ok(cells.every((c) => !c.touchesSourceEdge));
});
