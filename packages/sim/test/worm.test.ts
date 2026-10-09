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

describe('Worm jumps match measured W:A numbers', () => {
  const measure = (double: boolean) => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(300, 199, 'A', 0, 100));
    run(w, 1);
    worm.jump();
    if (double) {
      run(w, 2);
      worm.jump();
    }
    let minY = worm.y;
    let flew = false;
    for (let i = 0; i < 200 && !(flew && worm.state === 'idle'); i++) {
      w.step();
      if (worm.state === 'airborne') flew = true;
      minY = Math.min(minY, worm.y);
    }
    return { height: 199 - minY, dx: worm.x - 300 };
  };

  it('forward jump: ≈26 px high, ≈48 px long', () => {
    const j = measure(false);
    expect(j.height).toBeGreaterThan(22);
    expect(j.height).toBeLessThan(30);
    expect(j.dx).toBeGreaterThan(42);
    expect(j.dx).toBeLessThan(54);
  });

  it('backflip: ≈42 px high, ≈19 px back', () => {
    const j = measure(true);
    expect(j.height).toBeGreaterThan(38);
    expect(j.height).toBeLessThan(46);
    expect(j.dx).toBeLessThan(-14);
    expect(j.dx).toBeGreaterThan(-24);
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

  it('walks 27 px per one-second loop (W:A)', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(100, 199, 'A', 0, 100));
    worm.control.right = true;
    run(w, 100);
    expect(worm.x).toBeGreaterThan(100 + 54 - 3);
    expect(worm.x).toBeLessThan(100 + 54 + 3);
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
    expect(flip.minY).toBeLessThan(jump.minY - 12);
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

  it('comes to rest on 45° slopes instead of jittering in the air', () => {
    const t = new Terrain(400, 400);
    // A 45° slope.
    for (let y = 0; y < 400; y++)
      for (let x = 0; x < 400; x++) if (x + y >= 350) t.set(x, y, Material.Soil);
    const w = new World({ seed: 1, terrain: t, waterLevel: 390 });
    for (const sx of [100, 120, 140]) {
      const worm = w.spawn(new Worm(sx, 100, 'A', 0, 100));
      worm.launch(0, 0, false);
    }
    run(w, 300);
    for (const worm of w.ofKind<Worm>('worm')) expect(worm.state).toBe('idle');
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
