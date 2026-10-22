import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, root } from './ingest.mjs';
import { skinCells } from './skin-cells.mjs';
import { validate } from './rgba.mjs';

const dir = resolve(root, 'apps/client/public/assets/painted-hud');
const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
test('HUD housings retain native RGBA pixels and are reproducible from the master', () => {
  const cells = skinCells(
    readImage(resolve(root, 'docs/design/concepts/painted-hud-v1/hud-master.png')),
    2,
  );
  const entries = Object.entries(manifest.assets);
  assert.equal(entries.length, 4);
  for (const [index, [id, entry]] of entries.entries()) {
    const im = readImage(resolve(dir, entry.file));
    const stats = validate(im);
    assert.deepEqual([im.w, im.h], [entry.pixelW, entry.pixelH], id);
    assert.deepEqual(im.data, cells[index].art.data, `${id}: original colours and alpha unchanged`);
    assert.equal(cells[index].touchesSourceEdge, false, id);
    assert.equal(im.w / entry.w, 4, id);
    assert.equal(im.h / entry.h, 4, id);
    assert.equal(entry.sampling, 'linear');
    assert.ok(stats.colors > 256, id);
    assert.ok(stats.alphaLevels > 2 && stats.partialAlpha > 0, id);
  }
});
