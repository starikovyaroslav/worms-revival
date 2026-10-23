import { Hasher } from '../core/hash';
import { Rng } from '../core/rng';
import type { Terrain } from '../terrain/terrain';
import type { Entity } from './entity';
import type { SimEvent, PresentationVariant, WormMotion } from './events';

export interface PhysicsConfig {
  /** px / tick². */
  gravity: number;
  /** Wind acceleration at full strength, px / tick². */
  maxWind: number;
  /** Absolute speed cap, px / tick (W:A caps at 32). */
  maxSpeed: number;
  /** Worms take damage from hard landings. */
  fallDamage: boolean;
  /** Multiplier on all explosion damage. */
  damageScale: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 0.2,
  // Wind is a share of gravity: the strongest W:A wind pushes a bazooka shell with 119% of gravity.
  maxWind: 0.238,
  maxSpeed: 32,
  fallDamage: true,
  damageScale: 1,
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
  /** Entities by id and by kind, kept in id order; updated when pending ones join and on compaction. */
  private readonly index = new Map<number, Entity>();
  private readonly buckets = new Map<string, Entity[]>();

  /** Presentation events produced since the last drain. */
  events: SimEvent[] = [];
  private motionSequence = 0;
  /** Cosmetic lineage only: not hashed, not read by physics or rules. */
  private readonly presentationSources = new Map<number, string>();
  private presentationSource: string | undefined;
  private readonly presentationVariants = new Map<number, PresentationVariant>();
  private presentationVariant: PresentationVariant = 'standard';

  withPresentationSource<T>(
    source: string | undefined,
    run: () => T,
    variant: PresentationVariant = 'standard',
  ): T {
    const before = this.presentationSource;
    const beforeVariant = this.presentationVariant;
    this.presentationSource = source;
    this.presentationVariant = variant;
    try {
      return run();
    } finally {
      this.presentationSource = before;
      this.presentationVariant = beforeVariant;
    }
  }

  sourceOf(entity: Entity): string {
    return this.presentationSources.get(entity.id) ?? entity.kind;
  }

  variantOf(entity: Entity): PresentationVariant {
    return this.presentationVariants.get(entity.id) ?? 'standard';
  }

  constructor(opts: WorldOptions) {
    this.rng = new Rng(opts.seed);
    this.terrain = opts.terrain;
    this.waterLevel = opts.waterLevel;
    this.physics = { ...DEFAULT_PHYSICS, ...opts.physics };
  }

  /** Adds an entity; it starts updating on the next tick. */
  spawn<T extends Entity>(e: T): T {
    e.id = this.nextId++;
    if (this.presentationSource) this.presentationSources.set(e.id, this.presentationSource);
    if (this.presentationVariant !== 'standard')
      this.presentationVariants.set(e.id, this.presentationVariant);
    this.pending.push(e);
    return e;
  }

  emit(event: SimEvent): void {
    this.events.push(
      event.type === 'explosion' || event.type === 'airRaid'
        ? {
            ...event,
            source: event.source ?? this.presentationSource ?? 'generic',
            variant: event.variant ?? this.presentationVariant,
          }
        : event.type === 'sound'
          ? { ...event, variant: event.variant ?? this.presentationVariant }
          : event,
    );
  }

  /** Cosmetic only: never read by physics, rules, commands or the state hash. */
  emitWormMotion(wormId: number, x: number, y: number, motion: WormMotion): void {
    this.emit({
      type: 'worm-motion',
      wormId,
      x,
      y,
      motion,
      tick: this.tick,
      sequence: this.motionSequence++,
    });
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
    if (this.pending.length) this.flushPending();
    return this.index.get(id);
  }

  /** Live entities of one kind in id order. A fresh array, so callers may keep or reorder it. */
  ofKind<T extends Entity>(kind: string): T[] {
    if (this.pending.length) this.flushPending();
    const out: T[] = [];
    const bucket = this.buckets.get(kind);
    if (bucket) for (const e of bucket) if (!e.removed) out.push(e as T);
    return out;
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
      if (!e.removed)
        this.withPresentationSource(this.sourceOf(e), () => e.update(this), this.variantOf(e));
    }
    // Observe after ALL movers: rope/jetpack can move a worm after its own update.
    // Cosmetic only; this must not decide drowning or otherwise change the body.
    for (const e of current) {
      if (!e.removed && e.kind === 'worm' && e.prevY < this.waterLevel && e.y >= this.waterLevel)
        this.emitWormMotion(e.id, e.x, this.waterLevel, {
          kind: 'water-entry',
          vx: e.vx,
          vy: e.vy,
        });
    }
    this.compact();
    this.flushPending();
    this.tick++;
  }

  /** Drops removed entities in place, keeping order. */
  private compact(): void {
    const list = this.entities;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i] as Entity;
      if (e.removed) {
        this.index.delete(e.id);
        this.presentationSources.delete(e.id);
        this.presentationVariants.delete(e.id);
        const bucket = this.buckets.get(e.kind) as Entity[];
        bucket.splice(bucket.indexOf(e), 1);
      } else {
        list[n++] = e;
      }
    }
    list.length = n;
  }

  private flushPending(): void {
    if (!this.pending.length) return;
    // Ids are monotonic and pending is in spawn order, so appending keeps everything sorted.
    for (const e of this.pending) {
      this.entities.push(e);
      this.index.set(e.id, e);
      let bucket = this.buckets.get(e.kind);
      if (!bucket) this.buckets.set(e.kind, (bucket = []));
      bucket.push(e);
    }
    this.pending = [];
  }

  hash(): number {
    const h = new Hasher();
    h.u32(this.tick).f64(this.wind).f64(this.waterLevel).u32(this.nextId).value(this.physics);
    for (const s of this.rng.s) h.u32(s);
    this.terrain.hashInto(h);
    for (const e of this.all()) e.hashInto(h);
    return h.digest();
  }
}
