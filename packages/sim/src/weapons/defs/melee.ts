import type { World } from '../../world/world';
import { Worm } from '../../worm/worm';
import { explode } from '../explosion';
import { powerScale, registerWeapon, type FireContext } from '../weapon';

/** Living worms (other than `except`) whose body centre is within `r` of a point. */
export function wormsNear(world: World, x: number, y: number, r: number, except?: Worm): Worm[] {
  return world.ofKind<Worm>('worm').filter((w) => {
    if (!w.alive || w === except) return false;
    const dx = w.cx - x;
    const dy = w.cy - y;
    return dx * dx + dy * dy <= r * r;
  });
}

/** Hits worms just in front of the attacker. Returns true if anyone was hit. */
function strike(
  ctx: FireContext,
  reach: number,
  damage: number,
  vx: number,
  vy: number,
  sound: string,
): boolean {
  const { world, worm } = ctx;
  const hx = worm.cx + ctx.dirX * reach * 0.6;
  const hy = worm.cy + ctx.dirY * reach * 0.6;
  const victims = wormsNear(world, hx, hy, reach, worm);
  for (const v of victims) {
    v.takeDamage(world, damage * powerScale(ctx.setting.power));
    v.push(vx, vy);
  }
  world.emit({ type: 'sound', id: victims.length ? sound : 'swish', x: hx, y: hy });
  return victims.length > 0;
}

const SHOTGUN_RANGE = 700;
const PELLET_HIT_RADIUS = 6;

/** Fires one hitscan pellet; hits the first worm or land along the ray. */
function pellet(ctx: FireContext): void {
  const { world, worm, dirX, dirY } = ctx;
  const sx = worm.cx + dirX * 8;
  const sy = worm.cy + dirY * 8;
  const worms = world.ofKind<Worm>('worm').filter((w) => w.alive && w !== worm);
  const damage = 25 * powerScale(ctx.setting.power);
  for (let d = 0; d <= SHOTGUN_RANGE; d += 1) {
    const x = sx + dirX * d;
    const y = sy + dirY * d;
    for (const w of worms) {
      const dx = w.cx - x;
      const dy = w.cy - y;
      if (dx * dx + dy * dy <= PELLET_HIT_RADIUS * PELLET_HIT_RADIUS) {
        w.takeDamage(world, damage);
        w.push(dirX * 2.6, dirY * 2.6 - 1.2);
        world.emit({ type: 'explosion', x, y, radius: 6 });
        return;
      }
    }
    if (world.terrain.isSolid(x, y)) {
      explode(world, x, y, { crater: 8, radius: 14, damage: 8 });
      return;
    }
    if (y > world.waterLevel) {
      world.emit({ type: 'splash', x, y: world.waterLevel, size: 0.3 });
      return;
    }
  }
}

registerWeapon({
  id: 'shotgun',
  name: 'Shotgun',
  row: 3,
  col: 0,
  aim: 'angle',
  charge: false,
  shots: 2,
  fire: (ctx) => {
    ctx.world.emit({ type: 'sound', id: 'shotgun', x: ctx.worm.x, y: ctx.worm.y });
    pellet(ctx);
    if (ctx.upgrades.shotgun) pellet(ctx);
  },
});

registerWeapon({
  id: 'firepunch',
  name: 'Fire Punch',
  row: 4,
  col: 0,
  aim: 'none',
  charge: false,
  retreat: 3,
  fire: (ctx) => {
    const { world, worm } = ctx;
    // The uppercut cuts a channel through the land above the worm.
    for (let i = 0; i <= 4; i++) world.terrain.carveCircle(worm.x, worm.y - 8 - i * 9, 7, false);
    strike(ctx, 14, 30, worm.facing * 1.6, -6.2, 'punch');
    worm.launch(0, -4.4, false);
  },
});

registerWeapon({
  id: 'bat',
  name: 'Baseball Bat',
  row: 7,
  col: 3,
  aim: 'angle',
  charge: false,
  fire: (ctx) => {
    // Home run along the aim direction, always a little upwards.
    const dy = Math.min(ctx.dirY, -0.15);
    strike(ctx, 16, 30, ctx.dirX * 10.5, dy * 10.5, 'bat');
  },
});

registerWeapon({
  id: 'prod',
  name: 'Prod',
  row: 4,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    strike(
      { ...ctx, setting: { ...ctx.setting, power: 3 } },
      12,
      0,
      ctx.worm.facing * 1.8,
      -1.2,
      'prod',
    );
  },
});
