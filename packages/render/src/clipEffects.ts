import { Container, Sprite, type Texture } from 'pixi.js';
import { assets } from './assets';
import { VFX_CLIPS, type VfxClip } from './vfxCatalog';

export function clipFrame(
  age: number,
  life: number,
  count: number,
  loop = false,
  fps = 12,
): number {
  if (count <= 1) return 0;
  return loop
    ? Math.floor(Math.max(0, age) * fps) % count
    : Math.min(count - 1, Math.floor((Math.max(0, age) / Math.max(0.001, life)) * count));
}

export function clipTextures(name: VfxClip): Texture[] {
  const count = VFX_CLIPS[name].frames;
  const frames: Texture[] = [];
  for (let i = 0; i < count; i++) {
    const frame = assets.get(`vfx/${name}_${i}`);
    if (!frame) return [];
    frames.push(frame);
  }
  return frames;
}

export interface ClipOptions {
  life?: number;
  width?: number;
  tint?: number;
  vx?: number;
  vy?: number;
  rotation?: number;
  loop?: boolean;
  fps?: number;
  fade?: boolean;
  alpha?: number;
}
interface ActiveClip {
  sprite: Sprite;
  frames: Texture[];
  age: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  loop: boolean;
  fps: number;
  fade: boolean;
  alpha: number;
}

/** Bounded, pooled, cosmetic flipbooks. No sim objects or texture ownership are retained. */
export class ClipEffects {
  readonly container = new Container();
  private active: ActiveClip[] = [];
  private pool: Sprite[] = [];
  readonly limit = 192;

  get activeCount(): number {
    return this.active.length;
  }

  play(name: VfxClip, x: number, y: number, opts: ClipOptions = {}): boolean {
    const frames = clipTextures(name);
    if (!frames.length) return false;
    if (this.active.length >= this.limit) this.recycle(this.active.shift()!);
    const sprite = this.pool.pop() ?? new Sprite();
    const clip = VFX_CLIPS[name];
    sprite.texture = frames[0]!;
    sprite.anchor.set(...clip.anchor);
    sprite.position.set(Math.round(x), Math.round(y));
    sprite.rotation = opts.rotation ?? 0;
    sprite.scale.set((opts.width ?? clip.w) / frames[0]!.width);
    sprite.tint = opts.tint ?? 0xffffff;
    sprite.alpha = opts.alpha ?? 1;
    sprite.visible = true;
    this.container.addChild(sprite);
    this.active.push({
      sprite,
      frames,
      age: 0,
      life: opts.life ?? 0.6,
      x,
      y,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? 0,
      loop: opts.loop ?? false,
      fps: opts.fps ?? 12,
      fade: opts.fade ?? false,
      alpha: opts.alpha ?? 1,
    });
    return true;
  }

  private recycle(clip: ActiveClip): void {
    clip.sprite.removeFromParent();
    clip.sprite.visible = false;
    this.pool.push(clip.sprite);
  }

  update(dtMs: number): void {
    const dt = Math.max(0, Math.min(0.1, dtMs / 1000));
    let write = 0;
    for (const clip of this.active) {
      clip.age += dt;
      if (clip.age >= clip.life) {
        this.recycle(clip);
        continue;
      }
      clip.x += clip.vx * dt;
      clip.y += clip.vy * dt;
      clip.sprite.position.set(Math.round(clip.x), Math.round(clip.y));
      clip.sprite.texture =
        clip.frames[clipFrame(clip.age, clip.life, clip.frames.length, clip.loop, clip.fps)]!;
      clip.sprite.alpha =
        clip.alpha * (clip.fade ? Math.min(1, (1 - clip.age / clip.life) * 3) : 1);
      this.active[write++] = clip;
    }
    this.active.length = write;
  }

  clear(): void {
    for (const clip of this.active) this.recycle(clip);
    this.active.length = 0;
  }
  destroy(): void {
    this.clear();
    for (const sprite of this.pool) sprite.destroy();
    this.pool.length = 0;
    this.container.destroy();
  }
}
