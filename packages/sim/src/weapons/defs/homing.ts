import { HomingMissile } from '../homing';
import { muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { registerWeapon } from '../weapon';
import { MAX_LAUNCH } from './artillery';

registerWeapon({
  id: 'homing',
  name: 'Homing Missile',
  row: 1,
  col: 1,
  aim: 'angle',
  charge: true,
  needsTarget: true,
  fire: (ctx) => {
    if (!ctx.target) return;
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * ctx.power;
    const m = ctx.world.spawn(
      new HomingMissile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'homing',
          radius: 2,
          wind: 1,
          impact: 'explode',
          blast: scaledBlast(50, ctx.setting.power),
          armTicks: 30,
          homingTicks: 5 * 50,
          speed: 9,
          turn: 0.25,
        },
        ctx.target.x,
        ctx.target.y,
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'launch', x: p.x, y: p.y });
    ctx.focus(m.id);
  },
});
