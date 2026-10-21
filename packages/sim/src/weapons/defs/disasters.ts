import { Earthquake, MeteorShower } from '../disasters';
import { HomingMissile } from '../homing';
import { muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { type Worm } from '../../worm/worm';
import { registerLegacy } from '../legacy';
import { TPS } from '../../core/time';

registerLegacy({
  id: 'earthquake',
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    ctx.world.spawn(new Earthquake());
    ctx.world.emit({ type: 'sound', id: 'quake', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerLegacy({
  id: 'armageddon',
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    ctx.world.spawn(new MeteorShower(scaledBlast(30, ctx.setting.power), ctx.worm.id));
    ctx.world.emit({ type: 'sound', id: 'quake', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerLegacy({
  id: 'nuke',
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { world } = ctx;
    // A blinding flash (shown where the player looks, not at the water): everyone is poisoned and the water level rises.
    for (const w of world.ofKind<Worm>('worm')) if (w.alive) w.poisoned = true;
    world.waterLevel -= 30;
    world.emit({ type: 'explosion', x: ctx.worm.x, y: ctx.worm.y - 60, radius: 300 });
    world.emit({ type: 'shake', amount: 8 });
  },
});

registerLegacy({
  id: 'magicbullet',
  aim: 'angle',
  charge: false,
  needsTarget: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const t = ctx.target;
    // A bullet that finds its own way: no gravity, a hard pull towards the marker.
    const bullet = ctx.world.spawn(
      new HomingMissile(
        p.x,
        p.y,
        ctx.dirX * 5,
        ctx.dirY * 5,
        {
          look: 'bullet',
          radius: 1.5,
          wind: 0,
          gravity: 0,
          impact: 'explode',
          fuse: 8 * TPS,
          blast: scaledBlast(50, ctx.setting.power),
          armTicks: 0,
          lockEndTick: 8 * TPS,
          pull: 0.7,
          maxSpeed: 7,
        },
        t?.x ?? null,
        t?.y ?? null,
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'shot', x: p.x, y: p.y });
    ctx.focus(bullet.id);
  },
});
