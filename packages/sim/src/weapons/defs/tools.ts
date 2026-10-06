import { Material } from '../../terrain/terrain';
import type { World } from '../../world/world';
import { Worm, WORM_H, WORM_HALF_W } from '../../worm/worm';
import { registerWeapon } from '../weapon';

export const GIRDER_HALF_LENGTH = 30;
export const GIRDER_HALF_THICKNESS = 4;
/** How far from the worm a girder may be placed, px. */
export const GIRDER_REACH = 260;

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

registerWeapon({
  id: 'girder',
  name: 'Girder',
  row: 7,
  col: 2,
  aim: 'target',
  charge: false,
  validTarget: (world, worm, t) => {
    const dx = t.x - worm.cx;
    const dy = t.y - worm.cy;
    if (dx * dx + dy * dy > GIRDER_REACH * GIRDER_REACH) return false;
    return !overlapsWorm(world, t.x, t.y, GIRDER_HALF_LENGTH * 0.6);
  },
  fire: (ctx) => {
    if (!ctx.target) return;
    const a = girderAxis(ctx.dirX, ctx.dirY);
    ctx.world.terrain.fillRotatedRect(
      ctx.target.x,
      ctx.target.y,
      GIRDER_HALF_LENGTH,
      GIRDER_HALF_THICKNESS,
      a.x,
      a.y,
      Material.Girder,
    );
    ctx.world.emit({ type: 'sound', id: 'girder', x: ctx.target.x, y: ctx.target.y });
  },
});

registerWeapon({
  id: 'teleport',
  name: 'Teleport',
  row: 8,
  col: 3,
  aim: 'target',
  charge: false,
  validTarget: (world, worm, t) =>
    t.x > WORM_HALF_W &&
    t.x < world.terrain.width - WORM_HALF_W &&
    t.y > WORM_H &&
    t.y < world.waterLevel - 10 &&
    !worm.bodyCollides(world, t.x, t.y + WORM_H / 2),
  fire: (ctx) => {
    const { worm, world, target } = ctx;
    if (!target) return;
    world.emit({ type: 'sound', id: 'teleport', x: worm.x, y: worm.y });
    worm.x = worm.prevX = target.x;
    worm.y = worm.prevY = target.y + WORM_H / 2;
    worm.launch(0, 0, false);
    world.emit({ type: 'sound', id: 'teleport', x: worm.x, y: worm.y });
  },
});

registerWeapon({
  id: 'skipgo',
  name: 'Skip Go',
  row: 12,
  col: 0,
  aim: 'none',
  charge: false,
  action: 'skip',
  fire: () => {},
});

registerWeapon({
  id: 'surrender',
  name: 'Surrender',
  row: 12,
  col: 1,
  aim: 'none',
  charge: false,
  action: 'surrender',
  fire: () => {},
});
