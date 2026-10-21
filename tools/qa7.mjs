import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
console.log(await page.evaluate(()=>{const g=window.__game.game; return [...new Set([1,2,3,4,5,6,7,8,9,10,11,12].map(r=>r))].map(r=>r+':'+ (window.__game.game.constructor.name))[0]}));
await page.evaluate(()=>{window.__game.game.scheme.crateChance=100;});
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
await page.evaluate(()=>window.__game.match.input.push({t:'skip'}));
await until(page, s=>s.phase==='crate', 20000);
for (const k of ['F4','F1','F2','F3']) { await page.keyboard.press(k); await page.waitForTimeout(200);
  const s=await st(page); const chip=await page.evaluate(()=>document.querySelector('.hud')?.innerText.match(/Базука|[А-Яа-я ]+(?=\n)/g)); console.log(k, s.phase, s.weapon); }
await page.screenshot({path:'/tmp/qa_m2/u2_chip.png'});
console.log(await page.evaluate(()=>[...document.querySelectorAll('.hud *')].filter(e=>e.children.length===0&&/Базук|Кулак|Огнен|Гранат|Дробов/.test(e.textContent)).map(e=>e.className+':'+e.textContent)));
await browser.close();
