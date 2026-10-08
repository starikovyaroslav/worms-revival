import { Container, Sprite, type Texture } from 'pixi.js';
import {
  RECIPES,
  type BurstLayer,
  type FlashLayer,
  type Layer,
  type Range,
  type Recipe,
} from './recipes';
import { createFxTextures, type FxTextureId } from './textures';

/** What an effect can ask the rest of the presentation to do. */
export interface FxHooks {
  shake(power: number): void;
  glow(strength: number): void;
  /** Quick zoom punch (fraction of zoom). */
  punch(amount: number): void;
  /** Slow motion or hit-stop: game clock at `scale` for `seconds` of real time. */
  timeScale(scale: number, seconds: number): void;
  /** Screen-space shockwave distortion at a world point. */
  shockwave(worldX: number, worldY: number, strength: number): void;
  /** Dynamic light (consumed by the lighting pass when present). */
  light?(
    x: number,
    y: number,
    color: number,
    radius: number,
    life: number,
    intensity: number,
  ): void;
}

export interface PlayContext {
  /** Terrain colour for debris. */
  dirt: number;
  /** -1..1 wind. */
  wind: number;
}

interface Particle {
  sprite: Sprite;
  age: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  wind: number;
  spin: number;
  scale0: number;
  scale1: number;
  colors: number[];
  fade: BurstLayer['fade'];
  alpha: number;
  stretch: boolean;
  phase: number;
  pool: Sprite[];
  /** Extra non-uniform scale multipliers (tracers). */
  sx: number;
  sy: number;
}

interface Pending {
  at: number;
  layer: Layer;
  x: number;
  y: number;
  k: number;
  ctx: PlayContext;
}

const rand = (r: Range) => r[0] + Math.random() * (r[1] - r[0]);

