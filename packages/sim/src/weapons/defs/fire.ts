import { Flame } from '../fire';
import { muzzle } from '../projectile';
import { registerLegacy } from '../legacy';

registerLegacy({
  id: 'flamethrower',
  aim: 'angle',
  charge: false,
  fire: (ctx) => {
    const { world, worm } = ctx;
    const p = muzzle(worm, ctx.dirX, ctx.dirY, 8);
    // One long burst of napalm along the aim line, each blob a little different.
    let last = 0;
    for (let i = 0; i < 36; i++) {
      const speed = world.rng.range(3, 7.5);
      const spread = world.rng.range(-0.18, 0.18);
      const flame = new Flame(
        p.x,
        p.y,
        (ctx.dirX - ctx.dirY * spread) * speed,
        (ctx.dirY + ctx.dirX * spread) * speed,
        world.rng.int(150, 300),
      );
      last = world.spawn(flame).id;
    }
    world.emit({ type: 'sound', id: 'flame', x: p.x, y: p.y });
    ctx.focus(last);
  },
});
