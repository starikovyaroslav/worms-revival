import {
  AIM_SPEED,
  CHARGE_TICKS,
  HALF_PI,
  Rng,
  Worm,
  getWeapon,
  type Command,
  type Game,
  type WeaponDef,
} from '@wr/sim';
import { ProbeLand, probeShot, type ShotParams } from './probe';

/** Weapons the bot knows how to use, roughly in order of preference. */
const ARSENAL = [
  'bazooka',
  'grenade',
  'cluster',
  'banana',
  'hhg',
  'shotgun',
  'firepunch',
  'bat',
  'dynamite',
  'airstrike',
];

/**
 * Per difficulty 1..5: which weapons it considers, whether it refines its best guesses, and how
 * much it fumbles the final shot (in aim key ticks and charge ticks).
 */
const LEVELS = [
  { weapons: 2, refine: 0, aimError: 4, powerError: 7 },
  { weapons: 3, refine: 1, aimError: 3, powerError: 5 },
  { weapons: 4, refine: 2, aimError: 2, powerError: 3 },
  { weapons: 6, refine: 3, aimError: 1, powerError: 1 },
  { weapons: 10, refine: 4, aimError: 0, powerError: 0 },
] as const;

/** Coarse search grid. */
const COARSE_AIM_STEP = 5;
const COARSE_CHARGES = [10, 18, 26, 34, 42, 50, 55];

/** A planned turn: a list of command batches, one batch per tick. */
export type Plan = Command[][];

interface Candidate {
  shot: ShotParams;
  /** Aim expressed as up/down key ticks from the current aim. */
  aimTicks: number;
  /** Charge ticks for charged weapons. */
  chargeTicks: number;
  score: number;
}

/** Aim after holding up (positive) or down for `ticks`, replicating the game's arithmetic. */
function aimAfter(aim: number, ticks: number): number {
  let a = aim;
  for (let i = 0; i < Math.abs(ticks); i++) {
    a = ticks > 0 ? Math.min(HALF_PI, a + AIM_SPEED) : Math.max(-HALF_PI, a - AIM_SPEED);
  }
  return a;
}

/** Power after charging for `ticks`, replicating the game's arithmetic. */
function powerAfter(ticks: number): number {
  let p = 0;
  for (let i = 0; i < ticks; i++) p += 1 / CHARGE_TICKS;
  return Math.max(0.05, Math.min(1, p));
}

export class Bot {
  private rng: Rng;

  constructor(
    private readonly game: Game,
    readonly difficulty: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
  }

  private score(worm: Worm, damage: Map<number, number>, killed: Set<number>): number {
    let s = 0;
    for (const [id, dmg] of damage) {
      const w = this.game.world.byId(id) as Worm | undefined;
      if (!w) continue;
      const enemy = w.team !== worm.team;
      s += enemy ? dmg : -dmg * 1.6;
      if (killed.has(id)) s += enemy ? 40 : -120;
    }
    return s;
  }

