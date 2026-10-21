import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { SimEvent, World } from '@wr/sim';
import { assets } from './assets';
import { clipTextures } from './clipEffects';
import type { Camera } from './camera';

type Raid = Extract<SimEvent, { type: 'airRaid' }>;
interface Flight {
  event: Raid;
  sprite: Sprite;
  lights: Graphics;
  frames: Texture[];
  age: number;
  dropped: number;
}
interface Drop {
  sprite: Sprite;
  age: number;
  x: number;
  y: number;
  vx: number;
}

export function raidPhase(
  age: number,
  count: number,
): { frame: number; released: number; progress: number } {
  const progress = Math.max(0, Math.min(1, age / 1.8));
  const dropping = progress >= 0.25 && progress < 0.75;
  return {
    progress,
    frame: dropping ? (progress < 0.35 ? 2 : 3) : Math.floor(age * 12) % 2,
    released: Math.min(count, Math.floor(Math.max(0, (progress - 0.25) / 0.5) * count)),
  };
}

/** Cosmetic flyover, not a replacement scheduler for the already simulated payloads. */
export class Transports {
  readonly container = new Container();
  private flights: Flight[] = [];
  private drops: Drop[] = [];
  get activeCount(): number {
    return this.flights.length;
  }

  play(event: Raid): void {
    const frames = clipTextures(event.source === 'mail' ? 'mailplane' : 'cargo');
    if (!frames.length) return;
    if (this.flights.length >= 3) {
      const old = this.flights.shift()!;
      old.sprite.destroy();
      old.lights.destroy();
    }
    const sprite = new Sprite(frames[0]);
    sprite.anchor.set(0.5);
    const lights = new Graphics();
    this.container.addChild(sprite, lights);
    this.flights.push({ event, sprite, lights, frames, age: 0, dropped: 0 });
  }

  update(dtMs: number, camera: Camera, world: World): void {
    const dt = Math.max(0, Math.min(0.1, dtMs / 1000)),
      scale = camera.baseScale;
    let write = 0;
    for (const f of this.flights) {
      f.age += dt;
      if (f.age >= 1.8) {
        f.sprite.destroy();
        f.lights.destroy();
        continue;
      }
      const phase = raidPhase(f.age, f.event.payloadIds.length);
      const u = f.event.dir === 1 ? phase.progress : 1 - phase.progress;
      const x = -80 * scale + u * (camera.viewW + 160 * scale),
        y = 42 * scale;
      f.sprite.texture = f.frames[phase.frame]!;
      f.sprite.position.set(Math.round(x), Math.round(y));
      f.sprite.scale.set(scale * f.event.dir, scale);
      f.lights.clear();
      if (Math.floor(f.age * 6) % 2 === 0)
        f.lights.rect(x - 18 * scale * f.event.dir, y - 3 * scale, 2 * scale, scale).fill(0xd95763);
      // Decorative drops are shown only while the actual payload is still above the viewport.
      for (; f.dropped < phase.released; f.dropped++) {
        const actual = world.byId(f.event.payloadIds[f.dropped]!);
        if (!actual || actual.removed || camera.toScreen(actual.x, actual.y).y >= 0) continue;
        const id =
          f.event.source === 'mail'
            ? 'vfx/letter_0'
            : f.event.source === 'minestrike'
              ? 'objects/mine_off'
              : f.event.source === 'napalm'
                ? 'proj/napalm'
                : f.event.source === 'frenchsheep'
                  ? 'proj/frenchsheep'
                  : f.event.source === 'molesquad'
                    ? 'creatures/mole_0'
                    : f.event.source === 'carpet'
                      ? 'proj/carpet'
                      : 'vfx/missile_0';
        const tex = assets.get(id);
        if (!tex || this.drops.length >= 48) continue;
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale * 0.7);
        sprite.position.set(x, y + 8 * scale);
        this.container.addChild(sprite);
        this.drops.push({ sprite, age: 0, x, y: y + 8 * scale, vx: f.event.dir * 30 * scale });
      }
      this.flights[write++] = f;
    }
    this.flights.length = write;
    write = 0;
    for (const d of this.drops) {
      d.age += dt;
      if (d.age >= 0.45) {
        d.sprite.destroy();
        continue;
      }
      d.x += d.vx * dt;
      d.y += (35 + 180 * d.age) * scale * dt;
      d.sprite.position.set(Math.round(d.x), Math.round(d.y));
      d.sprite.alpha = 1 - d.age / 0.45;
      this.drops[write++] = d;
    }
    this.drops.length = write;
  }
  destroy(): void {
    this.container.destroy({ children: true });
    this.flights.length = 0;
    this.drops.length = 0;
  }
}
