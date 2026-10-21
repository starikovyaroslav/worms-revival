import { describe, expect, it } from 'vitest';
import { type Projectile } from '@wr/sim';
import { makeGame, stepUntil } from './helpers';

const TARGET_X = 450;

/**
 * Fires a strike at TARGET_X and returns each shell's x on the last tick before the first one
 * lands (the middle shell flies lowest, so it is first; later blasts shove the others about).
 */
function landings(weapon: string, wind: number, facing: 1 | -1 = 1): number[] {
  const g = makeGame({
    weapons: { [weapon]: { ammo: -1, power: 3, delay: 0, crate: 0 } },
    wind: 0,
    turnTime: 60,
  });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  g.world.wind = wind;
  g.activeWorm!.facing = facing;
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'target', x: TARGET_X, y: 199 }]);
  g.step([{ t: 'fire', down: true }]);
  let xs: number[] = [];
  for (let i = 0; i < 600; i++) {
    const shells = g.world.ofKind<Projectile>('projectile');
    if (xs.length && shells.length < xs.length) break;
    xs = shells.map((p) => p.x);
    g.step();
  }
  return xs;
}

const middle = (xs: number[]) => {
  const m = (xs.length - 1) / 2;
  return (xs[Math.floor(m)]! + xs[Math.ceil(m)]!) / 2;
};

describe('air strikes aim at the target', () => {
  for (const [weapon, count] of [
    ['airstrike', 5],
    ['napalm', 5],
    ['mail', 5],
    ['carpet', 12],
    ['frenchsheep', 5],
  ] as const) {
    it(`${weapon}: the middle shell lands on the target with no wind`, () => {
      const xs = landings(weapon, 0);
      expect(xs.length).toBe(count);
      expect(Math.abs(middle(xs) - TARGET_X)).toBeLessThan(15);
    });
  }

  it('mail strike leads the wind and still lands near the target', () => {
    const xs = landings('mail', 1);
    expect(Math.abs(middle(xs) - TARGET_X)).toBeLessThan(25);
  });

  it('strikes flying left land on the target too', () => {
    const xs = landings('mail', 0, -1);
    expect(Math.abs(middle(xs) - TARGET_X)).toBeLessThan(15);
  });
});
