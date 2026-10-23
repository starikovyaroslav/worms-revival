import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TICK_MS } from '@wr/sim';
import { FixedLoop } from '../src/loop';
import { WormReactions, wormPresentationSeconds } from '@wr/render';

/** Drives FixedLoop with a fake clock: each `frame(ms)` advances time and runs one animation frame. */
function harness() {
  let now = 0;
  let cb: ((t: number) => void) | null = null;
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => {
    cb = f;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const steps = { n: 0 };
  const renders: { alpha: number; dt: number }[] = [];
  const loop = new FixedLoop(
    () => steps.n++,
    (alpha, dt) => renders.push({ alpha, dt }),
  );
  loop.start();
  const frame = (ms: number) => {
    now += ms;
    cb?.(now);
  };
  return { loop, steps, renders, frame };
}

describe('FixedLoop pause', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not step while paused, still draws, and does not catch up on resume', () => {
    const { loop, steps, renders, frame } = harness();
    for (let i = 0; i < 10; i++) frame(TICK_MS);
    const before = steps.n;
    expect(before).toBeGreaterThanOrEqual(9);

    loop.paused = true;
    for (let i = 0; i < 100; i++) frame(100);
    expect(steps.n).toBe(before);
    expect(renders.at(-1)).toEqual({ alpha: renders.at(-1)!.alpha, dt: 0 });

    loop.paused = false;
    frame(TICK_MS);
    // Ten seconds of pause cost nothing: one frame's worth of ticks, not 500.
    expect(steps.n - before).toBeLessThanOrEqual(2);
  });

  it('a pause leaves the tick count where a run without pause would have it', () => {
    const run = (pauseFrames: number) => {
      const { loop, steps, frame } = harness();
      for (let i = 0; i < 50; i++) frame(TICK_MS);
      loop.paused = true;
      for (let i = 0; i < pauseFrames; i++) frame(TICK_MS);
      loop.paused = false;
      for (let i = 0; i < 50; i++) frame(TICK_MS);
      return steps.n;
    };
    expect(run(200)).toBe(run(0));
  });

  it('drives motion from the same interpolated simulation time at different FPS/speeds and on pause', () => {
    for (const hz of [30, 60, 144])
      for (const speed of [0.25, 1, 2]) {
        const { loop, steps, renders, frame } = harness();
        loop.speed = speed;
        const reaction = new WormReactions();
        reaction.handle({
          type: 'worm-motion',
          wormId: 1,
          tick: 0,
          sequence: 0,
          x: 0,
          y: 0,
          motion: { kind: 'impulse', vx: 2, vy: -5 },
        });
        const air = { health: 100, state: 'airborne' as const, blasted: true };
        const duration = 380 / speed;
        let elapsed = 0;
        while (elapsed < duration - 1e-8) {
          const dt = Math.min(1000 / hz, duration - elapsed);
          frame(dt);
          elapsed += dt;
          reaction.update(air, wormPresentationSeconds(steps.n, renders.at(-1)!.alpha));
        }
        const time = wormPresentationSeconds(steps.n, renders.at(-1)!.alpha);
        expect(time).toBeCloseTo(0.36, 10);
        expect(reaction.update(air, time)?.frame).toBe(3);
        loop.paused = true;
        for (let i = 0; i < 5; i++) frame(100);
        expect(wormPresentationSeconds(steps.n, renders.at(-1)!.alpha)).toBe(time);
        expect(reaction.update(air, time)?.frame).toBe(3);
        loop.stop();
      }
  });
});
