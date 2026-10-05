import { describe, expect, it } from 'vitest';
import { Hasher } from '@wr/sim';
import { generateMap } from '../src/generate';

const SMALL = { width: 480, height: 240 };

function hashOf(seed: number, style: 'island' | 'cavern' = 'island') {
  const map = generateMap({ ...SMALL, seed, style });
  const h = new Hasher();
  map.terrain.hashInto(h);
  return h.digest();
}

function landRatio(data: Uint8Array) {
  let solid = 0;
  for (const v of data) if (v) solid++;
  return solid / data.length;
}

describe('generateMap', () => {
  it('is deterministic per seed', () => {
    expect(hashOf(3)).toBe(hashOf(3));
    expect(hashOf(3)).not.toBe(hashOf(4));
  });

  it('produces a reasonable amount of land for islands and caverns', () => {
    for (const style of ['island', 'cavern'] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const ratio = landRatio(generateMap({ ...SMALL, seed, style }).terrain.data);
        expect(ratio).toBeGreaterThan(0.15);
        expect(ratio).toBeLessThan(0.8);
      }
    }
  });

  it('keeps the island sky open', () => {
    const { terrain } = generateMap({ ...SMALL, seed: 9 });
    for (let x = 0; x < terrain.width; x++) expect(terrain.isSolid(x, 0)).toBe(false);
  });
});
