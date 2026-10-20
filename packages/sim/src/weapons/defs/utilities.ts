import { registerWeapon, type FireContext } from '../weapon';

/**
 * Utilities: switched on for the rest of the turn, they do not use the turn up. In W:A they come
 * from crates (and campaign missions); the effect flags live on the worm and clear at the next turn.
 */
function utility(
  id: string,
  name: string,
  col: number,
  apply: (ctx: FireContext) => void,
  sound = 'collect',
): void {
  registerWeapon({
    id,
    name,
    row: 0,
    col,
    aim: 'none',
    charge: false,
    endsTurn: false,
    fire: (ctx) => {
      apply(ctx);
      ctx.world.emit({ type: 'sound', id: sound, x: ctx.worm.x, y: ctx.worm.y });
    },
  });
}

utility('lowgravity', 'Low Gravity', 1, (ctx) => {
  ctx.worm.lowGravity = true;
});
utility('fastwalk', 'Fast Walk', 2, (ctx) => {
  ctx.worm.fastWalk = true;
});
utility('laser', 'Laser Sight', 3, (ctx) => {
  ctx.worm.laser = true;
});
utility('invisible', 'Invisibility', 4, (ctx) => {
  ctx.worm.invisible = true;
});
utility('doubledamage', 'Double Damage', 5, (ctx) => {
  // Everything that goes off before the next turn hurts twice as much.
  ctx.world.physics.damageScale *= 2;
});
utility('cratespy', 'Crate Spy', 6, (ctx) => {
  ctx.worm.crateSpy = true;
});
