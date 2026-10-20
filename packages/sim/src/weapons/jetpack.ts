import type { Hasher } from '../core/hash';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import type { RemoteControlled } from './weapon';

/** Thrust ticks available. */
const FUEL = 5 * 50;
// Thrust accelerations in px/tick² (gravity is 0.2, so Up nets a modest climb) and the speed limits
// thrust can reach, with a light air drag while the engine runs. Hovering is possible by tapping Up.
const LIFT = 0.32;
const SIDE = 0.16;
const MAX_UP = 3;
const MAX_SIDE = 2.2;
const DRAG = 0.95;

/**
 * Jet Pack: arrow keys give thrust while there is fuel (Up lifts, Left/Right push sideways); Fire
 * puts it away. Other weapons can be used in flight.
 */
export class JetPack extends Entity implements RemoteControlled {
  readonly kind = 'jetpack';
  readonly weaponId = 'jetpack';
  fuel = FUEL;
  thrusting = false;
  private keys = { left: false, right: false, up: false, down: false };

  constructor(readonly wormId: number) {
    super(0, 0);
  }

  override isBusy(): boolean {
    return true;
  }

  steer(left: boolean, right: boolean, up: boolean, down: boolean): void {
    this.keys = { left, right, up, down };
  }

  remoteFire(): void {
    this.removed = true;
  }

  timeout(): void {
    this.removed = true;
  }

  update(world: World): void {
    const worm = world.byId(this.wormId);
    if (!(worm instanceof Worm) || !worm.alive) {
      this.removed = true;
      return;
    }
    this.x = worm.cx;
    this.y = worm.cy;
    const k = this.keys;
    this.thrusting = false;
    if (this.fuel <= 0 || (!k.up && !k.left && !k.right)) return;
    if (worm.state !== 'airborne') worm.launch(worm.vx, -1.5, false);
    if (worm.state !== 'airborne') return;
    this.fuel--;
    this.thrusting = true;
    if (k.up) worm.vy -= LIFT;
    if (k.left) {
      worm.vx -= SIDE;
      worm.facing = -1;
    }
    if (k.right) {
      worm.vx += SIDE;
      worm.facing = 1;
    }
    worm.vx *= DRAG;
    if (worm.vy < 0) worm.vy *= DRAG;
    worm.vx = Math.max(-MAX_SIDE, Math.min(MAX_SIDE, worm.vx));
    if (worm.vy < -MAX_UP) worm.vy = -MAX_UP;
    world.emit({ type: 'sound', id: 'jet', x: worm.x, y: worm.y });
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.fuel);
  }
}
