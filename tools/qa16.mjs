import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
const R = (...a)=>console.log(...a);
const info = ()=>page.evaluate(()=>JSON.stringify({ph:window.__game.game.phase, ctl:window.__game.game.controlledId, ws:window.__game.game.activeWorm.state, x:Math.round(window.__game.game.activeWorm.x), y:Math.round(window.__game.game.activeWorm.y), held:window.__game.game.held, paused:window.__game.match.isPaused, tick:window.__game.game.world.tick, fired:window.__game.game.firedThisTurn}));
await page.keyboard.press('KeyQ'); await page.waitForTimeout(500);
await page.evaluate(()=>window.__game.match.input.push({t:'select',weapon:'rope'})); await page.waitForTimeout(300);
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(150); await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
await page.keyboard.press('Enter'); await page.waitForTimeout(120);
await page.keyboard.press('Space'); await page.waitForTimeout(300);
R('after rope fire', await info());
if (JSON.parse(await info()).ctl) {
 await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300);
 await page.keyboard.press('Escape'); await page.waitForTimeout(300);
 const a=await info(); await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp'); const b=await info();
 R('paused', a, '\n', b);
 await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
 R('resumed', await info());
}
await page.screenshot({path:'/tmp/qa_m2/u4_rope_pause.png'});
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
