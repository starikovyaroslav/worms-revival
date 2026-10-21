import { registerLegacy } from '../legacy';
import { type FireContext } from '../weapon';
import type { SoundId } from '../spec';

/**
 * Utilities: switched on for the rest of the turn, they do not use the turn up. In W:A they come
 * from crates (and campaign missions); the effect flags live on the worm and clear at the next turn.
 * Each can be used once per turn (the game refuses a second use, so it is not charged twice).
 */
function utility(id: string, apply: (ctx: FireContext) => void, sound: SoundId = 'collect'): void {
  registerLegacy({
    id,
    aim: 'none',
    charge: false,
    endsTurn: false,
    oncePerTurn: true,
    fire: (ctx) => {
      apply(ctx);
      ctx.world.emit({ type: 'sound', id: sound, x: ctx.worm.x, y: ctx.worm.y });
    },
  });
}

utility('lowgravity', (ctx) => {
  ctx.worm.lowGravity = true;
});
utility('fastwalk', (ctx) => {
  ctx.worm.fastWalk = true;
});
utility('laser', (ctx) => {
  ctx.worm.laser = true;
});
utility('invisible', (ctx) => {
  ctx.worm.invisible = true;
});
utility('doubledamage', (ctx) => {
  // Everything that goes off before the next turn hurts twice as much (set, never multiplied).
  ctx.world.physics.damageScale = ctx.baseDamageScale * 2;
});
utility('cratespy', (ctx) => {
  ctx.worm.crateSpy = true;
});
