import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { makeGame, stepUntil } from './helpers';
import type { Game } from '../src/game/game';
import type { Worm } from '../src/worm/worm';

const WEAPONS = Object.fromEntries(
  ['shotgun', 'firepunch', 'bat', 'prod'].map((id) => [
    id,
    { ammo: -1, power: 3, delay: 0, crate: 0 },
  ]),
);

/** Puts an enemy worm right next to the active one, facing it. */
function duel(gap: number): { g: Game; me: Worm; enemy: Worm } {
  const g = makeGame({ weapons: WEAPONS, wind: 0 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  const me = g.activeWorm!;
  const enemy = g.worms.find((w) => w.team !== me.team)!;
  enemy.x = me.x + gap;
  enemy.y = me.y;
  me.facing = 1;
  me.aim = 0;
  g.step();
  return { g, me, enemy };
}

function use(g: Game, weapon: string) {
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'fire', down: true }]);
}

describe('melee and guns', () => {
  it('shotgun hits the first worm along the ray and allows a second shot', () => {
    const { g, enemy } = duel(150);
    use(g, 'shotgun');
    expect(enemy.health).toBe(75);
    expect(g.phase).toBe('turn');
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('retreat');
  });

  it('baseball bat sends the victim flying far', () => {
    const { g, enemy } = duel(10);
    const x0 = enemy.x;
    use(g, 'bat');
    expect(enemy.health).toBe(70);
    stepUntil(g, () => !enemy.alive || enemy.grounded, 2000);
    expect(Math.abs(enemy.x - x0)).toBeGreaterThan(150);
  });

  it('fire punch hurts and lifts the target, and the puncher rises', () => {
    const { g, me, enemy } = duel(10);
    const y0 = me.y;
    use(g, 'firepunch');
    expect(enemy.health).toBe(70);
    expect(enemy.vy).toBeLessThan(0);
    g.step();
    g.step();
    expect(me.y).toBeLessThan(y0);
  });

  it('prod pushes without damage', () => {
    const { g, enemy } = duel(9);
    use(g, 'prod');
    expect(enemy.health).toBe(100);
    expect(enemy.state).toBe('airborne');
  });
});
