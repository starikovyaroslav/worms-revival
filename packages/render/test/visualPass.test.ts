import { describe, expect, it } from 'vitest';
import { RECIPES } from '../src/effects/recipes';
import { DB32 } from '../src/palette';
import { THEMES } from '../src/theme';

describe('retro look of explosions and water', () => {
  it('explosion and splash particles are hard palette pixels on whole texels', () => {
    for (const id of ['explosion', 'splash']) {
      for (const layer of RECIPES[id]!.layers) {
        if (layer.type !== 'burst') continue;
        expect(layer.blend).toBe('normal');
        // Whole world pixels per texel, no half-transparent fades.
        expect(layer.fixed).toBeDefined();
        for (const f of layer.fixed!) expect(Number.isInteger(f)).toBe(true);
        expect(layer.fade).not.toBe('flicker');
        if (!layer.terrain) for (const c of layer.colors) expect(DB32).toContain(c);
      }
    }
  });

  it('every theme with its own water ramp uses DB32 colours only', () => {
    for (const t of THEMES) {
      for (const c of [...(t.waterRamp ?? []), ...(t.waterFoam ?? [])]) expect(DB32).toContain(c);
    }
  });
});
