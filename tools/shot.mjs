// Usage: node tools/shot.mjs <url> <out.png> [clicks as "x,y;x,y"] [waitMs]
import { chromium } from 'playwright';

const [url, out, clicks = '', wait = '1500'] = process.argv.slice(2);
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForTimeout(Number(wait));
for (const c of clicks.split(';').filter(Boolean)) {
  const [x, y] = c.split(',').map(Number);
  await page.mouse.click(x, y);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(300);
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
