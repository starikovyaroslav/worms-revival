/** Player settings, kept in localStorage under a versioned schema. UI state only: never part of the sim or its hash. */
import type { CrtMode } from '@wr/render';

export const SETTINGS_KEY = 'wr.settings';
export const SETTINGS_VERSION = 1;

export interface Settings {
  /** Sound effects volume, 0..1. */
  sfxVolume: number;
  /** Music on/off (there is no music yet: the switch is stored for when there is). */
  musicOn: boolean;
  /** Everything silent. */
  muted: boolean;
  crtMode: CrtMode;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  sfxVolume: 0.8,
  musicOn: true,
  muted: false,
  crtMode: 'soft',
};

/** The part of `Storage` this module needs (a plain object in tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const clamp01 = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Reads stored settings; anything unreadable, from another schema version or out of range falls back to the defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!data || typeof data !== 'object') return { ...DEFAULT_SETTINGS };
  const o = data as Record<string, unknown>;
  if (o.v !== SETTINGS_VERSION) return { ...DEFAULT_SETTINGS };
  return {
    sfxVolume: clamp01(o.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    musicOn: bool(o.musicOn, DEFAULT_SETTINGS.musicOn),
    muted: bool(o.muted, DEFAULT_SETTINGS.muted),
    crtMode:
      o.crtMode === 'off' ||
      o.crtMode === 'soft' ||
      o.crtMode === 'medium' ||
      o.crtMode === 'strong'
        ? o.crtMode
        : DEFAULT_SETTINGS.crtMode,
  };
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify({ v: SETTINGS_VERSION, ...s });
}

/** Current settings plus change notification. Storage failures (private mode, quota) are ignored: settings just don't persist. */
export class SettingsStore {
  private current: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor(private readonly storage: KeyValueStore | null) {
    let raw: string | null = null;
    try {
      raw = storage?.getItem(SETTINGS_KEY) ?? null;
    } catch {
      // Storage may throw when blocked by the browser.
    }
    this.current = parseSettings(raw);
  }

  get(): Settings {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = parseSettings(serializeSettings({ ...this.current, ...patch }));
    try {
      this.storage?.setItem(SETTINGS_KEY, serializeSettings(this.current));
    } catch {
      // Not persisted; the session keeps working.
    }
    for (const fn of this.listeners) fn(this.current);
  }

  /** Calls `fn` now and after every change; returns the unsubscribe function. */
  subscribe(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    fn(this.current);
    return () => this.listeners.delete(fn);
  }
}

function browserStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The one store the game uses. */
export const settingsStore = new SettingsStore(browserStorage());
