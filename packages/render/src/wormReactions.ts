import type { Worm } from '@wr/sim';
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
type Sample = Pick<Worm, 'health' | 'state' | 'vx' | 'vy' | 'blasted' | 'drowned'> & { y?: number };
export interface ReactionFrame {
  clip: ReactionClip;
  frame: number;
  progress: number;
}
/** Presentation events from consecutive snapshots, never writes to the simulation. */
export class WormReactions {
  private previous: Sample | null = null;
  private active: { clip: ReactionClip; elapsed: number } | null = null;
  update(w: Sample, dt: number, waterLevel?: number): ReactionFrame | null {
    const old = this.previous;
    if (this.active) this.active.elapsed += Math.max(0, dt);
    let start: ReactionClip | undefined;
    if (old) {
      const enteredWater =
        waterLevel !== undefined &&
        w.y !== undefined &&
        old.y !== undefined &&
        old.y < waterLevel &&
        w.y >= waterLevel;
      if ((enteredWater || (w.drowned && !old.drowned)) && this.active?.clip !== 'water')
        start = 'water';
      else if (w.state === 'airborne' && w.blasted && !(old.state === 'airborne' && old.blasted))
        start = 'blast';
      else if (
        old.state === 'airborne' &&
        (w.state === 'idle' || w.state === 'walking') &&
        !w.drowned &&
        w.health > 0
      )
        start = Math.abs(old.vy) >= 3 || old.blasted ? 'land-hard' : undefined;
      else if (w.health < old.health && w.state !== 'airborne' && w.health > 0)
        start = old.health - w.health >= 20 ? 'hit-heavy' : 'hit-light';
    } else if (w.state === 'airborne' && w.blasted) start = 'blast';
    if (start) this.active = { clip: start, elapsed: 0 };
    if ((w.health <= 0 || w.state === 'dead') && this.active?.clip !== 'water') this.active = null;
    if (w.state === 'roped' && this.active?.clip !== 'water') this.active = null;
    this.previous = {
      health: w.health,
      state: w.state,
      vx: w.vx,
      vy: w.vy,
      blasted: w.blasted,
      drowned: w.drowned,
      ...(w.y !== undefined ? { y: w.y } : {}),
    };
    if (!this.active) return null;
    const spec = REACTION_CLIPS[this.active.clip];
    if (
      (this.active.clip === 'blast' && (w.state !== 'airborne' || !w.blasted)) ||
      (!spec.loop && this.active.elapsed >= spec.seconds)
    ) {
      this.active = null;
      return null;
    }
    const progress = spec.loop
      ? (this.active.elapsed % spec.seconds) / spec.seconds
      : this.active.elapsed / spec.seconds;
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
