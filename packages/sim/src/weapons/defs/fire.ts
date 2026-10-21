import { Flame } from '../fire';
import { Projectile } from '../projectile';
import { muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { registerLegacy } from '../legacy';
import { MAX_LAUNCH } from './artillery';

registerLegacy({
  id: 'petrol',
  aim: 'angle',
  charge: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * 0.8 * ctx.power;
    const bomb = ctx.world.spawn(
      new Projectile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'petrol',
          radius: 2.5,
          wind: 0,
          impact: 'explode',
          // A small bang (10 hp) and a lot of burning petrol.
          blast: scaledBlast(10, ctx.setting.power, { push: 0.5 }),
          flames: { count: 40, speed: 2.4 },
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: p.x, y: p.y });
    ctx.focus(bomb.id);
  },
});

registerLegacy({
  id: 'skunk',
  aim: 'angle',
  charge: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * 0.7 * ctx.power;
    const skunk = ctx.world.spawn(
      new Projectile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'skunk',
          radius: 3,
          wind: 0,
          impact: 'explode',
          blast: scaledBlast(15, ctx.setting.power, { push: 0.6 }),
          gas: { count: 28 },
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: p.x, y: p.y });
    ctx.focus(skunk.id);
  },
});

registerLegacy({
  id: 'flamethrower',
  aim: 'angle',
  charge: false,
  fire: (ctx) => {
    const { world, worm } = ctx;
    const p = muzzle(worm, ctx.dirX, ctx.dirY, 8);
    // One long burst of napalm along the aim line, each blob a little different.
    let last = 0;
    for (let i = 0; i < 36; i++) {
      const speed = world.rng.range(3, 7.5);
      const spread = world.rng.range(-0.18, 0.18);
      const flame = new Flame(
        p.x,
        p.y,
        (ctx.dirX - ctx.dirY * spread) * speed,
        (ctx.dirY + ctx.dirX * spread) * speed,
        world.rng.int(150, 300),
      );
      last = world.spawn(flame).id;
    }
    world.emit({ type: 'sound', id: 'flame', x: p.x, y: p.y });
    ctx.focus(last);
  },
});
