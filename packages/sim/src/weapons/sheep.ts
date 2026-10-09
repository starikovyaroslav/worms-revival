import type { Hasher } from '../core/hash';
import { cos, sin } from '../core/math';
import { PhysBody, type Impact } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode, type BlastSpec } from './explosion';
import type { RemoteControlled } from './weapon';

const WALK_SPEED = 1.3;
const CLIMB = 6;
const HOP = { vx: 1.4, vy: -3.6 };
const FLY_SPEED = 4.6;
const TURN_RATE = 0.075;
const FLY_TICKS = 15 * 50;
const WORM_HIT = 9;

export type SheepMode = 'walk' | 'fly';

export interface SheepOptions {
  blast: BlastSpec;
  /** Walking time before it blows up by itself, ticks. */
  fuse: number;
  /** Super Sheep: a second fire press makes it take off. */
  canFly: boolean;
  /** Aqua Sheep: keeps flying under water. */
  aqua: boolean;
  /** Which animal it looks like (render only): sheep by default. */
  look?: 'sheep' | 'mole' | 'cow' | 'oldwoman' | 'nun';
  /** Walking speed, px/tick. */
  speed?: number;
  /** False: fire does not set it off (Old Woman). */
  manual?: boolean;
  /** Goes off by itself when it touches a worm (Mad Cows). */
  contact?: boolean;
}

/**
 * Sheep: trots forward hopping over obstacles, explodes on command or when its fuse runs out.
 * Super Sheep takes off on the second press and is steered with the arrow keys.
 */
export class Sheep extends PhysBody implements RemoteControlled {
  readonly kind = 'sheep';
  mode: SheepMode = 'walk';
  dir: 1 | -1;
  /** Flight heading in radians (0 = right, screen coordinates). */
  heading = 0;
  fuseLeft: number;
  age = 0;
  flyLeft = FLY_TICKS;
  private grounded = false;
  private blocked = 0;
  private steerLeft = false;
  private steerRight = false;

  constructor(
    x: number,
    y: number,
    dir: 1 | -1,
    readonly opts: SheepOptions,
    readonly ownerId: number,
  ) {
    super(x, y);
    this.dir = dir;
    this.radius = 4;
    this.restitution = 0.1;
    this.friction = 0.6;
    this.fuseLeft = opts.fuse;
    this.vx = dir * 1.5;
    this.vy = -2;
    this.sinks = !opts.aqua;
  }

  override isBusy(): boolean {
    return true;
  }

  remoteFire(world: World): void {
    if (this.opts.manual === false) return;
    if (this.mode === 'walk' && this.opts.canFly) {
      this.mode = 'fly';
      this.heading = this.dir > 0 ? -0.9 : -Math.PI + 0.9;
      world.emit({ type: 'sound', id: 'sheep-fly', x: this.x, y: this.y });
      return;
    }
    this.blowUp(world);
  }

  steer(left: boolean, right: boolean): void {
    this.steerLeft = left;
    this.steerRight = right;
  }

  timeout(world: World): void {
    this.blowUp(world);
  }

  blowUp(world: World): void {
    if (this.removed) return;
    this.removed = true;
    explode(world, this.x, this.y, this.opts.blast);
    world.emit({ type: 'sound', id: 'baa', x: this.x, y: this.y });
  }

  override update(world: World): void {
    this.age++;
    if (this.opts.contact && this.contact(world)) return;
    if (this.mode === 'fly') {
      this.fly(world);
      return;
    }
    if (--this.fuseLeft <= 0) {
      this.blowUp(world);
      return;
    }
    if (this.grounded) this.walk(world);
    else super.update(world);
  }

  protected override onImpact(world: World, hit: Impact): void {
    this.bounce(hit);
    if (hit.ny < -0.4) {
      this.vx = 0;
      this.vy = 0;
      this.grounded = true;
      this.rest(world);
      this.resting = false;
    }
  }

  /** Blows up when a worm (not the owner, at first) is touched. */
  private contact(world: World): boolean {
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive || (w.id === this.ownerId && this.age < 40)) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy < WORM_HIT * WORM_HIT) {
        this.blowUp(world);
        return true;
      }
    }
    return false;
  }

  private walk(world: World): void {
    const t = world.terrain;
    const r = this.radius;
    // Fell off an edge or the ground vanished.
    if (!t.circleCollides(this.x, this.y + 2, r)) {
      this.grounded = false;
      this.vx = this.dir * (this.opts.speed ?? WALK_SPEED) * 0.6;
      this.vy = 0;
      return;
    }
    const speed = this.opts.speed ?? WALK_SPEED;
    const nx = this.x + this.dir * speed;
    let ny = this.y;
    let lift = 0;
    while (t.circleCollides(nx, ny, r) && lift < CLIMB) {
      ny--;
      lift++;
    }
    if (t.circleCollides(nx, ny, r)) {
      // Wall: hop, and turn around if hopping doesn't help.
      if (++this.blocked > 2) {
        this.dir = this.dir > 0 ? -1 : 1;
        this.blocked = 0;
      }
      this.hop();
      return;
    }
    let drop = 0;
    while (!t.circleCollides(nx, ny + 1, r) && drop < CLIMB) {
      ny++;
      drop++;
    }
    this.x = nx;
    this.y = ny;
    this.blocked = 0;
    // Sheep hop around happily now and then.
    if (world.rng.chance(0.012)) this.hop();
  }

  private hop(): void {
    this.grounded = false;
    this.vx = this.dir * HOP.vx;
    this.vy = HOP.vy;
  }

  private fly(world: World): void {
    if (--this.flyLeft <= 0) {
      this.blowUp(world);
      return;
    }
    if (this.steerLeft) this.heading -= TURN_RATE;
    if (this.steerRight) this.heading += TURN_RATE;
    const underwater = this.y > world.waterLevel;
    const speed = underwater ? FLY_SPEED * 0.6 : FLY_SPEED;
    this.vx = cos(this.heading) * speed;
    this.vy = sin(this.heading) * speed;
    const steps = Math.ceil(speed);
    for (let i = 0; i < steps; i++) {
      const nx = this.x + this.vx / steps;
      const ny = this.y + this.vy / steps;
      if (world.terrain.circleCollides(nx, ny, this.radius)) {
        this.blowUp(world);
        return;
      }
      this.x = nx;
      this.y = ny;
    }
    if (this.y > world.waterLevel && !this.opts.aqua) {
      world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 0.6 });
      this.removed = true;
      return;
    }
    if (this.x < -300 || this.x > world.terrain.width + 300 || this.y < -2000) {
      this.removed = true;
      return;
    }
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (
        dx * dx + dy * dy < WORM_HIT * WORM_HIT &&
        !(w.id === this.ownerId && this.flyLeft > FLY_TICKS - 30)
      ) {
        this.blowUp(world);
        return;
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.mode)
      .u32(this.dir > 0 ? 1 : 0)
      .f64(this.heading)
      .u32(this.fuseLeft)
      .u32(this.age)
      .u32(this.flyLeft)
      .bool(this.grounded)
      .u32(this.blocked);
  }
}
