import type { Upgrades } from '../../game/scheme';
import { Mine } from '../mine';
import { Projectile } from '../projectile';
import { Sheep, type SheepOptions } from '../sheep';
import { scaledBlast } from '../blast';
import type { AnimalLook } from '../spec';
import type { FireContext } from '../weapon';
import { buildProjectile, type ProjectileParams } from './projectile';

/** A walking bomb: sheep and the other animals (they are all `Sheep` entities). */
export interface AnimalParams {
  /** Explosion damage at power level 3. */
  damage: number;
  /** Walking time before it blows up by itself, ticks. */
  fuse: number;
  look?: AnimalLook;
  /** Walking speed, px/tick. */
  speed?: number;
  /** False: fire does not set it off (Old Woman). */
  manual?: boolean;
  /** Goes off by itself when it touches a worm (Mad Cows). */
  contact?: boolean;
  /** Super Sheep: takes off on the second press. */
  canFly?: boolean;
  /** Flying under water as well when the scheme enables this upgrade (needs `canFly`). */
  aquaUpgrade?: keyof Upgrades;
}

export interface MineParams {
  /** Ticks before the mine becomes live. */
  armTicks: number;
  /** Ticks from trigger to explosion. */
  fuseTicks: number;
  dudsAllowed: boolean;
}

/** What a placing or dropping weapon puts into the world. */
export type Payload =
  | { kind: 'projectile'; projectile: ProjectileParams }
  | ({ kind: 'mine' } & MineParams)
  | ({ kind: 'animal' } & AnimalParams);

export function makeAnimal(
  ctx: FireContext,
  a: AnimalParams,
  x: number,
  y: number,
  dir: 1 | -1,
): Sheep {
  const opts: SheepOptions = {
    blast: scaledBlast(a.damage, ctx.setting.power),
    fuse: a.fuse,
    canFly: a.canFly ?? false,
    aqua: !!(a.canFly && a.aquaUpgrade && ctx.upgrades[a.aquaUpgrade]),
  };
  if (a.look !== undefined) opts.look = a.look;
  if (a.speed !== undefined) opts.speed = a.speed;
  if (a.manual !== undefined) opts.manual = a.manual;
  if (a.contact !== undefined) opts.contact = a.contact;
  return ctx.world.spawn(new Sheep(x, y, dir, opts, ctx.worm.id));
}

/** Spawns the payload at a point with a velocity; returns its entity id. */
export function spawnPayload(
  ctx: FireContext,
  payload: Payload,
  x: number,
  y: number,
  vx: number,
  vy: number,
): number {
  switch (payload.kind) {
    case 'projectile':
      return ctx.world.spawn(
        new Projectile(x, y, vx, vy, buildProjectile(payload.projectile, ctx), ctx.worm.id),
      ).id;
    case 'mine': {
      const mine = new Mine(x, y, {
        armTicks: payload.armTicks,
        fuseTicks: payload.fuseTicks,
        dudsAllowed: payload.dudsAllowed,
        power: ctx.setting.power,
      });
      mine.vx = vx;
      mine.vy = vy;
      return ctx.world.spawn(mine).id;
    }
    case 'animal': {
      const animal = makeAnimal(ctx, payload, x, y, ctx.worm.facing);
      animal.vx = vx;
      animal.vy = vy;
      return animal.id;
    }
  }
}
