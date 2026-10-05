import { describe, expect, it } from 'vitest';
import { Material, Terrain } from '../src/terrain/terrain';
import { World } from '../src/world/world';
import { Worm, fallDamage, CLIMB } from '../src/worm/worm';

/** Flat ground at y = 200 (first solid row). */
function flatWorld(): World {
  const t = new Terrain(800, 400);
  for (let y = 200; y < 400; y++) for (let x = 0; x < 800; x++) t.set(x, y, Material.Soil);
  return new World({ seed: 1, terrain: t, waterLevel: 390 });
}

function run(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) w.step();
}

describe('fallDamage (W:A formula)', () => {
  it('is zero up to 8 px/tick and grows linearly after', () => {
    expect(fallDamage(8)).toBe(0);
    expect(fallDamage(9)).toBe(3);
    expect(fallDamage(32)).toBe(67);
  });
});

describe('Worm', () => {
  it('falls onto the ground and stands on it', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(100, 150, 'A', 0, 100));
    worm.launch(0, 0, false);
    run(w, 60);
    expect(worm.state).toBe('idle');
    expect(worm.y).toBe(199);
    expect(worm.health).toBe(100);
  });

  it('walks with the W:A gait (~12 px per 15-frame cycle)', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(100, 199, 'A', 0, 100));
    worm.control.right = true;
    run(w, 1 + 15 * 4);
    expect(worm.x).toBeCloseTo(100 + 12.25 * 4, 5);
    expect(worm.y).toBe(199);
  });

  it('turns around before walking the other way', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(100, 199, 'A', 0, 100));
    worm.control.left = true;
    run(w, 1);
    expect(worm.facing).toBe(-1);
    expect(worm.x).toBe(100);
  });

  it('climbs small ledges but is blocked by walls', () => {
    const w = flatWorld();
    for (let y = 200 - CLIMB; y < 200; y++)
      for (let x = 130; x < 160; x++) w.terrain.set(x, y, Material.Soil);
    for (let y = 100; y < 200; y++)
      for (let x = 300; x < 310; x++) w.terrain.set(x, y, Material.Soil);
    const worm = w.spawn(new Worm(120, 199, 'A', 0, 100));
    worm.control.right = true;
    run(w, 40);
    expect(worm.x).toBeGreaterThan(135);
    expect(worm.y).toBe(199 - CLIMB);
    run(w, 600);
    expect(worm.x).toBeLessThan(300);
    expect(worm.x).toBeGreaterThan(290);
  });

  it('jumps forward, and a double press makes a higher backflip', () => {
    const peak = (double: boolean) => {
      const w = flatWorld();
      const worm = w.spawn(new Worm(100, 199, 'A', 0, 100));
      run(w, 1);
      worm.jump();
      if (double) {
        run(w, 2);
        worm.jump();
      }
      let minY = worm.y;
      for (let i = 0; i < 100; i++) {
        w.step();
        minY = Math.min(minY, worm.y);
      }
      return { minY, x: worm.x, state: worm.state };
    };
    const jump = peak(false);
    const flip = peak(true);
    expect(jump.state).toBe('idle');
    expect(jump.x).toBeGreaterThan(130);
    expect(flip.minY).toBeLessThan(jump.minY - 30);
    expect(flip.x).toBeLessThan(100);
  });

  it('takes fall damage from a high drop, but not when blasted', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(100, 0, 'A', 0, 100));
    worm.launch(0, 0, false);
    run(w, 200);
    expect(worm.health).toBeLessThan(100);
    expect(worm.state).toBe('idle');

    const w2 = flatWorld();
    const blasted = w2.spawn(new Worm(100, 0, 'A', 0, 100));
    blasted.push(3, 0);
    run(w2, 400);
    expect(blasted.health).toBe(100);
    expect(blasted.state).toBe('idle');
  });

  it('drowns in water', () => {
    const t = new Terrain(400, 400);
    const w = new World({ seed: 1, terrain: t, waterLevel: 300 });
    const worm = w.spawn(new Worm(100, 100, 'A', 0, 100));
    worm.launch(0, 0, false);
    run(w, 200);
    expect(worm.state).toBe('dead');
    expect(worm.drowned).toBe(true);
    expect(worm.health).toBe(0);
  });
});
