import { Hasher } from '../core/hash';
import { Rng } from '../core/rng';
import type { Terrain } from '../terrain/terrain';
import type { Entity } from './entity';
import type { SimEvent } from './events';

export interface PhysicsConfig {
  /** px / tick². */
  gravity: number;
  /** Wind acceleration at full strength, px / tick². */
  maxWind: number;
  /** Absolute speed cap, px / tick (W:A caps at 32). */
  maxSpeed: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 0.2,
  maxWind: 0.05,
  maxSpeed: 32,
};

export interface WorldOptions {
  seed: number;
  terrain: Terrain;
  /** Y coordinate of the water surface. */
  waterLevel: number;
  physics?: Partial<PhysicsConfig>;
}

export class World {
  tick = 0;
  readonly rng: Rng;
  readonly terrain: Terrain;
  readonly physics: PhysicsConfig;
  waterLevel: number;
  /** -1..1, multiplied by physics.maxWind for wind-affected objects. */
  wind = 0;

  private entities: Entity[] = [];
  private nextId = 1;
  private pending: Entity[] = [];

  /** Presentation events produced since the last drain. */
  events: SimEvent[] = [];

  constructor(opts: WorldOptions) {
    this.rng = new Rng(opts.seed);
    this.terrain = opts.terrain;
    this.waterLevel = opts.waterLevel;
    this.physics = { ...DEFAULT_PHYSICS, ...opts.physics };
  }

  /** Adds an entity; it starts updating on the next tick. */
  spawn<T extends Entity>(e: T): T {
    e.id = this.nextId++;
    this.pending.push(e);
    return e;
  }

  emit(event: SimEvent): void {
    this.events.push(event);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** All live entities in id order (includes ones spawned this tick). */
  all(): readonly Entity[] {
    if (this.pending.length) this.flushPending();
    return this.entities;
  }

  byId(id: number): Entity | undefined {
    return this.all().find((e) => e.id === id);
  }

  ofKind<T extends Entity>(kind: string): T[] {
    return this.all().filter((e) => e.kind === kind && !e.removed) as T[];
  }

  isBusy(): boolean {
    return this.all().some((e) => !e.removed && e.isBusy());
  }

  isUnderwater(y: number): boolean {
    return y >= this.waterLevel;
  }

  /** Advances the simulation by one tick. */
  step(): void {
    this.flushPending();
    for (const e of this.entities) {
      e.prevX = e.x;
      e.prevY = e.y;
    }
    // Entities spawned during this loop are processed starting next tick.
    const current = this.entities;
    for (let i = 0; i < current.length; i++) {
      const e = current[i] as Entity;
      if (!e.removed) e.update(this);
    }
    this.entities = this.entities.filter((e) => !e.removed);
    this.flushPending();
    this.tick++;
  }

  private flushPending(): void {
    if (!this.pending.length) return;
    this.entities.push(...this.pending);
    this.pending = [];
    // Ids are monotonic, so this is a no-op unless something re-inserts entities.
    this.entities.sort((a, b) => a.id - b.id);
  }

  hash(): number {
    const h = new Hasher();
    h.u32(this.tick).f64(this.wind).f64(this.waterLevel).u32(this.nextId);
    for (const s of this.rng.s) h.u32(s);
    this.terrain.hashInto(h);
    for (const e of this.all()) e.hashInto(h);
    return h.digest();
  }
}
