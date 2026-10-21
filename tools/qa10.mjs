import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
const R = (...a)=>console.log(...a);
const dlg = ()=>page.evaluate(()=>document.querySelector('.esc-menu')?.innerText.replace(/\n/g,' | ')||null);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300); // start turn
// --- A: charge + Esc + release during pause
await page.keyboard.down('Space'); await page.waitForTimeout(250);
let s=await st(page); R('A charging', s.charging, s.power.toFixed(2));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
let p1=await st(page); R('A paused', p1.paused, 'power', p1.power.toFixed(2), await dlg());
await page.keyboard.up('Space'); await page.waitForTimeout(500);
let p2=await st(page); R('A power frozen', p2.power===p1.power, p2.tick===p1.tick);
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
let p3=await st(page); R('A after resume: phase', p3.phase, 'charging', p3.charging, 'power', p3.power.toFixed(2), 'fired', await page.evaluate(()=>window.__game.game.firedThisTurn));
await page.screenshot({path:'/tmp/qa_m2/u4_charge_resume.png'});
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
