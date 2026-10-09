import type { World } from '../../world/world';
import { Worm } from '../../worm/worm';
import { hitscan } from '../hitscan';
import { KamikazeFlight } from '../kamikaze';
import { explode } from '../explosion';
import { scaledBlast } from '../blast';
import { Projectile } from '../projectile';
import { powerScale, registerWeapon, type FireContext } from '../weapon';

/** Living worms (other than `except`) whose body centre is within `r` of a point. */
export function wormsNear(world: World, x: number, y: number, r: number, except?: Worm): Worm[] {
  return world.ofKind<Worm>('worm').filter((w) => {
    if (!w.alive || w === except) return false;
    const dx = w.cx - x;
    const dy = w.cy - y;
    return dx * dx + dy * dy <= r * r;
  });
}

/** Hits worms just in front of the attacker. Returns true if anyone was hit. */
function strike(
  ctx: FireContext,
  reach: number,
  damage: number,
  vx: number,
  vy: number,
  sound: string,
): boolean {
  const { world, worm } = ctx;
  const hx = worm.cx + ctx.dirX * reach * 0.6;
  const hy = worm.cy + ctx.dirY * reach * 0.6;
  const victims = wormsNear(world, hx, hy, reach, worm);
  for (const v of victims) {
    v.takeDamage(world, damage * powerScale(ctx.setting.power));
    v.push(vx, vy);
  }
  world.emit({ type: 'sound', id: victims.length ? sound : 'swish', x: hx, y: hy });
  return victims.length > 0;
}

/** One shotgun blast. */
function pellet(ctx: FireContext): void {
  hitscan(ctx.world, ctx.worm, ctx.dirX, ctx.dirY, {
    damage: 25 * powerScale(ctx.setting.power),
    push: 2.6,
    crater: 8,
    range: 700,
  });
}

registerWeapon({
  id: 'shotgun',
  name: 'Shotgun',
  row: 3,
  col: 0,
  aim: 'angle',
  charge: false,
  shots: 2,
  fire: (ctx) => {
    ctx.world.emit({ type: 'sound', id: 'shotgun', x: ctx.worm.x, y: ctx.worm.y });
    pellet(ctx);
    if (ctx.upgrades.shotgun) pellet(ctx);
  },
});

registerWeapon({
  id: 'firepunch',
  name: 'Fire Punch',
  row: 4,
  col: 0,
  aim: 'none',
  charge: false,
  retreat: 3,
  fire: (ctx) => {
    const { world, worm } = ctx;
    // The uppercut cuts a channel through the land above the worm.
    for (let i = 0; i <= 4; i++) world.terrain.carveCircle(worm.x, worm.y - 8 - i * 9, 7, false);
    strike(ctx, 14, 30, worm.facing * 1.6, -6.2, 'punch');
    worm.launch(0, -4.4, false);
  },
});

registerWeapon({
  id: 'bat',
  name: 'Baseball Bat',
  row: 7,
  col: 3,
  aim: 'angle',
  charge: false,
  fire: (ctx) => {
    // Home run along the aim direction, always a little upwards.
    const dy = Math.min(ctx.dirY, -0.15);
    strike(ctx, 16, 30, ctx.dirX * 10.5, dy * 10.5, 'bat');
  },
});

registerWeapon({
  id: 'prod',
  name: 'Prod',
  row: 4,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    strike(
      { ...ctx, setting: { ...ctx.setting, power: 3 } },
      12,
      0,
      ctx.worm.facing * 1.8,
      -1.2,
      'prod',
    );
  },
});

registerWeapon({
  id: 'axe',
  name: 'Battle Axe',
  row: 2,
  col: 3,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const { world, worm } = ctx;
    const hx = worm.cx + worm.facing * 10;
    const victims = wormsNear(world, hx, worm.cy, 20, worm);
    // Takes half of the victim's current health (at least 1): even a 1 hp worm is finished.
    for (const v of victims) v.takeDamage(world, Math.max(1, Math.ceil(v.health / 2)));
    world.emit({ type: 'sound', id: victims.length ? 'bat' : 'swish', x: hx, y: worm.cy });
  },
});

registerWeapon({
  id: 'dragonball',
  name: 'Dragon Ball',
  row: 4,
  col: 1,
  aim: 'none',
  charge: false,
  retreat: 3,
  fire: (ctx) => {
    const { world, worm } = ctx;
    // A fireball that flies straight for a short way and goes off on contact.
    const ball = world.spawn(
      new Projectile(
        worm.cx + worm.facing * 10,
        worm.cy,
        worm.facing * 4.5,
        0,
        {
          look: 'dragonball',
          radius: 3,
          wind: 0,
          gravity: 0,
          impact: 'explode',
          fuse: 20,
          blast: scaledBlast(30, ctx.setting.power, { push: 1.4 }),
        },
        worm.id,
      ),
    );
    world.emit({ type: 'sound', id: 'launch', x: worm.x, y: worm.y });
    ctx.focus(ball.id);
  },
});

registerWeapon({
  id: 'kamikaze',
  name: 'Kamikaze',
  row: 4,
  col: 2,
  aim: 'angle',
  charge: false,
  retreat: 3,
  fire: (ctx) => {
    const { world, worm } = ctx;
    const f = world.spawn(
      new KamikazeFlight(worm.id, ctx.dirX, ctx.dirY, scaledBlast(30, ctx.setting.power)),
    );
    world.emit({ type: 'sound', id: 'launch', x: worm.x, y: worm.y });
    ctx.focus(f.id);
  },
});

registerWeapon({
  id: 'suicide',
  name: 'Suicide Bomber',
  row: 4,
  col: 3,
  aim: 'none',
  charge: false,
  retreat: 3,
  fire: (ctx) => {
    const { world, worm } = ctx;
    // The bomber goes with the blast (and the usual death blast follows).
    explode(world, worm.cx, worm.cy, scaledBlast(75, ctx.setting.power));
    worm.takeDamage(world, worm.health);
  },
});
