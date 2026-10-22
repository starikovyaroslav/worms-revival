/** Exercise the actual responsive setup screen and its existing controls. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const output = 'docs/design/concepts/quiet-ui-v2';
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
    await page.getByLabel('Seed', { exact: true }).fill('42');
    await page.screenshot({ path: `${output}/menu-${width}.png`, fullPage: true });
    const bounds = await page.evaluate(() => {
      const menu = document.querySelector('.menu');
      const body = document.querySelector('.menu-body').getBoundingClientRect();
      return {
        horizontalOverflow: menu.scrollWidth > menu.clientWidth + 1,
        left: body.left,
        right: body.right,
        width: innerWidth,
      };
    });
    assert.equal(bounds.horizontalOverflow, false);
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.width + 1);
    await page.getByRole('button', { name: '+ команда', exact: true }).click();
    await page.getByRole('button', { name: '+ команда', exact: true }).click();
    await page.getByLabel('Класс команды 1').selectOption('elder');
    await page.locator('.character-roster summary').first().click();
    await page.getByLabel('Персонаж 1 команды 1').selectOption('');
    await page.locator('.modifiers-card > summary').click();
    await page.locator('.wormpot-slot').first().click();
    assert.equal(await page.locator('.team-row').count(), 4);
    assert.equal(await page.locator('.modifiers-card').getAttribute('open'), '');
    await page.getByRole('button', { name: 'Удалить команду 4', exact: true }).click();
    assert.equal(await page.locator('.team-row').count(), 3);
    await page.getByRole('button', { name: 'В бой!', exact: true }).click();
    await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
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
