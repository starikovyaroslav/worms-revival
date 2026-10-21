import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/');
const sels = await page.$$('select');
await sels[3].selectOption({ label: 'CPU ★★★' });
await page.click('text=В бой!');
await ticking(page);
const log=[]; let lastKey='';
const t0=Date.now();
// sample phases; during CPU turn mash keys
for (let i=0;i<400;i++){
  const s=await st(page);
  const cpu = await page.evaluate(()=>{const g=window.__game.game; const t=g.teams[g.activeTeam]; return !!t.cpu});
  const k=`${s.turn}:${s.phase}:${cpu?'cpu':'hum'}:hs=${s.hs}:waits=${s.waits}`;
  if(k!==lastKey){log.push(`${((Date.now()-t0)/1000).toFixed(1)}s tick${s.tick} ${k} timer${s.timer}`);lastKey=k;}
  if (s.turn===1 && s.phase==='ready' && !cpu && i===5) await page.screenshot({path:'/tmp/qa_m2/u1_hvc_ready.png'});
  if (s.phase==='ready' && !cpu) { await page.keyboard.press('ArrowLeft'); }
  if (cpu) { await page.keyboard.press('Space'); await page.keyboard.down('ArrowRight'); await page.keyboard.press('F4'); await page.keyboard.press('Enter'); await page.keyboard.up('ArrowRight'); }
  if (s.turn>=5) break;
  await page.waitForTimeout(250);
}
console.log(log.join('\n'));
console.log(logs.filter(l=>!l.includes('Graphics')));
await browser.close();
