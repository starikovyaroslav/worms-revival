import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = { homing: { ammo: -1, power: 3, delay: 0, crate: 0 } };

describe('homing missile', () => {
  it('needs a target, then curves onto it', () => {
    const g = makeGame({ weapons: WEAPONS, wind: 0 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team)!;
    // Fire straight up: only homing can bring it down onto the enemy.
    me.aim = Math.PI / 2 - 0.05;
    g.step([{ t: 'select', weapon: 'homing' }]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.world.ofKind('projectile').length).toBe(0);
    g.step([{ t: 'target', x: enemy.cx, y: enemy.cy }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 20; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    stepUntil(g, () => g.world.ofKind('projectile').length === 0);
    expect(enemy.health).toBeLessThan(100);
  });
});
