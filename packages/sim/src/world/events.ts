export type SpeechLine = 'turn' | 'hurt' | 'fall' | 'drown' | 'death' | 'win' | 'fire' | 'kill';

/**
 * Fire-and-forget notifications for presentation (render, audio, camera).
 * They never feed back into the simulation and are not part of the state hash.
 */
export type SimEvent =
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'splash'; x: number; y: number; size: number }
  | { type: 'sound'; id: string; x: number; y: number }
  /** A worm says something; `line` is a phrase category the presentation picks a line from. */
  | { type: 'speech'; wormId: number; line: SpeechLine }
  | { type: 'damage'; wormId: number; amount: number }
  /** Announcement; the presentation layer turns the key into localised text. */
  | { type: 'message'; key: 'win' | 'draw' | 'suddenDeath'; team?: number }
  /** A worm picked up a crate: `text` is a weapon id or "+25" for health. */
  | { type: 'crate'; wormId: number; text: string }
  | { type: 'focus'; entityId: number }
  /** Screen shake without an explosion (earthquake). */
  | { type: 'shake'; amount: number }
  /** The active worm just used a weapon (presentation plays the use animation). */
  | { type: 'fired'; wormId: number; weapon: string }
  /** Bullet trail for hitscan weapons. */
  | { type: 'tracer'; x0: number; y0: number; x1: number; y1: number };
