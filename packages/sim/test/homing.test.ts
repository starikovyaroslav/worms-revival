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

describe('homing missile (W:A numbers)', () => {
  const fireUp = (target: boolean) => {
    const g = makeGame({ weapons: WEAPONS, wind: 0 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team)!;
    me.aim = Math.PI / 2 - 0.05;
    g.step([{ t: 'select', weapon: 'homing' }]);
    if (target) g.step([{ t: 'target', x: enemy.cx, y: enemy.cy }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 60; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    return { g, me, enemy };
  };

  it('can be fired without a marker, as a plain shell', () => {
    const { g } = fireUp(false);
    expect(g.world.ofKind('projectile').length).toBe(1);
  });

  it('locks on 0.5 s after launch, 546 px up when fired straight up at full power', () => {
    const { g, me } = fireUp(true);
    const m = g.world.ofKind<import('../src/weapons/homing').HomingMissile>('projectile')[0]!;
    while (!m.isHoming) g.step();
    expect(m.age).toBe(26);
    expect(me.y - m.y).toBeGreaterThan(500);
    expect(me.y - m.y).toBeLessThan(600);
  });

  it('explodes by itself after 10 s at the latest', () => {
    const { g } = fireUp(false);
    stepUntil(g, () => g.world.ofKind('projectile').length === 0, 700);
    expect(g.world.ofKind('projectile').length).toBe(0);
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
