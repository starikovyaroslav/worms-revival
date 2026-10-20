/** Every way a player can influence the simulation. Replays and netplay are lists of these. */
export type Command =
  /** Held direction keys. Sent when they change. */
  | { t: 'move'; left: boolean; right: boolean; up: boolean; down: boolean }
  | { t: 'jump' }
  /** Fire key pressed (`down`) or released. */
  | { t: 'fire'; down: boolean }
  | { t: 'select'; weapon: string }
  /** Fuse in seconds (1-5). */
  | { t: 'fuse'; seconds: number }
  | { t: 'bounce'; high: boolean }
  /** Target for homing / strike weapons, in world pixels. */
  | { t: 'target'; x: number; y: number }
  | { t: 'skip' }
  /** Any key at the hot-seat hand-over: starts the turn timer, changes nothing else. */
  | { t: 'ready' }
  | { t: 'surrender' };

export interface TimedCommand {
  tick: number;
  cmd: Command;
}
