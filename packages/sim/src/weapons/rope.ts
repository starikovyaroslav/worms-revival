import type { Hasher } from '../core/hash';
import { PI, atan2, cos, sin } from '../core/math';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm, WORM_H } from '../worm/worm';
import type { RemoteControlled } from './weapon';

/**
 * Ninja Rope, modelled on Worms Armageddon:
 *  - the rope is a straight, inextensible line: it does NOT bend around the landscape (worms2d.info:
 *    on PC the rope passes through terrain; only the worm collides with it);
 *  - while taut the worm swings like a pendulum; Left/Right push along the tangent, Up/Down shorten
 *    and lengthen the rope;
 *  - shortening conserves angular momentum, so the swing speeds up as the rope gets shorter;
 *  - bounces off land keep most of the speed (W:A: bouncing while roped can add momentum);
 *  - you can re-fire in mid-air (space to let go, space again) a number of times set by the power
 *    level, without using extra ammo; touching the ground loses the unused swings;
 *  - the power level also sets the maximum length and how far from vertical you may fire.
 * Table from worms2d.info (Ninja Rope):
 *   power  shots  max length   max angle from vertical
 *     1      1    294–297 px        45°
 *     2      2    336–339           45°
 *     3      2    378–381           90°
 *     4      4    420–423           90°
 *     5     ∞     462–465           90°
 */
export interface RopeSpec {
  shots: number;
  maxLength: number;
  /** Largest allowed angle between the shot and straight up, degrees. */
  limitDeg: number;
}

const ROPE_SPECS: RopeSpec[] = [
  { shots: 1, maxLength: 296, limitDeg: 45 },
  { shots: 2, maxLength: 338, limitDeg: 45 },
  { shots: 2, maxLength: 380, limitDeg: 90 },
  { shots: 4, maxLength: 422, limitDeg: 90 },
  { shots: Infinity, maxLength: 464, limitDeg: 90 },
];

export function ropeSpec(power: number): RopeSpec {
  return ROPE_SPECS[Math.min(5, Math.max(1, Math.round(power))) - 1] as RopeSpec;
}

export const ROPE_MAX = 464;
const ROPE_MIN = 10;
/** Hook travel speed, px/tick. */
const HOOK_SPEED = 24;
/** Swing acceleration from the arrow keys, px/tick². */
const SWING = 0.075;
/** Rope length change per tick when climbing/descending, px. */
const REEL = 1.5;
/** Fraction of the normal velocity kept on a bounce while roped. */
const BOUNCE = 0.75;

interface Point {
  x: number;
  y: number;
  /** Kept for the renderer's polyline; always 0 now that the rope never wraps. */
  side: number;
}

export type RopeState = 'shooting' | 'attached' | 'loose';

export class Rope extends Entity implements RemoteControlled {
  readonly kind = 'rope';
  readonly weaponId = 'rope';
  state: RopeState = 'shooting';
  /** The hook point (one entry; kept as a list for the renderer). */
  anchors: Point[] = [];
  /** Rope length from the hook to the worm. */
  length = 0;
  /** Hook position while it is flying. */
  hookX: number;
  hookY: number;
  hookDX = 0;
  hookDY = 0;
  private travelled = 0;
  private keys = { left: false, right: false, up: false, down: false };

  constructor(
    readonly wormId: number,
    worm: Worm,
    dirX: number,
    dirY: number,
    readonly spec: RopeSpec,
  ) {
    super(worm.cx, worm.cy);
    this.hookX = worm.cx;
    this.hookY = worm.cy;
    [this.hookDX, this.hookDY] = this.restrict(dirX, dirY);
  }

  /** Shots fired with this rope so far (the first one included). */
  shotsUsed = 1;

  /** Clamps a shot direction to the power level's allowed cone around straight up. */
  private restrict(dirX: number, dirY: number): [number, number] {
    const side = dirX < 0 ? -1 : 1;
    // Elevation above the horizontal, 90° = straight up.
    const elevation = atan2(-dirY, Math.abs(dirX));
    const min = (90 - this.spec.limitDeg) * (PI / 180);
    const e = Math.max(elevation, min);
    return [cos(e) * side, -sin(e)];
  }

  get pivot(): Point | undefined {
    return this.anchors[0];
  }

  override isBusy(): boolean {
    return true;
  }

  steer(left: boolean, right: boolean, up: boolean, down: boolean): void {
    this.keys = { left, right, up, down };
  }

  remoteFire(world: World): void {
    const worm = this.worm(world);
    if (!worm) return;
    if (this.state === 'attached') {
      this.letGo(worm);
    } else if (this.state === 'loose') {
      // Shoot again in mid-air, along the current aim, if there are shots left this turn.
      if (this.shotsUsed >= this.spec.shots) {
        world.emit({ type: 'sound', id: 'nope', x: worm.x, y: worm.y });
        return;
      }
      this.shotsUsed++;
      this.state = 'shooting';
      this.hookX = worm.cx;
      this.hookY = worm.cy;
      [this.hookDX, this.hookDY] = this.restrict(cos(worm.aim) * worm.facing, -sin(worm.aim));
      this.travelled = 0;
      world.emit({ type: 'sound', id: 'rope-shoot', x: worm.x, y: worm.y });
    }
  }

  timeout(world: World): void {
    const worm = this.worm(world);
    if (worm && worm.state === 'roped') this.letGo(worm);
    this.removed = true;
  }

  private worm(world: World): Worm | null {
    const w = world.byId(this.wormId);
    return w instanceof Worm && w.alive ? w : null;
  }

  private letGo(worm: Worm): void {
    this.state = 'loose';
    this.anchors = [];
    if (worm.state === 'roped') worm.launch(worm.vx, worm.vy, false);
  }

