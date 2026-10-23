import { Game, Hasher, type Command } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from './match';
import { SCHEMES } from './schemes';
import { RULESET } from './weapons';

/**
 * Bump whenever a change alters simulation results (rules, weapon numbers, hashed state). The golden
 * replay test in packages/ai/test/golden.test.ts fails if the logic changed and this was not bumped.
 * 2: complete state hash (ammo, turn counters, physics, entity specs...).
 * 3: review fixes: controlled tool released on replacement, donkey blasts once per layer,
 *    once-per-turn utilities.
 * 4: M2 UX rules: default weapon at turn start (last choice, else bazooka), no hot-seat hand-over wait
 *    for computer turns or with a single human team (TeamSetup.cpu, 'ready' command), crate
 *    parachute 1.3 -> 7 px/tick, weapon choice and aiming allowed while a crate falls (Fire/Jump skip
 *    the wait), held keys cleared at turn start.
 */
export const REPLAY_VERSION = 4;

let cachedRulesetHash: number | null = null;

/**
 * Fingerprint of the rule tables (all schemes and the flags of every weapon, in panel order).
 * Weapon numbers and `fire` code are not visible here; the golden replay covers those.
 */
export function rulesetHash(): number {
  if (cachedRulesetHash === null) {
    const h = new Hasher().value(SCHEMES);
    for (const def of RULESET.weapons) {
      // The flags the game branches on (not ui/view, not the code itself).
      const { spec: _spec, fire: _fire, validTarget, ...flags } = def;
      h.value({ ...flags, id: def.id, hasValidTarget: !!validTarget });
    }
    cachedRulesetHash = h.digest();
  }
  return cachedRulesetHash;
}

/** Why a replay cannot be played by this build, or null when it can. */
export type ReplayProblem =
  | { kind: 'malformed' }
  | { kind: 'version'; found: unknown }
  | { kind: 'ruleset' }
  /** Passed the checks but the match could not be built (set by the caller that tried). */
  | { kind: 'unplayable' };

export function replayProblem(raw: unknown): ReplayProblem | null {
  if (!isReplayShape(raw)) return { kind: 'malformed' };
  if (raw.version !== REPLAY_VERSION) return { kind: 'version', found: raw.version };
  if (raw.rulesetHash !== rulesetHash()) return { kind: 'ruleset' };
  return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Structure only (what `ReplayPlayer` needs to start); the ruleset and version are checked after. */
function isReplayShape(raw: unknown): raw is Replay {
  if (!isObject(raw) || !isObject(raw.config) || !Array.isArray(raw.log)) return false;
  const c = raw.config;
  const teamsOk =
    Array.isArray(c.teams) &&
    c.teams.length > 0 &&
    c.teams.every(
      (t: unknown) =>
        isObject(t) && isStr(t.name) && Array.isArray(t.worms) && t.worms.every(isStr),
    );
  const logOk = raw.log.every(
    (e: unknown) => Array.isArray(e) && e.length === 2 && isNum(e[0]) && Array.isArray(e[1]),
  );
  return (
    teamsOk &&
    logOk &&
    isNum(c.seed) &&
    (c.mapVersion === undefined || c.mapVersion === 1 || c.mapVersion === 2) &&
    isStr(c.style) &&
    isStr(c.themeId) &&
    isStr(c.schemeId) &&
    isNum(raw.finalTick) &&
    raw.finalTick >= 0 &&
    isNum(raw.finalHash)
  );
}

/** A whole match: the starting config plus every command, keyed by the tick it was applied on. */
export interface Replay {
  version: number;
  /** `rulesetHash()` of the build that recorded it. */
  rulesetHash: number;
  config: MatchConfig;
  /** [tick, commands] for ticks that had input. */
  log: [number, Command[]][];
  /** State hash at the end of the recording, to detect desyncs. */
  finalTick: number;
  finalHash: number;
}

/** Collects commands as a match is played. */
export class ReplayRecorder {
  readonly log: [number, Command[]][] = [];

  constructor(readonly config: MatchConfig) {}

  record(tick: number, commands: Command[]): void {
    if (commands.length) this.log.push([tick, commands.map((c) => ({ ...c }))]);
  }

  finish(game: Game): Replay {
    return {
      version: REPLAY_VERSION,
      rulesetHash: rulesetHash(),
      config: this.config,
      log: this.log,
      finalTick: game.world.tick,
      finalHash: game.hash(),
    };
  }
}

/** Feeds a replay's commands into a fresh game one tick at a time. */
export class ReplayPlayer {
  readonly game: Game;
  private next = 0;

  constructor(readonly replay: Replay) {
    const problem = replayProblem(replay);
    if (problem) throw new Error(`Unsupported replay: ${problem.kind}`);
    this.game = new Game(buildGameSetup(replay.config));
  }

  get done(): boolean {
    return this.game.world.tick >= this.replay.finalTick;
  }

  /** Commands for the game's current tick. */
  commands(): Command[] {
    const entry = this.replay.log[this.next];
    if (entry && entry[0] === this.game.world.tick) {
      this.next++;
      return entry[1];
    }
    return [];
  }

  step(): void {
    this.game.step(this.commands());
  }

  /** Plays to the end and checks the result matches the recording. */
  verify(): boolean {
    while (!this.done) this.step();
    return this.game.hash() === this.replay.finalHash;
  }
}
