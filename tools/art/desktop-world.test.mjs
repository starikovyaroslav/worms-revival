import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audit } from './density-audit.mjs';
import { canvas, empty, blit } from './desktop-world.mjs';
import { rotate } from './legacy-hd.mjs';
import { readImage, writeImage, root } from './ingest.mjs';
import { validate, healSeam } from './rgba.mjs';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('every PNG in every public pack passes desktop density, including fallback/unused paths', () => {
  const result = audit();
  assert.ok(result.totalPng >= 698);
  assert.equal(result.registeredPng, result.totalPng);
  assert.deepEqual(result.problems, []);
});

test('each production pack retains rich source color and continuous transparency', () => {
  for (const path of [
    'worm/idle_0',
    'generated/creatures/sheep_0',
    'arsenal/weapons/icon/laser',
    'vfx/vfx/blast_0',
    'military/vfx/attack_0',
  ]) {
    const stats = validate(readImage(resolve(root, 'apps/client/public/assets', `${path}.png`)));
    assert.ok(stats.colors > 32, `${path}: color quantization regression`);
    // Original creature masters used an opaque magenta key: no partial alpha exists to preserve.
    if (!path.startsWith('generated/'))
      assert.ok(stats.alphaLevels > 2, `${path}: binary alpha regression`);
  }
});

test('every exported sprite contains visible art (team masks may legitimately be empty)', () => {
  for (const pack of ['', 'generated', 'arsenal', 'vfx', 'military']) {
    const dir = resolve(root, 'apps/client/public/assets', pack);
    const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json')));
    for (const [id, a] of Object.entries(manifest.assets)) {
      const stats = validate(readImage(resolve(dir, a.file)));
      if (!id.endsWith('_band'))
        assert.ok(stats.transparent < a.pixelW * a.pixelH, `${pack}/${id}: empty art`);
    }
  }
});

test('PNG roundtrip and compositing preserve arbitrary RGBA, including faint edges', () => {
  const im = empty(2, 1);
  im.data.set([113, 127, 149, 17, 23, 47, 89, 201]);
  const dir = mkdtempSync(resolve(tmpdir(), 'worms-rgba-'));
  try {
    const path = resolve(dir, 'roundtrip.png');
    writeImage(path, im);
    assert.deepEqual(readImage(path).data, im.data);
    assert.deepEqual(blit(empty(2, 1), im, 0, 0).data, im.data);
  } finally {
    rmSync(dir, { recursive: true });
  }
  const bottom = empty(1, 1),
    top = empty(1, 1);
  bottom.data.set([255, 0, 0, 128]);
  top.data.set([0, 0, 255, 128]);
  assert.deepEqual([...blit(bottom, top, 0, 0).data], [85, 0, 170, 192]);
});

test('seam repair blends full color and alpha without snapping; thin sprites remain visible', () => {
  const im = empty(8, 1);
  im.data.set([113, 127, 149, 17], 0);
  im.data.set([23, 47, 89, 201], 28);
  healSeam(im, 'x');
  assert.deepEqual(im.data.subarray(0, 4), im.data.subarray(28, 32));
  assert.ok(im.data[3] > 17 && im.data[3] < 201);
  const bullet = canvas(
    { w: 2, h: 1, data: Buffer.from([255, 0, 0, 255, 255, 0, 0, 255]) },
    64,
    8,
    8,
  );
  assert.ok(validate(bullet).transparent < 64 * 8);
});
test('mechanical animation derivations keep the new detailed master and transparent padding', () => {
  const im = empty(8, 8);
  im.data.writeUInt32BE(0xffffffff, (2 * 8 + 5) * 4);
  const turned = rotate(im, Math.PI / 2);
  assert.equal(turned.data.filter((v, i) => i % 4 === 3 && v === 255).length, 1);
  const composed = canvas(turned, 128, 128, 8);
  assert.equal(composed.w, 128);
  assert.equal(composed.h, 128);
  assert.equal(blit(empty(16, 16), im, -4, -4).w, 16);
});
