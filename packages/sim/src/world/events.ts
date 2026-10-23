import type { SoundId } from '../weapons/spec';

export type SpeechLine = 'turn' | 'hurt' | 'fall' | 'drown' | 'death' | 'win' | 'fire' | 'kill';
export type PresentationVariant = 'standard' | 'mk2';

/** Sim measurements, not render snapshots. Contact velocity is captured before the response. */
export type WormMotion =
  | { kind: 'impulse'; vx: number; vy: number }
  | {
      kind: 'contact';
      vx: number;
      vy: number;
      nx: number;
      ny: number;
      airborne: boolean;
    }
  | { kind: 'water-entry'; vx: number; vy: number };

export interface WormMotionEvent {
  type: 'worm-motion';
  wormId: number;
  /** Start of the fixed step containing the event. */
  tick: number;
  /** Cosmetic ordering/deduplication key, independent of event drains. */
  sequence: number;
  x: number;
  y: number;
  motion: WormMotion;
}

/**
 * Fire-and-forget notifications for presentation (render, audio, camera).
 * They never feed back into the simulation and are not part of the state hash.
 */
export type SimEvent =
  | WormMotionEvent
  | {
      type: 'explosion';
      x: number;
      y: number;
      radius: number;
      source?: string;
      variant?: PresentationVariant;
    }
  /** Cosmetic transport cue. Payloads already exist; this must never delay their simulation. */
  | {
      type: 'airRaid';
      x: number;
      y: number;
      dir: 1 | -1;
      speed: number;
      spacing: number;
      payloadIds: number[];
      source?: string;
      variant?: PresentationVariant;
    }
  | { type: 'death'; wormId: number; x: number; y: number; team: number }
  | { type: 'steam'; x: number; y: number }
  | { type: 'splash'; x: number; y: number; size: number }
  | { type: 'sound'; id: SoundId; x: number; y: number; variant?: PresentationVariant }
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
