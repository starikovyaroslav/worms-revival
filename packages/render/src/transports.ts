import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { SimEvent, World } from '@wr/sim';
import { assets, type AssetPixels } from './assets';
import { clipTextures } from './clipEffects';
import type { Camera } from './camera';

type Raid = Extract<SimEvent, { type: 'airRaid' }>;
export type Aircraft = 'attack' | 'gunship' | 'stealth';
export function aircraftFor(source?: string): Aircraft {
  return source === 'nuke'
    ? 'stealth'
    : source === 'airstrike' || source === 'napalm'
      ? 'attack'
      : 'gunship';
}
/** Bounded visible-column ray cast, never shades empty air or water. */
export function shadowSurface(world: World, x: number, top: number, bottom: number): number | null {
  if (x < 0 || x >= world.terrain.width) return null;
  const end = Math.min(world.terrain.height, world.waterLevel, Math.ceil(bottom));
  for (let y = Math.max(0, Math.floor(top)); y < end; y++)
    if (world.terrain.isSolid(x, y)) return y;
  return null;
}
interface Flight {
  event: Raid;
  sprite: Sprite;
  lights: Graphics;
  frames: Texture[];
  age: number;
  dropped: number;
  aircraft: Aircraft;
  duration: number;
  shadow: AssetPixels | undefined;
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
  /** Added after terrain in world space, below worms and aim overlays. */
  readonly shadows = new Graphics();
  private flights: Flight[] = [];
  private drops: Drop[] = [];
  get activeCount(): number {
    return this.flights.length;
  }

  play(event: Raid): void {
    const aircraft = aircraftFor(event.source);
    let frames = clipTextures(aircraft);
    const military = frames.length > 0;
    if (!military) frames = clipTextures(event.source === 'mail' ? 'mailplane' : 'cargo');
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
    this.flights.push({
      event,
      sprite,
      lights,
      frames,
      age: 0,
      dropped: 0,
      aircraft,
      duration: aircraft === 'attack' ? 1.8 : aircraft === 'gunship' ? 2.2 : 2.8,
      shadow: military ? assets.pixels(`vfx/${aircraft}_0`) : undefined,
    });
  }

  update(dtMs: number, camera: Camera, world: World): void {
    const dt = Math.max(0, Math.min(0.1, dtMs / 1000)),
      scale = camera.baseScale;
    let write = 0;
    this.shadows.clear();
    for (const f of this.flights) {
      f.age += dt;
      if (f.age >= f.duration) {
        f.sprite.destroy();
        f.lights.destroy();
        continue;
      }
      const phase = raidPhase((f.age * 1.8) / f.duration, f.event.payloadIds.length);
      const u = f.event.dir === 1 ? phase.progress : 1 - phase.progress;
      const displayWidth = assets.sizeOf(f.frames[0]!).w;
      const margin = (displayWidth / 2 + 20) * scale;
      const x = -margin + u * (camera.viewW + margin * 2),
        y = (f.aircraft === 'stealth' ? 44 : 56) * scale;
      f.sprite.texture = f.frames[phase.frame]!;
      f.sprite.position.set(Math.round(x), Math.round(y));
      const densityScale = assets.scaleOf(f.sprite.texture);
      f.sprite.scale.set(scale * densityScale * f.event.dir, scale * densityScale);
      // The shadow leads the aircraft slightly: a warning before the body crosses overhead.
      this.paintShadow(f, camera, world, x + f.event.dir * 55 * scale);
      f.lights.clear();
      if (f.aircraft !== 'stealth' && Math.floor(f.age * 4) % 4 === 0)
        f.lights.rect(x - 30 * scale * f.event.dir, y - 8 * scale, 2 * scale, scale).fill(0xd95763);
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
        sprite.scale.set(scale * 0.7 * assets.scaleOf(tex));
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
  private paintShadow(f: Flight, camera: Camera, world: World, screenX: number): void {
    const art = f.shadow;
    if (!art) return;
    const center = camera.toWorld(screenX, 0).x;
    const top = camera.toWorld(0, 0).y;
    const bottom = camera.toWorld(0, camera.viewH).y;
    const logical = assets.sizeOf(f.frames[0]!);
    const density = art.w / logical.w;
    for (let column = 0; column < logical.w; column += 2) {
      const i = Math.floor(column * density);
      let coverage = 0;
      for (let row = 0; row < logical.h; row++) {
        const j = Math.min(art.h - 1, Math.floor(row * density));
        if (art.data[(j * art.w + i) * 4 + 3]) coverage++;
      }
      if (!coverage) continue;
      const x = Math.round(center + (column - logical.w / 2) * f.event.dir);
      const y = shadowSurface(world, x, top, bottom);
      if (y === null) continue;
      const depth = Math.min(12, 2 + Math.round(coverage / 3));
      for (let dx = 0; dx < 2; dx++)
        for (let dy = 0; dy < depth; dy++)
          if (world.terrain.isSolid(x + dx, y + dy)) this.shadows.rect(x + dx, y + dy, 1, 1);
    }
    this.shadows.fill({ color: 0x10101a, alpha: 0.28 });
  }
  destroy(): void {
    this.container.destroy({ children: true });
    this.flights.length = 0;
    this.drops.length = 0;
    this.shadows.destroy();
  }
}
