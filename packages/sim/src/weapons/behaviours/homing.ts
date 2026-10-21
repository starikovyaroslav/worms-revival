import type { Upgrades } from '../../game/scheme';
import {
  buildBlast,
  buildProjectile,
  type BlastParams,
  type ProjectileParams,
} from '../archetypes/projectile';
import { HomingMissile, type HomingSpec } from '../homing';
import { Flame } from '../fire';
import { Pigeon } from '../pigeon';
import { Projectile, muzzle } from '../projectile';
import type { Look } from '../spec';
import type { Behaviour } from './types';

export interface HomingParams {
  /** Launch speed at full power, px/tick. */
  speed: number;
  projectile: ProjectileParams;
  /** Ticks of plain ballistic flight before it locks on. */
  armTicks: number;
  /** Age in ticks at which the attraction ends. */
  lockEndTick: number;
  /** Pull towards the target, px/tick². */
  pull: number;
  /** Speed limit while pulled, px/tick. */
  maxSpeed: number;
}

/** Fired like a shell, then pulled towards the marker; it may also be fired without one. */
export const homing: Behaviour<HomingParams> = {
  fire(ctx, p, view) {
    const m = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = p.speed * ctx.power;
    const spec: HomingSpec = {
      ...buildProjectile(p.projectile, ctx),
      armTicks: p.armTicks,
      lockEndTick: p.lockEndTick,
      pull: p.pull,
      maxSpeed: p.maxSpeed,
    };
    const missile = ctx.world.spawn(
      new HomingMissile(
        m.x,
        m.y,
        ctx.dirX * v,
        ctx.dirY * v,
        spec,
        ctx.target?.x ?? null,
        ctx.target?.y ?? null,
        ctx.worm.id,
      ),
    );
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: m.x, y: m.y });
    ctx.focus(missile.id);
  },
};

export interface MortarParams {
  /** Launch speed (always fired at full power), px/tick. */
  speed: number;
  /** By scheme power level 1..5: bomblets, damage and crater diameter, for the shell and each bomblet. */
  levels: { clusters: number; damage: number; diameter: number }[];
  shell: { look: Look; radius: number; wind: number };
  bomblet: { look: Look; radius: number; wind: number };
  scatter: { minSpeed: number; maxSpeed: number; spread: number };
  /** Extra bomblets when the scheme enables this upgrade. */
  upgrade: { name: keyof Upgrades; extra: number };
}

/** Shell that bursts into bomblets, fired backwards out of the explosion. */
export const mortar: Behaviour<MortarParams> = {
  fire(ctx, p, view) {
    const m = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = p.speed;
    const level = Math.min(5, Math.max(1, Math.round(ctx.setting.power)));
    const { clusters, damage, diameter } = p.levels[level - 1] as MortarParams['levels'][number];
    const crater = diameter / 2;
    const blast = { damage, crater, radius: crater * 1.15 };
    const shell = ctx.world.spawn(
      new Projectile(
        m.x,
        m.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: p.shell.look,
          radius: p.shell.radius,
          wind: p.shell.wind,
          impact: 'explode',
          // The shell explodes like one of its bomblets.
          blast,
          cluster: {
            count: ctx.upgrades[p.upgrade.name] ? clusters + p.upgrade.extra : clusters,
            minSpeed: p.scatter.minSpeed,
            maxSpeed: p.scatter.maxSpeed,
            spread: p.scatter.spread,
            reverse: true,
            projectile: {
              look: p.bomblet.look,
              radius: p.bomblet.radius,
              wind: p.bomblet.wind,
              impact: 'explode',
              blast,
            },
          },
        },
        ctx.worm.id,
      ),
    );
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: m.x, y: m.y });
    ctx.focus(shell.id);
  },
};

export interface PigeonParams {
  /** Starts in front of and above the body centre, px. */
  offsetX: number;
  offsetY: number;
  blast: BlastParams;
}

export const pigeon: Behaviour<PigeonParams> = {
  fire(ctx, p, view) {
    if (!ctx.target) return;
    const bird = ctx.world.spawn(
      new Pigeon(
        ctx.worm.cx + ctx.worm.facing * p.offsetX,
        ctx.worm.cy + p.offsetY,
        ctx.worm.facing,
        ctx.target.x,
        ctx.target.y,
        buildBlast(p.blast, ctx),
        ctx.worm.id,
      ),
    );
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: bird.x, y: bird.y });
    ctx.focus(bird.id);
  },
};

export interface FlamethrowerParams {
  /** Distance of the nozzle from the body centre, px. */
  muzzle: number;
  /** Blobs in the burst. */
  count: number;
  speed: { min: number; max: number };
  /** Sideways scatter, radians. */
  spread: number;
  /** Burn time of each blob, ticks. */
  life: { min: number; max: number };
}

/** One long burst of napalm along the aim line, each blob a little different. */
export const flamethrower: Behaviour<FlamethrowerParams> = {
  fire(ctx, p, view) {
    const { world, worm } = ctx;
    const m = muzzle(worm, ctx.dirX, ctx.dirY, p.muzzle);
    let last = 0;
    for (let i = 0; i < p.count; i++) {
      const speed = world.rng.range(p.speed.min, p.speed.max);
      const spread = world.rng.range(-p.spread, p.spread);
      const flame = new Flame(
        m.x,
        m.y,
        (ctx.dirX - ctx.dirY * spread) * speed,
        (ctx.dirY + ctx.dirX * spread) * speed,
        world.rng.int(p.life.min, p.life.max),
      );
      last = world.spawn(flame).id;
    }
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: m.x, y: m.y });
    ctx.focus(last);
  },
};