function lerpColor(stops: number[], t: number): number {
  if (stops.length === 1) return stops[0] as number;
  const f = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(f);
  const a = stops[i] as number;
  const b = stops[i + 1] as number;
  const u = f - i;
  const mix = (sh: number) => Math.round(((a >> sh) & 255) * (1 - u) + ((b >> sh) & 255) * u);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function darken(c: number, k: number): number {
  return (
    (Math.round(((c >> 16) & 255) * k) << 16) |
    (Math.round(((c >> 8) & 255) * k) << 8) |
    Math.round((c & 255) * k)
  );
}

/**
 * Plays effect recipes: layered sprite particles drawn additively (fire, sparks) or normally
 * (smoke, debris). Purely cosmetic: it never touches the simulation.
 */
export class EffectsSystem {
  /** Smoke and debris, drawn under the fire. */
  readonly back = new Container();
  /** Fire, sparks and flashes, drawn additively on top. */
  readonly front = new Container();
  private textures = createFxTextures();
  private particles: Particle[] = [];
  private pending: Pending[] = [];
  private pool: Sprite[] = [];
  private recipes: Record<string, Recipe> = RECIPES;

  constructor(private readonly hooks: FxHooks) {}

  /** Replace or add recipes (loaded from config files). */
  setRecipes(recipes: Record<string, Recipe>): void {
    this.recipes = { ...this.recipes, ...recipes };
  }

  /**
   * Plays a recipe at a world position. `size` is the effect radius in world pixels
   * (blast radius); everything in the recipe scales with it.
   */
  play(id: string, x: number, y: number, size: number, ctx: PlayContext): void {
    const recipe = this.recipes[id];
    if (!recipe) return;
    const k = Math.min(3.2, Math.max(0.3, size / 50));
    for (const layer of recipe.layers) {
      const at = layer.at ?? 0;
      if (at <= 0) this.run(layer, x, y, k, ctx);
      else this.pending.push({ at, layer, x, y, k, ctx });
    }
  }

  private run(layer: Layer, x: number, y: number, k: number, ctx: PlayContext): void {
    switch (layer.type) {
      case 'camera':
        this.hooks.shake(layer.shake * Math.min(10, k * 6));
        this.hooks.glow(layer.glow * Math.min(1.2, k * 0.8));
        if (layer.punch) this.hooks.punch(layer.punch * Math.min(2, k));
        break;
      case 'time':
        if (k >= layer.minK) this.hooks.timeScale(layer.scale, layer.duration);
        break;
      case 'shockwave':
        if (k >= layer.minK) this.hooks.shockwave(x, y, layer.strength * Math.min(1.5, k * 0.7));
        break;
      case 'light':
        this.hooks.light?.(x, y, layer.color, layer.radius * k * 50, layer.life, layer.intensity);
        break;
      case 'flash':
        this.flash(layer, x, y, k);
        break;
      case 'burst':
        this.burst(layer, x, y, k, ctx);
        break;
    }
  }

  private take(tex: Texture): Sprite {
    const s = this.pool.pop() ?? new Sprite();
    s.texture = tex;
    s.anchor.set(0.5);
    s.visible = true;
    s.rotation = 0;
    return s;
  }

  private pickTex(id: FxTextureId): Texture {
    const list = this.textures[id];
    return list[Math.floor(Math.random() * list.length)] as Texture;
  }

  private flash(l: FlashLayer, x: number, y: number, k: number): void {
    const sprite = this.take(this.pickTex(l.tex));
    sprite.blendMode = l.blend;
    sprite.tint = l.color;
    sprite.position.set(x, y);
    (l.blend === 'add' ? this.front : this.back).addChild(sprite);
    const base = this.textureSize(sprite);
    this.particles.push({
      sprite,
      age: 0,
      life: l.life,
      x,
      y,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      wind: 0,
      spin: 0,
      scale0: (l.scale[0] * k * 100) / base,
      scale1: (l.scale[1] * k * 100) / base,
      colors: [l.color],
      fade: 'out',
      alpha: l.alpha ?? 1,
      stretch: false,
      phase: 0,
      pool: this.pool,
      sx: 1,
      sy: 1,
    });
  }

  /** A bullet trail: a thin bright streak that fades quickly. */
  tracer(x0: number, y0: number, x1: number, y1: number): void {
    const sprite = this.take(this.textures.spark[0] as Texture);
    sprite.blendMode = 'add';
    sprite.tint = 0xffe8a8;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    sprite.position.set((x0 + x1) / 2, (y0 + y1) / 2);
    sprite.rotation = Math.atan2(dy, dx);
    this.front.addChild(sprite);
    const base = this.textureSize(sprite);
    this.particles.push({
      sprite,
      age: 0,
      life: 0.1,
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      wind: 0,
      spin: 0,
      scale0: len / base,
      scale1: len / base,
      colors: [0xffe8a8],
      fade: 'out',
      alpha: 0.9,
      stretch: false,
      phase: 0,
      pool: this.pool,
      sx: 1,
      sy: 2.2 / len,
    });
  }

  private textureSize(s: Sprite): number {
    return Math.max(s.texture.width, 1);
  }

  private burst(l: BurstLayer, x: number, y: number, k: number, ctx: PlayContext): void {
    const n = Math.round(l.count[0] + l.count[1] * k);
    const container = l.blend === 'add' ? this.front : this.back;
    for (let i = 0; i < n; i++) {
      const sprite = this.take(this.pickTex(l.tex));
      sprite.blendMode = l.blend;
      const base = this.textureSize(sprite);
      const a0 = Math.random() * Math.PI * 2;
      const r0 = Math.sqrt(Math.random()) * l.spread * k * 50;
      const px = x + Math.cos(a0) * r0;
      const py = y + Math.sin(a0) * r0;
      let angle: number;
      if (l.dir === 'radial') angle = r0 > 1 ? a0 : Math.random() * Math.PI * 2;
      else angle = -Math.PI / 2 + (Math.random() * 2 - 1) * (l.cone ?? 1);
      const speed = rand(l.speed) * Math.min(1.8, 0.6 + k * 0.5);
      let colors = l.colors;
      if (l.terrain) {
        // Mix of dark and light clods in the terrain's colour.
        const v = 0.55 + Math.random() * 0.7;
        colors = [darken(ctx.dirt, v)];
      }
      const life = rand(l.life);
      const p: Particle = {
        sprite,
        age: -Math.random() * 0.03,
        life,
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: l.gravity,
        drag: l.drag,
        wind: (l.wind ?? 0) * ctx.wind,
        spin: l.spin ? rand(l.spin) : 0,
        scale0: (rand(l.scaleStart) * k * 100) / base,
        scale1: (rand(l.scaleEnd) * k * 100) / base,
        colors,
        fade: l.fade,
        alpha: l.alpha ?? 1,
        stretch: !!l.stretch,
        phase: Math.random() * 10,
        pool: this.pool,
        sx: 1,
        sy: 1,
      };
      sprite.position.set(px, py);
      sprite.rotation = l.spin || l.tex === 'smoke' ? Math.random() * Math.PI * 2 : 0;
      sprite.alpha = 0;
      container.addChild(sprite);
      this.particles.push(p);
    }
  }

  get activeCount(): number {
    return this.particles.length;
  }

  update(dtMs: number): void {
    const dt = Math.min(0.05, dtMs / 1000);
    if (this.pending.length) {
      for (const p of this.pending) p.at -= dt;
      const due = this.pending.filter((p) => p.at <= 0);
      this.pending = this.pending.filter((p) => p.at > 0);
      for (const p of due) this.run(p.layer, p.x, p.y, p.k, p.ctx);
    }
    let write = 0;
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.life) {
        p.sprite.parent?.removeChild(p.sprite);
        p.sprite.visible = false;
        this.pool.push(p.sprite);
        continue;
      }
      this.particles[write++] = p;
      if (p.age < 0) continue;
      const t = p.age / p.life;
      // Motion: gravity, wind, and drag as a per-second retention factor.
      p.vy += p.gravity * dt;
      p.vx += p.wind * dt;
      const keep = Math.pow(p.drag, dt);
      p.vx *= keep;
      p.vy *= keep;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const s = p.sprite;
      s.position.set(p.x, p.y);
      s.tint = lerpColor(p.colors, t);
      const scale = p.scale0 + (p.scale1 - p.scale0) * (1 - (1 - t) * (1 - t));
      if (p.stretch) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        s.rotation = Math.atan2(p.vy, p.vx);
        s.scale.set(scale * (1 + Math.min(5, speed / 160)), scale * 0.7);
      } else {
        s.scale.set(scale * p.sx, scale * p.sy);
        if (p.spin) s.rotation += p.spin * dt;
      }
      let a: number;
      switch (p.fade) {
        case 'inout':
          a = Math.min(1, t * 6) * (1 - t) * (1 - t) * 1.6;
          break;
        case 'flicker':
          a = (1 - t) * (0.55 + 0.45 * Math.sin(p.age * 24 + p.phase));
          break;
        default:
          a = 1 - t * t;
      }
      s.alpha = Math.max(0, Math.min(1, a * p.alpha));
    }
    this.particles.length = write;
  }

  clear(): void {
    for (const p of this.particles) {
      p.sprite.parent?.removeChild(p.sprite);
      p.sprite.visible = false;
      this.pool.push(p.sprite);
    }
    this.particles.length = 0;
    this.pending.length = 0;
  }
}
