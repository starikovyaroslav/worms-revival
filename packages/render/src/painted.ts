import { assets } from './assets';
import type { Theme } from './theme';

export const PAINTED_MEADOW_PACK = 'assets/painted-meadow';
export const PAINTED_MEADOW_REQUIRED = [
  ...['sky', 'far', 'mid', 'near'].map((name) => `painted/bg/meadow/${name}`),
  ...['fill', 'rim', 'under', 'scorch', 'rock'].map((name) => `painted/terrain/meadow/${name}`),
  'painted/water/meadow',
  ...['blast', 'smoke', 'fragment', 'fire'].flatMap((name) =>
    [0, 1, 2, 3].map((i) => `painted/vfx/${name}_${i}`),
  ),
];
export function paintedMeadowReady(): boolean {
  return PAINTED_MEADOW_REQUIRED.every((id) => assets.has(id));
}
export function paintedMeadowTheme(theme: Theme, requested: boolean): Theme {
  return requested && theme.id === 'meadow' && paintedMeadowReady()
    ? {
        ...theme,
        artStyle: 'painted',
        sky: [0x238afa],
        skyTop: 0x238afa,
        grade: { saturation: 1, contrast: 1, brightness: 1, gamma: 1 },
      }
    : theme;
}
