import { defaultFilterVert, Filter, GlProgram } from 'pixi.js';
import { CRT_PRESETS, type CrtMode } from './crtPresets';
export type { CrtMode } from './crtPresets';

/** Original single-pass approximation of phosphor spread, RGB slots and highlight bloom.
 * Inspiration / reference controls: https://www.tooooools.app/effects/crt
 * No animated noise, flicker or curvature: aiming stays stable. Higher presets add colour bleed.
 * WebGL only, matching the client's explicitly selected renderer.
 */
const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uSpread;
uniform float uSoftening;
uniform float uBloomThreshold;
uniform float uBloom;
uniform float uMask;
uniform float uScanline;
uniform float uPitch;
uniform float uBleed;
uniform float uVignette;

vec4 sampleAt(vec2 offset) {
    return texture(uTexture, clamp(vTextureCoord + offset * uSpread * uInputPixel.zw,
                                  uInputClamp.xy, uInputClamp.zw));
}

void main() {
    vec4 source = sampleAt(vec2(0.0));
    vec3 left = sampleAt(vec2(-1.0, 0.0)).rgb;
    vec3 right = sampleAt(vec2(1.0, 0.0)).rgb;
    vec3 nearby = (left + right
                 + sampleAt(vec2(0.0, -1.0)).rgb + sampleAt(vec2(0.0, 1.0)).rgb) * 0.25;
    vec3 halo = (sampleAt(vec2(-2.0, -2.0)).rgb + sampleAt(vec2(2.0, -2.0)).rgb
               + sampleAt(vec2(-2.0, 2.0)).rgb + sampleAt(vec2(2.0, 2.0)).rgb) * 0.25;
    vec3 color = mix(source.rgb, nearby, uSoftening);
    color.r = mix(color.r, left.r, uBleed);
    color.b = mix(color.b, right.b, uBleed);
    vec3 bloom = max((nearby + halo) * 0.5 - vec3(uBloomThreshold), vec3(0.0));
    color += bloom * uBloom;

    // Screen-fixed, physical-pixel RGB slots; alternate columns are half a row apart.
    // The baseline uses the original three-pixel grid; strong doubles the phosphor size.
    vec2 pixel = floor(gl_FragCoord.xy);
    float slot = floor(mod(pixel.x, uPitch) * (3.0 / uPitch));
    vec3 mask = vec3(slot < 0.5 ? 1.0 : -0.5,
                     slot > 0.5 && slot < 1.5 ? 1.0 : -0.5,
                     slot > 1.5 ? 1.0 : -0.5);
    float row = cos((pixel.y + mod(floor(pixel.x / uPitch), 2.0) * uPitch * 0.5)
                    * (6.2831853 / uPitch));
    color *= vec3(1.0) + mask * uMask;
    color *= 1.0 + row * uScanline;
    vec2 screen = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
    vec2 edge = screen * 2.0 - 1.0;
    color *= 1.0 - uVignette * smoothstep(0.2, 1.5, dot(edge, edge));
    // Keep premultiplied alpha valid, including the edge of a transparent render target.
    finalColor = vec4(clamp(color, vec3(0.0), vec3(source.a)), source.a);
}
`;

export class CrtFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        vertex: defaultFilterVert,
        fragment,
        name: 'worms-crt',
        // Shared vertex/fragment uniforms must have matching precision.
        preferredFragmentPrecision: 'highp',
      }),
      resolution: 'inherit',
      resources: {
        crtUniforms: Object.fromEntries(
          Object.entries(CRT_PRESETS.soft).map(([name, value]) => [name, { value, type: 'f32' }]),
        ),
      },
    });
  }

  setMode(mode: Exclude<CrtMode, 'off'>): void {
    Object.assign(this.resources.crtUniforms.uniforms, CRT_PRESETS[mode]);
  }
}
