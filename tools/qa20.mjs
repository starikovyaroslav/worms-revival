import { open, st, ticking, until } from './qa_lib.mjs';
const R=(...a)=>console.log(...a);
const { browser, page, logs } = await open('http://localhost:5231/');
page.on('dialog', d=>{R('alert:', d.message()); d.dismiss();});
const dlg = ()=>page.evaluate(()=>document.querySelector('.esc-menu')?.innerText.replace(/\n/g,' | ')||null);
for (const f of ['v3.wrr','garbage.wrr']) {
  await page.setInputFiles('input[type=file]', '/tmp/qa_m2/'+f); await page.waitForTimeout(1000);
  R(f, 'body msg:', await page.evaluate(()=>document.body.innerText.slice(0,0)), 'in game?', await page.evaluate(()=>!!window.__game && !!document.querySelector('.replay-bar')));
  await page.screenshot({path:'/tmp/qa_m2/replay_'+f+'.png'});
}
await page.setInputFiles('input[type=file]', '/tmp/qa_m2/r0.wrr'); await page.waitForTimeout(1500); await ticking(page);
R('replay bar', await page.evaluate(()=>!!document.querySelector('.replay-bar')));
await page.waitForTimeout(2000);
const a=await st(page); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
const b=await st(page); await page.waitForTimeout(800); const c=await st(page);
R('Esc in replay:', await dlg(), 'frozen', b.tick===c.tick, 'ticks before', b.tick-a.tick);
await page.keyboard.press('Escape'); await page.waitForTimeout(1500); const d=await st(page); R('resumed progress', d.tick-c.tick);
await page.getByText('4×').click(); await page.waitForTimeout(3000);
const e=await st(page); R('speed 4x ticks in 3s', (await st(page)).tick-d.tick);
// finish: poll for gameover with long timeout in-page
await page.evaluate(()=>window.__game.match.setSpeed(8));
await until(page, s=>s.phase==='gameover', 900000).catch(x=>R('no gameover', x.message));
await page.waitForTimeout(500);
R('verified', await page.evaluate(()=>window.__game.match.replayVerified), 'tick', (await st(page)).tick);
await page.screenshot({path:'/tmp/qa_m2/replay_end2.png'});
await browser.close(); console.log(logs.filter(l=>!l.includes('Graphics')&&!l.includes('BindGroup')));
