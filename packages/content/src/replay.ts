import { allWeapons, Game, Hasher, type Command } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from './match';
import { SCHEMES } from './schemes';

/**
 * Bump whenever a change alters simulation results (rules, weapon numbers, hashed state). The golden
 * replay test in packages/content fails if the logic changed and this was not bumped.
 * 2: complete state hash (ammo, turn counters, physics, entity specs...).
 */
export const REPLAY_VERSION = 2;

let cachedRulesetHash: number | null = null;

/**
 * Fingerprint of the rule tables (all schemes and the static fields of every weapon definition).
 * Numbers hidden inside weapon `fire` closures are not visible here; the golden replay covers those.
 */
export function rulesetHash(): number {
  if (cachedRulesetHash === null) {
    const h = new Hasher().value(SCHEMES);
    for (const def of allWeapons()) h.value(def);
    cachedRulesetHash = h.digest();
  }
  return cachedRulesetHash;
}

/** Why a replay cannot be played by this build, or null when it can. */
export type ReplayProblem =
  { kind: 'malformed' } | { kind: 'version'; found: unknown } | { kind: 'ruleset' };

export function replayProblem(raw: unknown): ReplayProblem | null {
  const r = raw as Partial<Replay> | null;
  if (!r || typeof r !== 'object' || !r.config || !Array.isArray(r.log))
    return { kind: 'malformed' };
  if (r.version !== REPLAY_VERSION) return { kind: 'version', found: r.version };
  if (r.rulesetHash !== rulesetHash()) return { kind: 'ruleset' };
  return null;
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
