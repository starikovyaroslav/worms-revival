import type { Hasher } from '../core/hash';
import { PhysBody } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode } from './explosion';
import { scaledBlast } from './blast';

/** Distance at which a worm sets off an armed mine, px. */
const TRIGGER_RADIUS = 26;
const DUD_CHANCE = 0.1;

export interface MineOptions {
  /** Ticks before the mine becomes live. */
  armTicks: number;
  /** Ticks from trigger to explosion; -1 = random 0..3 s. */
  fuseTicks: number;
  /** Whether this mine may turn out to be a dud. */
  dudsAllowed: boolean;
  power?: number;
}

export class Mine extends PhysBody {
  readonly kind = 'mine';
  armTicks: number;
  /** Ticks until explosion once triggered; -1 while untriggered. */
  fuse = -1;
  readonly fuseTicks: number;
  dud = false;
  /** A dud that already fizzled. */
  spent = false;
  private readonly dudsAllowed: boolean;
  private readonly power: number;

  constructor(x: number, y: number, opts: MineOptions) {
    super(x, y);
    this.radius = 3;
    this.restitution = 0.35;
    this.friction = 0.6;
    this.armTicks = opts.armTicks;
    this.fuseTicks = opts.fuseTicks;
    this.dudsAllowed = opts.dudsAllowed;
    this.power = opts.power ?? 3;
  }

  get armed(): boolean {
    return this.armTicks <= 0 && !this.spent;
  }

  get triggered(): boolean {
    return this.fuse >= 0;
  }

  override isBusy(): boolean {
    return !this.resting || this.fuse >= 0;
  }

  override update(world: World): void {
    super.update(world);
    if (this.removed || this.spent) return;
    if (this.armTicks > 0) {
      this.armTicks--;
      return;
    }
    if (this.fuse < 0) {
      if (this.wormNearby(world)) this.trigger(world);
      return;
    }
    if (this.fuse-- > 0) return;
    if (this.dud) {
      this.spent = true;
      world.emit({ type: 'sound', id: 'dud', x: this.x, y: this.y });
      return;
    }
    this.removed = true;
    explode(world, this.x, this.y, scaledBlast(50, this.power));
  }

  trigger(world: World): void {
    if (this.fuse >= 0 || this.spent) return;
    this.fuse = this.fuseTicks >= 0 ? this.fuseTicks : world.rng.int(0, 3) * 50;
    this.dud = this.dudsAllowed && world.rng.chance(DUD_CHANCE);
    world.emit({ type: 'sound', id: 'mine-beep', x: this.x, y: this.y });
  }

  private wormNearby(world: World): boolean {
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy <= TRIGGER_RADIUS * TRIGGER_RADIUS) return true;
    }
    return false;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.armTicks + 1)
      .u32(this.fuse + 1)
      .bool(this.dud)
      .bool(this.spent);
  }
}
