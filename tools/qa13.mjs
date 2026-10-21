import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
const R = (...a)=>console.log(...a);
const dlg = ()=>page.evaluate(()=>document.querySelector('.esc-menu')?.innerText.replace(/\n/g,' | ')||null);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
// Enter on Continue shouldn't jump
const y0=(await st(page)).w.y;
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.keyboard.press('Enter'); await page.waitForTimeout(800);
R('Enter on Continue: dialog', await dlg(), 'paused', (await st(page)).paused, 'worm y', y0,'->',(await st(page)).w.y, 'jumps?', await page.evaluate(()=>window.__game.game.activeWorm.state));
// Rope: select rope & fire
await page.evaluate(()=>window.__game.match.input.push({t:'select',weapon:'rope'})); await page.waitForTimeout(200);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
await page.keyboard.press('Space'); await page.waitForTimeout(600);
let s=await st(page); R('rope state', await page.evaluate(()=>({w:window.__game.game.activeWorm.state, ctl:window.__game.game.controlledId, weapon:window.__game.game.weaponId})));
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
const p1=await st(page); await page.waitForTimeout(500); const p2=await st(page);
R('rope paused frozen', p1.tick===p2.tick, p1.w.x===p2.w.x);
await page.keyboard.up('ArrowRight');
await page.screenshot({path:'/tmp/qa_m2/u4_rope_pause.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
const p3=await st(page); R('rope after resume (right released during pause) held', await page.evaluate(()=>JSON.stringify(window.__game.game.held)), 'x',p2.w.x,'->',p3.w.x, await page.evaluate(()=>window.__game.game.activeWorm.state));
// surrender confirm
await page.evaluate(()=>window.__game.match.input.push({t:'select',weapon:'surrender'})).catch(()=>{}); await page.waitForTimeout(300);
R('weapon', (await st(page)).weapon);
await page.keyboard.press('Space'); await page.waitForTimeout(400);
R('surrender dialog', await dlg(), 'paused', (await st(page)).paused); await page.screenshot({path:'/tmp/qa_m2/u4_surrender.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
R('Esc cancels surrender', await dlg(), (await st(page)).paused, 'team surrendered', await page.evaluate(()=>window.__game.game.teams.map(t=>t.surrendered)));
await page.keyboard.press('Space'); await page.waitForTimeout(300);
R('again', await dlg());
await page.keyboard.press('Space'); await page.waitForTimeout(300); // focus is first btn 'Нет, играть'?
R('Space on default', await dlg(), await page.evaluate(()=>window.__game.game.teams.map(t=>t.surrendered)));
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
