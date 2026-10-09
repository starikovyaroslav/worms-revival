import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Material } from '../src/terrain/terrain';
import { Rope } from '../src/weapons/rope';
import { explode } from '../src/weapons/explosion';
import { makeGame, stepUntil } from './helpers';
import type { Game } from '../src/game/game';

const WEAPONS = Object.fromEntries(
  ['rope', 'bazooka'].map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]),
);

/** Game with a ceiling slab 120 px above the ground. */
function cave(): Game {
  const g = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
  for (let y = 60; y < 80; y++)
    for (let x = 0; x < 1000; x++) g.world.terrain.set(x, y, Material.Soil);
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  const me = g.activeWorm!;
  me.facing = 1;
  me.aim = Math.PI / 2 - 0.3;
  return g;
}

const keys = (o: Partial<Record<'left' | 'right' | 'up' | 'down', boolean>>) => ({
  t: 'move' as const,
  left: false,
  right: false,
  up: false,
  down: false,
  ...o,
});

function shootRope(g: Game): Rope {
  g.step([{ t: 'select', weapon: 'rope' }]);
  g.step([{ t: 'fire', down: true }]);
  const rope = g.world.ofKind<Rope>('rope')[0]!;
  stepUntil(g, () => rope.state !== 'shooting');
  return rope;
}

describe('ninja rope', () => {
  it('hooks onto the ceiling and the worm hangs from it without ending the turn', () => {
    const g = cave();
    const rope = shootRope(g);
    expect(rope.state).toBe('attached');
    expect(rope.anchors[0]!.y).toBeCloseTo(80, -1);
    expect(g.activeWorm!.state).toBe('roped');
    for (let i = 0; i < 50; i++) g.step();
    expect(g.phase).toBe('turn');
  });

  it('swings with the arrows and climbs with up', () => {
    const g = cave();
    const rope = shootRope(g);
    const me = g.activeWorm!;
    const len = rope.length;
    g.step([keys({ up: true })]);
    for (let i = 0; i < 20; i++) g.step();
    expect(rope.length).toBeLessThan(len - 30);
    const x0 = me.x;
    g.step([keys({ right: true })]);
    for (let i = 0; i < 40; i++) g.step();
    expect(me.x).toBeGreaterThan(x0 + 10);
    // The worm never ends up further from the pivot than the rope length.
    const p = rope.pivot!;
    expect(Math.hypot(me.cx - p.x, me.cy - p.y)).toBeLessThanOrEqual(rope.length + 1);
  });

  it('lets go on fire and shoots again in mid-air', () => {
    const g = cave();
    const rope = shootRope(g);
    const me = g.activeWorm!;
    g.step([keys({ up: true })]);
    for (let i = 0; i < 25; i++) g.step();
    g.step([keys({})]);
    g.step([{ t: 'fire', down: true }]);
    expect(me.state).toBe('airborne');
    expect(rope.state).toBe('loose');
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => rope.state !== 'shooting');
    expect(rope.state).toBe('attached');
    expect(me.state).toBe('roped');
  });

  it('allows attacking from the rope, which starts the retreat', () => {
    const g = cave();
    shootRope(g);
    const me = g.activeWorm!;
    me.aim = 0;
    g.step([{ t: 'select', weapon: 'bazooka' }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 10; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    expect(g.world.ofKind('projectile').length).toBe(1);
    expect(g.phase).toBe('retreat');
    expect(me.state).toBe('roped');
  });

  it('drops the worm when the anchor is blown away', () => {
    const g = cave();
    const rope = shootRope(g);
    const a = rope.anchors[0]!;
    explode(g.world, a.x, a.y - 5, { crater: 30, radius: 5, damage: 1 });
    g.step();
    expect(rope.state).toBe('loose');
    expect(g.activeWorm!.state).toBe('airborne');
  });

  it('does not bend around the landscape: the rope stays one straight line', () => {
    const g = cave();
    const me = g.activeWorm!;
    for (let y = 80; y < 150; y++)
      for (let x = me.x + 40; x < me.x + 50; x++) g.world.terrain.set(x, y, Material.Soil);
    me.aim = Math.PI / 2 - 0.2;
    const rope = shootRope(g);
    g.step([keys({ right: true })]);
    for (let i = 0; i < 200; i++) g.step();
    expect(rope.anchors.length).toBe(1);
  });

  it('shortening the rope speeds the swing up (angular momentum is conserved)', () => {
    const g = cave();
    const rope = shootRope(g);
    const me = g.activeWorm!;
    g.step([keys({ right: true })]);
    for (let i = 0; i < 60; i++) g.step();
    g.step([keys({})]);
    // Angular momentum about the hook: radius × tangential speed.
    const moment = () => {
      const p = rope.pivot!;
      const dx = me.cx - p.x;
      const dy = me.cy - p.y;
      const r = Math.hypot(dx, dy);
      return { r, l: dx * me.vy - dy * me.vx };
    };
    const before = moment();
    g.step([keys({ up: true })]);
    const after = moment();
    expect(after.r).toBeLessThan(before.r);
    expect(Math.abs(after.l - before.l) / Math.abs(before.l)).toBeLessThan(0.12);
  });

  it('limits re-shots per turn by the weapon power (3 by default) and never fires downwards', () => {
    const g = cave();
    const me = g.activeWorm!;
    const rope = shootRope(g);
    expect(me.ropeShots).toBe(1);
    expect(rope.hookY).toBeLessThanOrEqual(g.activeWorm!.cy);
    for (let n = 2; n <= 3; n++) {
      g.step([{ t: 'fire', down: true }]);
      g.step([{ t: 'fire', down: true }]);
      stepUntil(g, () => rope.state !== 'shooting');
      expect(me.ropeShots).toBe(n);
    }
    // The fourth shot is refused.
    g.step([{ t: 'fire', down: true }]);
    g.step([{ t: 'fire', down: true }]);
    expect(me.ropeShots).toBe(3);
    expect(me.state).toBe('airborne');
  });
});