  update(world: World): void {
    const worm = this.worm(world);
    if (!worm) {
      this.removed = true;
      return;
    }
    switch (this.state) {
      case 'shooting':
        this.shoot(world, worm);
        break;
      case 'attached':
        // Knocked off the rope by an explosion.
        if (worm.state !== 'roped') {
          this.state = 'loose';
          this.anchors = [];
          break;
        }
        this.swing(world, worm);
        break;
      case 'loose':
        // Put the rope away once the worm is back on its feet.
        if (worm.grounded) this.removed = true;
        break;
    }
    this.x = worm.cx;
    this.y = worm.cy;
  }

  private shoot(world: World, worm: Worm): void {
    const t = world.terrain;
    for (let i = 0; i < HOOK_SPEED; i++) {
      this.hookX += this.hookDX;
      this.hookY += this.hookDY;
      this.travelled++;
      if (t.isSolid(this.hookX, this.hookY)) {
        this.attach(world, worm);
        return;
      }
      if (this.travelled >= this.spec.maxLength || this.hookY > world.waterLevel) {
        // Missed: the rope reels back in.
        this.state = 'loose';
        if (worm.grounded) this.removed = true;
        world.emit({ type: 'sound', id: 'rope-miss', x: worm.x, y: worm.y });
        return;
      }
    }
  }

  private attach(world: World, worm: Worm): void {
    // Hang from the last air pixel before the land.
    const x = this.hookX - this.hookDX;
    const y = this.hookY - this.hookDY;
    this.anchors = [{ x, y, side: 0 }];
    this.length = Math.max(ROPE_MIN, Math.sqrt((worm.cx - x) ** 2 + (worm.cy - y) ** 2));
    this.state = 'attached';
    if (worm.state !== 'airborne') {
      worm.vx = 0;
      worm.vy = 0;
    }
    worm.state = 'roped';
    worm.chute = false;
    world.emit({ type: 'sound', id: 'rope-attach', x, y });
  }

  private swing(world: World, worm: Worm): void {
    const p = this.pivot as Point;
    // The hook point was blown away: fall.
    if (!this.anchorHeld(world, p)) {
      this.letGo(worm);
      return;
    }

    // Reeling in or out. Angular momentum is conserved: a shorter rope spins faster.
    const before = this.length;
    if (this.keys.up) this.length = Math.max(ROPE_MIN, this.length - REEL);
    if (this.keys.down) this.length = Math.min(this.spec.maxLength, this.length + REEL);
    let dx = worm.cx - p.x;
    let dy = worm.cy - p.y;
    let d = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = dx / d;
    let ny = dy / d;
    if (this.length !== before) {
      // Tangent speed scales with before/after; the radial part follows the rope.
      const tx = -ny;
      const ty = nx;
      const vt = worm.vx * tx + worm.vy * ty;
      const scaled = vt * (before / this.length);
      worm.vx += tx * (scaled - vt);
      worm.vy += ty * (scaled - vt);
    }

    // Forces: gravity and the swing push along the tangent.
    const tx = -ny;
    const ty = nx;
    worm.vy += world.physics.gravity;
    if (this.keys.left !== this.keys.right) {
      const want = this.keys.left ? -1 : 1;
      // Push towards the pressed screen direction.
      const sign = tx * want >= 0 ? 1 : -1;
      worm.vx += tx * SWING * sign;
      worm.vy += ty * SWING * sign;
      worm.facing = this.keys.left ? -1 : 1;
    }
    const max = world.physics.maxSpeed;
    worm.vx = Math.max(-max, Math.min(max, worm.vx));
    worm.vy = Math.max(-max, Math.min(max, worm.vy));

    // Move in sub-steps. A blocked axis bounces (keeping most of the speed), a free one slides on.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(worm.vx), Math.abs(worm.vy))));
    for (let i = 0; i < steps; i++) {
      const sx = worm.x + worm.vx / steps;
      const sy = worm.y + worm.vy / steps;
      if (!worm.bodyCollides(world, sx, sy)) {
        worm.x = sx;
        worm.y = sy;
      } else if (!worm.bodyCollides(world, sx, worm.y)) {
        worm.x = sx;
        worm.vy = -worm.vy * BOUNCE;
      } else if (!worm.bodyCollides(world, worm.x, sy)) {
        worm.y = sy;
        worm.vx = -worm.vx * BOUNCE;
      } else {
        worm.vx = -worm.vx * BOUNCE;
        worm.vy = -worm.vy * BOUNCE;
        break;
      }
    }

    // The rope is inextensible: stay within `length` of the hook and drop the outward velocity.
    dx = worm.cx - p.x;
    dy = worm.cy - p.y;
    d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > this.length) {
      nx = dx / d;
      ny = dy / d;
      const cx = p.x + nx * this.length;
      const cy = p.y + ny * this.length + WORM_H / 2;
      if (!worm.bodyCollides(world, cx, cy)) {
        worm.x = cx;
        worm.y = cy;
      }
      const vr = worm.vx * nx + worm.vy * ny;
      if (vr > 0) {
        worm.vx -= vr * nx;
        worm.vy -= vr * ny;
      }
    }
  }

  /** The hook stays only while there is land right next to it. */
  private anchorHeld(world: World, a: Point): boolean {
    const t = world.terrain;
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) if (t.isSolid(a.x + ox, a.y + oy)) return true;
    }
    return false;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.state)
      .f64(this.length)
      .f64(this.hookX)
      .f64(this.hookY)
      .u32(this.travelled)
      .u32(this.shotsUsed);
    for (const a of this.anchors) h.f64(a.x).f64(a.y);
  }
}
