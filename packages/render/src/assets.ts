import { Assets, Rectangle, Texture } from 'pixi.js';

/** Ordered overlays: supplemental packs never replace files in the previous packs. */
export const ART_PACKS = [
  'assets',
  'assets/generated',
  'assets/arsenal',
  'assets/vfx',
  'assets/military',
  'assets/skins',
] as const;

/** Decoded art for the CPU-painted destructible terrain and map preview. */
export interface AssetPixels {
  w: number;
  h: number;
  logicalW?: number;
  logicalH?: number;
  data: Uint8ClampedArray;
}

export interface AssetSize {
  w: number;
  h: number;
}
export interface AssetEntry extends AssetSize {
  file: string;
  /** Physical PNG dimensions; w/h above remain world/display units. Legacy packs omit these. */
  pixelW?: number;
  pixelH?: number;
  /** A native-pixel rectangle in a shared atlas; pixelW/H describe this frame, not the atlas. */
  frame?: { x: number; y: number; w: number; h: number };
}

/** Resolution-independent manifest: image pixels never define collision or display size. */
export interface AssetManifest {
  version: number;
  /** `pixel`: pixel-art sampling, not a restriction to one texel per world unit. */
  style?: string;
  assets: Record<string, AssetEntry>;
  /** Id prefixes whose previously loaded assets are dropped first (an override replaces a whole set). */
  remove?: string[];
}

/** The asset manifest was found but cannot be used. */
export class ManifestError extends Error {
  override name = 'ManifestError';
}

/**
 * Image assets looked up by id (`objects/barrel`, `character/eye-open`...). Views ask for an id and
 * fall back to their built-in drawing when it is missing, so any asset can be replaced by simply
 * overwriting its file, and a missing one never breaks the game.
 */
export class AssetStore {
  private textures = new Map<string, Texture>();
  private urls = new Map<string, string>();
  private decoded = new Map<string, AssetPixels>();
  private sizes = new WeakMap<Texture, AssetSize>();
  private ids = new WeakMap<Texture, string>();
  manifest: AssetManifest | null = null;

  /** Loads a manifest and its images; later loads override earlier ones with the same id. */
  async load(baseUrl: string, version = ''): Promise<void> {
    // Files keep their names between releases, so a version query keeps browsers and CDNs from
    // serving stale copies.
    const q = version ? `?v=${version}` : '';
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/manifest.json${q}`, { cache: 'no-cache' });
    } catch {
      return; // offline or blocked: play with the built-in drawings
    }
    if (!res.ok) return; // no artwork installed
    let manifest: AssetManifest;
    try {
      manifest = (await res.json()) as AssetManifest;
    } catch (err) {
      // A manifest that exists but is broken is a build error, not "missing artwork".
      throw new ManifestError('manifest.json is not valid JSON', { cause: err });
    }
    if (!manifest || typeof manifest.assets !== 'object' || manifest.assets === null)
      throw new ManifestError('manifest.json has no "assets" table');
    this.manifest = manifest;
    for (const prefix of manifest.remove ?? []) {
      for (const id of [...this.textures.keys()]) {
        if (!id.startsWith(prefix)) continue;
        this.textures.delete(id);
        this.urls.delete(id);
        this.decoded.delete(id);
      }
    }
    await Promise.all(
      Object.entries(manifest.assets).map(async ([id, a]) => {
        try {
          const atlas = (await Assets.load(`${baseUrl}/${a.file}${q}`)) as Texture;
          const f = a.frame;
          if (
            f &&
            (!Number.isInteger(f.x) ||
              !Number.isInteger(f.y) ||
              !Number.isInteger(f.w) ||
              !Number.isInteger(f.h) ||
              f.x < 0 ||
              f.y < 0 ||
              f.w <= 0 ||
              f.h <= 0 ||
              f.x + f.w > atlas.width ||
              f.y + f.h > atlas.height)
          )
            throw new Error(`Invalid atlas frame: ${id}`);
          const tex = f
            ? new Texture({ source: atlas.source, frame: new Rectangle(f.x, f.y, f.w, f.h) })
            : atlas;
          // Pixel art: never blur it when scaled.
          tex.source.scaleMode = 'nearest';
          this.sizes.set(tex, { w: a.w, h: a.h });
          this.ids.set(tex, id);
          this.textures.set(id, tex);
          this.urls.set(id, `${baseUrl}/${a.file}${q}`);
          this.decoded.delete(id);
        } catch {
          // A broken file just means "use the fallback".
        }
      }),
    );
  }

  /** URL of an asset's image (for DOM UI), or undefined when it does not exist. */
  url(id: string): string | undefined {
    return this.urls.get(id);
  }

  /** Lazily read a loaded image once; unavailable art keeps its procedural fallback. */
  pixels(id: string): AssetPixels | undefined {
    const cached = this.decoded.get(id);
    if (cached) return cached;
    const tex = this.textures.get(id);
    if (!tex || typeof document === 'undefined') return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = tex.width;
      canvas.height = tex.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return undefined;
      const f = tex.frame;
      ctx.drawImage(
        tex.source.resource as CanvasImageSource,
        f.x,
        f.y,
        f.width,
        f.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const result = {
        w: canvas.width,
        h: canvas.height,
        logicalW: this.sizeOf(tex).w,
        logicalH: this.sizeOf(tex).h,
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      };
      this.decoded.set(id, result);
      return result;
    } catch {
      return undefined;
    }
  }

  has(id: string): boolean {
    return this.textures.has(id);
  }

  /** Display footprint, independent of source pixels. Unregistered procedural textures stay 1:1. */
  sizeOf(texture: Texture): AssetSize {
    return this.sizes.get(texture) ?? { w: texture.width, h: texture.height };
  }

  scaleOf(texture: Texture): number {
    return this.sizeOf(texture).w / texture.width;
  }

  companion(texture: Texture, suffix: string): Texture | undefined {
    const id = this.ids.get(texture);
    return id ? this.get(id + suffix) : undefined;
  }

  /** How many numbered frames `prefix0`, `prefix1`... exist (so sheets may have fewer frames). */
  count(prefix: string): number {
    let n = 0;
    while (this.textures.has(`${prefix}${n}`)) n++;
    return n;
  }

  get(id: string): Texture | undefined {
    return this.textures.get(id);
  }
}

/** The shared store, filled once at start-up. */
export const assets = new AssetStore();
