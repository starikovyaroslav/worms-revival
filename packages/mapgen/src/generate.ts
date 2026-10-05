import { Material, Terrain, Rng } from '@wr/sim';
import { fbm } from './noise';
import { removeSmallRegions } from './cleanup';

export type MapStyle = 'island' | 'cavern';

export interface MapParams {
  seed: number;
  width: number;
  height: number;
  style: MapStyle;
  /** 0..1: how much land there is. */
  landAmount: number;
  /** 0..1: how chaotic and holey the shapes are. */
  roughness: number;
}

export const DEFAULT_MAP_PARAMS: MapParams = {
  seed: 1,
  width: 1920,
  height: 800,
  style: 'island',
  landAmount: 0.5,
  roughness: 0.5,
};

export interface GeneratedMap {
  params: MapParams;
  terrain: Terrain;
  waterLevel: number;
}

/** Height above the bottom edge that is under water at the start of the game. */
const WATER_DEPTH = 60;
/** Strength of domain warping, in pixels. */
const WARP = 90;

export function generateMap(input: Partial<MapParams> = {}): GeneratedMap {
  const p: MapParams = { ...DEFAULT_MAP_PARAMS, ...input };
  const { width, height } = p;
  const rng = new Rng(p.seed);
  const noiseSeed = rng.nextU32() | 0;
  const terrain = new Terrain(width, height);
  const data = terrain.data;
  const waterLevel = height - WATER_DEPTH;

  // Larger scale = bigger features. Roughness adds high-frequency octaves.
  const scale = 1 / (260 - p.roughness * 80);
  const octaves = 4 + Math.round(p.roughness * 2);
  const amount = p.landAmount - 0.5;

  // A handful of island "masses" spread along the map with water in between. Each has its own
  // width and peak height so islands differ from each other.
  const masses: { x: number; w: number; top: number }[] = [];
  if (p.style === 'island') {
    const count = rng.int(2, 4);
    for (let i = 0; i < count; i++) {
      const slot = width / count;
      masses.push({
        x: slot * (i + 0.5) + rng.range(-0.12, 0.12) * slot,
        w: slot * rng.range(0.38, 0.55),
        top: rng.range(0.4, 0.62),
      });
    }
  }

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // Domain warping bends the shapes into overhangs, arches and ledges.
      const wx = x + fbm(x * scale * 1.5, y * scale * 1.5, noiseSeed + 7, 3) * WARP;
      const wy = y + fbm(x * scale * 1.5 + 31.7, y * scale * 1.5, noiseSeed + 13, 3) * WARP;
      const n = fbm(wx * scale, wy * scale, noiseSeed, octaves);
      let density: number;
      if (p.style === 'island') {
        // Islands: a rounded mass per island that gets solid below its peak height,
        // with water visible between islands.
        let shape = -2;
        for (const m of masses) {
          const d = Math.abs(x - m.x) / m.w;
          // The peak is highest at the centre and slopes down towards the island edges.
          const v = 0.5 - d * d * 0.7 + Math.min(ny - (m.top + d * d * 0.35), 0.2) * 2.6;
          if (v > shape) shape = v;
        }
        // Keep the side edges clear so worms can fall off the map.
        const side = Math.min(nx, 1 - nx);
        const edge = side < 0.07 ? (side - 0.07) * 30 : 0;
        // Always leave some sky above the highest peaks.
        const sky = ny < 0.12 ? (ny - 0.12) * 20 : 0;
        density = n * 1.1 + shape + amount + edge + sky;
      } else {
        // Caverns: solid frame (ceiling, walls, floor), open tunnels inside.
        const ex = Math.min(nx, 1 - nx) * 2;
        const ey = Math.min(ny, 1 - ny) * 2;
        const frame = 0.6 - Math.min(ex * 2.2, ey * 2.6, 1) * 0.95;
        density = n * 1.8 + frame + amount * 0.8 + (ny - 0.5) * 0.3 + 0.08;
      }
      data[y * width + x] = density > 0 ? Material.Soil : Material.Air;
    }
  }

  // Nothing solid below the water line matters visually, but keep land continuous into the water.
  removeSmallRegions(data, width, height, true, 900, Material.Air);
  removeSmallRegions(data, width, height, false, 300, Material.Soil);
  terrain.markAllDirty();

  return { params: p, terrain, waterLevel };
}
