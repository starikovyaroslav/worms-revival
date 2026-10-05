import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';

describe('Rng', () => {
  it('produces a stable sequence for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.nextU32());
    const seqB = Array.from({ length: 5 }, () => b.nextU32());
    expect(seqA).toEqual(seqB);
    expect(seqA).toMatchInlineSnapshot(`
      [
        2837322924,
        544945897,
        479756282,
        3500138142,
        339756180,
      ]
    `);
  });

  it('resumes from a copied state', () => {
    const a = new Rng(7);
    a.nextU32();
    const b = new Rng(a.s);
    expect(b.nextU32()).toBe(a.nextU32());
  });

  it('int() stays in range and covers it', () => {
    const r = new Rng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
  });
});
