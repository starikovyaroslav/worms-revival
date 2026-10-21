import {
  buildBlast,
  buildProjectile,
  type BlastParams,
  type ProjectileParams,
} from '../archetypes/projectile';
import { wormsNear } from '../archetypes/melee';
import { KamikazeFlight } from '../kamikaze';
import { explode } from '../explosion';
import { Projectile } from '../projectile';
import type { Behaviour } from './types';

export interface AxeParams {
  /** The swing lands this far in front of the body centre, px. */
  offsetX: number;
  radius: number;
}

/** Takes half of the victim's current health (at least 1): even a 1 hp worm is finished. */
export const axe: Behaviour<AxeParams> = {
  fire(ctx, p, view) {
    const { world, worm } = ctx;
    const hx = worm.cx + worm.facing * p.offsetX;
    const victims = wormsNear(world, hx, worm.cy, p.radius, worm);
    for (const v of victims) v.takeDamage(world, Math.max(1, Math.ceil(v.health / 2)));
    const sound = victims.length ? view.sound : view.missSound;
    if (sound) world.emit({ type: 'sound', id: sound, x: hx, y: worm.cy });
  },
};

export interface DragonballParams {
  offsetX: number;
  /** Straight flight speed, px/tick. */
  speed: number;
  projectile: ProjectileParams;
}

/** A fireball that flies straight for a short way and goes off on contact. */
export const dragonball: Behaviour<DragonballParams> = {
  fire(ctx, p, view) {
    const { world, worm } = ctx;
    const ball = world.spawn(
      new Projectile(
        worm.cx + worm.facing * p.offsetX,
        worm.cy,
        worm.facing * p.speed,
        0,
        buildProjectile(p.projectile, ctx),
        worm.id,
      ),
    );
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: worm.x, y: worm.y });
    ctx.focus(ball.id);
  },
};

export interface KamikazeParams {
  blast: BlastParams;
}

export const kamikaze: Behaviour<KamikazeParams> = {
  fire(ctx, p, view) {
    const { world, worm } = ctx;
    const f = world.spawn(
      new KamikazeFlight(worm.id, ctx.dirX, ctx.dirY, buildBlast(p.blast, ctx)),
    );
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: worm.x, y: worm.y });
    ctx.focus(f.id);
  },
};

export interface SuicideParams {
  blast: BlastParams;
}

/** The bomber goes with the blast (and the usual death blast follows). */
export const suicide: Behaviour<SuicideParams> = {
  fire(ctx, p) {
    const { world, worm } = ctx;
    explode(world, worm.cx, worm.cy, buildBlast(p.blast, ctx));
    worm.takeDamage(world, worm.health);
  },
};
