import type { World } from '../../world/world';
import type { Worm } from '../../worm/worm';
import type { ViewSpec } from '../spec';
import type { FireContext } from '../weapon';

/**
 * Code for a weapon whose behaviour is its own (no shared archetype). A spec names it
 * (`archetype: 'custom', behaviour: 'longbow'`) and supplies its numbers as `params`.
 */
export interface Behaviour<P> {
  fire(ctx: FireContext, params: P, view: ViewSpec): void;
  /** Rejects bad targets (teleporting into rock) before anything is spent. */
  validTarget?(
    world: World,
    worm: Worm,
    target: { x: number; y: number },
    dirX: number,
    dirY: number,
    params: P,
  ): boolean;
}
