import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Crate } from '../src/weapons/crate';
import { explode } from '../src/weapons/explosion';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = { bazooka: { ammo: 2, power: 3, delay: 0, crate: 3 } };

function ready(chance = 0) {
  const g = makeGame({ weapons: WEAPONS, wind: 0, crateChance: chance });
  stepUntil(g, () => g.worms.every((w) => w.grounded) && !g.world.isBusy());
  return g;
}

describe('crates', () => {
  it('parachute down slowly and land', () => {
    const g = ready();
    const c = g.world.spawn(new Crate(500, -40, 'health', '', 25));
    for (let i = 0; i < 40; i++) g.step();
    expect(c.vy).toBeLessThanOrEqual(1.3 + 1e-9);
    stepUntil(g, () => c.resting);
    expect(c.chute).toBe(false);
    expect(c.y).toBeLessThan(200);
  });

  it('health crate heals the worm that touches it and cures poison', () => {
    const g = ready();
    const me = g.activeWorm!;
    me.health = me.shownHealth = 40;
    me.poisoned = true;
    g.world.spawn(new Crate(me.x, me.y - 30, 'health', '', 25));
    stepUntil(g, () => g.world.ofKind('crate').length === 0);
    expect(me.health).toBe(65);
    expect(me.shownHealth).toBe(65);
    expect(me.poisoned).toBe(false);
  });

  it('weapon crate adds ammo to the collecting team', () => {
    const g = ready();
    const me = g.activeWorm!;
    const team = g.teams[me.team]!;
    g.world.spawn(new Crate(me.x, me.y - 30, 'weapon', 'bazooka', 1));
    stepUntil(g, () => g.world.ofKind('crate').length === 0);
    expect(team.ammo.bazooka).toBe(3);
  });

  it('explodes when blasted', () => {
    const g = ready();
    const c = g.world.spawn(new Crate(500, 190, 'health', '', 25));
    g.step();
    explode(g.world, 505, 190, { crater: 10, radius: 30, damage: 40 });
    g.step();
    expect(c.removed).toBe(true);
  });

  it('drops at the start of turns according to the scheme chance', () => {
    const g = ready(100);
    expect(g.world.ofKind('crate').length).toBeGreaterThan(0);
  });
});
