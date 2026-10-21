import { buildBlast, type BlastParams } from '../archetypes/projectile';
import { Donkey } from '../donkey';
import type { Behaviour } from './types';

export interface DonkeyParams {
  /** Where it appears above the target, px (negative = above the map top). */
  startY: number;
  blast: BlastParams;
}

export const donkey: Behaviour<DonkeyParams> = {
  fire(ctx, p, view) {
    const { world, target } = ctx;
    if (!target) return;
    const d = world.spawn(new Donkey(target.x, p.startY, buildBlast(p.blast, ctx)));
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: target.x, y: 0 });
    ctx.focus(d.id);
  },
};
