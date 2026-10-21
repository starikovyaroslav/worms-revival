import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
await page.evaluate(()=>{window.__game.game.scheme.crateChance=100;});
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
await page.evaluate(()=>window.__game.match.input.push({t:'skip'}));
const s0=await until(page, s=>s.phase==='crate', 20000);
// hold walk left through crate end
await page.keyboard.down('ArrowLeft');
const sp = await until(page, s=>s.phase!=='crate', 20000);
console.log('crate ended after ticks', sp.tick-s0.tick, '->', sp.phase);
const x0=sp.w.x; await page.waitForTimeout(800); const x1=(await st(page)).w.x;
console.log('still holding Left after crate: x', x0, '->', x1, '(walks?)');
await page.keyboard.up('ArrowLeft');
await page.screenshot({path:'/tmp/qa_m2/u2_after_crate_ready.png'});
// Esc in ready/hot-seat prompt
await until(page, s=>s.turn===3||s.phase==='ready'||s.phase==='turn');
console.log('state', await st(page));
await browser.close();
