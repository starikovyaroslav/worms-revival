import { Container, RenderTexture, Sprite, Texture, type Application } from 'pixi.js';
import type { Camera } from './camera';

interface Light {
  sprite: Sprite;
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  age: number;
  life: number;
  flicker: number;
}

function lightTexture(): Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Quadratic-ish falloff reads as a natural light pool.
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return Texture.from(c);
}

const MAX_LIGHTS = 48;

const channel = (c: number, sh: number) => (c >> sh) & 255;
const mix = (a: number, b: number, t: number) =>
  (Math.round(channel(a, 16) + (channel(b, 16) - channel(a, 16)) * t) << 16) |
  (Math.round(channel(a, 8) + (channel(b, 8) - channel(a, 8)) * t) << 8) |
  Math.round(channel(a, 0) + (channel(b, 0) - channel(a, 0)) * t);

/**
 * 2D lighting. Lights are soft additive sprites collected into a light map.
 *  - With ambient white the lights are simply added over the scene (a warm pool around a blast).
 *  - With a darker ambient the light map is multiplied over the scene, so only lit areas keep
 *    their colour: night themes and Sudden Death get real, dramatic lighting.
 */
export class LightLayer {
  /** Add to the stage above the world. */
  readonly container = new Container();
  private readonly rt: RenderTexture;
  private readonly mapSprite: Sprite;
  private readonly lightsRoot = new Container();
  private readonly direct = new Container();
  private readonly tex = lightTexture();
  private lights: Light[] = [];
  private frameLights: Light[] = [];
  private pool: Sprite[] = [];
  private ambient = 0xffffff;
  private ambientTarget = 0xffffff;
  private time = 0;

  constructor(private readonly app: Application) {
    const w = Math.max(2, Math.ceil(app.screen.width / 2));
    const h = Math.max(2, Math.ceil(app.screen.height / 2));
    this.rt = RenderTexture.create({ width: w, height: h });
    this.mapSprite = new Sprite(this.rt);
    this.mapSprite.blendMode = 'multiply';
    this.container.addChild(this.direct, this.mapSprite);
  }

  setAmbient(color: number, instant = false): void {
    this.ambientTarget = color;
    if (instant) this.ambient = color;
  }

  /** One-shot light that fades out (explosions). */
  flash(
    x: number,
    y: number,
    color: number,
    radius: number,
    life: number,
    intensity: number,
  ): void {
    if (this.lights.length >= MAX_LIGHTS) this.recycle(this.lights.shift());
    this.lights.push(this.make(x, y, color, radius, intensity, life, 0));
  }

  /** Light that exists for this frame only: call every frame (flames, rockets, mines). */
  frame(x: number, y: number, color: number, radius: number, intensity: number, flicker = 0): void {
    if (this.lights.length + this.frameLights.length >= MAX_LIGHTS) return;
    this.frameLights.push(this.make(x, y, color, radius, intensity, 0, flicker));
  }

  private make(
    x: number,
    y: number,
    color: number,
    radius: number,
    intensity: number,
    life: number,
    flicker: number,
  ): Light {
    const sprite = this.pool.pop() ?? new Sprite(this.tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.tint = color;
    return { sprite, x, y, radius, color, intensity, age: 0, life, flicker };
  }

  private recycle(l: Light | undefined): void {
    if (!l) return;
    l.sprite.parent?.removeChild(l.sprite);
    this.pool.push(l.sprite);
  }

  update(dtMs: number, camera: Camera): void {
    const dt = dtMs / 1000;
    this.time += dt;
    this.ambient = mix(this.ambient, this.ambientTarget, Math.min(1, dt * 2.5));
    const dark = this.ambient < 0xfafafa;

    // Age one-shot lights, drop the dead ones.
    this.lights = this.lights.filter((l) => {
      l.age += dt;
      if (l.age >= l.life) {
        this.recycle(l);
        return false;
      }
      return true;
    });

    const root = dark ? this.lightsRoot : this.direct;
    this.direct.visible = !dark;
    this.mapSprite.visible = dark;
    const scale = dark ? 0.5 : 1;

    const all = [...this.lights, ...this.frameLights];
    for (const l of all) {
      const p = camera.toScreen(l.x, l.y);
      const fade = l.life > 0 ? 1 - l.age / l.life : 1;
      const flick = l.flicker ? 1 + Math.sin(this.time * 19 + l.x) * l.flicker : 1;
      const r = (l.radius * camera.scale * flick * scale * 2) / this.tex.width;
      l.sprite.position.set(p.x * scale, p.y * scale);
      l.sprite.scale.set(r);
      // Day: subtle warm pool. Night: strong, since it is what reveals the scene.
      l.sprite.alpha = Math.min(1, l.intensity * fade * (dark ? 1 : 0.28));
      if (l.sprite.parent !== root) root.addChild(l.sprite);
    }

    if (dark) {
      const w = this.rt.width;
      const h = this.rt.height;
      if (this.mapSprite.width !== this.app.screen.width) {
        this.mapSprite.width = this.app.screen.width;
        this.mapSprite.height = this.app.screen.height;
      }
      void w;
      void h;
      const c = this.ambient;
      this.app.renderer.render({
        container: this.lightsRoot,
        target: this.rt,
        clear: true,
        clearColor: [channel(c, 16) / 255, channel(c, 8) / 255, channel(c, 0) / 255, 1],
      });
    }

    // Per-frame lights are recycled every frame.
    for (const l of this.frameLights) this.recycle(l);
    this.frameLights = [];
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.rt.destroy(true);
  }
}
