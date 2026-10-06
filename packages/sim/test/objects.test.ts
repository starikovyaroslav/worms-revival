import { describe, expect, it } from 'vitest';
import { Barrel } from '../src/weapons/barrel';
import { explode } from '../src/weapons/explosion';
import { Flame } from '../src/weapons/fire';
import { Worm } from '../src/worm/worm';
import { World } from '../src/world/world';
import { flatTerrain } from './helpers';

function world() {
  return new World({ seed: 3, terrain: flatTerrain(), waterLevel: 390 });
}

describe('oil drums and fire', () => {
  it('a nearby explosion sets off a drum that sprays flames', () => {
    const w = world();
    const barrel = w.spawn(new Barrel(300, 193));
    w.step();
    explode(w, 310, 195, { crater: 20, radius: 40, damage: 60 });
    w.step();
    expect(barrel.removed).toBe(true);
    expect(w.ofKind('flame').length).toBeGreaterThan(5);
  });

  it('a weak hit only damages a drum', () => {
    const w = world();
    const barrel = w.spawn(new Barrel(300, 193));
    w.step();
    explode(w, 330, 195, { crater: 5, radius: 40, damage: 20 });
    w.step();
    expect(barrel.removed).toBe(false);
    expect(barrel.health).toBeLessThan(50);
  });

  it('flames burn worms standing in them and die out', () => {
    const w = world();
    const worm = w.spawn(new Worm(300, 199, 'A', 0, 100));
    for (let i = 0; i < 5; i++) w.spawn(new Flame(300 + i, 190, 0, 0, 100));
    for (let i = 0; i < 120; i++) w.step();
    expect(worm.health).toBeLessThan(100);
    expect(w.ofKind('flame').length).toBe(0);
  });

  it('flames drift with the wind', () => {
    const drift = (wind: number) => {
      const w = world();
      w.wind = wind;
      const f = w.spawn(new Flame(300, 100, 0, -2, 200));
      for (let i = 0; i < 40; i++) w.step();
      return f.x;
    };
    expect(drift(1)).toBeGreaterThan(drift(-1) + 10);
  });
});
