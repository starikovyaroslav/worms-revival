import { describe, expect, it } from 'vitest';
import { Crate } from '@wr/sim';
import { explode } from '@wr/sim';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = { bazooka: { ammo: 2, power: 3, delay: 0, crate: 3 } };

function ready(chance = 0) {
  const g = makeGame({ weapons: WEAPONS, wind: 0, crateChance: chance });
  stepUntil(g, () => g.worms.every((w) => w.grounded) && !g.world.isBusy());
  return g;
}

describe('crates', () => {
  it('parachute down at a steady speed and land', () => {
    const g = ready();
    const c = g.world.spawn(new Crate(500, -40, 'health', '', 25));
    for (let i = 0; i < 10; i++) g.step();
    expect(c.vy).toBeCloseTo(7, 9);
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

describe('crate phase', () => {
  function crateTurn() {
    const g = makeGame({ weapons: { bazooka: WEAPONS.bazooka }, wind: 0, crateChance: 100 });
    expect(g.phase).toBe('crate');
    return g;
  }

  it('holds the turn only until the crate has landed (240 px drop here: about 1 s)', () => {
    // The real maps are 800 px high; the measured crate phase over 20 turns is in the M2 report.
    const g = crateTurn();
    const n = stepUntil(g, () => g.phase !== 'crate');
    expect(n).toBeLessThan(1.5 * 50);
  });

  it('allows weapon choice and aiming, but no walking, while the crate falls', () => {
    const g = crateTurn();
    const worm = g.activeWorm!;
    const x = worm.x;
    const aim = worm.aim;
    g.step([{ t: 'select', weapon: 'bazooka' }]);
    expect(g.weaponId).toBe('bazooka');
    g.step([{ t: 'move', left: true, right: false, up: true, down: false }]);
    for (let i = 0; i < 10; i++) g.step();
    expect(g.phase).toBe('crate');
    expect(worm.aim).toBeGreaterThan(aim);
    expect(worm.x).toBe(x);
  });

  it('fire or jump skips the wait; the shot itself is dropped and the camera stays on the crate', () => {
    const g = crateTurn();
    const crate = g.world.ofKind<Crate>('crate')[0]!;
    for (let i = 0; i < 5; i++) g.step();
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('turn');
    expect(g.charging).toBe(false);
    expect(g.firedThisTurn).toBe(false);
    expect(crate.chute).toBe(true);
    expect(g.focusId).toBe(crate.id);
    // Once it has landed the camera goes back to the worm.
    stepUntil(g, () => crate.resting);
    g.step();
    expect(g.focusId).toBe(g.activeWormId);
  });

  it('ignores skip and surrender while the crate falls', () => {
    const g = crateTurn();
    g.step([{ t: 'skip' }, { t: 'surrender' }]);
    expect(g.phase).toBe('crate');
    expect(g.teams.some((t) => t.surrendered)).toBe(false);
  });
});
