import { BufferImageSource, Container, Sprite, Texture } from 'pixi.js';
import type { Terrain } from '@wr/sim';
import { assets, type AssetPixels } from './assets';

/** Re-sample against the *current* collision mask: subsequent craters erase old soot too. */
export function paintScorch(
  out: Uint8Array,
  size: number,
  x: number,
  y: number,
  art: AssetPixels,
  solid: (x: number, y: number) => boolean,
  ember: number,
): void {
  out.fill(0);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      if (!solid(x + i, y + j)) continue;
      const src = (Math.floor((j * art.h) / size) * art.w + Math.floor((i * art.w) / size)) * 4;
      const dst = (j * size + i) * 4;
      if (!art.data[src + 3]) continue;
      const hot = art.data[src]! > 120 && art.data[src]! > art.data[src + 1]! * 1.4;
      const glow = hot ? ember : 1;
      out[dst] = art.data[src]! * glow;
      out[dst + 1] = art.data[src + 1]! * glow;
      out[dst + 2] = art.data[src + 2]! * glow;
      out[dst + 3] = art.data[src + 3]!;
    }
  }
}

/** Bounded, temporary cosmetic soot; never writes to the terrain or the simulation RNG. */
export class BurnMarks {
  readonly container = new Container();
  private marks: {
    sprite: Sprite;
    source: BufferImageSource;
    pixels: Uint8Array;
    art: AssetPixels;
    size: number;
    x: number;
    y: number;
    age: number;
  }[] = [];
  private clock = 0;
  private serial = 0;

  constructor(private readonly terrain: Terrain) {}

  get activeCount(): number {
    return this.marks.length;
  }

  add(x: number, y: number, radius: number): void {
    const art = assets.pixels(`vfx/scorch_${this.serial++ % 4}`);
    if (!art) return;
    if (this.marks.length >= 32) this.remove(0);
    const size = Math.max(16, Math.min(160, Math.round(radius * 3.2)));
    x = Math.round(x - size / 2);
    y = Math.round(y - size / 2);
    const pixels = new Uint8Array(size * size * 4);
    const source = new BufferImageSource({
      resource: pixels,
      width: size,
      height: size,
      scaleMode: 'nearest',
    });
    const sprite = new Sprite(new Texture({ source }));
    sprite.position.set(x, y);
    this.container.addChild(sprite);
    const mark = { sprite, source, pixels, art, size, x, y, age: 0 };
    this.marks.push(mark);
    this.paint(mark);
  }

  private paint(mark: (typeof this.marks)[number]): void {
    const ember = Math.max(0.25, (1 - mark.age / 3) * (0.75 + Math.sin(mark.age * 17) * 0.25));
    paintScorch(
      mark.pixels,
      mark.size,
      mark.x,
      mark.y,
      mark.art,
      (x, y) => this.terrain.isSolid(x, y),
      ember,
    );
    mark.source.update();
  }

  update(dtMs: number, terrainChanged = false): void {
    const dt = Math.max(0, Math.min(0.1, dtMs / 1000));
    this.clock += dt;
    const repaint = this.clock >= 0.125 || terrainChanged;
    if (repaint) this.clock = 0;
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i]!;
      m.age += dt;
      if (m.age >= 18) {
        this.remove(i);
        continue;
      }
      m.sprite.alpha = 0.7 * Math.min(1, (18 - m.age) / 5);
      if (repaint) this.paint(m);
    }
  }

  private remove(i: number): void {
    this.marks[i]!.sprite.destroy({ texture: true, textureSource: true });
    this.marks.splice(i, 1);
  }

  destroy(): void {
    while (this.marks.length) this.remove(0);
    this.container.destroy();
  }
}
