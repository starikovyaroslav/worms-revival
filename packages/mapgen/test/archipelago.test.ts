import { describe, expect, it } from 'vitest';
import { Hasher, Material } from '@wr/sim';
import { generateMap } from '../src/generate';
import { findSurfaces } from '../src/spawn';

describe('island topology v2', () => {
  it('creates multiple heights, genuine passages, physical crossings and plentiful dry spawn points', () => {
    for (const seed of [1, 2, 7, 42, 77, 1847]) {
      const map = generateMap({ seed, version: 2 });
      const { islands, bridges } = map.features!;
      expect(islands.length).toBeGreaterThanOrEqual(3);
      expect(
        Math.max(...islands.map((m) => m.top)) - Math.min(...islands.map((m) => m.top)),
      ).toBeGreaterThan(100);
      for (const m of islands.filter((m) => m.arch)) {
        const x = Math.round(m.x),
          y = Math.round(map.waterLevel - 8);
        expect(map.terrain.isSolid(x, y)).toBe(false);
        expect(map.terrain.isSolid(x, Math.round(m.top + 55))).toBe(true);
      }
      expect(bridges.length).toBeGreaterThan(0);
      expect(map.terrain.data.includes(Material.Bridge)).toBe(true);
      expect(
        findSurfaces(map.terrain, {
          halfWidth: 4,
          height: 13,
          waterLevel: map.waterLevel,
          waterMargin: 40,
        }).length,
      ).toBeGreaterThan(80);
    }
  });
  it('uses destructible wood and preserves v1 for existing recordings', () => {
    const map = generateMap({ seed: 42, version: 2 });
    const hash = (version: 1 | 2) => {
      const h = new Hasher();
      generateMap({ seed: 42, version }).terrain.hashInto(h);
      return h.digest();
    };
    expect(hash(2)).toBe(hash(2));
    expect(hash(1)).not.toBe(hash(2));
    const index = map.terrain.data.indexOf(Material.Bridge);
    expect(
      map.terrain.carveCircle(index % map.terrain.width, Math.floor(index / map.terrain.width), 15),
    ).toBeGreaterThan(0);
    expect(map.terrain.data[index]).toBe(Material.Air);
  });
});
