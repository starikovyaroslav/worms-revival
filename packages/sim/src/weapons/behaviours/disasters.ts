import { buildBlast, type BlastParams } from '../archetypes/projectile';
import { Earthquake, MeteorShower } from '../disasters';
import type { Worm } from '../../worm/worm';
import type { Behaviour } from './types';

/** Shakes the whole map; nothing to tune here (the quake's own numbers live in its entity). */
export const earthquake: Behaviour<Record<string, never>> = {
  fire(ctx, _p, view) {
    ctx.world.spawn(new Earthquake());
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
  },
};

export interface ArmageddonParams {
  /** Damage of each meteor at power level 3. */
  blast: BlastParams;
}

export const armageddon: Behaviour<ArmageddonParams> = {
  fire(ctx, p, view) {
    ctx.world.spawn(new MeteorShower(buildBlast(p.blast, ctx), ctx.worm.id));
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
  },
};

export interface NukeParams {
  /** The water level rises by this many px. */
  waterRise: number;
  /** The flash is shown this far above the worm (where the player looks, not at the water). */
  flashDy: number;
  flashRadius: number;
  shake: number;
}

/** A blinding flash: everyone is poisoned and the water level rises. */
export const nuke: Behaviour<NukeParams> = {
  fire(ctx, p) {
    const { world } = ctx;
    for (const w of world.ofKind<Worm>('worm')) if (w.alive) w.poisoned = true;
    world.waterLevel -= p.waterRise;
    world.emit({
      type: 'explosion',
      x: ctx.worm.x,
      y: ctx.worm.y + p.flashDy,
      radius: p.flashRadius,
    });
    world.emit({ type: 'shake', amount: p.shake });
  },
};
