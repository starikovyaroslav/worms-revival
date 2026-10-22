/** Static approval-page QA. Does not start or mutate a game. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { root } from './ingest.mjs';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const output = resolve(root, 'assets-in/previews/skins');
  mkdirSync(output, { recursive: true });
  for (const [name, count] of [
    ['worm-skins-v1', 8],
    ['worm-skins-v2', 8],
    ['worm-skins-all', 16],
  ]) {
    await page.goto(pathToFileURL(resolve(root, 'docs/design/concepts', `${name}.html`)).href);
    const images = await page.locator('img').evaluateAll((nodes) =>
      nodes.map((im) => ({
        loaded: im.complete && im.naturalHeight === 192,
        height: im.height,
      })),
    );
    assert.equal(images.length, count * 3, name);
    assert.ok(
      images.every((im) => im.loaded),
      `${name}: all cropped PNGs load`,
    );
    assert.equal(images.filter((im) => im.height === 32).length, count, `${name}: 32 px`);
    assert.equal(images.filter((im) => im.height === 48).length, count, `${name}: 48 px`);
    assert.equal(await page.locator('article').count(), count);
    await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
    console.log(`${name}: ${count} concepts, ${images.length} images loaded; 32/48 px verified`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
