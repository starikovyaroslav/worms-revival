import { describe, expect, it } from 'vitest';
import { Rng } from '@wr/sim';
import { generateMap } from '../src/generate';
import { findSurfaces, pickSpread } from '../src/spawn';

describe('spawn points', () => {
  const map = generateMap({ seed: 4, width: 960, height: 480 });
  const q = { halfWidth: 3, height: 13, waterMargin: 30, waterLevel: map.waterLevel };

  it('finds points with a free body box and ground just below', () => {
    const pts = findSurfaces(map.terrain, q);
    expect(pts.length).toBeGreaterThan(50);
    for (const p of pts) {
      expect(map.terrain.isSolid(p.x, p.y)).toBe(false);
      expect(map.terrain.rectCollides(p.x - 3, p.y - 12, p.x + 3, p.y)).toBe(false);
      expect(map.terrain.raycast(p.x, p.y, 0, 1, 10)).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(map.waterLevel - 30);
    }
  });

  it('spreads picks apart deterministically', () => {
    const pts = findSurfaces(map.terrain, q);
    const a = pickSpread(pts, 8, 80, new Rng(1));
    const b = pickSpread(pts, 8, 80, new Rng(1));
    expect(a).toEqual(b);
    expect(a.length).toBe(8);
  });
});
