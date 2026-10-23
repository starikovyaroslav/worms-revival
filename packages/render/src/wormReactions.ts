import { TICKS_PER_SECOND, type Worm, type WormMotionEvent } from '@wr/sim';
import type { SkinPose } from './skins';

export type ReactionClip = 'blast' | 'land-hard' | 'hit-light' | 'hit-heavy' | 'water';
export const REACTION_CLIPS = {
  blast: { frames: 4, seconds: 0.44, loop: true, fallback: 'fall' },
  'land-hard': { frames: 4, seconds: 0.38, loop: false, fallback: 'land' },
  'hit-light': { frames: 2, seconds: 0.2, loop: false, fallback: 'hurt' },
  'hit-heavy': { frames: 2, seconds: 0.4, loop: false, fallback: 'hurt' },
  water: { frames: 4, seconds: 0.58, loop: false, fallback: 'fall' },
} as const satisfies Record<
  ReactionClip,
  { frames: number; seconds: number; loop: boolean; fallback: SkinPose }
>;
type Sample = Pick<Worm, 'health' | 'state' | 'blasted'>;
/** Same previous→current interval as interpolated worm positions; pause keeps both inputs fixed. */
export function wormPresentationSeconds(tick: number, alpha: number): number {
  return Math.max(0, tick - 1 + alpha) / TICKS_PER_SECOND;
}
export interface ReactionFrame {
  clip: ReactionClip;
  frame: number;
  progress: number;
}
/** Event-driven playback on absolute simulation time; render frequency never starts a clip. */
export class WormReactions {
  private active: { clip: ReactionClip; start: number } | null = null;
  private tumbleStart: number | null = null;
  private lastSequence = -1;
  private enteredWater = false;

  handle(event: WormMotionEvent): void {
    if (event.sequence <= this.lastSequence) return;
    this.lastSequence = event.sequence;
    const start = event.tick / TICKS_PER_SECOND;
    const m = event.motion;
    if (m.kind === 'water-entry') {
      // Drowning can emit a later terminal cue after first touching the surface.
      if (!this.enteredWater) this.active = { clip: 'water', start };
      this.enteredWater = true;
      this.tumbleStart = null;
      return;
    }
    if (this.enteredWater) return;
    if (m.kind === 'impulse') {
      this.tumbleStart = start;
      this.active = { clip: 'blast', start };
      return;
    }
    const speed = Math.max(0, -(m.vx * m.nx + m.vy * m.ny));
    if (!m.airborne) this.tumbleStart = null;
    if (m.ny < -0.55 && !m.airborne) {
      this.active = speed >= 3 ? { clip: 'land-hard', start } : null;
    } else if (speed > 2) {
      // Dedicated wall/ceiling art is not supplied yet. Use a flinch, never a floor squash.
      this.active = { clip: speed >= 6 ? 'hit-heavy' : 'hit-light', start };
    }
  }

  update(w: Sample, simulationSeconds: number): ReactionFrame | null {
    if ((w.health <= 0 || w.state === 'dead' || w.state === 'roped') && !this.enteredWater) {
      this.active = null;
      this.tumbleStart = null;
    }
    const flying = w.state === 'airborne' && w.blasted;
    if (!flying) {
      this.tumbleStart = null;
      if (this.active?.clip === 'blast') this.active = null;
    }
    if (this.active) {
      const spec = REACTION_CLIPS[this.active.clip];
      if (!spec.loop && simulationSeconds - this.active.start >= spec.seconds) this.active = null;
    }
    if (!this.active && flying && this.tumbleStart !== null)
      this.active = { clip: 'blast', start: this.tumbleStart };
    if (!this.active) return null;
    const spec = REACTION_CLIPS[this.active.clip];
    const elapsed = Math.max(0, simulationSeconds - this.active.start);
    const progress = spec.loop ? (elapsed % spec.seconds) / spec.seconds : elapsed / spec.seconds;
    return {
      clip: this.active.clip,
      // The first source drawing is the airborne brace; impact starts with the squash,
      // not a 100ms delay before contact is acknowledged.
      frame:
        this.active.clip === 'land-hard'
          ? [1, 2, 3, 3][Math.min(3, Math.floor(progress * 4))]!
          : Math.min(spec.frames - 1, Math.floor(progress * spec.frames)),
      progress,
    };
  }
}

/** Identity-preserving fallback for skins not yet supplied with redrawn reaction sheets. */
export function reactionDeformation(frame: ReactionFrame | null): {
  x: number;
  y: number;
  lean: number;
} {
  if (!frame) return { x: 1, y: 1, lean: 0 };
  const beat = Math.sin(frame.progress * Math.PI);
  switch (frame.clip) {
    case 'land-hard':
      return { x: 1 + beat * 0.32, y: 1 - beat * 0.3, lean: 0 };
    case 'hit-light':
      return { x: 1 - beat * 0.07, y: 1 + beat * 0.04, lean: -beat * 0.09 };
    case 'hit-heavy':
      return { x: 1 + beat * 0.12, y: 1 - beat * 0.12, lean: -beat * 0.24 };
    case 'blast':
      return {
        x: 1 + Math.sin(frame.progress * Math.PI * 2) * 0.09,
        y: 1 - Math.sin(frame.progress * Math.PI * 2) * 0.07,
        lean: Math.sin(frame.progress * Math.PI * 2) * 0.22,
      };
    case 'water':
      return { x: 1 + beat * 0.18, y: 1 - frame.progress * 0.45, lean: 0 };
  }
}
