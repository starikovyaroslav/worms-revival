import type { Hasher } from '../core/hash';
import { cos, sin } from '../core/math';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm, WORM_H } from '../worm/worm';
import type { RemoteControlled } from './weapon';

/** Longest rope, px (W:A at default power: a bit over 400). */
export const ROPE_MAX = 420;
const ROPE_MIN = 12;
/** Hook travel speed, px/tick. */
const HOOK_SPEED = 24;
/** Swing acceleration from the arrow keys, px/tick². */
const SWING = 0.07;
/** Rope length change per tick when climbing/descending, px. */
const REEL = 2;
/** Fraction of speed kept when bouncing off land while roped. */
const BOUNCE = 0.45;
/** Speed kept per sub-step while sliding along a surface on the rope. */
const FLOOR_FRICTION = 0.995;

interface Point {
  x: number;
  y: number;
  /** Side the rope wrapped around this point (sign of the cross product), for unwrapping. */
  side: number;
}

export type RopeState = 'shooting' | 'attached' | 'loose';

/**
 * Ninja rope. Fire shoots the hook along the aim; while attached the worm swings like a pendulum,
 * arrows swing / climb, fire lets go, and fire again in mid-air shoots a new rope.
 * The rope wraps around corners of the landscape.
 */
export class Rope extends Entity implements RemoteControlled {
  readonly kind = 'rope';
  readonly weaponId = 'rope';
  state: RopeState = 'shooting';
  /** Anchors from the first (hook) to the current pivot. */
  anchors: Point[] = [];
  /** Length of the free segment from the current pivot to the worm. */
  length = 0;
  /** Hook position while it is flying. */
  hookX: number;
  hookY: number;
  private hookDX: number;
  private hookDY: number;
  private travelled = 0;
  private keys = { left: false, right: false, up: false, down: false };

  constructor(
    readonly wormId: number,
    worm: Worm,
    dirX: number,
    dirY: number,
  ) {
    super(worm.cx, worm.cy);
    this.hookX = worm.cx;
    this.hookY = worm.cy;
    this.hookDX = dirX;
    this.hookDY = dirY;
  }

  get pivot(): Point | undefined {
    return this.anchors[this.anchors.length - 1];
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
      // Shoot again in mid-air, along the current aim.
      this.state = 'shooting';
      this.hookX = worm.cx;
      this.hookY = worm.cy;
      this.hookDX = cos(worm.aim) * worm.facing;
      this.hookDY = -sin(worm.aim);
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
      if (this.travelled >= ROPE_MAX || this.hookY > world.waterLevel) {
        // Missed: reel back in.
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
    if (!this.anchorHeld(world, this.anchors[0] as Point)) {
      this.letGo(worm);
      return;
    }
    if (this.keys.up) this.length = Math.max(ROPE_MIN, this.length - REEL);
    if (this.keys.down) this.length = Math.min(ROPE_MAX, this.length + REEL);

    let dx = worm.cx - p.x;
    let dy = worm.cy - p.y;
    let d = Math.sqrt(dx * dx + dy * dy) || 1;
    // Tangent pointing to the right of the rope direction.
    const tx = -dy / d;
    const ty = dx / d;
    let ax = 0;
    let ay = world.physics.gravity;
    if (this.keys.left !== this.keys.right) {
      const s = this.keys.left ? -1 : 1;
      // Push along the tangent in the screen direction pressed.
      const sign = tx * s >= 0 ? 1 : -1;
      ax += tx * SWING * sign;
      ay += ty * SWING * sign;
      worm.facing = this.keys.left ? -1 : 1;
    }
    worm.vx += ax;
    worm.vy += ay;
    const max = world.physics.maxSpeed;
    worm.vx = Math.max(-max, Math.min(max, worm.vx));
    worm.vy = Math.max(-max, Math.min(max, worm.vy));

    // Move in sub-steps. Blocked axes bounce, free ones keep going, so the worm slides along
    // floors and walls instead of sticking to them.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(worm.vx), Math.abs(worm.vy))));
    for (let i = 0; i < steps; i++) {
      const nx = worm.x + worm.vx / steps;
      const ny = worm.y + worm.vy / steps;
      if (!worm.bodyCollides(world, nx, ny)) {
        worm.x = nx;
        worm.y = ny;
        continue;
      }
      if (!worm.bodyCollides(world, nx, worm.y)) {
        worm.x = nx;
        worm.vy = Math.abs(worm.vy) > 1 ? -worm.vy * BOUNCE : 0;
        worm.vx *= FLOOR_FRICTION;
      } else if (!worm.bodyCollides(world, worm.x, ny)) {
        worm.y = ny;
        worm.vx = Math.abs(worm.vx) > 1 ? -worm.vx * BOUNCE : 0;
      } else {
        worm.vx = -worm.vx * BOUNCE;
        worm.vy = -worm.vy * BOUNCE;
        break;
      }
    }

    // Rope constraint: never further than the rope length from the pivot.
    dx = worm.cx - p.x;
    dy = worm.cy - p.y;
    d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > this.length) {
      const nx = dx / d;
      const ny = dy / d;
      const tx2 = p.x + nx * this.length;
      const ty2 = p.y + ny * this.length + WORM_H / 2;
      if (!worm.bodyCollides(world, tx2, ty2)) {
        worm.x = tx2;
        worm.y = ty2;
      }
      const vr = worm.vx * nx + worm.vy * ny;
      if (vr > 0) {
        worm.vx -= vr * nx;
        worm.vy -= vr * ny;
      }
    }
    this.wrap(world, worm);
  }

