import { Projectile } from '../projectile';
import { scaledBlast } from '../blast';
import { registerWeapon } from '../weapon';

/** Altitude above the map top at which the plane releases its payload. */
const DROP_ALTITUDE = 80;
const STRIKE_SPEED = 4;

registerWeapon({
  id: 'airstrike',
  name: 'Air Strike',
  row: 6,
  col: 0,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    const { world, worm, target } = ctx;
    if (!target) return;
    const dir = worm.facing;
    const vx = STRIKE_SPEED * dir;
    const y0 = -DROP_ALTITUDE;
    // Release point so that the middle missile lands on the target.
    const fall = target.y - y0;
    const t = Math.sqrt((2 * fall) / world.physics.gravity);
    const x0 = target.x - vx * t;
    world.emit({ type: 'sound', id: 'airstrike', x: target.x, y: 0 });
    for (let i = -2; i <= 2; i++) {
      const m = world.spawn(
        new Projectile(
          x0 + i * 22 * dir,
          y0 - Math.abs(i) * 4,
          vx,
          0,
          {
            look: 'missile',
            radius: 2,
            wind: 0,
            impact: 'explode',
            blast: scaledBlast(30, ctx.setting.power),
          },
          worm.id,
        ),
      );
      if (i === 0) ctx.focus(m.id);
    }
  },
});
