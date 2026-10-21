import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@wr/sim';
import { Input } from '../src/input';

/** Minimal window/target stubs: Input only needs addEventListener. */
function setup() {
  const handlers = new Map<string, (e: unknown) => void>();
  vi.stubGlobal('window', {
    addEventListener: (t: string, f: (e: unknown) => void) => handlers.set(t, f),
  });
  const g = { turn: 1, phase: 'turn', weapon: null } as unknown as Game & { turn: number };
  const input = new Input(
    () => g,
    { addEventListener() {} } as unknown as HTMLElement,
    new AbortController().signal,
  );
  const key = (type: 'keydown' | 'keyup', code: string) =>
    handlers.get(type)!({ code, repeat: false, preventDefault() {} });
  return { g, input, key };
}

describe('Input held keys', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('a key released while disabled is not stuck: the next press is sent', () => {
    const { g, input, key } = setup();
    key('keydown', 'ArrowLeft');
    expect(input.drain()).toEqual([expect.objectContaining({ t: 'move', left: true })]);
    input.enabled = false; // turn ends
    key('keyup', 'ArrowLeft');
    g.turn = 2;
    input.enabled = true;
    expect(input.drain()).toEqual([expect.objectContaining({ t: 'move', left: false })]);
    key('keydown', 'ArrowLeft');
    expect(input.drain()).toEqual([expect.objectContaining({ t: 'move', left: true })]);
  });

  it('a new turn resends the held state', () => {
    const { g, input, key } = setup();
    key('keydown', 'ArrowRight');
    input.drain();
    expect(input.drain()).toEqual([]);
    g.turn = 2;
    expect(input.drain()).toEqual([expect.objectContaining({ t: 'move', right: true })]);
  });

  it('Esc is not "any key" for the hot-seat ready command', () => {
    const { g, input, key } = setup();
    (g as { phase: string }).phase = 'ready';
    key('keydown', 'Escape');
    expect(input.drain().some((c) => c.t === 'ready')).toBe(false);
    key('keydown', 'KeyA');
    expect(input.drain().some((c) => c.t === 'ready')).toBe(true);
  });
});
