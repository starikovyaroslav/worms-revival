import type { FxTextureId } from './textures';

/**
 * Effect recipes are plain data: a list of layers played at offsets from the start.
 * Sizes are relative to the effect "size" k (blast radius / 50), so one recipe scales from a
 * bazooka shell to a nuke. They can later be loaded from `*.fx.json` unchanged.
 */
export type Layer = FlashLayer | BurstLayer | CameraLayer | ShockwaveLayer | GlowLayer | TimeLayer;

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
  fade: 'out' | 'inout' | 'flicker';
  alpha?: number;
  spin?: Range;
  /** Stretch the sprite along its velocity (sparks). */
  stretch?: boolean;
  /** How much the wind pushes it, px/s² at full wind. */
  wind?: number;
  /** Tint from the terrain colour instead of `colors` (debris). */
  terrain?: boolean;
}

export interface CameraLayer {
  type: 'camera';
  at?: number;
  shake: number;
  glow: number;
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

const FIRE = [0xfffbe0, 0xffd860, 0xff9a28, 0xe0521a, 0x6a1e0e];

export const RECIPES: Record<string, Recipe> = {
  explosion: {
    id: 'explosion',
    layers: [
      { type: 'camera', shake: 1, glow: 1, punch: 0.035 },
      { type: 'time', scale: 0.3, duration: 0.2, minK: 1.15 },
      { type: 'shockwave', strength: 1, minK: 0.9 },
      { type: 'light', color: 0xffc070, radius: 3.6, life: 0.7, intensity: 1.3 },
      // Instant white-hot flash.
      { type: 'flash', tex: 'soft', blend: 'add', color: 0xfff6d0, scale: [0.6, 3.2], life: 0.14 },
      // Wide warm glow that lingers.
      {
        type: 'flash',
        tex: 'soft',
        blend: 'add',
        color: 0xff8a30,
        scale: [1.6, 3.4],
        life: 0.5,
        alpha: 0.55,
      },
      // Expanding shock ring.
      {
        type: 'flash',
        tex: 'ring',
        blend: 'add',
        color: 0xffe9c0,
        scale: [0.3, 3.4],
        life: 0.42,
        alpha: 0.75,
      },
      // Fireball: overlapping blobs that cool from white to deep red.
      {
        type: 'burst',
        tex: 'soft',
        blend: 'add',
        count: [4, 3],
        spread: 0.35,
        speed: [10, 70],
        dir: 'radial',
        gravity: -40,
        drag: 0.25,
        life: [0.35, 0.65],
        scaleStart: [0.5, 0.8],
        scaleEnd: [1.1, 1.8],
        colors: FIRE,
        fade: 'out',
        alpha: 0.95,
      },
      // Sparks: fast streaks that arc and fall.
      {
        type: 'burst',
        tex: 'spark',
        blend: 'add',
        count: [8, 9],
        spread: 0.1,
        speed: [160, 520],
        dir: 'radial',
        gravity: 520,
        drag: 0.55,
        life: [0.45, 1.1],
        scaleStart: [0.18, 0.34],
        scaleEnd: [0.04, 0.1],
        colors: [0xffffff, 0xffe080, 0xff8a30, 0xc03010],
        fade: 'out',
        stretch: true,
      },
      // Embers: slow glowing specks that drift up and flicker out ("ash and cinders").
      {
        type: 'burst',
        tex: 'ember',
        blend: 'add',
        count: [6, 8],
        spread: 0.6,
        speed: [30, 140],
        dir: 'up',
        cone: 1.2,
        gravity: -30,
        drag: 0.5,
        life: [1.0, 2.6],
        scaleStart: [0.05, 0.1],
        scaleEnd: [0.02, 0.05],
        colors: [0xffd070, 0xff7a20, 0x802010],
        fade: 'flicker',
        wind: 40,
      },
      // Earth clods thrown out of the crater.
      {
        type: 'burst',
        tex: 'chunk',
        blend: 'normal',
        count: [6, 8],
        spread: 0.3,
        speed: [120, 420],
        dir: 'up',
        cone: 1.5,
        gravity: 760,
        drag: 0.8,
        life: [0.9, 1.7],
        scaleStart: [0.12, 0.28],
        scaleEnd: [0.1, 0.2],
        colors: [0xffffff],
        fade: 'out',
        spin: [-12, 12],
        terrain: true,
      },
      // Smoke: starts glowing from the fire below, cools to grey, billows and drifts with the wind.
      {
        type: 'burst',
        at: 0.08,
        tex: 'smoke',
        blend: 'normal',
        count: [4, 5],
        spread: 0.45,
        speed: [8, 60],
        dir: 'up',
        cone: 0.9,
        gravity: -22,
        drag: 0.35,
        life: [1.4, 2.8],
        scaleStart: [0.5, 0.9],
        scaleEnd: [1.4, 2.4],
        colors: [0x6a3a22, 0x3a3230, 0x4a4846, 0x6e6c6a],
        fade: 'inout',
        alpha: 0.7,
        spin: [-0.6, 0.6],
        wind: 60,
      },
    ],
  },

  splash: {
    id: 'splash',
    layers: [
      {
        type: 'burst',
        tex: 'soft',
        blend: 'normal',
        count: [6, 10],
        spread: 0.2,
        speed: [90, 330],
        dir: 'up',
        cone: 0.7,
        gravity: 700,
        drag: 0.9,
        life: [0.6, 1.1],
        scaleStart: [0.12, 0.22],
        scaleEnd: [0.05, 0.1],
        colors: [0xffffff, 0xcfeaff],
        fade: 'out',
        alpha: 0.9,
      },
      {
        type: 'burst',
        tex: 'smoke',
        blend: 'normal',
        count: [2, 3],
        spread: 0.3,
        speed: [10, 60],
        dir: 'up',
        cone: 0.5,
        gravity: -10,
        drag: 0.4,
        life: [0.7, 1.2],
        scaleStart: [0.3, 0.5],
        scaleEnd: [0.7, 1.1],
        colors: [0xe8f4ff, 0xbcd8f0],
        fade: 'inout',
        alpha: 0.5,
      },
      {
        type: 'flash',
        tex: 'ring',
        blend: 'add',
        color: 0xcfe8ff,
        scale: [0.2, 1.4],
        life: 0.5,
        alpha: 0.5,
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
      { type: 'camera', shake: 0.12, glow: 0.12 },
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
