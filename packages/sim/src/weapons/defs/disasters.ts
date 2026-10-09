import { Earthquake, MeteorShower } from '../disasters';
import { HomingMissile } from '../homing';
import { Projectile, muzzle } from '../projectile';
import { scaledBlast } from '../blast';
import { Worm } from '../../worm/worm';
import { registerWeapon } from '../weapon';
import { BOUNCE_HIGH, BOUNCE_LOW, MAX_LAUNCH } from './artillery';

registerWeapon({
  id: 'earthquake',
  name: 'Earthquake',
  row: 2,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    ctx.world.spawn(new Earthquake());
    ctx.world.emit({ type: 'sound', id: 'quake', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerWeapon({
  id: 'armageddon',
  name: 'Armageddon',
  row: 11,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    ctx.world.spawn(new MeteorShower(scaledBlast(30, ctx.setting.power), ctx.worm.id));
    ctx.world.emit({ type: 'sound', id: 'quake', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerWeapon({
  id: 'nuke',
  name: 'Indian Nuclear Test',
  row: 11,
  col: 3,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { world } = ctx;
    // A blinding flash: everyone is poisoned and the water level rises.
    for (const w of world.ofKind<Worm>('worm')) if (w.alive) w.poisoned = true;
    world.waterLevel -= 30;
    world.emit({ type: 'explosion', x: ctx.worm.x, y: world.waterLevel, radius: 200 });
    world.emit({ type: 'shake', amount: 8 });
  },
});

registerWeapon({
  id: 'vase',
  name: 'Priceless Ming Vase',
  row: 10,
  col: 2,
  aim: 'angle',
  charge: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * ctx.power;
    const vase = ctx.world.spawn(
      new Projectile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'vase',
          radius: 3.5,
          wind: 0,
          impact: 'explode',
          blast: scaledBlast(40, ctx.setting.power),
          // It shatters into sharp pieces.
          cluster: {
            count: 12,
            minSpeed: 2,
            maxSpeed: 6,
            spread: 1.2,
            projectile: {
              look: 'shard',
              radius: 1.5,
              wind: 0,
              impact: 'explode',
              blast: scaledBlast(12, ctx.setting.power, { push: 0.6 }),
            },
          },
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: p.x, y: p.y });
    ctx.focus(vase.id);
  },
});

registerWeapon({
  id: 'magicbullet',
  name: "Patsy's Magic Bullet",
  row: 12,
  col: 4,
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
          fuse: 8 * 50,
          blast: scaledBlast(50, ctx.setting.power),
          armTicks: 0,
          lockEndTick: 8 * 50,
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

registerWeapon({
  id: 'superbanana',
  name: 'Super Banana Bomb',
  row: 9,
  col: 0,
  aim: 'angle',
  charge: true,
  fuse: true,
  bounce: true,
  fire: (ctx) => {
    const m = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * ctx.power;
    const big = scaledBlast(75, ctx.setting.power);
    const piece = {
      look: 'bananalet',
      radius: 2.5,
      wind: 0,
      impact: 'explode' as const,
      blast: big,
    };
    // Each piece is a small banana bomb itself: the whole thing splits twice.
    const bomb = ctx.world.spawn(
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
          blast: big,
          cluster: {
            count: 5,
            minSpeed: 3.5,
            maxSpeed: 7,
            spread: 0.8,
            projectile: {
              ...piece,
              impact: 'bounce',
              fuse: 40,
              restitution: BOUNCE_LOW,
              cluster: { count: 4, minSpeed: 2, maxSpeed: 5, spread: 0.9, projectile: piece },
            },
          },
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: m.x, y: m.y });
    ctx.focus(bomb.id);
  },
});
