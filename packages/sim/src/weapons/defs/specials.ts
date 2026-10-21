import { scaledBlast } from '../blast';
import { Sheep } from '../sheep';
import { registerLegacy } from '../legacy';
import { type FireContext } from '../weapon';
import { TPS } from '../../core/time';

function releaseSheep(ctx: FireContext, canFly: boolean): void {
  const { worm, world } = ctx;
  const sheep = world.spawn(
    new Sheep(
      worm.x + worm.facing * 8,
      worm.cy,
      worm.facing,
      {
        blast: scaledBlast(75, ctx.setting.power),
        fuse: 9 * TPS,
        canFly,
        aqua: canFly && ctx.upgrades.aquaSheep,
      },
      worm.id,
    ),
  );
  world.emit({ type: 'sound', id: 'baa', x: sheep.x, y: sheep.y });
  ctx.control(sheep.id);
}

registerLegacy({
  id: 'sheep',
  aim: 'none',
  charge: false,
  fire: (ctx) => releaseSheep(ctx, false),
});

registerLegacy({
  id: 'supersheep',
  aim: 'none',
  charge: false,
  fire: (ctx) => releaseSheep(ctx, true),
});
