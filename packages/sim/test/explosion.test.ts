import { describe, expect, it } from 'vitest';
import { Material, Terrain } from '../src/terrain/terrain';
import { World } from '../src/world/world';
import { Worm } from '../src/worm/worm';
import { blastDamage, explode } from '../src/weapons/explosion';

function flatWorld(): World {
  const t = new Terrain(800, 400);
  for (let y = 200; y < 400; y++) for (let x = 0; x < 800; x++) t.set(x, y, Material.Soil);
  return new World({ seed: 1, terrain: t, waterLevel: 390 });
}

describe('explosions', () => {
  it('falls off linearly with distance', () => {
    const b = { damage: 50, radius: 40 };
    expect(blastDamage(b, 0)).toBe(50);
    expect(blastDamage(b, 20)).toBe(25);
    expect(blastDamage(b, 40)).toBe(0);
    expect(blastDamage(b, -5)).toBe(50);
  });

  it('carves a crater, hurts and throws nearby worms away from the centre', () => {
    const w = flatWorld();
    const near = w.spawn(new Worm(320, 199, 'near', 0, 100));
    const far = w.spawn(new Worm(500, 199, 'far', 1, 100));
    w.step();
    explode(w, 300, 200, { crater: 25, radius: 50, damage: 50 });
    expect(w.terrain.isSolid(300, 210)).toBe(false);
    expect(near.health).toBeLessThan(100);
    expect(near.health).toBeGreaterThan(50);
    expect(near.state).toBe('airborne');
    expect(near.vx).toBeGreaterThan(0);
    expect(near.vy).toBeLessThan(0);
    expect(far.health).toBe(100);
    expect(w.drainEvents().some((e) => e.type === 'explosion')).toBe(true);
  });

  it('deals full damage on a direct hit', () => {
    const w = flatWorld();
    const worm = w.spawn(new Worm(300, 199, 'a', 0, 100));
    w.step();
    explode(w, worm.cx, worm.cy, { crater: 20, radius: 40, damage: 45 });
    expect(worm.health).toBe(55);
  });
});

describe('W:A power table', () => {
  it('maps damage to crater diameter like the Bazooka/Grenade table', async () => {
    const { craterDiameter, scaledBlast } = await import('../src/weapons/blast');
    expect(craterDiameter(25)).toBe(47);
    expect(craterDiameter(50)).toBe(97);
    expect(craterDiameter(100)).toBe(199);
    // Standard bazooka (power 3): 50 hp, 97 px crater.
    const std = scaledBlast(50, 3);
    expect(std.damage).toBe(50);
    expect(std.crater * 2).toBeCloseTo(97, 5);
    // Power stars: 40, 45, 50, 55, 60 hp.
    expect([1, 2, 3, 4, 5].map((p) => Math.round(scaledBlast(50, p).damage))).toEqual([
      40, 45, 50, 55, 60,
    ]);
  });
});
