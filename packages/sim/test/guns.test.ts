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

describe('longbow', () => {
  const LB = { longbow: { ammo: -1, power: 3, delay: 0, crate: 0 } };

  it('hits a worm for 15 and leaves arrows in the land that can be stood on', () => {
    const g = makeGame({ weapons: LB, wind: 0 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team)!;
    enemy.x = me.x + 50;
    enemy.y = me.y;
    me.facing = 1;
    me.aim = 0.05;
    g.step([{ t: 'select', weapon: 'longbow' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('arrow').length === 0);
    expect(enemy.health).toBe(85);
    // Second arrow into a wall.
    enemy.x = 2000;
    for (let y = 100; y < 200; y++)
      for (let x = me.x + 40; x < me.x + 60; x++) g.world.terrain.set(x, y, 1);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('arrow').length === 0);
    let girder = 0;
    for (let x = me.x; x < me.x + 45; x++)
      for (let y = 150; y < 200; y++) if (g.world.terrain.get(x, y) === 4) girder++;
    expect(girder).toBeGreaterThan(5);
  });
});
