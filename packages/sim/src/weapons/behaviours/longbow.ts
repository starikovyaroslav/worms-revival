import type { Upgrades } from '../../game/scheme';
import { Arrow } from '../arrow';
import { powerScale } from '../weapon';
import type { Behaviour } from './types';

export interface LongbowParams {
  /** Flight speed, px/tick. */
  speed: number;
  /** Can't shoot much below the horizontal: the aim's vertical component is capped here. */
  maxDirY: number;
  /** Arrow start distance from the body centre, px. */
  muzzle: number;
  damage: number;
  upgrade: { name: keyof Upgrades; damage: number };
}

export const longbow: Behaviour<LongbowParams> = {
  fire(ctx, p, view) {
    const dirY = Math.min(ctx.dirY, p.maxDirY);
    const n = Math.sqrt(ctx.dirX * ctx.dirX + dirY * dirY);
    const damage = ctx.upgrades[p.upgrade.name] ? p.upgrade.damage : p.damage;
    const arrow = ctx.world.spawn(
      new Arrow(
        ctx.worm.cx + (ctx.dirX / n) * p.muzzle,
        ctx.worm.cy + (dirY / n) * p.muzzle,
        (ctx.dirX / n) * p.speed,
        (dirY / n) * p.speed,
        damage * powerScale(ctx.setting.power),
        ctx.worm.id,
      ),
    );
    if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: arrow.x, y: arrow.y });
    ctx.focus(arrow.id);
  },
};
