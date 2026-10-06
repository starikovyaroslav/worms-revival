import { Projectile, muzzle, type ProjectileSpec } from '../projectile';
import { scaledBlast } from '../blast';
import { registerWeapon, type FireContext } from '../weapon';

/** Launch speed at full power, px/tick. */
export const MAX_LAUNCH = 14;

/** Max-bounce keeps 60% of the normal speed (W:A: −40%), min-bounce keeps 30% (−70%). */
export const BOUNCE_HIGH = 0.6;
export const BOUNCE_LOW = 0.3;

function launch(ctx: FireContext, spec: ProjectileSpec, speed = MAX_LAUNCH): Projectile {
  const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
  const v = speed * ctx.power;
  const proj = ctx.world.spawn(
    new Projectile(p.x, p.y, ctx.dirX * v, ctx.dirY * v, spec, ctx.worm.id),
  );
  ctx.focus(proj.id);
  return proj;
}

registerWeapon({
  id: 'bazooka',
  name: 'Bazooka',
  row: 1,
  col: 0,
  aim: 'angle',
  charge: true,
  fire: (ctx) =>
    launch(ctx, {
      look: 'missile',
      radius: 2,
      wind: 1,
      impact: 'explode',
      blast: scaledBlast(50, ctx.setting.power),
    }),
});

registerWeapon({
  id: 'grenade',
  name: 'Grenade',
  row: 2,
  col: 0,
  aim: 'angle',
  charge: true,
  fuse: true,
  bounce: true,
  fire: (ctx) =>
    launch(ctx, {
      look: 'grenade',
      radius: 3,
      wind: 0,
      impact: 'bounce',
      fuse: ctx.fuse,
      restitution: ctx.bounceHigh ? BOUNCE_HIGH : BOUNCE_LOW,
      friction: 0.96,
      blast: scaledBlast(ctx.upgrades.grenade ? 75 : 50, ctx.setting.power),
    }),
});

registerWeapon({
  id: 'cluster',
  name: 'Cluster Bomb',
  row: 2,
  col: 1,
  aim: 'angle',
  charge: true,
  fuse: true,
  bounce: true,
  fire: (ctx) =>
    launch(ctx, {
      look: 'cluster',
      radius: 3,
      wind: 0,
      impact: 'bounce',
      fuse: ctx.fuse,
      restitution: ctx.bounceHigh ? BOUNCE_HIGH : BOUNCE_LOW,
      friction: 0.96,
      blast: scaledBlast(25, ctx.setting.power),
      cluster: {
        count: ctx.upgrades.clusters ? 8 : 5,
        minSpeed: 2,
        maxSpeed: 4.5,
        spread: 0.8,
        projectile: {
          look: 'clusterlet',
          radius: 2,
          wind: 0,
          impact: 'explode',
          blast: scaledBlast(20, ctx.setting.power),
        },
      },
    }),
});
