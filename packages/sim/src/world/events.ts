/**
 * Fire-and-forget notifications for presentation (render, audio, camera).
 * They never feed back into the simulation and are not part of the state hash.
 */
export type SimEvent =
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'splash'; x: number; y: number; size: number }
  | { type: 'sound'; id: string; x: number; y: number }
  | { type: 'speech'; wormId: number; line: string }
  | { type: 'damage'; wormId: number; amount: number }
  /** Announcement; the presentation layer turns the key into localised text. */
  | { type: 'message'; key: 'win' | 'draw' | 'suddenDeath'; team?: number }
  /** A worm picked up a crate: `text` is a weapon id or "+25" for health. */
  | { type: 'crate'; wormId: number; text: string }
  | { type: 'focus'; entityId: number };
