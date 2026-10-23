/** Live acceptance for the combat-comic HUD. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'docs/design/concepts/combat-comic-ui-v1/live';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [],
  results = [];
try {
  for (const [width, height, dpr, theme, teamCount = 2] of [
    [1280, 720, 1, 'meadow'],
    [1920, 1080, 1, 'meadow'],
    [1920, 1080, 2, 'arctic'],
    [2560, 1440, 1, 'hell'],
    [1280, 720, 1, 'desert'],
    [1280, 960, 1, 'meadow'],
    [1280, 720, 1, 'meadow', 4],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(base);
    await page.getByLabel('Тема').selectOption(theme);
    await page.getByLabel('Seed', { exact: true }).fill('42');
    await page.getByLabel('Seed', { exact: true }).press('Tab');
    for (let i = 2; i < teamCount; i++)
      await page.getByRole('button', { name: '+ команда', exact: true }).click();
    await page.getByRole('button', { name: 'В бой!' }).click();
    await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
    await page.evaluate(() => {
      const { match, game, scene } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      for (let i = 0; i < 120; i++) game.step();
      game.step([{ t: 'select', weapon: 'bazooka' }]);
      scene.sync();
      scene.setCrt('off');
      scene.userScrolled = true;
      scene.camera.lookAt(game.activeWorm.x, game.activeWorm.y - 40);
      const hash = game.hash();
      scene.render(1, 16);
      scene.app.render();
      if (game.hash() !== hash) throw new Error('Rendering changed simulation state');
    });
    await page.waitForFunction(
      () => document.querySelector('.hud .weapon b')?.textContent === 'Базука',
    );
    const state = await page.evaluate(() => {
      const selector = '.hud .timer-box, .hud .wind, .hud .team, .hud .weapon, .hud .hint-line';
      const panels = [...document.querySelectorAll(selector)].map((e) => {
        const r = e.getBoundingClientRect();
        return {
          name: e.className,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          background: getComputedStyle(e).backgroundImage,
        };
      });
      const overlaps = [];
      for (let i = 0; i < panels.length; i++)
        for (let j = i + 1; j < panels.length; j++) {
          const a = panels[i],
            b = panels[j];
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          )
            overlaps.push([a.name, b.name]);
        }
      const icon = document.querySelector('.hud-weapon-icon');
      return {
        visual: document.body.dataset.visual,
        panels,
        overlaps,
        inside: panels.every(
          (r) =>
            r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        ),
        iconLoaded: icon.complete && icon.naturalWidth > 0,
      };
    });
    assert.equal(state.visual, 'painted');
    assert.equal(state.inside, true);
    assert.equal(state.iconLoaded, true);
    assert.deepEqual(state.overlaps, []);
    assert.ok(
      state.panels
        .filter((p) => !p.name.includes('hint-line'))
        .every((p) => p.background.includes('/assets/comic-ui/')),
    );
    await page.screenshot({
      path: `${output}/match-${theme}-${width}x${height}-dpr${dpr}${teamCount === 4 ? '-4teams' : ''}.png`,
    });
    results.push({ width, height, dpr, theme, teamCount, ...state });
    if (width === 1280 && height === 720 && theme === 'meadow' && teamCount === 2) {
      const coverage = await page.evaluate(async () => {
        const { game } = window.__game;
        const original = game.weaponId;
        const errors = [];
        for (const weapon of game.rules.weapons) {
          game.weaponId = weapon.id;
          await new Promise(window.requestAnimationFrame);
          await new Promise(window.requestAnimationFrame);
          const panel = document.querySelector('.hud .weapon').getBoundingClientRect();
          const copy = document.querySelector('.hud-weapon-copy').getBoundingClientRect();
          if (copy.top < panel.top || copy.bottom > panel.bottom || copy.right > panel.right)
            errors.push(weapon.id);
        }
        game.weaponId = original;
        return {
          count: game.rules.weapons.length,
          overflow: errors,
          fontReady: document.fonts.check('700 16px "Comic Hand"'),
        };
      });
      assert.equal(coverage.count, 67);
      assert.deepEqual(coverage.overflow, []);
      assert.equal(coverage.fontReady, true);
      results[results.length - 1].weapons = coverage;
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/acceptance.json`, JSON.stringify({ results, errors }, null, 2) + '\n');
  console.log(
    `HUD acceptance: ${results.length} real match configurations, no overlaps or errors.`,
  );
} finally {
  await browser.close();
}
