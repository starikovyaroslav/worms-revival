import type { Hasher } from '../core/hash';
import type { Blast } from '../weapons/explosion';
import { blastImpulse } from '../weapons/explosion';
import { Entity } from './entity';
import type { World } from './world';

export interface Impact {
  /** Surface normal at the contact, pointing out of the land. */
  nx: number;
  ny: number;
  /** Speed into the surface at the moment of impact (positive). */
  speed: number;
}

/**
 * A small round physics object: projectiles, gravestones, mines, barrels, crates.
 * Flies under gravity (and optionally wind), bounces off land and comes to rest.
 */
export abstract class PhysBody extends Entity {
  radius = 3;
  /** Fraction of the normal velocity kept on a bounce. */
  restitution = 0.5;
  /** Fraction of the tangential velocity kept on a bounce. */
  friction = 0.85;
  /** 0 = ignores wind, 1 = fully affected. */
  windFactor = 0;
  gravityScale = 1;
  /** How strongly explosions push it (0 = immovable). */
  blastFactor = 1;
  resting = false;
  /** Removed when it touches water (most objects sink out of play). */
  sinks = true;
  /** Ticks in a row it hit land without really moving (resting on a steep slope). */
  private stuckTicks = 0;
  private impacted = false;

  override isBusy(): boolean {
    return !this.resting;
  }

  override onBlast(_world: World, b: Blast): void {
    if (this.blastFactor <= 0) return;
    const dx = this.x - b.x;
    const dy = this.y - b.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= b.radius) return;
    const dmg = b.damage * (1 - d / b.radius);
    const v = blastImpulse(b, this.x, this.y, dmg);
    this.vx += v.x * this.blastFactor;
    this.vy += v.y * this.blastFactor;
    this.resting = false;
  }

  /**
   * Called when the body hits land. The default bounces and eventually rests; projectiles
   * override this to explode.
   */
  protected onImpact(world: World, hit: Impact): void {
    this.bounce(hit);
    if (hit.ny < -0.5 && Math.abs(this.vx) + Math.abs(this.vy) < 0.6) this.rest(world);
  }

  protected bounce(hit: Impact): void {
    const vn = this.vx * hit.nx + this.vy * hit.ny;
    if (vn >= 0) return;
    const tx = this.vx - vn * hit.nx;
    const ty = this.vy - vn * hit.ny;
    this.vx = tx * this.friction - vn * hit.nx * this.restitution;
    this.vy = ty * this.friction - vn * hit.ny * this.restitution;
  }

  protected rest(world: World): void {
    this.vx = 0;
    this.vy = 0;
    this.resting = true;
    // Settle so it sits just on the surface.
    let guard = 0;
    while (world.terrain.circleCollides(this.x, this.y, this.radius) && guard++ < 10) this.y -= 1;
  }

  protected onWater(world: World): void {
    world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 0.5 });
    if (this.sinks) this.removed = true;
  }

  update(world: World): void {
    if (this.resting) {
      // Wake up if the land underneath is gone.
      if (!world.terrain.circleCollides(this.x, this.y + 1, this.radius)) this.resting = false;
      else return;
    }
    const x0 = this.x;
    const y0 = this.y;
    this.impacted = false;
    this.integrate(world);
    if (this.removed) return;
    // Pinned against a steep slope, creeping by fractions of a pixel: call it resting.
    if (this.impacted && !this.resting && Math.abs(this.x - x0) + Math.abs(this.y - y0) < 0.3) {
      if (++this.stuckTicks >= 3) this.rest(world);
    } else {
      this.stuckTicks = 0;
    }
    if (this.y > world.waterLevel) this.onWater(world);
  }

  /** Moves the body for one tick in small sub-steps; returns after the first impact. */
  protected integrate(world: World): void {
    const p = world.physics;
    this.vy += p.gravity * this.gravityScale;
    this.vx += world.wind * p.maxWind * this.windFactor;
    const max = p.maxSpeed;
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
      if (!world.terrain.circleCollides(nx, ny, this.radius)) {
        this.x = nx;
        this.y = ny;
        continue;
      }
      const n = world.terrain.normalAt(nx, ny, this.radius + 3) ?? { x: -dx, y: -dy };
      const len = Math.sqrt(n.x * n.x + n.y * n.y) || 1;
      const hit = { nx: n.x / len, ny: n.y / len, speed: 0 };
      hit.speed = -(this.vx * hit.nx + this.vy * hit.ny);
      this.impacted = true;
      this.onImpact(world, hit);
      return;
    }
    // Leaving the map sideways or far below: gone for good.
    if (this.x < -500 || this.x > world.terrain.width + 500) this.removed = true;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.bool(this.resting).u32(this.stuckTicks);
  }
}
