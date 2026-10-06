import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Material } from '../src/terrain/terrain';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = Object.fromEntries(
  ['girder', 'teleport', 'skipgo', 'surrender'].map((id) => [
    id,
    { ammo: -1, power: 3, delay: 0, crate: 0 },
  ]),
);

function ready() {
  const g = makeGame({ weapons: WEAPONS, wind: 0 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  return g;
}

describe('tools', () => {
  it('girder places solid steel near the worm, but not too far away', () => {
    const g = ready();
    const me = g.activeWorm!;
    g.step([
      { t: 'select', weapon: 'girder' },
      { t: 'target', x: me.x + 2000, y: 120 },
    ]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('turn');
    const x = me.x + (me.x < 500 ? 80 : -80);
    g.step([{ t: 'target', x, y: 120 }]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.world.terrain.get(x, 120)).toBe(Material.Girder);
    expect(g.phase).toBe('retreat');
  });

  it('teleport moves the worm to a free spot only', () => {
    const g = ready();
    const me = g.activeWorm!;
    g.step([
      { t: 'select', weapon: 'teleport' },
      { t: 'target', x: 500, y: 300 },
    ]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('turn');
    g.step([{ t: 'target', x: 500, y: 100 }]);
    g.step([{ t: 'fire', down: true }]);
    expect(Math.abs(me.x - 500)).toBeLessThan(2);
    stepUntil(g, () => me.grounded);
    expect(me.y).toBe(199);
  });

  it('skip go ends the turn and surrender removes the team', () => {
    const g = ready();
    const first = g.activeTeam;
    g.step([{ t: 'select', weapon: 'skipgo' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.activeTeam !== first);
    g.step([{ t: 'select', weapon: 'surrender' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.phase === 'gameover');
    expect(g.winner).toBe(first);
  });
});

describe('digging and parachute', () => {
  const W = Object.fromEntries(
    ['blowtorch', 'drill', 'parachute'].map((id) => [
      id,
      { ammo: -1, power: 3, delay: 0, crate: 0 },
    ]),
  );
  function readyDig() {
    const g = makeGame({ weapons: W, wind: 0, turnTime: 60 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    return g;
  }

  it('pneumatic drill digs the worm down into the ground', () => {
    const g = readyDig();
    const me = g.activeWorm!;
    const y0 = me.y;
    g.step([{ t: 'select', weapon: 'drill' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.controlledId === 0);
    stepUntil(g, () => me.grounded);
    expect(me.y).toBeGreaterThan(y0 + 60);
  });

  it('blow torch tunnels sideways and can be stopped early', () => {
    const g = readyDig();
    const me = g.activeWorm!;
    // A wall of land right in front of the worm to tunnel into.
    me.facing = 1;
    me.aim = 0;
    for (let y = 120; y < 200; y++)
      for (let x = me.x + 6; x < me.x + 200; x++) g.world.terrain.set(x, y, Material.Soil);
    const x0 = me.x;
    g.step([{ t: 'select', weapon: 'blowtorch' }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 60; i++) g.step();
    g.step([{ t: 'fire', down: true }]);
    g.step();
    expect(g.controlledId).toBe(0);
    expect(Math.abs(me.x - x0)).toBeGreaterThan(30);
    expect(Math.abs(me.x - x0)).toBeLessThan(60);
  });

  it('parachute only opens in the air, slows the fall and does not end the turn', () => {
    const g = readyDig();
    const me = g.activeWorm!;
    g.step([{ t: 'select', weapon: 'parachute' }]);
    g.step([{ t: 'fire', down: true }]);
    expect(me.chute).toBe(false);
    me.y = 20;
    me.launch(0, 0, false);
    g.step([{ t: 'fire', down: true }]);
    expect(me.chute).toBe(true);
    for (let i = 0; i < 60; i++) g.step();
    expect(me.vy).toBeLessThanOrEqual(1.1 + 1e-9);
    stepUntil(g, () => me.grounded);
    expect(me.health).toBe(100);
    expect(g.phase).toBe('turn');
  });
});
