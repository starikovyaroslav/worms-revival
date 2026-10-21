// Browser integration: start Vite first. Tests actual consumers, not just files in a manifest.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/arsenal';
mkdirSync(output, { recursive: true });
const sources = JSON.parse(readFileSync(new URL('./arsenal-sources.json', import.meta.url)));
const icons = sources.flatMap((s) => s.cells).filter((c) => c.id.startsWith('weapons/icon/'));
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`${url}?seed=42&scheme=arsenal`);
  await page.waitForFunction(() => window.__game?.scene.terrainView.art);
  await page.evaluate(() => {
    window.__game.match.setPaused(true);
    window.__game.match.loop.stop();
    window.__game.scene.setCrt('off');
  });
  await page.locator('#game canvas').click({ button: 'right', position: { x: 100, y: 100 } });
  await page.locator('.weapon-panel').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.weapon-panel .slot-img').count(), 67);
  assert.equal(await page.locator('.weapon-panel .slot-icon').count(), 0);
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.weapon-panel img')];
    return images.length === 67 && images.every((im) => im.complete && im.naturalWidth > 0);
  });
  const loaded = await page
    .locator('.weapon-panel img')
    .evaluateAll((images) => images.every((im) => im.complete && im.naturalWidth > 0));
  assert.ok(loaded);
  for (const id of icons.map((c) => c.id.split('/').at(-1))) {
    const img = page.locator(`.slot-img[src*="/assets/arsenal/weapons/icon/${id}.png"]`);
    assert.equal(await img.count(), 1, id);
    assert.equal(await img.evaluate((im) => getComputedStyle(im).mixBlendMode), 'normal');
  }
  await page.screenshot({ path: `${output}/panel-1280x720.png` });
  for (const viewport of [
    { width: 960, height: 540 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      window.__game.match.loop.start();
      return new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => {
            window.__game.match.loop.stop();
            resolve();
          }),
        ),
      );
    });
    const panel = await page.locator('.weapon-panel').boundingBox();
    assert.ok(
      panel &&
        panel.x >= 0 &&
        panel.y >= 0 &&
        panel.x + panel.width <= viewport.width + 1 &&
        panel.y + panel.height <= viewport.height + 1,
    );
    await page.screenshot({ path: `${output}/panel-${viewport.width}x${viewport.height}.png` });
  }
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 720 });

  async function inspectWorld(target, fallback = false) {
    return target.evaluate(async (fallback) => {
      const entries = window.performance.getEntriesByType('resource').map((e) => e.name);
      const sim = await import(
        entries.find((s) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(s))
      );
      const render = await import(
        entries.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
      );
      const { game, scene, match } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      const w = game.activeWorm,
        x = w.x,
        y = w.y - 50;
      scene.userScrolled = true;
      scene.camera.level = 2;
      scene.camera.lookAt(x, y);
      const looks = [
        'meteor',
        'vase',
        'shard',
        'bullet',
        'mbbomb',
        'dragonball',
        'napalm',
        'carpet',
        'letter',
        'frenchsheep',
      ];
      const projectiles = looks.map((look, i) =>
        game.world.spawn(
          new sim.Projectile(x - 65 + (i % 5) * 32, y - 25 + Math.floor(i / 5) * 32, 0, 0, {
            look,
            radius: 2,
            wind: 0,
            impact: 'bounce',
            fuse: 1000,
            blast: { damage: 0 },
          }),
        ),
      );
      const jet = game.world.spawn(new sim.JetPack(w.id));
      jet.thrusting = true;
      const flame = game.world.spawn(new sim.Flame(x + 65, y + 35, 0, 0, 100));
      scene.render(1, 0);
      scene.app.render();
      const results = projectiles.map((p) => {
        const v = scene.entities.get(p.id);
        return {
          look: p.look,
          generated:
            !!v.art &&
            v.art.texture ===
              render.assets.get(
                !fallback && p.look === 'letter'
                  ? 'vfx/letter_0'
                  : render.GENERATED_PROJECTILES[p.look],
              ),
        };
      });
      const jv = scene.entities.get(jet.id),
        fv = scene.entities.get(flame.id);
      const before = fv.art?.texture;
      fv.update(1, 100);
      scene.app.render();
      return {
        projectiles: results,
        jet: !!jv.art,
        thrust: jv.exhaust?.visible ?? false,
        flame: !!fv.art,
        flameAnimated: !!before && fv.art.texture !== before,
        fallback,
      };
    }, fallback);
  }
  const art = await inspectWorld(page);
  assert.ok(art.projectiles.every((p) => p.generated));
  assert.ok(art.jet && art.thrust && art.flame && art.flameAnimated);
  await page.screenshot({ path: `${output}/world-in-game.png` });
  await page.evaluate(() => {
    window.__game.scene.setCrt('strong');
    window.__game.scene.app.render();
  });
  await page.screenshot({ path: `${output}/world-crt.png` });
  assert.deepEqual(errors, []);

  // A genuinely independent page with the supplemental pack unavailable.
  const fallback = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const fallbackErrors = [];
  fallback.on('pageerror', (e) => fallbackErrors.push(e.message));
  await fallback.route('**/assets/arsenal/manifest.json*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await fallback.route('**/assets/vfx/manifest.json*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await fallback.route('**/assets/military/manifest.json*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await fallback.goto(`${url}?seed=42&scheme=arsenal`);
  await fallback.waitForFunction(() => window.__game?.scene.terrainView.art);
  const old = await inspectWorld(fallback, true);
  assert.ok(old.projectiles.every((p) => !p.generated));
  assert.ok(!old.jet && !old.flame);
  assert.deepEqual(fallbackErrors, []);
  console.log(
    JSON.stringify(
      { icons: 67, added: icons.length, art, fallback: 'passed', screenshots: output },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
