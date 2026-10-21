import { describe, expect, it } from 'vitest';
import { clipFrame } from '../src/clipEffects';
import { raidPhase } from '../src/transports';

describe('cosmetic animation timing', () => {
  it('plays finite clips once and loops engine/propeller frames', () => {
    expect([0, 0.25, 0.5, 0.75, 1].map((t) => clipFrame(t, 1, 4))).toEqual([0, 1, 2, 3, 3]);
    expect(clipFrame(-1, 1, 4)).toBe(0);
    expect(clipFrame(1, 1, 4, true, 12)).toBe(0);
    expect(clipFrame(0, 0, 0)).toBe(0);
  });
  it('opens the bay during the pass and releases exactly the existing payload count', () => {
    expect(raidPhase(0, 5).released).toBe(0);
    expect(raidPhase(0.8, 5).frame).toBe(3);
    expect(raidPhase(1.6, 5).released).toBe(5);
    expect(raidPhase(100, 12).released).toBe(12);
  });
});
