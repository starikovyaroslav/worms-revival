/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Hasher } from '../src/core/hash';
import { Arrow } from '../src/weapons/arrow';
import { Barrel } from '../src/weapons/barrel';
import { Crate } from '../src/weapons/crate';
import { Earthquake, MeteorShower } from '../src/weapons/disasters';
import { DigTool } from '../src/weapons/digTool';
import { Donkey } from '../src/weapons/donkey';
import { Flame } from '../src/weapons/fire';
import { Gas } from '../src/weapons/gas';
import { Gunfire } from '../src/weapons/gunfire';
import { HomingMissile } from '../src/weapons/homing';
import { JetPack } from '../src/weapons/jetpack';
import { KamikazeFlight } from '../src/weapons/kamikaze';
import { Mine } from '../src/weapons/mine';
import { Pigeon } from '../src/weapons/pigeon';
import { Projectile, type ProjectileSpec } from '../src/weapons/projectile';
import { Rope } from '../src/weapons/rope';
import { Sheep } from '../src/weapons/sheep';
import { Gravestone } from '../src/world/gravestone';
import { World } from '../src/world/world';
import { Worm } from '../src/worm/worm';
import { Terrain } from '../src/terrain/terrain';
import { flatTerrain, makeGame } from './helpers';

/*
 * Hash completeness: everything that can influence the outcome of the simulation must be in
 * hashInto, otherwise a desync or a changed rule goes unnoticed. For every entity class (and for
 * Game and World) we build a populated instance, change each leaf field in turn and require the
 * hash to change. A field that is deliberately not hashed must be listed in EXCLUDED with a reason.
 */

type Path = (string | number)[];

const key = (p: Path) => p.join('.');

