import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Projectile } from '../src/weapons/projectile';
import { Sheep } from '../src/weapons/sheep';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = Object.fromEntries(
  ['banana', 'hhg', 'sheep', 'supersheep'].map((id) => [
    id,
    { ammo: -1, power: 3, delay: 0, crate: 0 },
  ]),
);

function ready() {
  const g = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  const me = g.activeWorm!;
  me.facing = 1;
  me.aim = 0.6;
  return g;
}

function shoot(g: ReturnType<typeof ready>, weapon: string, charge = 15) {
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'fire', down: true }]);
  for (let i = 0; i < charge; i++) g.step();
  g.step([{ t: 'fire', down: false }]);
}

describe('special weapons', () => {
  it('banana bomb throws five bananas that explode on impact', () => {
    const g = ready();
    g.step([{ t: 'fuse', seconds: 1 }]);
    shoot(g, 'banana');
    const main = g.world.ofKind<Projectile>('projectile')[0]!;
    stepUntil(g, () => main.removed);
    g.step();
    expect(
      g.world.ofKind<Projectile>('projectile').filter((p) => p.look === 'bananalet').length,
    ).toBe(5);
  });

  it('holy hand grenade waits until it stops, then sings and explodes', () => {
    const g = ready();
    shoot(g, 'hhg', 30);
    const hhg = g.world.ofKind<Projectile>('projectile')[0]!;
    let sang = -1;
    const ticks = stepUntil(g, () => {
      if (g.world.events.some((e) => e.type === 'sound' && e.id === 'hallelujah'))
        sang = g.world.tick;
      return hhg.removed;
    });
    expect(ticks).toBeGreaterThan(150);
    expect(sang).toBeGreaterThan(0);
    expect(hhg.resting || hhg.removed).toBe(true);
  });

  it('sheep walks forward and explodes on the second fire press, then retreat starts', () => {
    const g = ready();
    const me = g.activeWorm!;
    shoot(g, 'sheep', 0);
    const sheep = g.world.ofKind<Sheep>('sheep')[0]!;
    expect(g.controlledId).toBe(sheep.id);
    for (let i = 0; i < 80; i++)
      g.step([{ t: 'move', left: false, right: true, up: false, down: false }]);
    expect(sheep.x).toBeGreaterThan(me.x + 40);
    expect(me.state).toBe('idle');
    g.step([{ t: 'fire', down: true }]);
    expect(sheep.removed).toBe(true);
    g.step();
    expect(g.phase).toBe('retreat');
  });

  it('super sheep flies when fired again and can be steered', () => {
    const fly = (steerUp: boolean) => {
      const g = ready();
      shoot(g, 'supersheep', 0);
      for (let i = 0; i < 10; i++) g.step();
      g.step([{ t: 'fire', down: true }]);
      const sheep = g.world.ofKind<Sheep>('sheep')[0]!;
      expect(sheep.mode).toBe('fly');
      g.step([{ t: 'move', left: steerUp, right: false, up: false, down: false }]);
      for (let i = 0; i < 15; i++) g.step();
      return sheep.y;
    };
    expect(fly(true)).toBeLessThan(fly(false));
  });
});
