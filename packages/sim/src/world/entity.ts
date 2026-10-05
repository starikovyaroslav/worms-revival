import type { Hasher } from '../core/hash';
import type { World } from './world';

/** Base class for everything that moves or ticks in the world. */
export abstract class Entity {
  /** Assigned by the world; entities are always processed in ascending id order. */
  id = 0;
  abstract readonly kind: string;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  /** Set to true to have the world remove the entity at the end of the tick. */
  removed = false;

  /** Position at the start of the tick, for render interpolation. */
  prevX: number;
  prevY: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }

  abstract update(world: World): void;

  /**
   * True while the entity is still "busy" (flying, fuse burning, sliding).
   * The turn only advances once nothing in the world is busy.
   */
  isBusy(): boolean {
    return false;
  }

  hashInto(h: Hasher): void {
    h.u32(this.id)
      .str(this.kind)
      .f64(this.x)
      .f64(this.y)
      .f64(this.vx)
      .f64(this.vy)
      .bool(this.removed);
  }
}
