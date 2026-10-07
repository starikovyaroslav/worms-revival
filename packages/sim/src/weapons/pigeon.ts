import type { Hasher } from '../core/hash';
import { atan2, cos, sin, wrapAngle } from '../core/math';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode, type BlastSpec } from './explosion';

const SPEED = 3.6;
const TURN = 0.11;
const LOOKAHEAD = 16;
const LIFE = 8 * 50;

/** Homing pigeon: flies to the target on its own, swerving around the landscape. */
export class Pigeon extends Entity {
  readonly kind = 'pigeon';
  heading: number;
  life = LIFE;
  /** Which way it swerves around obstacles. */
  private avoid: 1 | -1;

  constructor(
    x: number,
    y: number,
    facing: 1 | -1,
    readonly targetX: number,
    readonly targetY: number,
    readonly blast: BlastSpec,
    readonly ownerId: number,
  ) {
    super(x, y);
    this.heading = facing > 0 ? -0.6 : Math.PI + 0.6;
    this.avoid = facing > 0 ? -1 : 1;
  }

  override isBusy(): boolean {
    return true;
  }

  private boom(world: World): void {
    this.removed = true;
    explode(world, this.x, this.y, this.blast);
  }

  /** Whether flying along heading `h` would hit land soon. */
  private blocked(world: World, h: number): boolean {
    const t = world.terrain;
    const c = cos(h);
    const sn = sin(h);
    for (const d of [5, 10, LOOKAHEAD]) {
      if (t.circleCollides(this.x + c * d, this.y + sn * d, 3)) return true;
    }
    return false;
  }

  update(world: World): void {
    if (--this.life <= 0) {
      this.boom(world);
      return;
    }
    const t = world.terrain;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (dx * dx + dy * dy < 64) {
      this.boom(world);
      return;
    }
    // Turn towards the target, but only onto a heading with a clear path; otherwise keep
    // swerving around whatever is in the way.
    const want = atan2(dy, dx);
    const diff = wrapAngle(want - this.heading);
    const turned = this.heading + Math.max(-TURN, Math.min(TURN, diff));
    if (!this.blocked(world, turned)) {
      this.heading = turned;
    } else {
      for (let i = 0; i < 12 && this.blocked(world, this.heading); i++)
        this.heading += this.avoid * 0.3;
    }
    this.vx = cos(this.heading) * SPEED;
    this.vy = sin(this.heading) * SPEED;
    this.x += this.vx;
    this.y += this.vy;
    if (t.circleCollides(this.x, this.y, 2) || this.y > world.waterLevel) {
      this.boom(world);
      return;
    }
    if (this.life < LIFE - 20) {
      for (const w of world.ofKind<Worm>('worm')) {
        if (!w.alive || w.id === this.ownerId) continue;
        if ((w.cx - this.x) ** 2 + (w.cy - this.y) ** 2 < 64) {
          this.boom(world);
          return;
        }
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.f64(this.heading)
      .u32(this.life)
      .u32(this.avoid > 0 ? 1 : 0);
  }
}