/** Own enumerable leaf paths, recursing into plain objects, arrays, typed arrays and state classes. */
function leafPaths(
  obj: object,
  skip: (p: string) => boolean,
  prefix: Path = [],
  out: Path[] = [],
): Path[] {
  for (const k of Object.keys(obj)) {
    const v = (obj as Record<string, unknown>)[k];
    if (typeof v === 'function') continue;
    const path = [...prefix, k];
    if (skip(key(path))) {
      out.push(path); // reported as excluded by the caller
      continue;
    }
    if (v !== null && typeof v === 'object') {
      if (Object.keys(v).length === 0) {
        throw new Error(`${key(path)} is an empty container: populate it in the factory`);
      }
      leafPaths(v, skip, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

function parentOf(root: object, path: Path): Record<string, unknown> {
  let o = root as Record<string, unknown>;
  for (const k of path.slice(0, -1)) o = o[k] as Record<string, unknown>;
  return o;
}

function mutated(v: unknown): unknown {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 7;
    return v === 1 ? -1 : v === -1 ? 1 : v + 1;
  }
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'string') return v + 'x';
  return 1; // null / undefined become a number
}

const BLAST = { crater: 20, radius: 40, damage: 30, push: 1 };

function spec(): ProjectileSpec {
  return {
    look: 'rocket',
    radius: 3,
    wind: 1,
    gravity: 1,
    impact: 'explode',
    fuse: 100,
    restitution: 0.5,
    friction: 0.9,
    blast: { ...BLAST },
    cluster: {
      count: 3,
      minSpeed: 1,
      maxSpeed: 2,
      spread: 0.5,
      reverse: false,
      projectile: {
        look: 'bomblet',
        radius: 2,
        wind: 0,
        impact: 'explode',
        blast: { ...BLAST },
      },
    },
    flames: { count: 4, speed: 1 },
    gas: { count: 5 },
    waitForRest: true,
    preSound: { id: 'x', ticks: 10 },
  };
}

function worm(): Worm {
  return new Worm(100, 100, 'Test', 0, 100);
}

interface Subject {
  /** Populated instance. */
  make(): object;
  /** Fields intentionally left out of the hash: path (dot-joined) or prefix -> reason. */
  excluded?: Record<string, string>;
  hash?(subject: object): number;
}

const ENTITY_COMMON: Record<string, string> = {
  prevX: 'render interpolation only; overwritten from x at the start of every tick',
  prevY: 'render interpolation only; overwritten from y at the start of every tick',
};
const PHYS_COMMON: Record<string, string> = {
  ...ENTITY_COMMON,
  impacted: 'transient: reset at the start of every update before it is read',
};

const entityHash = (e: object) => {
  const h = new Hasher();
  (e as { hashInto(h: Hasher): void }).hashInto(h);
  return h.digest();
};

const SUBJECTS: Record<string, Subject> = {
  Worm: {
    make: () => {
      const w = worm();
      w.blasted = true;
      return w;
    },
    excluded: {
      ...ENTITY_COMMON,
      name: 'label only; never read by the rules (identity is team + id)',
    },
  },
  Projectile: {
    make: () => new Projectile(10, 20, 1, 2, spec(), 3),
    excluded: PHYS_COMMON,
  },
  HomingMissile: {
    make: () => {
      const homing = { ...spec(), armTicks: 5, lockEndTick: 50, pull: 0.1, maxSpeed: 4 };
      return new HomingMissile(10, 20, 1, 2, homing, 55, 66, 3);
    },
    excluded: {
      ...PHYS_COMMON,
      homing: 'the same object as spec (hashed through spec)',
    },
  },
  Arrow: { make: () => new Arrow(10, 20, 1, 2, 25, 3), excluded: PHYS_COMMON },
  Gravestone: { make: () => new Gravestone(10, 20, 1), excluded: PHYS_COMMON },
  Mine: {
    make: () => new Mine(10, 20, { armTicks: 50, fuseTicks: 150, dudsAllowed: true, power: 3 }),
    excluded: PHYS_COMMON,
  },
  Crate: { make: () => new Crate(10, 20, 'weapon', 'bazooka', 3), excluded: PHYS_COMMON },
  Barrel: { make: () => new Barrel(10, 20), excluded: PHYS_COMMON },
  Flame: { make: () => new Flame(10, 20, 1, 1, 200), excluded: PHYS_COMMON },
  Gas: { make: () => new Gas(10, 20, 1, 1, 300), excluded: ENTITY_COMMON },
  Sheep: {
    make: () =>
      new Sheep(
        10,
        20,
        1,
        { blast: { ...BLAST }, fuse: 250, canFly: true, aqua: false, speed: 1, manual: true },
        3,
      ),
    excluded: PHYS_COMMON,
  },
  KamikazeFlight: {
    make: () => new KamikazeFlight(3, 0.6, -0.8, { ...BLAST }),
    excluded: ENTITY_COMMON,
  },
  Donkey: { make: () => new Donkey(10, 20, { ...BLAST }), excluded: ENTITY_COMMON },
  JetPack: {
    make: () => new JetPack(3),
    excluded: { ...ENTITY_COMMON, weaponId: 'constant of the class' },
  },
  Earthquake: { make: () => new Earthquake(), excluded: ENTITY_COMMON },
  MeteorShower: { make: () => new MeteorShower({ ...BLAST }, 3), excluded: ENTITY_COMMON },
  Pigeon: {
    make: () => new Pigeon(10, 20, 1, 300, 150, { ...BLAST }, 3),
    excluded: ENTITY_COMMON,
  },
  Rope: {
    make: () => {
      const r = new Rope(3, worm(), 0.6, -0.8, { shots: 2, maxLength: 300, limitDeg: 90 });
      r.anchors.push({ x: 5, y: 6, side: 1 });
      return r;
    },
    excluded: {
      ...ENTITY_COMMON,
      weaponId: 'derived from spec.elastic in the constructor (spec is hashed)',
    },
  },
  DigTool: {
    make: () => {
      const d = new DigTool('torch', 3, worm());
      (d as unknown as { hit: number[] }).hit.push(7);
      return d;
    },
    excluded: ENTITY_COMMON,
  },
  Gunfire: {
    make: () =>
      new Gunfire(3, worm(), {
        damage: 5,
        push: 1,
        crater: 2,
        range: 300,
        bullets: 10,
        interval: 3,
        spread: 0.1,
        sound: 'uzi',
      }),
    excluded: {
      ...ENTITY_COMMON,
      'spec.sound': 'sound id only; presentation',
    },
  },
};

function checkSubject(name: string, subject: Subject, hashOf: (o: object) => number): void {
  const obj = subject.make();
  const base = hashOf(obj);
  expect(hashOf(subject.make()), `${name}: hash is deterministic`).toBe(base);
  const excluded = subject.excluded ?? {};
  const used = new Set<string>();
  const missing: string[] = [];
  const excludedBy = (p: string) =>
    Object.keys(excluded).find((e) => p === e || p.startsWith(e + '.'));
  for (const path of leafPaths(obj, (p) => excludedBy(p) !== undefined)) {
    const p = key(path);
    const hit = excludedBy(p);
    if (hit) {
      used.add(hit);
      continue;
    }
    const parent = parentOf(obj, path);
    const last = path[path.length - 1] as string;
    const original = parent[last];
    parent[last] = mutated(original);
    if (hashOf(obj) === base) missing.push(p);
    parent[last] = original;
  }
  expect(missing, `${name}: fields that do not change the hash`).toEqual([]);
  const stale = Object.keys(excluded).filter((e) => !used.has(e));
  expect(stale, `${name}: exclusions that match no field`).toEqual([]);
}

describe('hash completeness', () => {
  for (const [name, subject] of Object.entries(SUBJECTS)) {
    it(`${name} hashes every field that matters`, () => {
      checkSubject(name, subject, subject.hash ?? entityHash);
    });
  }

  it('World hashes tick, wind, water, id counter, rng and physics', () => {
    checkSubject(
      'World',
      {
        make: () => new World({ seed: 5, terrain: flatTerrain(), waterLevel: 380 }),
        excluded: {
          events: 'presentation events, drained by the renderer',
          terrain: 'hashed by Terrain.hashInto (covered by terrain tests)',
          entities: 'every entity is hashed through its own class (tests above)',
          pending: 'flushed into entities before hashing',
        },
      },
      (w) => (w as World).hash(),
    );
  });

  it('World hash covers the set of entities', () => {
    const w = new World({ seed: 5, terrain: flatTerrain(), waterLevel: 380 });
    const empty = w.hash();
    w.spawn(new Earthquake());
    expect(w.hash()).not.toBe(empty);
  });

  it('Game hashes its turn and weapon state', () => {
    const game = makeGame();
    // Populate the optional / empty fields so that they can be mutated.
    game.target = { x: 5, y: 6 };
    game.winner = 0;
    for (const t of game.teams) t.ammo.bazooka = 3;
    (game as unknown as { dyingQueue: number[] }).dyingQueue.push(3);
    checkSubject(
      'Game',
      {
        make: () => game,
        excluded: {
          world: 'hashed by World.hash (covered above)',
          scheme: 'immutable setup config, identical by construction (guarded by rulesetHash)',
          cavern: 'immutable setup config',
          focusId: 'camera target, presentation only',
          'teams.0.index': 'position in the teams array',
          'teams.0.name': 'label only',
          'teams.1.index': 'position in the teams array',
          'teams.1.name': 'label only',
        },
      },
      (g) => (g as typeof game).hash(),
    );
  });

  it('Terrain changes alter the world hash', () => {
    const t = new Terrain(20, 20);
    const w = new World({ seed: 1, terrain: t, waterLevel: 19 });
    const before = w.hash();
    t.set(3, 3, 1);
    expect(w.hash()).not.toBe(before);
  });

  it('every Entity subclass in src has a completeness subject', () => {
    const classes: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith('.ts')) {
          const src = readFileSync(p, 'utf8');
          for (const m of src.matchAll(
            /^export class (\w+) extends (?:Entity|PhysBody|Projectile)\b/gm,
          )) {
            classes.push(m[1] as string);
          }
        }
      }
    };
    walk(join(import.meta.dirname, '../src'));
    expect(classes.length).toBeGreaterThan(15);
    expect(classes.filter((c) => !(c in SUBJECTS))).toEqual([]);
  });
});
