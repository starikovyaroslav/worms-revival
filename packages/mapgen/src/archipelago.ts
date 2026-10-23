import { Material, Rng, Terrain } from '@wr/sim';
import { fbm } from './noise';
import type { MapParams } from './generate';

export interface IslandFeature {
  x: number;
  radius: number;
  top: number;
  arch: boolean;
  cave: boolean;
}
export interface BridgeFeature {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sag: number;
}
export interface ArchipelagoFeatures {
  islands: IslandFeature[];
  bridges: BridgeFeature[];
}

/** Designed large-scale topology first; seeded noise only supplies the smaller rock contours. */
export function archipelago(
  p: MapParams,
  waterLevel: number,
): { terrain: Terrain; features: ArchipelagoFeatures } {
  const { width, height } = p;
  const rng = new Rng(p.seed ^ 0x41c41),
    seed = rng.nextU32() | 0;
  const terrain = new Terrain(width, height);
  const unit = Math.min(width / 1920, height / 800);
  const count = Math.max(3, Math.min(5, Math.round(width / 480) + rng.int(-1, 1)));
  const slot = width / count;
  const heights = rng.shuffle(Array.from({ length: count }, (_, i) => i));
  const islands: IslandFeature[] = Array.from({ length: count }, (_, i) => ({
    x: slot * (i + 0.5) + rng.range(-0.07, 0.07) * slot,
    radius: slot * rng.range(0.31, 0.49) * (0.8 + p.landAmount * 0.4),
    top: height * (0.17 + (heights[i]! / (count - 1)) * 0.33 + rng.range(0, 0.025)),
    arch: i === (p.seed >>> 0) % count || (count > 3 && i === ((p.seed >>> 0) + 2) % count),
    cave: rng.chance(0.6),
  }));
  for (const m of islands) {
    const x0 = Math.max(1, Math.floor(m.x - m.radius * 1.15));
    const x1 = Math.min(width - 2, Math.ceil(m.x + m.radius * 1.15));
    for (let x = x0; x <= x1; x++) {
      const t = Math.abs(x - m.x) / m.radius;
      // Broad walkable terraces, steep shoulders, and narrower submerged supports.
      const noise = fbm(x / (100 * unit), 0.7, seed, 3);
      const shelf = Math.round((noise * 25 * unit) / Math.max(2, 7 * unit)) * Math.max(2, 7 * unit);
      const top = m.top + t * t * 85 * unit + shelf;
      for (let y = Math.max(0, Math.floor(top)); y < height; y++) {
        const depth = (y - top) / Math.max(1, waterLevel - top);
        const contour =
          fbm(x / (65 * unit), y / (80 * unit), seed + 9, 2) * (0.08 + p.roughness * 0.14);
        const radius = 0.69 + 1.15 * Math.sqrt(Math.max(0, depth)) - 1.28 * depth + contour;
        if (t > radius) continue;
        if (m.arch) {
          // Bottom-open arches keep two supporting legs rather than slicing off a floating slab.
          const ax = (x - m.x) / (m.radius * 0.43);
          const ay = (y - waterLevel - 12 * unit) / ((waterLevel - m.top) * 0.54);
          if (ax * ax + ay * ay < 1 + contour * 0.3) continue;
        } else if (m.cave) {
          const cx = (x - m.x - m.radius * 0.72) / (m.radius * 0.78);
          const cy = (y - m.top - (waterLevel - m.top) * 0.55) / (37 * unit);
          if (cx * cx + cy * cy < 1 + contour * 0.25) continue;
        }
        terrain.set(x, y, Material.Soil);
      }
    }
  }
  const bridges: BridgeFeature[] = [];
  // Alternate high and lower crossings, leaving at least one open sea channel.
  for (let i = 0; i < islands.length - 1; i++) {
    if (i === (p.seed >>> 0) % (islands.length - 1) && islands.length > 3) continue;
    const a = islands[i]!,
      b = islands[i + 1]!;
    const x0 = Math.round(a.x + a.radius * 0.65),
      x1 = Math.round(b.x - b.radius * 0.65);
    const surface = (x: number) => {
      for (let y = 1; y < waterLevel; y++) if (terrain.isSolid(x, y)) return y;
      return Math.round(height * 0.6);
    };
    const y0 = surface(x0) + 3 * unit,
      y1 = surface(x1) + 3 * unit;
    const sag = rng.range(6, 16) * unit;
    bridges.push({ x0, x1, y0, y1, sag });
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      const y = Math.round(y0 + (y1 - y0) * t + 4 * t * (1 - t) * sag);
      for (let dy = 0; dy < Math.max(4, Math.round(9 * unit)); dy++)
        if (!terrain.isSolid(x, y + dy)) terrain.set(x, y + dy, Material.Bridge);
    }
  }
  terrain.markAllDirty();
  return { terrain, features: { islands, bridges } };
}