  /** The hook stays only while there is land right next to it. */
  private anchorHeld(world: World, a: Point): boolean {
    const t = world.terrain;
    for (let oy = -2; oy <= 2; oy++)
      for (let ox = -2; ox <= 2; ox++) if (t.isSolid(a.x + ox, a.y + oy)) return true;
    return false;
  }

  /** Bends the rope around corners and straightens it again when swinging back. */
  private wrap(world: World, worm: Worm): void {
    const p = this.pivot as Point;
    const dx = worm.cx - p.x;
    const dy = worm.cy - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 4) return;
    // Is the straight line from the pivot to the worm blocked? Bend at the last free point.
    const t = world.terrain;
    let lastFree = 0;
    let blocked = false;
    for (let s = 2; s < d - 6; s += 1) {
      if (t.isSolid(p.x + (dx * s) / d, p.y + (dy * s) / d)) {
        blocked = true;
        break;
      }
      lastFree = s;
    }
    if (blocked && lastFree > 3) {
      const bx = p.x + (dx * lastFree) / d;
      const by = p.y + (dy * lastFree) / d;
      const prevDx = bx - p.x;
      const prevDy = by - p.y;
      const side = Math.sign(prevDx * (worm.cy - by) - prevDy * (worm.cx - bx)) || 1;
      this.anchors.push({ x: bx, y: by, side });
      this.length = Math.max(ROPE_MIN, this.length - lastFree);
      return;
    }
    // Unwrap: swinging back past the line through the previous pivot.
    if (this.anchors.length > 1) {
      const prev = this.anchors[this.anchors.length - 2] as Point;
      const ax = p.x - prev.x;
      const ay = p.y - prev.y;
      const side = Math.sign(ax * (worm.cy - p.y) - ay * (worm.cx - p.x));
      if (side !== 0 && side !== p.side) {
        this.anchors.pop();
        this.length = Math.min(ROPE_MAX, this.length + Math.sqrt(ax * ax + ay * ay));
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.state).f64(this.length).f64(this.hookX).f64(this.hookY).u32(this.travelled);
    for (const a of this.anchors) h.f64(a.x).f64(a.y).f64(a.side);
  }
}
