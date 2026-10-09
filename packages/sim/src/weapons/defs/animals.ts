import { Donkey } from '../donkey';
import { Sheep, type SheepOptions } from '../sheep';
import { scaledBlast } from '../blast';
import { Projectile, muzzle } from '../projectile';
import { registerWeapon, type FireContext } from '../weapon';
import { MAX_LAUNCH } from './artillery';
import { airRaid } from './strikes';

function animal(
  ctx: FireContext,
  x: number,
  y: number,
  dir: 1 | -1,
  opts: Partial<SheepOptions> & { damage: number; fuse: number },
): Sheep {
  const { damage, fuse, ...rest } = opts;
  return ctx.world.spawn(
    new Sheep(
      x,
      y,
      dir,
      { blast: scaledBlast(damage, ctx.setting.power), fuse, canFly: false, aqua: false, ...rest },
      ctx.worm.id,
    ),
  );
}

registerWeapon({
  id: 'sheeplauncher',
  name: 'Sheep Launcher',
  row: 1,
  col: 4,
  aim: 'angle',
  charge: true,
  fire: (ctx) => {
    const { worm } = ctx;
    const p = muzzle(worm, ctx.dirX, ctx.dirY);
    const sheep = animal(ctx, p.x, p.y, worm.facing, { damage: 75, fuse: 5 * 50 });
    // Shot out like a shell; once it lands it trots like any sheep.
    const v = MAX_LAUNCH * 0.8 * ctx.power;
    sheep.vx = ctx.dirX * v;
    sheep.vy = ctx.dirY * v;
    ctx.world.emit({ type: 'sound', id: 'baa', x: p.x, y: p.y });
    ctx.focus(sheep.id);
  },
});

registerWeapon({
  id: 'molebomb',
  name: 'Mole Bomb',
  row: 5,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm } = ctx;
    const mole = animal(ctx, worm.x + worm.facing * 8, worm.cy, worm.facing, {
      damage: 45,
      fuse: 9 * 50,
      look: 'mole',
      speed: 1.1,
    });
    ctx.control(mole.id);
  },
});

registerWeapon({
  id: 'molesquad',
  name: 'Mole Squadron',
  row: 6,
  col: 4,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    airRaid(ctx, 5, 26, (x, y, vx, i) => {
      const mole = animal(ctx, x, y, ctx.worm.facing, {
        damage: 45,
        fuse: 6 * 50,
        look: 'mole',
        speed: 1.1,
      });
      mole.vx = vx * 0.5;
      mole.vy = 0;
      if (i === 2) ctx.focus(mole.id);
    });
  },
});

registerWeapon({
  id: 'oldwoman',
  name: 'Old Woman',
  row: 11,
  col: 1,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm } = ctx;
    // Walks slowly, mutters for five seconds, and cannot be stopped.
    const granny = animal(ctx, worm.x + worm.facing * 8, worm.cy, worm.facing, {
      damage: 75,
      fuse: 5 * 50,
      look: 'oldwoman',
      speed: 0.6,
      manual: false,
    });
    ctx.world.emit({ type: 'sound', id: 'baa', x: granny.x, y: granny.y });
    ctx.focus(granny.id);
  },
});

registerWeapon({
  id: 'madcows',
  name: 'Mad Cows',
  row: 11,
  col: 0,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm } = ctx;
    // 1..5 cows by the weapon's power level, charging side by side and exploding on contact.
    const n = Math.min(5, Math.max(1, Math.round(ctx.setting.power)));
    for (let i = 0; i < n; i++) {
      const cow = animal(ctx, worm.x + worm.facing * (10 + i * 10), worm.cy - 2, worm.facing, {
        damage: 75,
        fuse: 6 * 50,
        look: 'cow',
        speed: 1.7,
        contact: true,
        manual: false,
      });
      if (i === 0) ctx.focus(cow.id);
    }
  },
});

registerWeapon({
  id: 'salvation',
  name: 'Salvation Army',
  row: 9,
  col: 3,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { worm } = ctx;
    const nun = animal(ctx, worm.x + worm.facing * 8, worm.cy, worm.facing, {
      damage: 75,
      fuse: 10 * 50,
      look: 'nun',
      speed: 0.9,
    });
    ctx.control(nun.id);
  },
});

registerWeapon({
  id: 'donkey',
  name: 'Concrete Donkey',
  row: 11,
  col: 2,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    const { world, target } = ctx;
    if (!target) return;
    const d = world.spawn(new Donkey(target.x, -60, scaledBlast(100, ctx.setting.power)));
    world.emit({ type: 'sound', id: 'baa', x: target.x, y: 0 });
    ctx.focus(d.id);
  },
});

registerWeapon({
  id: 'mbbomb',
  name: 'MB Bomb',
  row: 9,
  col: 4,
  aim: 'angle',
  charge: true,
  fuse: true,
  fire: (ctx) => {
    const p = muzzle(ctx.worm, ctx.dirX, ctx.dirY);
    const v = MAX_LAUNCH * 0.9 * ctx.power;
    // A huge bomb that bounces like a rubber ball before it goes off.
    const bomb = ctx.world.spawn(
      new Projectile(
        p.x,
        p.y,
        ctx.dirX * v,
        ctx.dirY * v,
        {
          look: 'mbbomb',
          radius: 4,
          wind: 0,
          impact: 'bounce',
          fuse: ctx.fuse,
          restitution: 0.85,
          friction: 0.9,
          blast: scaledBlast(100, ctx.setting.power),
        },
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: p.x, y: p.y });
    ctx.focus(bomb.id);
  },
});
