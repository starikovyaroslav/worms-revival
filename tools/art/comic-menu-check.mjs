/** Exercise the actual responsive setup screen and its existing controls. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const output = 'docs/design/concepts/comic-menu-v2/live';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [],
  results = [];
try {
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
    [768, 1024],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.argv[2] ?? 'http://127.0.0.1:5174/');
    await page.getByLabel('Тема').selectOption('meadow');
    await page.locator('.map-details > summary').click();
    await page.getByLabel('Seed', { exact: true }).fill('42');
    await page.getByLabel('Seed', { exact: true }).press('Tab');
    await page.locator('.map-details > summary').click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () => document.querySelector('canvas.map-preview')?.dataset.previewKey === '42/island/meadow',
    );
    await page.evaluate(() => {
      document.activeElement?.blur();
      document.querySelector('.menu').scrollTop = 0;
    });
    await page.screenshot({ path: `${output}/menu-${width}.png`, fullPage: true });
    const bounds = await page.evaluate(() => {
      const menu = document.querySelector('.menu');
      const body = document.querySelector('.menu-stage').getBoundingClientRect();
      return {
        horizontalOverflow: menu.scrollWidth > menu.clientWidth + 1,
        left: body.left,
        right: body.right,
        width: innerWidth,
      };
    });
    assert.equal(bounds.horizontalOverflow, false);
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.width + 1);
    if (width >= 961 && height <= 800) {
      const launch = await page.getByRole('button', { name: 'В бой!', exact: true }).boundingBox();
      assert.ok(
        launch && launch.y >= 0 && launch.y + launch.height <= height,
        'Launch stays visible on short desktop',
      );
    }
    if (width === 1920) {
      for (const family of [
        'heavy',
        'soft',
        'glam',
        'dominant',
        'elder',
        'sick',
        'veteran',
        'classic',
        'nocturne',
        'mixed',
      ]) {
        await page.getByLabel('Класс команды 1').selectOption(family);
        const portrait = page.locator('.team-preview img').first();
        await portrait.evaluate((image) => image.decode());
        const state = await portrait.evaluate((image) => ({
          src: image.src,
          width: image.naturalWidth,
          height: image.naturalHeight,
        }));
        assert.ok(state.src.endsWith(`/team-previews/${family}.png`));
        assert.ok(state.width >= 1500 && state.height >= 500);
      }
      await page.getByLabel('Класс команды 1').selectOption('heavy');
    }
    await page.getByRole('button', { name: '+ команда', exact: true }).click();
    await page.getByRole('button', { name: '+ команда', exact: true }).click();
    await page.getByLabel('Класс команды 1').selectOption('elder');
    if (width >= 1280) {
      await page.evaluate(() => {
        document.activeElement?.blur();
        document.querySelector('.menu').scrollTop = 0;
      });
      await page.screenshot({ path: `${output}/menu-${width}-4teams.png` });
    }
    await page.getByRole('button', { name: 'Настроить состав команды 1', exact: true }).click();
    assert.equal(await page.locator('.character-roster').first().getAttribute('open'), '');
    assert.equal(
      await page.getByLabel('Персонаж 1 команды 1').evaluate((e) => e === document.activeElement),
      true,
    );
    await page.getByLabel('Персонаж 1 команды 1').selectOption('');
    await page.locator('.modifiers-card > summary').click();
    await page.locator('.wormpot-slot').first().click();
    assert.equal(await page.locator('.team-row').count(), 4);
    assert.equal(await page.locator('.modifiers-card').getAttribute('open'), '');
    await page.getByRole('button', { name: 'Удалить команду 4', exact: true }).click();
    assert.equal(await page.locator('.team-row').count(), 3);
    await page.getByRole('button', { name: 'В бой!', exact: true }).click();
    await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Выйти в меню', exact: true }).click();
    await page.getByRole('button', { name: 'Да, выйти', exact: true }).click();
    await page.getByRole('button', { name: 'В бой!', exact: true }).waitFor();
    results.push({ width, height, ...bounds, controls: 'passed', matchStarted: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    `${output}/menu-acceptance.json`,
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
  console.log(`Menu acceptance: ${results.length} sizes and complete setup workflows passed.`);
} finally {
  await browser.close();
}
