// Simulation benchmark: ticks per second of a bot-played 8-worm arsenal match (Game.step only;
// bot thinking is excluded from the timing). Run: `node tools/bench-sim.mjs [ticks=20000] [runs=5]`.
// The printed hash must not change across pure performance work.
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const ticks = Number(process.argv[2] ?? 20000);
const runs = Number(process.argv[3] ?? 5);
const outDir = fileURLToPath(new URL('.bench/', root));
await build({
  root: fileURLToPath(root),
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    lib: { entry: fileURLToPath(new URL('bench/sim-bench.entry.ts', import.meta.url)), formats: ['es'], fileName: 'bench' },
  },
});
const { run } = await import(new URL('bench.js', `file://${outDir}`).href);
run(300); // warm-up
for (let i = 0; i < runs; i++) {
  const { ms, hash } = run(ticks);
  console.log(`run ${i + 1}: ${((ticks / ms) * 1000).toFixed(0)} ticks/s, ${(ms / ticks).toFixed(3)} ms/tick, hash ${hash}`);
}
