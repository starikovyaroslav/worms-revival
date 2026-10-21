import type { FxTextureId } from './textures';

/**
 * Effect recipes are plain data: a list of layers played at offsets from the start.
 * Sizes are relative to the effect "size" k (blast radius / 50), so one recipe scales from a
 * bazooka shell to a nuke. They can later be loaded from `*.fx.json` unchanged.
 */
export type Layer =
  FlashLayer | BurstLayer | CameraLayer | ShockwaveLayer | GlowLayer | TimeLayer | BlastLayer;

export type Range = [number, number];

/** A single expanding, fading sprite (muzzle flash, shockwave ring, ground glow). */
export interface FlashLayer {
  type: 'flash';
  at?: number;
  tex: FxTextureId;
  blend: 'add' | 'normal';
  color: number;
  /** Start and end scale in units of k × 100 px. */
  scale: [number, number];
  life: number;
  alpha?: number;
}

export interface BurstLayer {
  type: 'burst';
  at?: number;
  tex: FxTextureId;
  blend: 'add' | 'normal';
  /** count = base + perK × k */
  count: [number, number];
  /** Spawn radius as a fraction of k × 50 px. */
  spread: number;
  /** Launch speed range, px/s per k. */
  speed: Range;
  /** 'radial' = away from the centre, 'up' = upward fan. */
  dir: 'radial' | 'up';
  /** Half-angle of the upward fan, radians. */
  cone?: number;
  gravity: number;
  /** Fraction of velocity kept per second (0.2 = loses 80% per second). */
  drag: number;
  life: Range;
  /** Scale range at start and at end, in units of k × 100 px (spark: length). */
  scaleStart: Range;
  scaleEnd: Range;
  /** Colour stops over the particle's life (sampled linearly). */
  colors: number[];
  fade: 'out' | 'inout' | 'flicker' | 'blink';
  alpha?: number;
  spin?: Range;
  /** Stretch the sprite along its velocity (sparks). */
  stretch?: boolean;
  /** How much the wind pushes it, px/s² at full wind. */
  wind?: number;
  /** Whole world pixels per texel [min, max], picked per particle: hard pixels, ignores scaleStart/End. */
  fixed?: Range;
  /** Treat the texture list as growth stages (small to large) instead of random variants. */
  stages?: boolean;
  /** Spread the particles evenly around the circle: a ring. */
  ring?: boolean;
  /** Tint from the terrain colour instead of `colors` (debris). */
  terrain?: boolean;
}

/** Procedural pixel blast (see PixelBlasts): fireball with flash and ring, or a splash ring. */
export interface BlastLayer {
  type: 'blast';
  at?: number;
  kind: 'fireball' | 'splash';
  /** Radius as a multiple of k × 50 px. */
  size: number;
}

export interface CameraLayer {
  type: 'camera';
  at?: number;
  shake: number;
  /** Quick zoom-in "punch" that settles back (fraction of zoom per k). */
  punch?: number;
}

/** Slow motion / hit-stop: the game clock runs at `scale` for `duration` real seconds. */
export interface TimeLayer {
  type: 'time';
  at?: number;
  scale: number;
  duration: number;
  /** Only for effects at least this large. */
  minK: number;
}

export interface ShockwaveLayer {
  type: 'shockwave';
  at?: number;
  strength: number;
  minK: number;
}

export interface GlowLayer {
  type: 'light';
  at?: number;
  color: number;
  radius: number;
  life: number;
  intensity: number;
}

export interface Recipe {
  id: string;
  layers: Layer[];
}


