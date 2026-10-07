import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { makeGame, stepUntil } from './helpers';

const W = Object.fromEntries(
  ['uzi', 'minigun', 'handgun'].map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]),
);

describe('automatic guns', () => {
  for (const [id, min] of [
    ['uzi', 25],
    ['minigun', 20],
    ['handgun', 20],
  ] as const) {
    it(`${id} riddles a worm in front and then starts the retreat`, () => {
      const g = makeGame({ weapons: W, wind: 0, turnTime: 60 });
      stepUntil(g, () => g.worms.every((w) => w.grounded));
      const me = g.activeWorm!;
      const enemy = g.worms.find((w) => w.team !== me.team)!;
      enemy.x = me.x + 60;
      enemy.y = me.y;
      me.facing = 1;
      me.aim = 0;
      g.step([{ t: 'select', weapon: id }]);
      g.step([{ t: 'fire', down: true }]);
      expect(g.phase).toBe('turn');
      stepUntil(g, () => g.phase !== 'turn');
      expect(g.phase).toBe('retreat');
      expect(100 - enemy.health).toBeGreaterThanOrEqual(min);
    });
  }
});
