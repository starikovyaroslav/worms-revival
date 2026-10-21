import { describe, expect, it } from 'vitest';
import { Material, Terrain } from '@wr/sim';
import { artPixel, terrainArtPixel, type TerrainArt } from '../src/terrainArt';
import type { AssetPixels } from '../src/assets';

function image(color: number, opaque = true): AssetPixels {
  const data = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color >>> 16;
    data[i + 1] = (color >>> 8) & 255;
    data[i + 2] = color & 255;
    data[i + 3] = opaque ? 255 : 0;
  }
  return { w: 16, h: 16, data };
}

const art: TerrainArt = {
  fill: image(0x8f563b),
  rim: image(0x6abe30),
  scorch: image(0x222034),
  under: image(0x663931),
};

function island(): Terrain {
  const t = new Terrain(64, 64);
  for (let y = 10; y < 55; y++) for (let x = 0; x < 64; x++) t.set(x, y, Material.Soil);
  return t;
}

describe('generated art on destructible terrain', () => {
  it('tiles at world coordinates and exposes transparent texels', () => {
    const texture = image(0x37946e);
    texture.data[0] = 0xff;
    expect(artPixel(texture, 0, 0)).toBe(artPixel(texture, 16, 16));
    expect(artPixel(texture, -16, -16)).toBe(artPixel(texture, 0, 0));
    expect(artPixel(image(0x000000, false), 3, 4)).toBe(-1);
  });

  it('uses grass on the top, soil inside, underside below, and does not change collisions', () => {
    const t = island(),
      before = t.data.slice();
    expect(terrainArtPixel(t, art, 30, 10, Material.Soil)).toBe(0x6abe30);
    expect(terrainArtPixel(t, art, 30, 32, Material.Soil)).toBe(0x8f563b);
    expect(terrainArtPixel(t, art, 30, 54, Material.Soil)).toBe(0x663931);
    expect(terrainArtPixel(t, art, 30, 9, Material.Air)).toBe(0x6abe30);
    expect(terrainArtPixel(t, art, 30, 58, Material.Air)).toBe(-1);
    expect(t.data).toEqual(before);
  });

  it('keeps solid soil visible through holes in the decorative edge', () => {
    const t = island();
    const transparent = { ...art, rim: image(0, false), under: image(0, false) };
    expect(terrainArtPixel(t, transparent, 30, 10, Material.Soil)).toBe(0x8f563b);
    expect(terrainArtPixel(t, transparent, 30, 54, Material.Soil)).toBe(0x8f563b);
  });

  it('responds to craters and scorch without painting over their air or steel', () => {
    const t = island();
    t.carveCircle(30, 30, 10, true);
    expect(terrainArtPixel(t, art, 30, 30, Material.Air)).toBe(-1);
    const burnt = t.data.findIndex((m) => m === Material.Scorched);
    expect(burnt).toBeGreaterThan(0);
    expect(
      terrainArtPixel(t, art, burnt % t.width, Math.floor(burnt / t.width), Material.Scorched),
    ).toBe(0x222034);
    expect(terrainArtPixel(t, art, 30, 30, Material.Rock)).toBeUndefined();
    expect(terrainArtPixel(t, art, 30, 30, Material.Girder)).toBeUndefined();
  });
});
