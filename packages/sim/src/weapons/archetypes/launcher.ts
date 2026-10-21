import { Projectile, muzzle } from '../projectile';
import type { ViewSpec, SimFlags } from '../spec';
import type { FireContext } from '../weapon';
import { buildProjectile, type ProjectileParams } from './projectile';

/** A projectile shot or thrown from the muzzle along the aim line (bazooka, grenade, banana...). */
export interface LauncherSim extends SimFlags {
  archetype: 'launcher';
  /** Launch speed at full power, px/tick. */
  speed: number;
  projectile: ProjectileParams;
}

export function fireLauncher(ctx: FireContext, sim: LauncherSim, view: ViewSpec): void {
  const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
  const v = sim.speed * ctx.power;
  const proj = ctx.world.spawn(
    new Projectile(
      p.x,
      p.y,
      ctx.dirX * v,
      ctx.dirY * v,
      buildProjectile(sim.projectile, ctx),
      ctx.worm.id,
    ),
  );
  if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: p.x, y: p.y });
  ctx.focus(proj.id);
}
