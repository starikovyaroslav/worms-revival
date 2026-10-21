import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeSequence, nativeCell, output } from './vfx.mjs';
import { BASE_VFX_CLIPS as VFX_CLIPS, VFX_DENSITY } from '../../packages/render/src/vfxCatalog.ts';
import { readImage, validate } from './ingest.mjs';

test('fixed canvases preserve growth stages and bottom anchors', () => {
  const frame = (size) => {
    const im = { w: 64, h: 64, data: Buffer.alloc(64 * 64 * 4) };
    for (let y = 32 - size; y < 32 + size; y++)
      for (let x = 32 - size; x < 32 + size; x++)
        im.data.writeUInt32BE(0xfbf236ff, (y * 64 + x) * 4);
    return im;
  };
  const frames = normalizeSequence([frame(4), frame(8)], { w: 64, h: 64, anchor: [0.5, 1] });
  assert.equal(frames[0].scale, frames[1].scale);
  const occupied = frames.map((f) =>
    f.im.data.reduce((sum, v, i) => sum + (i % 4 === 3 && v === 255 ? 1 : 0), 0),
  );
  assert.ok(occupied[1] > occupied[0] * 3);
  assert.equal(frames[0].im.h, frames[1].im.h);
  assert.throws(
    () =>
      normalizeSequence([{ w: 64, h: 64, data: Buffer.alloc(64 * 64 * 4, 255) }], VFX_CLIPS.blast),
    /boundary/,
  );
});

test('all 64 frames have binary DB32 pixels and the promised fixed dimensions', () => {
  const m = JSON.parse(readFileSync(resolve(output, 'manifest.json')));
  assert.equal(Object.keys(m.assets).length, 64);
  for (const [prefix, clip] of Object.entries(VFX_CLIPS)) {
    const signatures = new Set();
    for (let i = 0; i < clip.frames; i++) {
      const id = `vfx/${prefix}_${i}`,
        a = m.assets[id];
      assert.ok(a, id);
      const im = readImage(resolve(output, a.file));
      assert.deepEqual([a.w, a.h], [clip.w, clip.h]);
      assert.deepEqual([im.w, im.h], [clip.w * VFX_DENSITY, clip.h * VFX_DENSITY]);
      assert.deepEqual([a.pixelW, a.pixelH], [im.w, im.h]);
      validate(im);
      signatures.add(im.data.toString('base64'));
    }
    assert.ok(signatures.size > 1, `${prefix}: animation must change`);
  }
});

test('native cropping preserves isolated source details instead of a low-resolution majority vote', () => {
  const source = { w: 512, h: 512, data: Buffer.alloc(512 * 512 * 4) };
  source.data.writeUInt32BE(0xfbf236ff, (101 * 512 + 111) * 4);
  const cell = nativeCell(source, 0, 0, 128, 128);
  assert.deepEqual(cell.crop, [0, 0, 256, 256]);
  assert.equal(cell.im.data.readUInt32BE((101 * 256 + 111) * 4), 0xfbf236ff);
});
