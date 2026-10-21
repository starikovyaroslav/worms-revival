// Real WebGL smoke test; start Vite first. Screenshots are ignored review artifacts.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/crt';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  for (const dpr of [1, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(`${url}?seed=42&theme=meadow`);
    await page.waitForFunction(() => window.__game?.scene.terrainView.art);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const { scene, match, game } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      scene.userScrolled = true;
      scene.camera.level = 1;
      scene.camera.lookAt(game.activeWorm.x, game.activeWorm.y - 40);
      scene.render(1, 0);
    });
    const images = [];
    const tick = await page.evaluate(() => window.__game.game.world.tick);
    for (const mode of ['off', 'soft', 'medium', 'strong']) {
      const state = await page.evaluate((mode) => {
        const { scene, game } = window.__game;
        scene.setCrt(mode);
        scene.app.render();
        return {
          tick: game.world.tick,
          passes: scene.picture.filters?.length ?? 0,
          labelsOutside: scene.labelLayer.parent !== scene.picture,
          aimOutside: scene.aimLayer.parent !== scene.picture,
        };
      }, mode);
      assert.equal(state.passes, mode === 'off' ? 0 : 1);
      assert.equal(state.tick, tick, 'Changing a visual preset does not advance the simulation');
      assert.ok(state.labelsOutside && state.aimOutside);
      const png = await page.screenshot(dpr === 1 ? { path: `${output}/${mode}.png` } : {});
      assert.deepEqual(errors, [], `No WebGL compilation or runtime errors in ${mode}`);
      images.push(createHash('sha256').update(png).digest('hex'));
    }
    assert.equal(new Set(images).size, 4, 'Each preset changes actual rendered pixels');

    const shock = await page.evaluate(() => {
      const { scene } = window.__game;
      scene.post.shockwave(640, 360, 1);
      scene.post.update(200);
      scene.app.render();
      const during = scene.app.stage.filters.length;
      scene.post.update(2000);
      scene.app.render();
      return { during, after: scene.app.stage.filters.length, crt: scene.picture.filters.length };
    });
    assert.deepEqual(shock, { during: 2, after: 1, crt: 1 });

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Графика', exact: true }).click();
    for (const [label, mode] of [
      ['Выключен', 'off'],
      ['Выраженный', 'strong'],
      ['Средний', 'medium'],
      ['Мягкий', 'soft'],
    ]) {
      const button = page.getByRole('button', { name: label, exact: true });
      await button.click();
      await page.evaluate(() => window.__game.scene.app.render());
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(
        await page.evaluate(() => JSON.parse(window.localStorage.getItem('wr.settings')).crtMode),
        mode,
      );
      assert.equal(
        await page.evaluate(() => window.__game.scene.picture.filters?.length ?? 0),
        mode === 'off' ? 0 : 1,
      );
    }
    for (const size of [
      { width: 960, height: 540 },
      { width: 1600, height: 900 },
    ]) {
      await page.setViewportSize(size);
      const area = await page.evaluate(() => {
        const { scene, match } = window.__game;
        match.loop.start();
        return new Promise((resolve) => {
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => {
              match.loop.stop();
              const { width, height } = scene.picture.filterArea;
              resolve({ width, height });
            }),
          );
        });
      });
      assert.deepEqual(area, size);
    }
    if (dpr === 1) await page.screenshot({ path: `${output}/settings.png` });
    await page.getByRole('button', { name: 'Выключен', exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene.terrainView.art);
    assert.equal(await page.evaluate(() => window.__game.scene.picture.filters?.length ?? 0), 0);
    // Tear down and start another match: filters must not survive their scene or break cleanup.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Выйти в меню', exact: true }).click();
    await page.getByRole('button', { name: 'Да, выйти', exact: true }).click();
    await page.getByRole('button', { name: 'В бой!', exact: true }).click();
    await page.waitForFunction(() => window.__game?.scene.terrainView.art);
    assert.equal(await page.evaluate(() => window.__game.scene.picture.filters?.length ?? 0), 0);
    console.log(
      `CRT: presets, shockwave, UI, resize, persistence and teardown passed at DPR ${dpr}`,
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