  /**
   * Thinks about the turn in small slices (yield between probes) and returns a plan.
   * Run it a little every frame so the game keeps rendering.
   */
  *think(): Generator<void, Plan> {
    const game = this.game;
    const worm = game.activeWorm;
    if (!worm) return [];
    const level = LEVELS[Math.min(5, Math.max(1, this.difficulty)) - 1]!;
    const enemies = game.worms.filter((w) => w.alive && w.team !== worm.team);
    const facings = new Set<1 | -1>(enemies.map((e) => (e.x < worm.x ? -1 : 1)));
    if (!facings.size) facings.add(worm.facing);

    const usable = ARSENAL.filter((id) => game.canUse(id))
      .slice(0, level.weapons)
      .map((id) => getWeapon(id))
      .filter((d): d is WeaponDef => !!d);

    const land = new ProbeLand(game.world.terrain);
    const tried = new Set<string>();
    const results: Candidate[] = [];
    const consider = (c: Omit<Candidate, 'score'>) => {
      const key = `${c.shot.weapon.id}|${c.shot.facing}|${c.aimTicks}|${c.chargeTicks}|${c.shot.fuseSeconds}|${c.shot.target?.x}`;
      if (tried.has(key)) return;
      tried.add(key);
      const out = probeShot(game, worm.id, c.shot, land);
      results.push({ ...c, score: this.score(worm, out.damage, out.killed) });
    };
    const make = (
      def: WeaponDef,
      facing: 1 | -1,
      aimTicks: number,
      chargeTicks: number,
      fuseSeconds: number,
    ) => ({
      shot: {
        weapon: def,
        facing,
        aim: aimAfter(worm.aim, aimTicks),
        power: def.charge ? powerAfter(chargeTicks) : 1,
        fuseSeconds,
        bounceHigh: false,
        target: null,
      },
      aimTicks,
      chargeTicks,
    });

    // Range of aim key presses that stays within -90°..90°.
    const minTicks = -Math.ceil((worm.aim + HALF_PI) / AIM_SPEED);
    const maxTicks = Math.ceil((HALF_PI - worm.aim) / AIM_SPEED);
    const clampAim = (t: number) => Math.max(minTicks, Math.min(maxTicks, t));

    // 1. Coarse sweep over every usable weapon.
    for (const def of usable) {
      for (const facing of facings) {
        if (def.aim === 'target') {
          for (const e of enemies) {
            consider({
              shot: {
                weapon: def,
                facing,
                aim: worm.aim,
                power: 1,
                fuseSeconds: 3,
                bounceHigh: false,
                target: { x: e.cx, y: e.cy },
              },
              aimTicks: 0,
              chargeTicks: 0,
            });
            yield;
          }
          continue;
        }
        // Melee only makes sense with someone close by.
        if (
          def.aim === 'none' &&
          !enemies.some((e) => Math.abs(e.x - worm.x) < 40 && Math.abs(e.y - worm.y) < 30)
        )
          continue;
        const aims: number[] = [];
        if (def.aim === 'angle')
          for (let t = minTicks; t <= maxTicks; t += COARSE_AIM_STEP) aims.push(t);
        else aims.push(0);
        const charges = def.charge ? COARSE_CHARGES : [0];
        for (const a of aims) {
          for (const k of charges) consider(make(def, facing, a, k, 3));
          yield;
        }
      }
    }

    // 2. Refine around the most promising shots.
    const top = results
      .filter((r) => r.score > 0 && r.shot.weapon.aim === 'angle')
      .sort((a, b) => b.score - a.score)
      .slice(0, level.refine);
    for (const c of top) {
      const def = c.shot.weapon;
      const fuses = def.fuse ? [2, 3, 4] : [3];
      for (let da = -3; da <= 3; da++) {
        for (let dk = def.charge ? -6 : 0; dk <= (def.charge ? 6 : 0); dk += 2) {
          for (const f of fuses) {
            const k = def.charge ? Math.max(3, Math.min(55, c.chargeTicks + dk)) : 0;
            consider(make(def, c.shot.facing, clampAim(c.aimTicks + da), k, f));
          }
        }
        yield;
      }
    }

    let best: Candidate | null = null;
    for (const r of results) if (!best || r.score > best.score) best = r;
    const chosen = best as Candidate | null;
    if (!chosen || chosen.score <= 0) return this.planSkip();
    // Human-like imprecision.
    const aimTicks = chosen.aimTicks + this.rng.int(-level.aimError, level.aimError);
    const chargeTicks = chosen.shot.weapon.charge
      ? Math.min(
          CHARGE_TICKS,
          Math.max(3, chosen.chargeTicks + this.rng.int(-level.powerError, level.powerError)),
        )
      : 0;
    return this.planShot(worm, {
      ...chosen,
      aimTicks: chosen.shot.weapon.aim === 'angle' ? aimTicks : 0,
      chargeTicks,
    });
  }

  private planSkip(): Plan {
    const plan: Plan = [
      [{ t: 'select', weapon: 'skipgo' }],
      [],
      [{ t: 'fire', down: true }],
      [{ t: 'fire', down: false }],
    ];
    return this.game.canUse('skipgo') ? plan : [[{ t: 'skip' }]];
  }

  /** Turns a chosen shot into keypresses, with pauses so it looks like someone is playing. */
  private planShot(worm: Worm, c: Candidate): Plan {
    const plan: Plan = [];
    const idle = (n: number) => {
      for (let i = 0; i < n; i++) plan.push([]);
    };
    const none = { t: 'move' as const, left: false, right: false, up: false, down: false };
    idle(15);
    plan.push([{ t: 'select', weapon: c.shot.weapon.id }]);
    if (c.shot.weapon.fuse) plan.push([{ t: 'fuse', seconds: c.shot.fuseSeconds }]);
    if (c.shot.target)
      plan.push([{ t: 'target', x: Math.round(c.shot.target.x), y: Math.round(c.shot.target.y) }]);
    idle(10);
    if (c.shot.facing !== worm.facing) {
      plan.push([{ ...none, left: c.shot.facing < 0, right: c.shot.facing > 0 }]);
      plan.push([none]);
      idle(8);
    }
    if (c.aimTicks !== 0) {
      plan.push([{ ...none, up: c.aimTicks > 0, down: c.aimTicks < 0 }]);
      idle(Math.abs(c.aimTicks) - 1);
      plan.push([none]);
    }
    idle(12);
    plan.push([{ t: 'fire', down: true }]);
    if (c.shot.weapon.charge) {
      idle(c.chargeTicks - 1);
      plan.push([{ t: 'fire', down: false }]);
    } else {
      plan.push([{ t: 'fire', down: false }]);
      // Second barrel.
      if (c.shot.weapon.shots && c.shot.weapon.shots > 1) {
        idle(25);
        plan.push([{ t: 'fire', down: true }], [{ t: 'fire', down: false }]);
      }
    }
    return plan;
  }
}
