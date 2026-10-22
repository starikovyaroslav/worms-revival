/** Validate the offline pilot, its HTML HUD and the exact production CRT shader. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { readImage } from './ingest.mjs';

const dir = 'docs/design/concepts/visual-pilot-v2';
const output = 'assets-in/previews/visual-pilot-v2';
mkdirSync(output, { recursive: true });
const art = readImage(resolve(dir, 'meadow-pilot.png'));
assert.ok(art.w >= 1280 && art.h >= 720, 'Native desktop-sized master');
assert.ok(Math.abs(art.w / art.h - 16 / 9) < 0.02, 'Landscape gameplay composition');
const source = readFileSync('packages/render/src/crt.ts', 'utf8').match(
  /const fragment = `([\s\S]*?)`;/,
)[1];
const review = readFileSync(resolve(dir, 'review.html'), 'utf8');
assert.ok(review.includes(JSON.stringify(source)), 'Exact production shader is embedded');
assert.ok(!/__GAME_|__PILOT_IMAGE__|__BEFORE_IMAGE__/.test(review));
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [],
  results = [];
try {
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 1952, height: 1300 },
      deviceScaleFactor: dpr,
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(resolve(dir, 'review.html')).href);
    await page.waitForFunction(() => document.getElementById('stage').dataset.ready === 'pilot');
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width: width + 32, height: (width * 9) / 16 + 260 });
      await page.locator('#size').selectOption(String(width));
      const states = {};
      for (const crt of ['off', 'soft', 'medium', 'strong']) {
        await page.locator('#crt').selectOption(crt);
        const state = await page.evaluate(() => {
          const stage = document.getElementById('stage'),
            canvas = document.getElementById('world');
          const bounds = stage.getBoundingClientRect();
          const outside = [...document.querySelectorAll('.panel')].some((panel) => {
            const b = panel.getBoundingClientRect();
            return (
              b.left < bounds.left ||
              b.top < bounds.top ||
              b.right > bounds.right ||
              b.bottom > bounds.bottom
            );
          });
          return {
            width: stage.clientWidth,
            height: stage.clientHeight,
            backing: [canvas.width, canvas.height],
            error: stage.dataset.error ?? null,
            outside,
            image: canvas.toDataURL(),
            smallText: parseFloat(
              getComputedStyle(document.querySelector('.weapon small')).fontSize,
            ),
          };
        });
        assert.equal(state.error, null);
        assert.equal(state.width, width);
        assert.equal(state.height, (width * 9) / 16);
        assert.deepEqual(state.backing, [width * dpr, ((width * 9) / 16) * dpr]);
        assert.ok(!state.outside, 'HUD panels stay inside game frame');
        assert.ok(state.smallText >= 10, 'HUD text remains legible at desktop sizes');
        states[crt] = createHash('sha256').update(state.image).digest('hex');
        if (dpr === 1 && ['off', 'soft'].includes(crt))
          await page.locator('#stage').screenshot({ path: `${output}/pilot-${width}-${crt}.png` });
      }
      assert.equal(
        new Set(Object.values(states)).size,
        4,
        'Each real CRT preset changes rendered pixels',
      );
      await page.locator('#hud').uncheck();
      assert.ok(await page.locator('#overlay').isHidden());
      await page.locator('#hud').check();
      assert.ok(await page.locator('#overlay').isVisible());
      results.push({
        width,
        dpr,
        presets: Object.keys(states),
        hud: 'inside',
        smallText: '>=10 CSS px',
      });
    }
    await page.locator('#crt').selectOption('off');
    await page.locator('#variant').selectOption('before');
    assert.ok(await page.locator('#overlay').isHidden());
    assert.ok(await page.locator('#hud').isDisabled());
    if (dpr === 1)
      await page.locator('#stage').screenshot({ path: `${output}/before-1920-off.png` });
    await page.locator('#variant').selectOption('pilot');
    assert.ok(await page.locator('#overlay').isVisible());
    await page.close();
  }
  assert.deepEqual(errors, []);
  const report = {
    nativePixels: [art.w, art.h],
    shader: 'production source and presets',
    scenarios: results,
    errors,
    screenshots: output,
  };
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