export const RECIPES: Record<string, Recipe> = {
  explosion: {
    id: 'explosion',
    layers: [
      { type: 'camera', shake: 1, punch: 0.035 },
      { type: 'time', scale: 0.3, duration: 0.2, minK: 1.15 },
      { type: 'light', color: 0xffc070, radius: 3.6, life: 0.7, intensity: 1.3 },
      // Flash, banded fireball and dotted ring, painted pixel by pixel.
      { type: 'blast', kind: 'fireball', size: 1 },
      // Ring of sparks racing outwards, then falling.
      {
        type: 'burst',
        tex: 'px',
        blend: 'normal',
        count: [10, 6],
        spread: 0.05,
        speed: [190, 230],
        dir: 'radial',
        ring: true,
        gravity: 420,
        drag: 0.04,
        life: [0.5, 0.8],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [2, 2],
        colors: [0xffffff, 0xfbf236, 0xdf7126, 0xac3232],
        fade: 'blink',
      },
      // Scattered sparks.
      {
        type: 'burst',
        tex: 'px',
        blend: 'normal',
        count: [6, 6],
        spread: 0.15,
        speed: [90, 380],
        dir: 'radial',
        gravity: 520,
        drag: 0.4,
        life: [0.5, 1.1],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [1, 2],
        colors: [0xfbf236, 0xdf7126, 0xac3232],
        fade: 'blink',
      },
      // Embers: slow specks drifting up and blinking out.
      {
        type: 'burst',
        tex: 'px',
        blend: 'normal',
        count: [4, 5],
        spread: 0.6,
        speed: [30, 120],
        dir: 'up',
        cone: 1.2,
        gravity: -30,
        drag: 0.5,
        life: [1.0, 2.2],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [1, 1],
        colors: [0xfbf236, 0xdf7126, 0x663931],
        fade: 'blink',
        wind: 40,
      },
      // Earth clods thrown out of the crater.
      {
        type: 'burst',
        tex: 'chunk',
        blend: 'normal',
        count: [7, 8],
        spread: 0.3,
        speed: [110, 380],
        dir: 'up',
        cone: 1.5,
        gravity: 760,
        drag: 0.8,
        life: [0.9, 1.7],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [1, 2],
        colors: [0xffffff],
        fade: 'blink',
        terrain: true,
      },
      // Smoke puffs rise out of the fire, swelling in steps and drifting with the wind.
      {
        type: 'burst',
        at: 0.12,
        tex: 'puff',
        stages: true,
        blend: 'normal',
        count: [2, 3],
        spread: 0.5,
        speed: [10, 45],
        dir: 'up',
        cone: 0.7,
        gravity: -26,
        drag: 0.4,
        life: [1.1, 1.9],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [1, 1],
        colors: [0xffffff],
        fade: 'inout',
        alpha: 0.9,
        wind: 50,
      },
    ],
  },

  splash: {
    id: 'splash',
    layers: [
      { type: 'blast', kind: 'splash', size: 1 },
      // Droplets thrown up in a fan.
      {
        type: 'burst',
        tex: 'px',
        blend: 'normal',
        count: [10, 16],
        spread: 0.2,
        speed: [120, 320],
        dir: 'up',
        cone: 0.65,
        gravity: 560,
        drag: 0.9,
        life: [0.55, 0.95],
        scaleStart: [1, 1],
        scaleEnd: [1, 1],
        fixed: [1, 2],
        colors: [0xffffff, 0xcbdbfc, 0x5fcde4],
        fade: 'blink',
      },
    ],
  },

  /** Small bullet impact. */
  impact: {
    id: 'impact',
    layers: [
      { type: 'flash', tex: 'soft', blend: 'add', color: 0xffe8a0, scale: [0.3, 1.1], life: 0.1 },
      {
        type: 'burst',
        tex: 'spark',
        blend: 'add',
        count: [4, 3],
        spread: 0.05,
        speed: [120, 300],
        dir: 'radial',
        gravity: 500,
        drag: 0.5,
        life: [0.2, 0.5],
        scaleStart: [0.14, 0.24],
        scaleEnd: [0.03, 0.06],
        colors: [0xffffff, 0xffb040, 0xc04010],
        fade: 'out',
        stretch: true,
      },
    ],
  },

  /** Rocket exhaust: a puff of smoke and a lick of fire, spawned every frame. */
  'trail-rocket': {
    id: 'trail-rocket',
    layers: [
      {
        type: 'burst',
        tex: 'smoke',
        blend: 'normal',
        count: [2, 0],
        spread: 0.06,
        speed: [4, 18],
        dir: 'radial',
        gravity: -14,
        drag: 0.3,
        life: [0.7, 1.3],
        scaleStart: [0.2, 0.3],
        scaleEnd: [0.7, 1.2],
        colors: [0xe8dcc8, 0xa8a49c, 0x6e6c6a],
        fade: 'inout',
        alpha: 0.75,
        spin: [-1, 1],
        wind: 40,
      },
      {
        type: 'burst',
        tex: 'soft',
        blend: 'add',
        count: [1, 0],
        spread: 0.04,
        speed: [0, 12],
        dir: 'radial',
        gravity: 0,
        drag: 0.2,
        life: [0.12, 0.22],
        scaleStart: [0.3, 0.42],
        scaleEnd: [0.05, 0.1],
        colors: [0xfffbe0, 0xffa040, 0xc03010],
        fade: 'out',
      },
    ],
  },

  /** Burning fuse spark on grenades and dynamite. */
  'trail-fuse': {
    id: 'trail-fuse',
    layers: [
      {
        type: 'burst',
        tex: 'ember',
        blend: 'add',
        count: [1, 0],
        spread: 0.03,
        speed: [10, 60],
        dir: 'up',
        cone: 1.4,
        gravity: 120,
        drag: 0.6,
        life: [0.2, 0.45],
        scaleStart: [0.06, 0.1],
        scaleEnd: [0.01, 0.03],
        colors: [0xffffff, 0xffc050, 0xe05010],
        fade: 'out',
      },
    ],
  },

  /** Muzzle flash with a puff of smoke. */
  muzzle: {
    id: 'muzzle',
    layers: [
      { type: 'camera', shake: 0.12 },
      { type: 'light', color: 0xffd090, radius: 1.8, life: 0.12, intensity: 0.9 },
      { type: 'flash', tex: 'soft', blend: 'add', color: 0xfff0c0, scale: [0.5, 1.5], life: 0.07 },
      {
        type: 'burst',
        tex: 'spark',
        blend: 'add',
        count: [3, 0],
        spread: 0.02,
        speed: [140, 340],
        dir: 'radial',
        gravity: 300,
        drag: 0.4,
        life: [0.1, 0.28],
        scaleStart: [0.1, 0.18],
        scaleEnd: [0.02, 0.05],
        colors: [0xffffff, 0xffb040, 0xb04010],
        fade: 'out',
        stretch: true,
      },
      {
        type: 'burst',
        tex: 'smoke',
        blend: 'normal',
        count: [2, 0],
        spread: 0.1,
        speed: [10, 40],
        dir: 'radial',
        gravity: -16,
        drag: 0.3,
        life: [0.5, 0.9],
        scaleStart: [0.12, 0.2],
        scaleEnd: [0.4, 0.7],
        colors: [0xd8d2c4, 0x8a8782],
        fade: 'inout',
        alpha: 0.5,
        wind: 30,
      },
    ],
  },
};
