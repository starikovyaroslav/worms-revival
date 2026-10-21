import { Material } from '../../terrain/terrain';
import type { World } from '../../world/world';
import { WORM_H, WORM_HALF_W, type Worm } from '../../worm/worm';
import type { Behaviour } from './types';

const dist = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

export interface GirderParams {
  halfLength: number;
  halfThickness: number;
  /** How far from the worm a girder may be placed, px. */
  reach: number;
}

function overlapsWorm(world: World, x: number, y: number, r: number): boolean {
  return world.ofKind<Worm>('worm').some((w) => {
    if (!w.alive) return false;
    const dx = w.cx - x;
    const dy = w.cy - y;
    return dx * dx + dy * dy < (r + WORM_H / 2) * (r + WORM_H / 2);
  });
}

/** Girder axis: horizontal, rotated by the aim. */
export function girderAxis(dirX: number, dirY: number): { x: number; y: number } {
  return { x: Math.abs(dirX), y: dirX >= 0 ? dirY : -dirY };
}

export const girder: Behaviour<GirderParams> = {
  validTarget(world, worm, t, _dx, _dy, p) {
    const dx = t.x - worm.cx;
    const dy = t.y - worm.cy;
    if (dx * dx + dy * dy > p.reach * p.reach) return false;
    return !overlapsWorm(world, t.x, t.y, p.halfLength * 0.6);
  },
  fire(ctx, p, view) {
    if (!ctx.target) return;
    const a = girderAxis(ctx.dirX, ctx.dirY);
    ctx.world.terrain.fillRotatedRect(
      ctx.target.x,
      ctx.target.y,
      p.halfLength,
      p.halfThickness,
      a.x,
      a.y,
      Material.Girder,
    );
    if (view.sound)
      ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.target.x, y: ctx.target.y });
  },
};

export const teleport: Behaviour<Record<string, never>> = {
  validTarget: (world, worm, t) =>
    t.x > WORM_HALF_W &&
    t.x < world.terrain.width - WORM_HALF_W &&
    t.y > WORM_H &&
    t.y < world.waterLevel - 10 &&
    !worm.bodyCollides(world, t.x, t.y + WORM_H / 2),
  fire(ctx, _p, view) {
    const { worm, world, target } = ctx;
    if (!target) return;
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: worm.x, y: worm.y });
    worm.x = worm.prevX = target.x;
    worm.y = worm.prevY = target.y + WORM_H / 2;
    worm.launch(0, 0, false);
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: worm.x, y: worm.y });
  },
};

/** Every team ends up with the same total health, shared equally between its worms. */
export const scales: Behaviour<Record<string, never>> = {
  fire(ctx, _p, view) {
    const worms = ctx.world.ofKind<Worm>('worm').filter((w) => w.alive);
    const teams = [...new Set(worms.map((w) => w.team))];
    if (!teams.length) return;
    const total = worms.reduce((n, w) => n + w.health, 0);
    const each = total / teams.length;
    for (const t of teams) {
      const members = worms.filter((w) => w.team === t);
      const hp = Math.max(1, Math.round(each / members.length));
      for (const w of members) w.health = w.shownHealth = hp;
    }
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
  },
};

/** The whole team is encased in ice until its next turn. */
export const freeze: Behaviour<Record<string, never>> = {
  fire(ctx, _p, view) {
    for (const w of ctx.world.ofKind<Worm>('worm')) {
      if (w.alive && w.team === ctx.worm.team) w.invulnerable = true;
    }
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
  },
};

export interface SelectWormParams {
  /** A click must land this close to a team mate's body centre, px. */
  pickRadius: number;
}

export const selectworm: Behaviour<SelectWormParams> = {
  validTarget: (world, worm, t, _dx, _dy, p) =>
    world
      .ofKind<Worm>('worm')
      .some(
        (w) =>
          w.alive &&
          w !== worm &&
          w.team === worm.team &&
          dist(w.cx - t.x, w.cy - t.y) < p.pickRadius,
      ),
  fire(ctx) {
    const { target, worm, world } = ctx;
    if (!target) return;
    const pick = world
      .ofKind<Worm>('worm')
      .filter((w) => w.alive && w !== worm && w.team === worm.team)
      .sort(
        (a, b) => dist(a.cx - target.x, a.cy - target.y) - dist(b.cx - target.x, b.cy - target.y),
      )[0];
    if (pick) ctx.switchWorm(pick.id);
  },
};
