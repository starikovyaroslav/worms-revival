import { Assets, Texture } from 'pixi.js';

/** Written by `npm run art`: which images exist and how big they are (logical size). */
export interface AssetManifest {
  version: number;
  /** `pixel`: retro art, 1 art pixel = 1 world pixel. */
  style?: string;
  assets: Record<string, { file: string; w: number; h: number }>;
}

/**
 * Image assets looked up by id (`objects/barrel`, `character/eye-open`...). Views ask for an id and
 * fall back to their built-in drawing when it is missing, so any asset can be replaced by simply
 * overwriting its file, and a missing one never breaks the game.
 */
export class AssetStore {
  private textures = new Map<string, Texture>();
  manifest: AssetManifest | null = null;

  async load(baseUrl: string): Promise<void> {
    let manifest: AssetManifest;
    try {
      const res = await fetch(`${baseUrl}/manifest.json`);
      if (!res.ok) return;
      manifest = (await res.json()) as AssetManifest;
    } catch {
      return;
    }
    this.manifest = manifest;
    await Promise.all(
      Object.entries(manifest.assets).map(async ([id, a]) => {
        try {
          const tex = (await Assets.load(`${baseUrl}/${a.file}`)) as Texture;
          // Pixel art: never blur it when scaled.
          tex.source.scaleMode = 'nearest';
          this.textures.set(id, tex);
        } catch {
          // A broken file just means "use the fallback".
        }
      }),
    );
  }

  has(id: string): boolean {
    return this.textures.has(id);
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
