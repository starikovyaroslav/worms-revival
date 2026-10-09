import { Assets, Texture } from 'pixi.js';

/** Written by `npm run art`: which images exist and how big they are (logical size). */
export interface AssetManifest {
  version: number;
  /** `pixel`: retro art, 1 art pixel = 1 world pixel. */
  style?: string;
  assets: Record<string, { file: string; w: number; h: number }>;
  /** Id prefixes whose previously loaded assets are dropped first (an override replaces a whole set). */
  remove?: string[];
}

/**
 * Image assets looked up by id (`objects/barrel`, `character/eye-open`...). Views ask for an id and
 * fall back to their built-in drawing when it is missing, so any asset can be replaced by simply
 * overwriting its file, and a missing one never breaks the game.
 */
export class AssetStore {
  private textures = new Map<string, Texture>();
  private urls = new Map<string, string>();
  manifest: AssetManifest | null = null;

  /** Loads a manifest and its images; later loads override earlier ones with the same id. */
  async load(baseUrl: string, version = ''): Promise<void> {
    // Files keep their names between releases, so a version query keeps browsers and CDNs from
    // serving stale copies.
    const q = version ? `?v=${version}` : '';
    let manifest: AssetManifest;
    try {
      const res = await fetch(`${baseUrl}/manifest.json${q}`, { cache: 'no-cache' });
      if (!res.ok) return;
      manifest = (await res.json()) as AssetManifest;
    } catch {
      return;
    }
    this.manifest = manifest;
    for (const prefix of manifest.remove ?? []) {
      for (const id of [...this.textures.keys()]) {
        if (!id.startsWith(prefix)) continue;
        this.textures.delete(id);
        this.urls.delete(id);
      }
    }
    await Promise.all(
      Object.entries(manifest.assets).map(async ([id, a]) => {
        try {
          const tex = (await Assets.load(`${baseUrl}/${a.file}${q}`)) as Texture;
          // Pixel art: never blur it when scaled.
          tex.source.scaleMode = 'nearest';
          this.textures.set(id, tex);
          this.urls.set(id, `${baseUrl}/${a.file}${q}`);
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
