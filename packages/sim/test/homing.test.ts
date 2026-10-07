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

describe('mortar and pigeon', () => {
  const W = {
    mortar: { ammo: -1, power: 3, delay: 0, crate: 0 },
    pigeon: { ammo: -1, power: 3, delay: 0, crate: 0 },
  };

  it('mortar always fires at full power and splits on impact', () => {
    const g = makeGame({ weapons: W, wind: 0 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    g.activeWorm!.aim = 1.35;
    g.step([{ t: 'select', weapon: 'mortar' }]);
    g.step([{ t: 'fire', down: true }]);
    const shell = g.world.ofKind<import('../src/weapons/projectile').Projectile>('projectile')[0]!;
    expect(Math.hypot(shell.vx, shell.vy)).toBeGreaterThan(13);
    stepUntil(g, () => shell.removed);
    g.step();
    expect(g.world.ofKind('projectile').length).toBe(6);
  });

  it('pigeon flies over a wall to reach its target', () => {
    const g = makeGame({ weapons: W, wind: 0 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team && Math.abs(w.x - me.x) > 150)!;
    // A wall between them.
    const wx = (me.x + enemy.x) / 2;
    for (let y = 120; y < 200; y++)
      for (let x = wx - 5; x < wx + 5; x++) g.world.terrain.set(x, y, 1);
    me.facing = enemy.x > me.x ? 1 : -1;
    g.step([
      { t: 'select', weapon: 'pigeon' },
      { t: 'target', x: enemy.cx, y: enemy.cy },
    ]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('pigeon').length === 0);
    expect(enemy.health).toBeLessThan(100);
  });
});
