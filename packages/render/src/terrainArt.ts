import { Material, type Terrain } from '@wr/sim';
import { assets, type AssetPixels } from './assets';

export interface TerrainArt {
  fill: AssetPixels;
  rim: AssetPixels;
  scorch: AssetPixels;
  under: AssetPixels;
}

export function terrainArtForTheme(id: string): TerrainArt | undefined {
  const fill = assets.pixels(`terrain/${id}/fill`);
  const rim = assets.pixels(`terrain/${id}/rim`);
  const scorch = assets.pixels(`terrain/${id}/scorch`);
  const under = assets.pixels(`terrain/${id}/under`);
  return fill && rim && scorch && under ? { fill, rim, scorch, under } : undefined;
}

/** -1 means transparent. Repeat horizontally; the fill may also repeat vertically. */
export function artPixel(image: AssetPixels, x: number, y: number): number {
  const col = ((x % image.w) + image.w) % image.w;
  const row = ((y % image.h) + image.h) % image.h;
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
): number | undefined {
  const at = (yy: number): Material =>
    yy < 0 || yy >= t.height ? Material.Air : (t.data[yy * t.width + x] as Material);
  const soil = (m: Material) => m === Material.Soil || m === Material.Scorched;
  if (material === Material.Air) {
    // Four cosmetic pixels above the surface, three below an island/cave ceiling.
    for (let d = 1; d <= 4; d++) {
      const below = at(y + d);
      if (below !== Material.Air) {
        if (soil(below))
          return artPixel(below === Material.Scorched ? art.scorch : art.rim, x, 4 - d);
        break;
      }
    }
    for (let d = 1; d <= 3; d++) {
      const above = at(y - d);
      if (above !== Material.Air) return soil(above) ? artPixel(art.under, x, 11 + d) : -1;
    }
    return -1;
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
  const fill = artPixel(art.fill, x, y);
  if (material === Material.Scorched) {
    const edge = artPixel(art.scorch, x, Math.min(15, Math.min(top, bottom) - 1));
    return edge < 0 ? fill : edge;
  }
  if (top <= 12 && top <= bottom) {
    const edge = artPixel(art.rim, x, 3 + top);
    return edge < 0 ? fill : edge;
  }
  if (bottom <= 12) {
    const edge = artPixel(art.under, x, 12 - bottom);
    return edge < 0 ? fill : edge;
  }
  return fill;
}
