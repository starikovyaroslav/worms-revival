import { type Rng, type Terrain } from '@wr/sim';

export interface SurfacePoint {
  x: number;
  /** Lowest body row; the ground is at most a few pixels below. */
  y: number;
}

export interface SurfaceQuery {
  /** Free box above the point (half width, height). */
  halfWidth: number;
  height: number;
  /** Points must be at least this far above the water. */
  waterMargin: number;
  waterLevel: number;
  step?: number;
}

/** All standable surface points on a grid of columns, top to bottom. */
export function findSurfaces(terrain: Terrain, q: SurfaceQuery): SurfacePoint[] {
  const out: SurfacePoint[] = [];
  const step = q.step ?? 4;
  const maxY = q.waterLevel - q.waterMargin;
  for (let x = q.halfWidth + 1; x < terrain.width - q.halfWidth - 1; x += step) {
    for (let y = 1; y < maxY; y++) {
      if (!terrain.isSolid(x, y + 1) || terrain.isSolid(x, y)) continue;
      // On slopes the body box touches the ground; lift it like a climbing worm would.
      let lift = 0;
      while (
        lift <= 8 &&
        terrain.rectCollides(x - q.halfWidth, y - lift - q.height + 1, x + q.halfWidth, y - lift)
      ) {
        lift++;
      }
      if (lift > 8) continue;
      out.push({ x, y: y - lift });
    }
  }
  return out;
}

/**
 * Picks `count` surface points spread at least `minDist` apart, relaxing the distance if the map
 * is too crowded. Deterministic for a given rng state.
 */
export function pickSpread(
  points: SurfacePoint[],
  count: number,
  minDist: number,
  rng: Rng,
): SurfacePoint[] {
  const pool = rng.shuffle(points.slice());
  const chosen: SurfacePoint[] = [];
  let dist = minDist;
  while (chosen.length < count && dist >= 4) {
    for (const p of pool) {
      if (chosen.length >= count) break;
      if (chosen.includes(p)) continue;
      const ok = chosen.every(
        (c) => (c.x - p.x) * (c.x - p.x) + (c.y - p.y) * (c.y - p.y) >= dist * dist,
      );
      if (ok) chosen.push(p);
    }
    dist = Math.floor(dist * 0.7);
  }
  return chosen;
}
