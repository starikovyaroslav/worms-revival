import { describe, expect, it } from 'vitest';
import { clipFrame } from '../src/clipEffects';
import { raidPhase, aircraftFor, shadowSurface } from '../src/transports';
import { World, Terrain } from '@wr/sim';

describe('cosmetic animation timing', () => {
  it('assigns recognizable aircraft by role and clips shadows to visible dry terrain', () => {
    expect(['airstrike', 'napalm', 'mail', 'minestrike', 'nuke'].map(aircraftFor)).toEqual([
      'attack',
      'attack',
      'gunship',
      'gunship',
      'stealth',
    ]);
    const t = new Terrain(30, 40),
      w = new World({ seed: 1, terrain: t, waterLevel: 35 });
    t.set(10, 20, 1);
    t.set(10, 36, 1);
    expect(shadowSurface(w, 10, 0, 40)).toBe(20);
    expect(shadowSurface(w, 10, 21, 40)).toBe(null);
    expect(shadowSurface(w, 9, 0, 40)).toBe(null);
    expect(shadowSurface(w, -1, 0, 40)).toBe(null);
  });
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
