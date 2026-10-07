import { Game, type Command } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from './match';

export const REPLAY_VERSION = 1;

/** A whole match: the starting config plus every command, keyed by the tick it was applied on. */
export interface Replay {
  version: number;
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
    if (replay.version !== REPLAY_VERSION)
      throw new Error(`Unsupported replay version ${replay.version}`);
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
