import { hex, type RGB } from './color';
import { makePattern, type PatternSpec } from './pattern';

export interface ThemeSpec {
  id: string;
  name: string;
  skyTop: number;
  skyBottom: number;
  water: number;
  soil: PatternSpec;
  /** Top surface layer (grass, sand, snow). */
  surface: number;
  surfaceDark: number;
  outline: number;
  scorch: number;
  rock: PatternSpec;
  girder: number;
}

export interface Theme extends ThemeSpec {
  soilTex: Uint8ClampedArray;
  rockTex: Uint8ClampedArray;
  texSize: number;
  surfaceRgb: RGB;
  surfaceDarkRgb: RGB;
  outlineRgb: RGB;
  scorchRgb: RGB;
  girderRgb: RGB;
}

export const THEMES: ThemeSpec[] = [
  {
    id: 'meadow',
    name: 'Луг',
    skyTop: 0x3b6fb6,
    skyBottom: 0xbfe3f2,
    water: 0x2a5d8f,
    soil: { base: 0x8a5a33, dark: 0x5a3519, speck: 0xc9a27a, speckDensity: 0.06, seed: 11 },
    surface: 0x5fc436,
    surfaceDark: 0x2f7d1e,
    outline: 0x2b1a0c,
    scorch: 0x2a1c12,
    rock: { base: 0x8c8c94, dark: 0x55555e, speck: 0xb0b0ba, speckDensity: 0.05, seed: 3 },
    girder: 0xc8742a,
  },
  {
    id: 'desert',
    name: 'Пустыня',
    skyTop: 0xe08a3c,
    skyBottom: 0xf7d9a0,
    water: 0x3a7c8c,
    soil: { base: 0xd9a35b, dark: 0xa26a2e, speck: 0xf2e0b0, speckDensity: 0.08, seed: 21 },
    surface: 0xf5d27a,
    surfaceDark: 0xc79a3c,
    outline: 0x4a2c10,
    scorch: 0x3c2410,
    rock: { base: 0x9c7a5a, dark: 0x6a4a30, speck: 0xc8a888, speckDensity: 0.05, seed: 4 },
    girder: 0x8a8a95,
  },
  {
    id: 'arctic',
    name: 'Арктика',
    skyTop: 0x1d3557,
    skyBottom: 0x9cc7e6,
    water: 0x16425f,
    soil: { base: 0x9fc4dc, dark: 0x5b85a8, speck: 0xe8f4ff, speckDensity: 0.07, seed: 31 },
    surface: 0xffffff,
    surfaceDark: 0xc6dcef,
    outline: 0x1c3248,
    scorch: 0x22303c,
    rock: { base: 0x7a8a9a, dark: 0x4a5866, speck: 0xa0b0c0, speckDensity: 0.04, seed: 5 },
    girder: 0xc04a3a,
  },
  {
    id: 'hell',
    name: 'Преисподняя',
    skyTop: 0x1a0505,
    skyBottom: 0x7a1d0d,
    water: 0x8a2a05,
    soil: { base: 0x5a2a2a, dark: 0x2a0e0e, speck: 0xd04a20, speckDensity: 0.07, seed: 41 },
    surface: 0x3a3a3a,
    surfaceDark: 0x1a1a1a,
    outline: 0x0a0000,
    scorch: 0x050000,
    rock: { base: 0x4a4048, dark: 0x201820, speck: 0x6a5a68, speckDensity: 0.05, seed: 6 },
    girder: 0x9a9aa0,
  },
];

const TEX_SIZE = 256;

export function buildTheme(spec: ThemeSpec): Theme {
  return {
    ...spec,
    soilTex: makePattern(spec.soil, TEX_SIZE),
    rockTex: makePattern(spec.rock, TEX_SIZE),
    texSize: TEX_SIZE,
    surfaceRgb: hex(spec.surface),
    surfaceDarkRgb: hex(spec.surfaceDark),
    outlineRgb: hex(spec.outline),
    scorchRgb: hex(spec.scorch),
    girderRgb: hex(spec.girder),
  };
}

export function themeById(id: string): Theme {
  const spec = THEMES.find((t) => t.id === id) ?? (THEMES[0] as ThemeSpec);
  return buildTheme(spec);
}
