import { defaultFilterVert, Filter, GlProgram } from 'pixi.js';

export type SensoryEffect = 'flash' | 'blind' | 'hallucination';

/** Single soft pulse, not a strobe. The tail is a faint afterimage, never opaque blindness. */
export function sensoryEnvelope(age: number, life = 1.2): number {
  if (age < 0 || age >= life) return 0;
  return Math.min(1, age / 0.12) * (1 - age / life) ** 2;
}

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uTime;
uniform float uFlash;
uniform float uBlind;
uniform float uHallucination;
void main() {
  vec2 uv = vTextureCoord;
  vec4 src = texture(uTexture, uv);
  vec2 screen = uv * uInputSize.xy / uOutputFrame.zw;
  vec2 offset = vec2(sin(screen.y * 12.0 + uTime) * 4.0, 1.0) / uInputSize.xy;
  vec3 echo = texture(uTexture, clamp(uv + offset, uInputClamp.xy, uInputClamp.zw)).rgb;
  vec3 color = mix(src.rgb, echo * vec3(0.85, 1.08, 1.05), uHallucination * 0.3);
  float spots = exp(-dot((screen - vec2(0.35, 0.45)) * vec2(6.0, 4.0),
                        (screen - vec2(0.35, 0.45)) * vec2(6.0, 4.0)))
              + exp(-dot((screen - vec2(0.7, 0.65)) * vec2(9.0, 6.0),
                         (screen - vec2(0.7, 0.65)) * vec2(9.0, 6.0)));
  color *= 1.0 - min(1.0, spots) * uBlind * 0.22;
  color = mix(color, vec3(src.a), uFlash * 0.16);
  finalColor = vec4(clamp(color, vec3(0.0), vec3(src.a)), src.a);
}
`;

/** Cosmetic picture-only pass; aim, labels and DOM HUD are never distorted or hidden. */
export class SensoryFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        vertex: defaultFilterVert,
        fragment,
        name: 'worms-sensory',
        preferredFragmentPrecision: 'highp',
      }),
      resolution: 'inherit',
      resources: {
        sensoryUniforms: {
          uTime: { value: 0, type: 'f32' },
          uFlash: { value: 0, type: 'f32' },
          uBlind: { value: 0, type: 'f32' },
          uHallucination: { value: 0, type: 'f32' },
        },
      },
    });
  }

  setPulse(effect: SensoryEffect, age: number): void {
    const u = this.resources.sensoryUniforms.uniforms;
    const envelope = sensoryEnvelope(age);
    u.uTime = age;
    u.uFlash = effect === 'flash' ? envelope : 0;
    // The same nuclear pulse leaves a faint, longer-lived pair of afterimages.
    u.uBlind = effect === 'blind' ? envelope : effect === 'flash' ? sensoryEnvelope(age - 0.15) : 0;
    u.uHallucination = effect === 'hallucination' ? envelope : 0;
  }
}
