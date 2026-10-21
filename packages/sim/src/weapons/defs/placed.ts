import { Projectile } from '../projectile';
import { scaledBlast } from '../blast';
import { Mine } from '../mine';
import { registerLegacy } from '../legacy';
import { TPS } from '../../core/time';

registerLegacy({
  id: 'dynamite',
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm, world } = ctx;
    const stick = world.spawn(
      new Projectile(
        worm.x + worm.facing * 4,
        worm.cy,
        worm.facing * 0.6,
        -1,
        {
          look: 'dynamite',
          radius: 3,
          wind: 0,
          impact: 'bounce',
          fuse: 5 * TPS,
          restitution: 0.15,
          friction: 0.5,
          blast: scaledBlast(75, ctx.setting.power),
        },
        worm.id,
      ),
    );
    ctx.focus(stick.id);
  },
});

registerLegacy({
  id: 'mine',
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm, world } = ctx;
    const mine = new Mine(worm.x + worm.facing * 6, worm.cy, {
      armTicks: 2 * TPS,
      fuseTicks: 3 * TPS,
      dudsAllowed: false,
      power: ctx.setting.power,
    });
    mine.vx = worm.facing * 0.8;
    mine.vy = -1;
    world.spawn(mine);
  },
});
