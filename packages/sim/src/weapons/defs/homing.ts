import { HomingMissile } from '../homing';
import { Pigeon } from '../pigeon';
import { Projectile } from '../projectile';
import { muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { registerWeapon } from '../weapon';
import { MAX_LAUNCH } from './artillery';

/** Launch speed at full power, px/tick: lock-on (25 ticks) happens ~546 px up when fired straight up. */
const HOMING_LAUNCH = 24.3;

registerWeapon({
  id: 'homing',
  name: 'Homing Missile',
  row: 1,
  col: 1,
  aim: 'angle',
  charge: true,
  needsTarget: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    // Full power lets it lock on 546 px above the ground when fired straight up (worms2d.info).
    const v = HOMING_LAUNCH * ctx.power;
    const m = ctx.world.spawn(
      new HomingMissile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'homing',
          radius: 2,
          wind: 0,
          impact: 'explode',
          fuse: 10 * 50,
          blast: scaledBlast(50, ctx.setting.power),
          armTicks: 25,
          lockEndTick: 4 * 50,
          pull: 2.2,
          maxSpeed: 24,
        },
        // It may also be fired without a marker, as a plain shell.
        ctx.target?.x ?? null,
        ctx.target?.y ?? null,
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'launch', x: p.x, y: p.y });
    ctx.focus(m.id);
  },
});

registerWeapon({
  id: 'mortar',
  name: 'Mortar',
  row: 1,
  col: 2,
  aim: 'angle',
  charge: false,
  fire: (ctx) => {
    // Always fired at full power: only the angle matters.
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH;
    const shell = ctx.world.spawn(
      new Projectile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'mortar',
          radius: 2.5,
          wind: 0,
          impact: 'explode',
          blast: scaledBlast(20, ctx.setting.power),
          cluster: {
            count: ctx.upgrades.clusters ? 9 : 6,
            minSpeed: 2,
            maxSpeed: 4,
            spread: 0.9,
            projectile: {
              look: 'clusterlet',
              radius: 2,
              wind: 0,
              impact: 'explode',
              blast: scaledBlast(15, ctx.setting.power),
            },
          },
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'launch', x: p.x, y: p.y });
    ctx.focus(shell.id);
  },
});

registerWeapon({
  id: 'pigeon',
  name: 'Homing Pigeon',
  row: 1,
  col: 3,
  aim: 'target',
  charge: false,
  fire: (ctx) => {
    if (!ctx.target) return;
    const bird = ctx.world.spawn(
      new Pigeon(
        ctx.worm.cx + ctx.worm.facing * 8,
        ctx.worm.cy - 6,
        ctx.worm.facing,
        ctx.target.x,
        ctx.target.y,
        scaledBlast(75, ctx.setting.power),
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: bird.x, y: bird.y });
    ctx.focus(bird.id);
  },
});
