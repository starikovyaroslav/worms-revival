import { Projectile } from '../projectile';
import { scaledBlast } from '../blast';
import { Mine } from '../mine';
import { registerWeapon } from '../weapon';

registerWeapon({
  id: 'dynamite',
  name: 'Dynamite',
  row: 5,
  col: 0,
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
          fuse: 5 * 50,
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

registerWeapon({
  id: 'mine',
  name: 'Mine',
  row: 5,
  col: 1,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm, world } = ctx;
    const mine = new Mine(worm.x + worm.facing * 6, worm.cy, {
      armTicks: 2 * 50,
      fuseTicks: 3 * 50,
      dudsAllowed: false,
      power: ctx.setting.power,
    });
    mine.vx = worm.facing * 0.8;
    mine.vy = -1;
    world.spawn(mine);
  },
});
