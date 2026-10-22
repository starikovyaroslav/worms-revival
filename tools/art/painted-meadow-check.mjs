/** Real match acceptance, separate from the non-playable concept reviewer. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/painted-meadow';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [],
  results = [];
try {
  for (const width of [1280, 1920])
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({
        viewport: { width, height: (width * 9) / 16 },
        deviceScaleFactor: dpr,
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}?visual=painted`);
      await page.getByLabel('Тема').selectOption('meadow');
      await page.getByLabel('Seed', { exact: true }).fill('42');
      await page.getByLabel('Класс команды 1').selectOption('heavy');
      await page.getByLabel('Класс команды 2').selectOption('elder');
      await page.getByRole('button', { name: 'В бой!' }).click();
      await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
      const state = await page.evaluate(async () => {
        const { scene, match, game } = window.__game;
        match.setPaused(true);
        match.loop.stop();
        // Let spawn physics settle before judging foot contacts and equipment.
        for (let i = 0; i < 120; i++) game.step();
        game.step([{ t: 'select', weapon: 'bazooka' }]);
        scene.sync();
        const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
        const render = await import(
          urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
        );
        window.__paintedReview = render;
        const w = game.activeWorm;
        scene.userScrolled = true;
        scene.camera.lookAt(w.x, w.y - 40);
        const hash = game.hash();
        scene.render(1, 16);
        const renderingIsCosmetic = game.hash() === hash;
        const originalLevel = scene.camera.level;
        const originalSize = scene.worms.get(w.id).container.width;
        scene.camera.level = 1;
        scene.render(1, 16);
        const footprintUnchanged = scene.worms.get(w.id).container.width === originalSize;
        scene.camera.level = originalLevel;
        scene.render(1, 16);
        const panelBounds = [...document.querySelectorAll('.hud .px-panel')].map((e) =>
          e.getBoundingClientRect(),
        );
        return {
          visual: document.body.dataset.visual,
          ready: render.paintedMeadowReady(),
          zoom: scene.camera.level,
          renderingIsCosmetic,
          footprintUnchanged,
          skins: [...scene.worms.values()].map((v) => v.skinActor?.id),
          panelsInside: panelBounds.every(
            (r) =>
              r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          ),
          paintedSampling: render.assets.get('painted/bg/meadow/sky').source.scaleMode,
        };
      });
      assert.equal(state.visual, 'painted');
      assert.equal(state.ready, true);
      assert.equal(state.zoom, 2);
      assert.equal(state.renderingIsCosmetic, true);
      assert.equal(state.footprintUnchanged, true);
      assert.equal(state.panelsInside, true);
      assert.equal(state.paintedSampling, 'linear');
      assert.ok(state.skins.every(Boolean));
      for (const crt of ['off', 'soft']) {
        await page.evaluate((crt) => {
          window.__game.scene.setCrt(crt);
          window.__game.scene.app.render();
        }, crt);
        await page.screenshot({ path: `${output}/${width}-dpr${dpr}-${crt}.png` });
      }
      const crater = await page.evaluate(() => {
        const { scene, game } = window.__game,
          t = game.world.terrain,
          w = game.activeWorm;
        const before = game.hash();
        const removed = t.carveCircle(w.x + 22, w.y + 15, 24);
        const after = game.hash();
        const checksum = () => {
          let h = 2166136261;
          for (const chunk of scene.terrainView.chunks)
            for (const b of chunk.pixels) h = Math.imul(h ^ b, 16777619);
          return h >>> 0;
        };
        scene.terrainView.update();
        const incremental = checksum();
        scene.terrainView.redrawAll();
        const full = checksum();
        const maskUnchanged = game.hash() === after;
        scene.camera.lookAt(w.x + 22, w.y - 25);
        scene.render(1, 16);
        scene.effects.clips.play('blast', w.x + 22, w.y - 25, { width: 64, life: 0.55 });
        scene.effects.clips.play('smoke', w.x + 45, w.y - 60, { width: 40, life: 1 });
        scene.effects.clips.update(180);
        scene.setCrt('off');
        scene.app.render();
        return {
          removed,
          hashChanged: before !== after,
          maskUnchanged,
          incrementalMatchesFull: incremental === full,
          activeClips: scene.effects.clips.activeCount,
        };
      });
      assert.ok(crater.removed > 0);
      assert.equal(crater.hashChanged, true);
      assert.equal(crater.maskUnchanged, true);
      assert.equal(crater.incrementalMatchesFull, true);
      assert.equal(crater.activeClips, 2);
      await page.screenshot({ path: `${output}/${width}-dpr${dpr}-crater-effects.png` });
      const water = await page.evaluate(() => {
        const { scene, game } = window.__game;
        const hash = game.hash();
        scene.camera.lookAt(game.activeWorm.x, game.world.waterLevel - 45);
        scene.render(1, 16);
        scene.app.render();
        return {
          back: !!scene.water.paintedBack,
          front: !!scene.water.paintedFront,
          hashUnchanged: hash === game.hash(),
        };
      });
      assert.deepEqual(water, { back: true, front: true, hashUnchanged: true });
      await page.screenshot({ path: `${output}/${width}-dpr${dpr}-water.png` });
      results.push({ width, dpr, ...state, crater, water });
      await page.close();
    }
  for (const scenario of ['normal', 'other-biome', 'missing-pack']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(e.message));
    if (scenario === 'missing-pack')
      await page.route('**/painted-meadow/manifest.json*', (r) => r.abort());
    await page.goto(
      `${base}?seed=42&theme=${scenario === 'other-biome' ? 'desert' : 'meadow'}${scenario === 'normal' ? '' : '&visual=painted'}`,
    );
    await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
    const fallback = await page.evaluate(() => ({
      visual: document.body.dataset.visual,
      zoom: window.__game.scene.camera.level,
    }));
    assert.deepEqual(fallback, { visual: 'pixel', zoom: 1 });
    if (scenario === 'normal')
      assert.equal(
        await page.evaluate(() =>
          window.performance
            .getEntriesByType('resource')
            .some((e) => e.name.includes('/painted-meadow/')),
        ),
        false,
      );
    results.push({ scenario, ...fallback });
    await page.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/report.json`, JSON.stringify({ results, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
