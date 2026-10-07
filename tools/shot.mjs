// Screenshots the running client with scripted input.
// Usage: node tools/shot.mjs <url> <out.png> [actions] [waitMs]
// actions, separated by ";" (e:expr evaluates JS and logs it, r:x,y right-clicks):  c:x,y (click)  s:x,y (shift+click)  h:Key:ms (hold key)
//                             p:Key (press key)  w:ms (wait)  shot:path.png (extra screenshot)
import { chromium } from 'playwright';

const [url, out, actions = '', wait = '1500'] = process.argv.slice(2);
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
for (const action of actions.split(';').filter(Boolean)) {
  const [kind, a, b] = action.split(':');
  if (kind === 'c' || kind === 's') {
    const [x, y] = a.split(',').map(Number);
    if (kind === 's') await page.keyboard.down('Shift');
    await page.mouse.click(x, y);
    if (kind === 's') await page.keyboard.up('Shift');
  } else if (kind === 'r') {
    const [x, y] = a.split(',').map(Number);
    await page.mouse.click(x, y, { button: 'right' });
  } else if (kind === 'h') {
    await page.keyboard.down(a);
    await page.waitForTimeout(Number(b));
    await page.keyboard.up(a);
  } else if (kind === 'p') {
    await page.keyboard.press(a);
  } else if (kind === 'w') {
    await page.waitForTimeout(Number(a));
  } else if (kind === 'e') {
    logs.push(`[eval] ${a} => ${JSON.stringify(await page.evaluate(a))}`);
  } else if (kind === 'shot') {
    await page.screenshot({ path: a });
  }
  await page.waitForTimeout(50);
}
await page.waitForTimeout(300);
await page.screenshot({ path: out });
console.log(logs.filter((l) => !l.includes('[vite]') && !l.includes('404')).join('\n'));
await browser.close();
