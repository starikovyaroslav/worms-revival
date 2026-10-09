import type { Hasher } from '../core/hash';
import { blastDamage, blastImpulse, type Blast } from '../weapons/explosion';
import { Entity } from '../world/entity';
import type { World } from '../world/world';

/** Worm body: a box of WORM_W × WORM_H pixels standing on (x, y) — y is the lowest body row. */
/** Collision box 9×16 px (W:A: "coffin" shaped, up to 9×16). */
export const WORM_HALF_W = 4;
export const WORM_H = 16;
/** Max ledge a walking worm climbs, px (W:A: 8). */
export const CLIMB = 8;
/** Max drop a walking worm follows before it starts falling, px. */
const STEP_DOWN = 4;

/**
 * Horizontal movement per frame of the 15-frame walk cycle (W:A: 13 of 15 frames move,
 * 0..1.75 px). One frame per tick gives the characteristic uneven "inchworm" gait.
 */
/**
 * Walking, tick by tick (Deadcode, via worms2d.info "Worm Walking"). Starting to walk plays a two tick
 * warm-up, then a loop of 17 ticks covering 9 px; every third loop is one idle tick shorter, so three
 * loops take 17 + 17 + 16 = 50 ticks (1.00 s) and cover exactly 27 px.
 */
const WALK_WARMUP = [0.5, 0];
const WALK_LOOP = [0.5, 0.5, 0.5, 0.5, 1.5, 1.75, 1.5, 1.25, 0, 0.25, 0, 0.25, 0.25, 0.25, 0, 0, 0];
const WALK_FRAMES = 15;

/**
 * Calibrated to measured W:A jumps at gravity 0.2 px/tick²: a forward jump travels ≈48 px and rises
 * ≈26 px; a backflip goes ≈19 px back and rises ≈42 px.
 */
export const JUMP = { vx: 1.49, vy: -3.22 };
export const BACKFLIP = { vx: -0.46, vy: -4.1 };
/** Ticks to wait for a second jump press that turns a jump into a backflip. */
const JUMP_WINDOW = 9;

/** Below this impact speed (px/tick) falls don't hurt (W:A: 8). */
const FALL_SAFE_SPEED = 8;
const FALL_COEF = 50;

/** Max sink speed under a parachute, px/tick. */
const CHUTE_FALL = 1.1;

/** Bounce response for worms sent flying by explosions. */
const RESTITUTION = 0.35;
const SLIDE_FRICTION = 0.82;
const SETTLE_SPEED = 1.1;

/** `roped`: hanging from the ninja rope, which moves the worm itself. */
export type WormState = 'idle' | 'walking' | 'airborne' | 'roped' | 'dead';

export interface WormControl {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/** W:A fall damage: depends on impact speed, not height. */
export function fallDamage(vspeed: number): number {
  if (vspeed <= FALL_SAFE_SPEED) return 0;
  return Math.floor(((vspeed - FALL_SAFE_SPEED + 1 / 65536) * FALL_COEF + 18) / 18);
}

export class Worm extends Entity {
  readonly kind = 'worm';
  name: string;
  team: number;
  health: number;
  /** Health shown on the label; catches up with `health` at the end of each turn (W:A). */
  shownHealth: number;
  state: WormState = 'idle';
  /** 1 = facing right, -1 = facing left. */
  facing: 1 | -1 = 1;
  /** Aim angle relative to facing direction: -PI/2 (down) .. PI/2 (up). */
  aim = 0;
  /** Frame (0..14) of the 15-frame walk sprite. */
  walkFrame = 0;
  private walkTick = 0;
  private walkCycle = 0;
  /** Warm-up ticks played so far after starting to walk. */
  private walkWarm = 0;
  /** Sent flying by an explosion: bounces and slides and takes no fall damage. */
  blasted = false;
  /** Damage taken in the current turn, applied to team totals at the end of the turn. */
  pendingDamage = 0;
  poisoned = false;
  drowned = false;
  /** Parachute open: slow, wind-blown descent. */
  chute = false;
  control: WormControl = { left: false, right: false, up: false, down: false };
  private jumpTimer = 0;
  /** Ticks since the worm last stood still on the ground. */
  airTicks = 0;
  private stuckTicks = 0;

