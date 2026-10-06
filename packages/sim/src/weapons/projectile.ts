import type { Hasher } from '../core/hash';
import { cos, sin } from '../core/math';
import { PhysBody, type Impact } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode, type BlastSpec } from './explosion';

export interface ClusterSpec {
  count: number;
  /** Launch speed range of each bomblet, px/tick. */
  minSpeed: number;
  maxSpeed: number;
  /** Half-angle of the upward cone they fly out in, radians. */
  spread: number;
  projectile: ProjectileSpec;
}

export interface ProjectileSpec {
  /** Visual identifier for the renderer. */
  look: string;
  radius: number;
  /** 0..1 wind influence (bazooka 1, grenade 0). */
  wind: number;
  gravity?: number;
  /** 'explode' on contact with land/worms, or 'bounce' until the fuse runs out. */
  impact: 'explode' | 'bounce';
  /** Fuse in ticks for bouncing projectiles. */
  fuse?: number;
  restitution?: number;
  friction?: number;
  blast: BlastSpec;
  cluster?: ClusterSpec;
  /** Only explode once the fuse is out AND it stopped moving (Holy Hand Grenade). */
  waitForRest?: boolean;
  /** Sound played, followed by a pause of `ticks`, before the explosion ("Hallelujah!"). */
  preSound?: { id: string; ticks: number };
}

/** Ticks during which a projectile ignores the worm that fired it. */
const SAFE_TICKS = 6;
/** Contact distance between a projectile and a worm's body centre. */
const WORM_HIT_RADIUS = 7;

/** Anything launched from a weapon that flies and then goes bang. */
export class Projectile extends PhysBody {
  readonly kind = 'projectile';
  fuseLeft: number;
  age = 0;
  ownerId: number;
  private fuseOut = false;
  /** Ticks of dramatic pause before the explosion, -1 when not started. */
  private finale = -1;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    readonly spec: ProjectileSpec,
    ownerId = 0,
  ) {
    super(x, y);
    this.vx = vx;
    this.vy = vy;
    this.radius = spec.radius;
    this.windFactor = spec.wind;
    this.gravityScale = spec.gravity ?? 1;
    this.restitution = spec.restitution ?? 0.5;
    this.friction = spec.friction ?? 0.96;
    this.fuseLeft = spec.fuse ?? -1;
    this.ownerId = ownerId;
  }

  get look(): string {
    return this.spec.look;
  }

  override isBusy(): boolean {
    return true;
  }

  override update(world: World): void {
    this.age++;
    if (this.finale > 0) {
      if (--this.finale === 0) {
        this.detonate(world);
        return;
      }
    } else if (this.fuseLeft > 0 && --this.fuseLeft === 0) {
      this.fuseLeft = -1;
      this.fuseOut = true;
    }
    if (this.fuseOut && this.finale < 0 && (!this.spec.waitForRest || this.resting)) {
      const pre = this.spec.preSound;
      if (pre) {
        // Pause for effect ("Hallelujah!"), then go bang.
        world.emit({ type: 'sound', id: pre.id, x: this.x, y: this.y });
        this.finale = pre.ticks;
      } else {
        this.detonate(world);
        return;
      }
    }
    super.update(world);
    if (this.removed || this.spec.impact !== 'explode') return;
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive || (w.id === this.ownerId && this.age < SAFE_TICKS)) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy < WORM_HIT_RADIUS * WORM_HIT_RADIUS) {
        this.detonate(world);
        return;
      }
    }
  }

  protected override onImpact(world: World, hit: Impact): void {
    if (this.spec.impact === 'explode') {
      this.detonate(world);
      return;
    }
    const before = Math.abs(this.vx) + Math.abs(this.vy);
    this.bounce(hit);
    if (before > 2.5) world.emit({ type: 'sound', id: 'bounce', x: this.x, y: this.y });
    if (hit.ny < -0.5 && Math.abs(this.vx) + Math.abs(this.vy) < 0.4) this.rest(world);
  }

  protected override onWater(world: World): void {
    world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 0.4 });
    this.removed = true;
  }

  detonate(world: World): void {
    if (this.removed) return;
    this.removed = true;
    explode(world, this.x, this.y, this.spec.blast);
    const c = this.spec.cluster;
    if (!c) return;
    for (let i = 0; i < c.count; i++) {
      const a = world.rng.range(-c.spread, c.spread);
      const speed = world.rng.range(c.minSpeed, c.maxSpeed);
      // Straight up rotated by `a`.
      const vx = speed * sin(a);
      const vy = -speed * cos(a);
      world.spawn(new Projectile(this.x, this.y - 2, vx, vy, c.projectile, this.ownerId));
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.spec.look)
      .u32(this.fuseLeft + 1)
      .u32(this.age);
  }
}

/** Spawn point just outside the worm's body along the aim direction. */
export function muzzle(
  worm: Worm,
  dirX: number,
  dirY: number,
  dist = 10,
): { x: number; y: number } {
  return { x: worm.cx + dirX * dist, y: worm.cy + dirY * dist };
}
