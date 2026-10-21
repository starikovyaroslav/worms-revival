import { afterEach, describe, expect, it, vi } from 'vitest';
import { Assets, BufferImageSource, Texture } from 'pixi.js';
import { assets, type AssetEntry } from '../src/assets';
import { artSprite } from '../src/views/common';
import { ClipEffects } from '../src/clipEffects';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function load(entries: Record<string, AssetEntry>) {
  const textures = Object.fromEntries(
    Object.values(entries).map((a) => [
      a.file,
      new Texture({
        source: new BufferImageSource({
          resource: new Uint8Array((a.pixelW ?? a.w) * (a.pixelH ?? a.h) * 4),
          width: a.pixelW ?? a.w,
          height: a.pixelH ?? a.h,
        }),
      }),
    ]),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 2, assets: entries }) }),
  );
  vi.spyOn(Assets, 'load').mockImplementation(
    (async (url: unknown) => textures[String(url).split('/').at(-1)!]!) as typeof Assets.load,
  );
  await assets.load('test');
  return textures;
}

describe('texture density is not game-world size', () => {
  it('keeps legacy and 3x/4x sprites at the same world footprint', async () => {
    const entries = Object.fromEntries(
      [1, 3, 4].map((d) => [
        `density/${d}`,
        { file: `${d}.png`, w: 24, h: 12, pixelW: 24 * d, pixelH: 12 * d },
      ]),
    );
    await load(entries);
    for (const density of [1, 3, 4]) {
      const sprite = artSprite(`density/${density}`)!;
      expect([sprite.width, sprite.height]).toEqual([24, 12]);
      expect(sprite.texture.width).toBe(24 * density);
      sprite.destroy();
    }
  });

  it('uses display units for clips and explicit widths across animation frames', async () => {
    await load(
      Object.fromEntries(
        [0, 1, 2, 3].map((i) => [
          `vfx/blast_${i}`,
          { file: `blast${i}.png`, w: 64, h: 64, pixelW: 256, pixelH: 256 },
        ]),
      ),
    );
    const clips = new ClipEffects();
    expect(clips.play('blast', 0, 0)).toBe(true);
    expect(clips.container.children[0]!.width).toBe(64);
    clips.update(100);
    expect(clips.container.children[0]!.width).toBe(64);
    clips.play('blast', 0, 0, { width: 100 });
    expect(clips.container.children[1]!.width).toBe(100);
    clips.destroy();
    expect(assets.get('vfx/blast_0')!.destroyed).toBe(false);
  });
});
