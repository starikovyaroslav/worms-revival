import { Arrow } from '../arrow';
import { Gunfire, type BurstSpec } from '../gunfire';
import { powerScale, registerWeapon, type FireContext } from '../weapon';

function burst(ctx: FireContext, spec: BurstSpec): void {
  const g = ctx.world.spawn(
    new Gunfire(ctx.worm.id, ctx.worm, {
      ...spec,
      damage: spec.damage * powerScale(ctx.setting.power),
    }),
  );
  ctx.control(g.id);
}

registerWeapon({
  id: 'handgun',
  name: 'Handgun',
  row: 3,
  col: 1,
  aim: 'angle',
  charge: false,
  fire: (ctx) =>
    burst(ctx, {
      bullets: 6,
      interval: 9,
      spread: 0.01,
      damage: 5,
      push: 1.1,
      crater: 4,
      range: 700,
      sound: 'shot',
    }),
});

registerWeapon({
  id: 'uzi',
  name: 'Uzi',
  row: 3,
  col: 2,
  aim: 'angle',
  charge: false,
  fire: (ctx) =>
    burst(ctx, {
      bullets: 20,
      interval: 2,
      spread: 0.05,
      damage: 2.5,
      push: 1.3,
      crater: 3,
      range: 600,
      sound: 'shot',
    }),
});

registerWeapon({
  id: 'minigun',
  name: 'Minigun',
  row: 3,
  col: 3,
  aim: 'angle',
  charge: false,
  fire: (ctx) =>
    burst(ctx, {
      bullets: 40,
      interval: 1,
      spread: 0.08,
      damage: 2.5,
      push: 1.6,
      crater: 3,
      range: 600,
      sound: 'shot',
    }),
});

registerWeapon({
  id: 'longbow',
  name: 'Longbow',
  row: 3,
  col: 4,
  aim: 'angle',
  charge: false,
  shots: 2,
  fire: (ctx) => {
    // Can't shoot much below the horizontal.
    const dirY = Math.min(ctx.dirY, 0.35);
    const n = Math.sqrt(ctx.dirX * ctx.dirX + dirY * dirY);
    const speed = 16;
    const arrow = ctx.world.spawn(
      new Arrow(
        ctx.worm.cx + (ctx.dirX / n) * 9,
        ctx.worm.cy + (dirY / n) * 9,
        (ctx.dirX / n) * speed,
        (dirY / n) * speed,
        (ctx.upgrades.longbow ? 25 : 15) * powerScale(ctx.setting.power),
        ctx.worm.id,
      ),
    );
    ctx.world.emit({ type: 'sound', id: 'throw', x: arrow.x, y: arrow.y });
    ctx.focus(arrow.id);
  },
});
