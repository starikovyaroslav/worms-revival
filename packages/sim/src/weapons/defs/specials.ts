import { Projectile, muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { Sheep } from '../sheep';
import { registerWeapon, type FireContext } from '../weapon';
import { BOUNCE_HIGH, BOUNCE_LOW, MAX_LAUNCH } from './artillery';

function throwIt(ctx: FireContext, p: Projectile): void {
  ctx.world.spawn(p);
  ctx.focus(p.id);
}

registerWeapon({
  id: 'banana',
  name: 'Banana Bomb',
  row: 2,
  col: 2,
  aim: 'angle',
  charge: true,
  fuse: true,
  bounce: true,
  fire: (ctx) => {
    const m = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * ctx.power;
    const banana = scaledBlast(75, ctx.setting.power);
    throwIt(
      ctx,
      new Projectile(
        m.x,
        m.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'banana',
          radius: 3,
          wind: 0,
          impact: 'bounce',
          fuse: ctx.fuse,
          restitution: ctx.bounceHigh ? BOUNCE_HIGH : BOUNCE_LOW,
          blast: banana,
          cluster: {
            count: 5,
            minSpeed: 3.5,
            maxSpeed: 7,
            spread: 0.7,
            projectile: {
              look: 'bananalet',
              radius: 2.5,
              wind: 0,
              impact: 'explode',
              blast: banana,
            },
          },
        },
        ctx.worm.id,
      ),
    );
  },
});

registerWeapon({
  id: 'hhg',
  name: 'Holy Hand Grenade',
  row: 9,
  col: 1,
  aim: 'angle',
  charge: true,
  fire: (ctx) => {
    const m = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * ctx.power;
    throwIt(
      ctx,
      new Projectile(
        m.x,
        m.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'hhg',
          radius: 3.5,
          wind: 0,
          impact: 'bounce',
          // Fixed three second fuse, minimum bounce, waits until it stops.
          fuse: 3 * 50,
          restitution: BOUNCE_LOW,
          friction: 0.8,
          waitForRest: true,
          preSound: { id: 'hallelujah', ticks: 60 },
          blast: scaledBlast(100, ctx.setting.power, { push: 1.3 }),
        },
        ctx.worm.id,
      ),
    );
  },
});

function releaseSheep(ctx: FireContext, canFly: boolean): void {
  const { worm, world } = ctx;
  const sheep = world.spawn(
    new Sheep(
      worm.x + worm.facing * 8,
      worm.cy,
      worm.facing,
      {
        blast: scaledBlast(75, ctx.setting.power),
        fuse: 9 * 50,
        canFly,
        aqua: canFly && ctx.upgrades.aquaSheep,
      },
      worm.id,
    ),
  );
  world.emit({ type: 'sound', id: 'baa', x: sheep.x, y: sheep.y });
  ctx.control(sheep.id);
}

registerWeapon({
  id: 'sheep',
  name: 'Sheep',
  row: 5,
  col: 2,
  aim: 'none',
  charge: false,
  fire: (ctx) => releaseSheep(ctx, false),
});

registerWeapon({
  id: 'supersheep',
  name: 'Super Sheep',
  row: 5,
  col: 3,
  aim: 'none',
  charge: false,
  fire: (ctx) => releaseSheep(ctx, true),
});