  constructor(x: number, y: number, name: string, team: number, health: number) {
    super(x, y);
    this.name = name;
    this.team = team;
    this.health = health;
    this.shownHealth = health;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  get grounded(): boolean {
    return this.state === 'idle' || this.state === 'walking';
  }

  /** Body centre, used for explosion distances and the camera. */
  get cx(): number {
    return this.x;
  }
  get cy(): number {
    return this.y - WORM_H / 2;
  }

  override isBusy(): boolean {
    return this.state === 'airborne' || this.state === 'roped' || this.jumpTimer > 0;
  }

  bodyCollides(world: World, x: number, y: number): boolean {
    return world.terrain.rectCollides(x - WORM_HALF_W, y - WORM_H + 1, x + WORM_HALF_W, y);
  }

  private onGround(world: World): boolean {
    const t = world.terrain;
    const y = Math.floor(this.y) + 1;
    for (let dx = -WORM_HALF_W; dx <= WORM_HALF_W; dx++) {
      if (t.isSolid(this.x + dx, y)) return true;
    }
    return false;
  }

  /** Press of the jump key. Two presses in quick succession make a backflip. */
  jump(): void {
    if (!this.grounded) return;
    if (this.jumpTimer > 0) {
      this.jumpTimer = 0;
      this.launch(BACKFLIP.vx * this.facing, BACKFLIP.vy, false);
    } else {
      this.jumpTimer = JUMP_WINDOW;
    }
  }

  /** Sets the worm flying. `blasted` marks explosion knockback (bouncy, no fall damage). */
  launch(vx: number, vy: number, blasted: boolean): void {
    if (!this.alive) return;
    // A worm already flying from a blast stays "blasted" until it settles.
    this.blasted = blasted || (this.blasted && this.state === 'airborne');
    this.vx = vx;
    this.vy = vy;
    this.state = 'airborne';
    this.jumpTimer = 0;
  }

  /** Adds explosion knockback on top of current motion. */
  push(vx: number, vy: number): void {
    if (!this.alive) return;
    const flying = this.state === 'airborne';
    this.launch((flying ? this.vx : 0) + vx, (flying ? this.vy : 0) + vy, true);
  }

  takeDamage(world: World, amount: number): void {
    if (!this.alive || amount <= 0) return;
    const dealt = Math.min(Math.max(0, this.health), Math.round(amount));
    this.health -= dealt;
    this.pendingDamage += dealt;
    world.emit({ type: 'damage', wormId: this.id, amount: dealt });
    if (dealt >= 15) world.emit({ type: 'speech', wormId: this.id, line: 'hurt' });
  }

  override onBlast(world: World, b: Blast): void {
    if (!this.alive) return;
    const dx = this.cx - b.x;
    const dy = this.cy - b.y;
    // Distance to the body rather than its centre: a direct hit does full damage.
    const d = Math.sqrt(dx * dx + dy * dy) - WORM_H / 2;
    const dmg = blastDamage(b, d);
    if (dmg <= 0) return;
    this.takeDamage(world, dmg);
    const v = blastImpulse(b, this.cx, this.cy, dmg);
    this.push(v.x, v.y);
  }

  update(world: World): void {
    if (!this.alive) return;

    if (this.jumpTimer > 0 && --this.jumpTimer === 0 && this.grounded) {
      this.launch(JUMP.vx * this.facing, JUMP.vy, false);
    }

    if (this.state === 'roped') {
      // The rope entity drives the worm.
    } else if (this.state === 'airborne') {
      this.airTicks++;
      this.fly(world);
    } else {
      this.airTicks = 0;
      if (!this.onGround(world)) {
        // Ground removed from under the worm.
        this.launch(0, 0, false);
      } else {
        this.walk(world);
      }
    }

    if (this.y - WORM_H > world.waterLevel) this.drown(world);
  }

  private resetWalk(): void {
    this.state = this.grounded ? 'idle' : this.state;
    this.walkFrame = 0;
    this.walkTick = 0;
    this.walkCycle = 0;
    this.walkWarm = 0;
  }

  private walk(world: World): void {
    const dir = this.control.left === this.control.right ? 0 : this.control.left ? -1 : 1;
    if (dir === 0) {
      this.state = 'idle';
      this.resetWalk();
      return;
    }
    if (dir !== this.facing) {
      // Turning around takes a step of its own.
      this.facing = dir;
      this.resetWalk();
      return;
    }
    this.state = 'walking';
    let step: number;
    if (this.walkWarm < WALK_WARMUP.length) {
      step = WALK_WARMUP[this.walkWarm++] as number;
    } else {
      step = WALK_LOOP[this.walkTick] as number;
      const length = this.walkCycle === 2 ? WALK_LOOP.length - 1 : WALK_LOOP.length;
      this.walkFrame = Math.min(
        WALK_FRAMES - 1,
        Math.floor((this.walkTick / length) * WALK_FRAMES),
      );
      if (++this.walkTick >= length) {
        this.walkTick = 0;
        this.walkCycle = (this.walkCycle + 1) % 3;
      }
    }
    if (step === 0) return;

    const nx = this.x + step * dir;
    let ny = this.y;
    // Climb ledges up to CLIMB pixels.
    let lift = 0;
    while (this.bodyCollides(world, nx, ny) && lift < CLIMB) {
      ny--;
      lift++;
    }
    if (this.bodyCollides(world, nx, ny)) return; // wall
    // Follow the ground downwards a little; beyond that we walked off an edge.
    let drop = 0;
    while (!this.bodyCollides(world, nx, ny + 1) && drop <= STEP_DOWN) {
      ny++;
      drop++;
    }
    this.x = nx;
    this.y = ny;
    if (drop > STEP_DOWN) {
      this.launch(0, 0, false);
    }
  }

  private fly(world: World): void {
    const startX = this.x;
    const startY = this.y;
    if (this.flyStep(world)) {
      // Pinned against terrain without making progress (resting on a steep slope or wedged in
      // a gap): settle after a few ticks instead of jittering forever.
      const moved = Math.abs(this.x - startX) + Math.abs(this.y - startY);
      this.stuckTicks = moved < 0.3 ? this.stuckTicks + 1 : 0;
      if (this.stuckTicks >= 3 && this.state === 'airborne') this.land(world, true);
    } else {
      this.stuckTicks = 0;
    }
  }

  /** Integrates one tick of flight. Returns true if the worm hit terrain. */
  private flyStep(world: World): boolean {
    const g = world.physics.gravity;
    this.vy += g;
    if (this.chute) {
      if (this.vy > CHUTE_FALL) this.vy = CHUTE_FALL;
      this.vx = this.vx * 0.96 + world.wind * world.physics.maxWind * 0.12;
    }
    const max = world.physics.maxSpeed;
    if (this.vx > max) this.vx = max;
    if (this.vx < -max) this.vx = -max;
    if (this.vy > max) this.vy = max;
    if (this.vy < -max) this.vy = -max;

    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy))));
    const dx = this.vx / steps;
    const dy = this.vy / steps;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + dx;
      const ny = this.y + dy;
      if (!this.bodyCollides(world, nx, ny)) {
        this.x = nx;
        this.y = ny;
        continue;
      }
      this.collide(world, nx, ny);
      return true;
    }
    return false;
  }

  private collide(world: World, nx: number, ny: number): void {
    const n = world.terrain.normalAt(nx, ny - WORM_H / 2, 9) ?? { x: 0, y: -1 };
    const vn = this.vx * n.x + this.vy * n.y;
    const groundLike = n.y < -0.55;

    if (groundLike && !this.blasted) {
      const dmg = world.physics.fallDamage ? fallDamage(this.vy) : 0;
      this.land(world);
      if (dmg > 0) {
        world.emit({ type: 'speech', wormId: this.id, line: 'fall' });
        this.takeDamage(world, dmg);
        world.emit({ type: 'sound', id: 'fall-hurt', x: this.x, y: this.y });
      }
      return;
    }

    if (vn < 0) {
      // Reflect the normal component, damp the tangential one.
      const tx = this.vx - vn * n.x;
      const ty = this.vy - vn * n.y;
      this.vx = tx * SLIDE_FRICTION - vn * n.x * RESTITUTION;
      this.vy = ty * SLIDE_FRICTION - vn * n.y * RESTITUTION;
    } else {
      this.vx *= SLIDE_FRICTION;
      this.vy *= SLIDE_FRICTION;
    }
    if (-vn > 2) world.emit({ type: 'sound', id: 'worm-bounce', x: this.x, y: this.y });

    // Come to rest once slow enough, even against a steep slope or an edge, as long as
    // something supports the worm from below.
    if (
      Math.abs(this.vx) + Math.abs(this.vy) < SETTLE_SPEED &&
      (groundLike || this.onGround(world))
    ) {
      this.land(world);
    }
  }

  /** Snaps the worm onto the ground below it and stops. `force` settles even without support. */
  private land(world: World, force = false): void {
    this.vx = 0;
    this.vy = 0;
    // Resolve any overlap by lifting, then settle down onto the surface.
    let guard = 0;
    while (this.bodyCollides(world, this.x, this.y) && guard++ < 20) this.y--;
    guard = 0;
    while (!this.bodyCollides(world, this.x, this.y + 1) && guard++ < 3) this.y++;
    this.y = Math.floor(this.y);
    if (!force && !this.onGround(world)) {
      // Still not supported (landed on a steep edge): keep falling.
      this.state = 'airborne';
      return;
    }
    this.state = 'idle';
    this.blasted = false;
    this.chute = false;
    this.resetWalk();
  }

  private drown(world: World): void {
    this.state = 'dead';
    this.drowned = true;
    this.pendingDamage += Math.max(0, this.health);
    this.health = 0;
    this.vx = this.vy = 0;
    world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 1 });
    world.emit({ type: 'speech', wormId: this.id, line: 'drown' });
    world.emit({ type: 'sound', id: 'splash', x: this.x, y: world.waterLevel });
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.state)
      .u32(this.team)
      .f64(this.health)
      .f64(this.shownHealth)
      .f64(this.aim)
      .u32(this.facing === 1 ? 1 : 0)
      .u32(this.walkFrame)
      .u32(this.walkTick)
      .u32(this.walkCycle)
      .u32(this.walkWarm)
      .bool(this.blasted)
      .u32(this.jumpTimer)
      .u32(this.stuckTicks)
      .f64(this.pendingDamage)
      .bool(this.poisoned)
      .bool(this.chute);
  }
}
