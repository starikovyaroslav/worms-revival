import { describe, expect, it } from 'vitest';
import { RULESET } from '@wr/content';
import { RENDERED_LOOKS } from '@wr/render';
import { SOUNDS } from '../src/audio/sounds';

/** The part of the weapon registry check that needs both content and the presentation layers. */
describe('weapon registry vs presentation', () => {
  it('only uses looks the renderer can draw', () => {
    for (const d of RULESET.weapons) {
      const look = d.spec.view.look;
      if (look) expect(RENDERED_LOOKS[look], `${d.id}: look ${look}`).toBe(true);
    }
    for (const look of Object.keys(RULESET.looks))
      expect(RENDERED_LOOKS[look as keyof typeof RENDERED_LOOKS], `light/trail for ${look}`).toBe(
        true,
      );
  });

  it('only uses sounds the audio engine has a synth for', () => {
    for (const d of RULESET.weapons) {
      const sound = d.spec.view.sound;
      if (sound) expect(SOUNDS[sound], `${d.id}: sound ${sound}`).toBeTypeOf('function');
    }
  });
});
