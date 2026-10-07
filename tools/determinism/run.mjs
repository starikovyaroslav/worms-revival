// Checks that the simulation produces bit-identical results in Node, Chromium, Firefox and WebKit.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const root = new URL('../../', import.meta.url);
execSync('npx vite build --config tools/determinism/vite.config.ts --logLevel warn', {
  cwd: root,
  stdio: 'inherit',
});
const bundlePath = new URL('.determinism/harness.js', root);
const code = readFileSync(bundlePath, 'utf8');

const results = {};
const t0 = Date.now();
results.node = (await import(bundlePath.href)).run();
console.log(`node      done in ${Date.now() - t0} ms`);

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const t = Date.now();
  // Chromium: use the installed Chrome rather than downloading Playwright's build.
  const browser = await type.launch(name === 'chromium' ? { channel: 'chrome' } : {});
  const page = await browser.newPage();
  await page.goto('about:blank');
  // Load the bundle as a module and run it.
  results[name] = await page.evaluate(async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const mod = await import(url);
    return mod.run();
  }, code);
  await browser.close();
  console.log(`${name.padEnd(9)} done in ${Date.now() - t} ms`);
}

const ref = JSON.stringify(results.node);
let ok = true;
for (const [name, r] of Object.entries(results)) {
  const same = JSON.stringify(r) === ref;
  ok &&= same;
  console.log(
    `${name.padEnd(9)} ${same ? 'OK ' : 'DIFF'} final hash ${r.hashes.at(-1)} health ${r.health.join(',')}`,
  );
}
if (!ok) {
  console.error('Simulation is NOT deterministic across engines');
  process.exit(1);
}
console.log('Deterministic across all engines.');
