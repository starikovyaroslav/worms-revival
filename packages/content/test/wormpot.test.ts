import { describe, expect, it } from 'vitest';
import { INTERMEDIATE } from '../src/schemes';
import { WORMPOT, applyWormpot } from '../src/wormpot';

describe('wormpot', () => {
  it('stacks modifiers on top of a scheme without changing the original', () => {
    const s = applyWormpot(INTERMEDIATE, ['tanks', 'lowgrav', 'double']);
    expect(s.wormHealth).toBe(200);
    expect(s.physics?.gravity).toBeLessThan(0.2);
    expect(s.physics?.damageScale).toBe(2);
    expect(INTERMEDIATE.wormHealth).toBe(100);
    expect(INTERMEDIATE.physics).toBeUndefined();
  });

  it('has unique ids and every modifier changes something', () => {
    expect(new Set(WORMPOT.map((m) => m.id)).size).toBe(WORMPOT.length);
    for (const m of WORMPOT)
      expect(JSON.stringify(m.apply(INTERMEDIATE))).not.toBe(JSON.stringify(INTERMEDIATE));
  });
});
