import { afterEach, describe, expect, it, vi } from 'vitest';
import { Assets, BufferImageSource, Texture } from 'pixi.js';
import { assets, type AssetEntry } from '../src/assets';
import { artSprite, scaleArt } from '../src/views/common';
import { ClipEffects, clipTextures } from '../src/clipEffects';
import { paintedMeadowTheme, PAINTED_MEADOW_REQUIRED } from '../src/painted';
import { themeById } from '../src/theme';

afterEach(() => {
  assets.setVariant(null);
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
  it('canonicalizes cross-pack paths before the GPU cache lookup', async () => {
    const atlas = new Texture({
      source: new BufferImageSource({ resource: new Uint8Array(4 * 4 * 4), width: 4, height: 4 }),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 2,
          assets: {
            'cache/one': { file: '../shared.png', w: 4, h: 4 },
            'cache/two': { file: '../other/../shared.png', w: 4, h: 4 },
          },
        }),
      }),
    );
    const loader = vi
      .spyOn(Assets, 'load')
      .mockImplementation((async () => atlas) as typeof Assets.load);
    await assets.load('painted-pack');
    expect(loader.mock.calls.map((args) => args[0])).toEqual([
      'http://assets.invalid/shared.png',
      'http://assets.invalid/shared.png',
    ]);
    expect(assets.get('cache/one')!.source).toBe(assets.get('cache/two')!.source);
  });
  it('keeps each alias footprint independent while sharing the GPU source', async () => {
    await load({
      'alias/small': { file: 'shared-alias.png', w: 16, h: 16, pixelW: 128, pixelH: 128 },
      'alias/large': { file: 'shared-alias.png', w: 32, h: 32, pixelW: 128, pixelH: 128 },
    });
    const small = assets.get('alias/small')!,
      large = assets.get('alias/large')!;
    expect(small).not.toBe(large);
    expect(small.source).toBe(large.source);
    expect(artSprite('alias/small')!.width).toBe(16);
    expect(artSprite('alias/large')!.width).toBe(32);
  });
  it('switches reversible overlays for textures, URLs and numbered frames without destroying originals', async () => {
    await load({
      'overlay/base_0': { file: 'base-zero.png', w: 12, h: 8, pixelW: 48, pixelH: 32 },
      'painted/common/overlay/base_0': {
        file: 'painted-zero.png',
        w: 12,
        h: 8,
        pixelW: 144,
        pixelH: 96,
        sampling: 'linear',
      },
      'painted/common/overlay/base_1': {
        file: 'painted-one.png',
        w: 12,
        h: 8,
        pixelW: 144,
        pixelH: 96,
        sampling: 'linear',
      },
    });
    const legacy = assets.get('overlay/base_0')!;
    expect(assets.count('overlay/base_')).toBe(1);
    assets.setVariant('painted/common/');
    expect(assets.get('overlay/base_0')).not.toBe(legacy);
    expect(assets.url('overlay/base_0')).toContain('painted-zero.png');
    expect(assets.count('overlay/base_')).toBe(2);
    expect(assets.sizeOf(assets.get('overlay/base_0')!)).toEqual({ w: 12, h: 8 });
    assets.setVariant(null);
    expect(assets.get('overlay/base_0')).toBe(legacy);
    expect(legacy.destroyed).toBe(false);
    expect(assets.url('overlay/base_0')).toContain('base-zero.png');
  });
  it('opts in only a complete meadow pack without mutating cached themes', () => {
    const meadow = themeById('meadow');
    const spy = vi.spyOn(assets, 'has').mockReturnValue(true);
    const next = paintedMeadowTheme(meadow, true);
    expect(next.artStyle).toBe('painted');
    expect(meadow.artStyle).toBeUndefined();
    expect(paintedMeadowTheme(meadow, false)).toBe(meadow);
    const desert = themeById('desert');
    expect(paintedMeadowTheme(desert, true)).toBe(desert);
    for (const missing of PAINTED_MEADOW_REQUIRED) {
      spy.mockImplementation((id) => id !== missing);
      expect(paintedMeadowTheme(meadow, true)).toBe(meadow);
    }
  });
  it('honours smooth sampling without changing footprint or unrelated legacy sprites', async () => {
    await load({
      'sampling/painted': {
        file: 'painted.png',
        w: 32,
        h: 32,
        pixelW: 128,
        pixelH: 128,
        sampling: 'linear',
      },
      'sampling/legacy': { file: 'legacy.png', w: 32, h: 32, pixelW: 128, pixelH: 128 },
    });
    expect(assets.get('sampling/painted')!.source.scaleMode).toBe('linear');
    expect(assets.get('sampling/legacy')!.source.scaleMode).toBe('nearest');
    assets.setSampling('sampling/painted', 'nearest');
    expect(assets.get('sampling/painted')!.source.scaleMode).toBe('nearest');
    expect(assets.sizeOf(assets.get('sampling/painted')!)).toEqual({ w: 32, h: 32 });
  });
  it('falls back to a complete legacy clip, never a mixture of painted and legacy frames', async () => {
    await load(
      Object.fromEntries(
        [0, 1, 2, 3].map((i) => [
          `vfx/blast_${i}`,
          { file: `legacy-blast-${i}.png`, w: 64, h: 64 },
        ]),
      ),
    );
    await load({ 'painted/vfx/blast_0': { file: 'painted-blast.png', w: 64, h: 64 } });
    expect(clipTextures('blast', 'painted/vfx')).toEqual(clipTextures('blast'));
  });
  it('extracts independent native atlas frames sharing one GPU source', async () => {
    const atlas = new Texture({
      source: new BufferImageSource({
        resource: new Uint8Array(8 * 4 * 4),
        width: 8,
        height: 4,
      }),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 2,
          assets: {
            'atlas/one': {
              file: 'shared.png',
              w: 24,
              h: 24,
              pixelW: 4,
              pixelH: 4,
              frame: { x: 0, y: 0, w: 4, h: 4 },
            },
            'atlas/two': {
              file: 'shared.png',
              w: 24,
              h: 24,
              pixelW: 4,
              pixelH: 4,
              frame: { x: 4, y: 0, w: 4, h: 4 },
            },
            'atlas/bad': { file: 'shared.png', w: 24, h: 24, frame: { x: 7, y: 0, w: 4, h: 4 } },
          },
        }),
      }),
    );
    vi.spyOn(Assets, 'load').mockImplementation((async () => atlas) as typeof Assets.load);
    await assets.load('test-atlas');
    const first = assets.get('atlas/one')!,
      second = assets.get('atlas/two')!;
    expect(first).not.toBe(second);
    expect(first.source).toBe(second.source);
    expect(first.width).toBe(4);
    expect(second.frame.x).toBe(4);
    expect(artSprite('atlas/two')!.width).toBe(24);
    expect(assets.has('atlas/bad')).toBe(false);
    expect(atlas.destroyed).toBe(false);
  });
  it('preserves facing, frame footprint and matching tint layers after texture swaps', async () => {
    await load({
      'density/pose': { file: 'pose.png', w: 32, h: 32, pixelW: 128, pixelH: 128 },
      'density/pose_band': { file: 'band.png', w: 32, h: 32, pixelW: 128, pixelH: 128 },
      'density/other': { file: 'other.png', w: 24, h: 24, pixelW: 144, pixelH: 144 },
    });
    const sprite = artSprite('density/pose')!;
    expect(assets.companion(sprite.texture, '_band')).toBe(assets.get('density/pose_band'));
    scaleArt(sprite, -1);
    expect(sprite.scale.x).toBe(-0.25);
    expect(sprite.width).toBe(32);
    sprite.texture = assets.get('density/other')!;
    scaleArt(sprite, -1);
    expect([sprite.width, sprite.height]).toEqual([24, 24]);
    expect(sprite.scale.x).toBe(-1 / 6);
    expect(assets.companion(sprite.texture, '_band')).toBeUndefined();
    sprite.destroy();
  });
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
