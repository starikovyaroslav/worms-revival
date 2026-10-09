import { Mine } from '../mine';
import { Projectile, type ProjectileSpec } from '../projectile';
import { scaledBlast } from '../blast';
import { registerWeapon, type FireContext } from '../weapon';

/** Altitude above the map top at which the plane releases its payload. */
const DROP_ALTITUDE = 80;
const STRIKE_SPEED = 4;

/**
 * Releases `count` payloads from a plane flying over the target in the facing direction: the middle
 * one lands on the target, the rest `spacing` px apart along the flight line.
 */
export function airRaid(
  ctx: FireContext,
  count: number,
  spacing: number,
  make: (x: number, y: number, vx: number, i: number) => void,
  speed = STRIKE_SPEED,
): void {
  const { world, worm, target } = ctx;
  if (!target) return;
  const dir = worm.facing;
  const vx = speed * dir;
  const y0 = -DROP_ALTITUDE;
  const fall = target.y - y0;
  const t = Math.sqrt((2 * fall) / world.physics.gravity);
  const x0 = target.x - vx * t;
  world.emit({ type: 'sound', id: 'airstrike', x: target.x, y: 0 });
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    make(x0 + (i - mid) * spacing * dir, y0 - Math.abs(i - mid) * 4, vx, i);
  }
}

function strikeShell(spec: ProjectileSpec, ctx: FireContext) {
  return (x: number, y: number, vx: number, i: number, mid: number) => {
    const m = ctx.world.spawn(new Projectile(x, y, vx, 0, spec, ctx.worm.id));
    if (i === mid) ctx.focus(m.id);
  };
}

registerWeapon({
  id: 'airstrike',
  name: 'Air Strike',
  row: 6,
  col: 0,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    const shell = strikeShell(
      {
        look: 'missile',
        radius: 2,
        wind: 0,
        impact: 'explode',
        blast: scaledBlast(30, ctx.setting.power),
      },
      ctx,
    );
    airRaid(ctx, 5, 22, (x, y, vx, i) => shell(x, y, vx, i, 2));
  },
});

registerWeapon({
  id: 'napalm',
  name: 'Napalm Strike',
  row: 6,
  col: 1,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    const shell = strikeShell(
      {
        look: 'napalm',
        radius: 2,
        wind: 0,
        impact: 'explode',
        blast: scaledBlast(5, ctx.setting.power, { push: 0.3, noCrater: true }),
        flames: { count: 24, speed: 2.8 },
      },
      ctx,
    );
    airRaid(ctx, 5, 24, (x, y, vx, i) => shell(x, y, vx, i, 2), 3.2);
  },
});

registerWeapon({
  id: 'mail',
  name: 'Mail Strike',
  row: 6,
  col: 2,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    // Letters flutter down and are pushed around by the wind.
    const shell = strikeShell(
      {
        look: 'letter',
        radius: 2,
        wind: 0.6,
        gravity: 0.5,
        impact: 'explode',
        blast: scaledBlast(50, ctx.setting.power),
      },
      ctx,
    );
    airRaid(ctx, 5, 26, (x, y, vx, i) => shell(x, y, vx, i, 2));
  },
});

registerWeapon({
  id: 'minestrike',
  name: 'Mine Strike',
  row: 6,
  col: 3,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    airRaid(ctx, 5, 24, (x, y, vx, i) => {
      const mine = new Mine(x, y, {
        armTicks: 0,
        fuseTicks: 3 * 50,
        dudsAllowed: false,
        power: ctx.setting.power,
      });
      mine.vx = vx;
      const m = ctx.world.spawn(mine);
      if (i === 2) ctx.focus(m.id);
    });
  },
});

registerWeapon({
  id: 'carpet',
  name: "Mike's Carpet Bomb",
  row: 10,
  col: 4,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    // A long carpet of small bombs, one after another down the flight line.
    const shell = strikeShell(
      {
        look: 'carpet',
        radius: 2,
        wind: 0,
        impact: 'explode',
        blast: scaledBlast(30, ctx.setting.power),
      },
      ctx,
    );
    airRaid(ctx, 12, 14, (x, y, vx, i) => shell(x, y, vx, i, 6), 3.4);
  },
});

registerWeapon({
  id: 'frenchsheep',
  name: 'French Sheep Strike',
  row: 10,
  col: 3,
  aim: 'target',
  charge: false,
  needsSky: true,
  fire: (ctx) => {
    // Burning sheep rain down.
    const shell = strikeShell(
      {
        look: 'frenchsheep',
        radius: 3,
        wind: 0,
        impact: 'explode',
        blast: scaledBlast(75, ctx.setting.power),
        flames: { count: 14, speed: 2.4 },
      },
      ctx,
    );
    airRaid(ctx, 5, 30, (x, y, vx, i) => shell(x, y, vx, i, 2));
  },
});
