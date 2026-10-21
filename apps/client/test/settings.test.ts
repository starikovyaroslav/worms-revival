import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  SettingsStore,
  parseSettings,
  type KeyValueStore,
} from '../src/settings';

function memory(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('parseSettings', () => {
  it('defaults for nothing, junk and foreign versions', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ v: SETTINGS_VERSION + 1, sfxVolume: 0.1 }))).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(parseSettings(JSON.stringify({ sfxVolume: 0.1 }))).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps volume and ignores wrong types field by field', () => {
    const s = parseSettings(
      JSON.stringify({ v: SETTINGS_VERSION, sfxVolume: 7, musicOn: 'yes', muted: true }),
    );
    expect(s).toEqual({ ...DEFAULT_SETTINGS, sfxVolume: 1, muted: true });
    expect(parseSettings(JSON.stringify({ v: SETTINGS_VERSION, sfxVolume: -3 })).sfxVolume).toBe(0);
  });

  it('keeps old audio preferences and defaults the new CRT field', () => {
    expect(
      parseSettings(JSON.stringify({ v: 1, sfxVolume: 0.2, musicOn: false, muted: true })),
    ).toEqual({ sfxVolume: 0.2, musicOn: false, muted: true, crtMode: 'soft' });
  });

  it('accepts only known CRT modes', () => {
    for (const crtMode of ['off', 'soft', 'medium', 'strong'] as const) {
      expect(parseSettings(JSON.stringify({ v: 1, crtMode })).crtMode).toBe(crtMode);
    }
    for (const crtMode of ['unknown', 1, null, false]) {
      expect(parseSettings(JSON.stringify({ v: 1, crtMode })).crtMode).toBe('soft');
    }
  });
});

describe('SettingsStore', () => {
  it('survives a "reload": a new store over the same storage sees the saved values', () => {
    const storage = memory();
    new SettingsStore(storage).update({ sfxVolume: 0.3, muted: true, crtMode: 'off' });
    const again = new SettingsStore(storage).get();
    expect(again.sfxVolume).toBe(0.3);
    expect(again.muted).toBe(true);
    expect(again.crtMode).toBe('off');
    expect(JSON.parse(storage.data[SETTINGS_KEY] as string).v).toBe(SETTINGS_VERSION);
  });

  it('notifies subscribers now and on every change, until they unsubscribe', () => {
    const store = new SettingsStore(memory());
    const seen: number[] = [];
    const off = store.subscribe((s) => seen.push(s.sfxVolume));
    store.update({ sfxVolume: 0.5 });
    off();
    store.update({ sfxVolume: 0.1 });
    expect(seen).toEqual([DEFAULT_SETTINGS.sfxVolume, 0.5]);
  });

  it('keeps working when storage throws or is missing', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    for (const storage of [broken, null]) {
      const store = new SettingsStore(storage);
      expect(store.get()).toEqual(DEFAULT_SETTINGS);
      store.update({ muted: true });
      expect(store.get().muted).toBe(true);
    }
  });

  it('clamps out-of-range updates', () => {
    const store = new SettingsStore(memory());
    store.update({ sfxVolume: 5 });
    expect(store.get().sfxVolume).toBe(1);
  });
});
