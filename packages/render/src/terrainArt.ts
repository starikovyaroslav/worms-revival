import { Material, type Terrain } from '@wr/sim';
import { assets, type AssetPixels } from './assets';
import { bridgeColor } from './bridgeArt';

export interface TerrainArt {
  painted?: boolean;
  fill: AssetPixels;
  rim: AssetPixels;
  scorch: AssetPixels;
  under: AssetPixels;
  rock?: AssetPixels;
  steel?: AssetPixels;
}

export function terrainArtForTheme(id: string, painted = false): TerrainArt | undefined {
  const prefix = painted ? 'painted/terrain' : 'terrain';
  const fill = assets.pixels(`${prefix}/${id}/fill`);
  const rim = assets.pixels(`${prefix}/${id}/rim`);
  const scorch = assets.pixels(`${prefix}/${id}/scorch`);
  const under = assets.pixels(`${prefix}/${id}/under`);
  return fill && rim && scorch && under
    ? {
        fill,
        rim,
        scorch,
        under,
        ...(painted
          ? {
              painted: true,
              rock: assets.pixels('materials/rock'),
              steel: assets.pixels('materials/steel'),
            }
          : {}),
      }
    : painted
      ? terrainArtForTheme(id)
      : undefined;
}

/** -1 means transparent. Repeat horizontally; the fill may also repeat vertically. */
export function artPixel(image: AssetPixels, x: number, y: number): number {
  const w = image.logicalW ?? image.w,
    h = image.logicalH ?? image.h;
  const col = Math.floor(((((x % w) + w) % w) * image.w) / w);
  const row = Math.floor(((((y % h) + h) % h) * image.h) / h);
  const i = (row * image.w + col) * 4;
  return image.data[i + 3]! < 128
    ? -1
    : (image.data[i]! << 16) | (image.data[i + 1]! << 8) | image.data[i + 2]!;
}

/** Paint art on the current mask; never change collision pixels or hide solid terrain. */
export function terrainArtPixel(
  t: Terrain,
  art: TerrainArt,
  x: number,
  y: number,
  material: Material,
  subX = 0,
  subY = 0,
  sampler: (image: AssetPixels, x: number, y: number) => number = artPixel,
): number | undefined {
  const sample = (im: AssetPixels, yy: number) => sampler(im, x + subX, yy + subY);
  const at = (yy: number): Material =>
    yy < 0 || yy >= t.height ? Material.Air : (t.data[yy * t.width + x] as Material);
  const soil = (m: Material) => m === Material.Soil || m === Material.Scorched;
  if (material === Material.Air) {
    // Four cosmetic pixels above the surface, three below an island/cave ceiling.
    for (let d = 1; d <= 4; d++) {
      const below = at(y + d);
      if (below !== Material.Air) {
        if (soil(below)) return sample(below === Material.Scorched ? art.scorch : art.rim, 4 - d);
        break;
      }
    }
    for (let d = 1; d <= 3; d++) {
      const above = at(y - d);
      if (above !== Material.Air) return soil(above) ? sample(art.under, 11 + d) : -1;
    }
    return -1;
  }
  if (material === Material.Rock && art.rock) return sample(art.rock, y);
  if (material === Material.Girder && art.steel) return sample(art.steel, y);
  if (material === Material.Bridge) {
    const color = bridgeColor(x + subX, y + subY);
    return art.painted ? 0xff000000 + color : color;
  }
  if (!soil(material)) return undefined;
  let top = 13,
    bottom = 13;
  for (let d = 1; d <= 12; d++) {
    const m = at(y - d);
    if (m === Material.Air) {
      top = d;
      break;
    }
    if (!soil(m)) break;
  }
  for (let d = 1; d <= 12; d++) {
    const m = at(y + d);
    if (m === Material.Air) {
      bottom = d;
      break;
    }
    if (!soil(m)) break;
  }
  const fill = sample(art.fill, y);
  if (material === Material.Scorched) {
    const edge = sample(art.scorch, Math.min(15, Math.min(top, bottom) - 1));
    return edge < 0 ? fill : edge;
  }
  if (top <= 12 && top <= bottom) {
    const edge = sample(art.rim, 3 + top);
    return edge < 0 ? fill : edge;
  }
  if (bottom <= 12) {
    const edge = sample(art.under, 12 - bottom);
    return edge < 0 ? fill : edge;
  }
  return fill;
}

/** Painted sampling retains continuous source alpha; negative still means genuinely empty. */
export function terrainArtRGBA(
  t: Terrain,
  art: TerrainArt,
  x: number,
  y: number,
  material: Material,
  subX = 0,
  subY = 0,
): number | undefined {
  const sample = (im: AssetPixels, xx: number, yy: number) => {
    const w = im.logicalW ?? im.w,
      h = im.logicalH ?? im.h;
    const col = Math.floor(((((xx % w) + w) % w) * im.w) / w),
      row = Math.floor(((((yy % h) + h) % h) * im.h) / h);
    const i = (row * im.w + col) * 4,
      a = im.data[i + 3]!;
    return a === 0
      ? -1
      : a * 0x1000000 + (im.data[i]! << 16) + (im.data[i + 1]! << 8) + im.data[i + 2]!;
  };
  const rgba = terrainArtPixel(t, art, x, y, material, subX, subY, sample);
  if (rgba === undefined || rgba < 0 || material === Material.Air || rgba >>> 24 === 255)
    return rgba;
  // A translucent decorative edge must never turn a physically solid pixel into a visual hole.
  const fill = sample(art.fill, x + subX, y + subY),
    alpha = (rgba >>> 24) / 255;
  const channel = (shift: number) =>
    Math.round(((rgba >>> shift) & 255) * alpha + ((fill >>> shift) & 255) * (1 - alpha));
  return 255 * 0x1000000 + (channel(16) << 16) + (channel(8) << 8) + channel(0);
}
