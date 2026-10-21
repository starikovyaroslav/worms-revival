import { open, st, ticking } from './qa_lib.mjs';
const seed = process.argv[2]||'3';
const { browser, page, logs } = await open(`http://localhost:5231/?seed=${seed}&cpu=3`);
await ticking(page);
await page.evaluate(()=>window.__game.match.setSpeed(4));
// in-page phase recorder per tick via polling raf
await page.evaluate(()=>{ const g=window.__game.game; const rec={}; window.__rec=rec; let last=''; let startTick=0; const seg=[]; rec.seg=seg;
 const poll=()=>{ const k=g.phase; if(k!==last){ if(last) seg.push([last,g.world.tick-startTick,g.turn]); last=k; startTick=g.world.tick;} requestAnimationFrame(poll)}; poll(); });
const t0=Date.now(); let shot=0;
while(Date.now()-t0<1700000){ const s=await st(page); if(s.phase==='gameover') break; await page.waitForTimeout(1000);
 if(s.phase==='dying'&&!shot){shot=1;await page.screenshot({path:'/tmp/qa_m2/dying.png'});} }
const s=await st(page); console.log('final', s.phase, s.turn, (Date.now()-t0)/1000);
const seg=await page.evaluate(()=>window.__rec.seg);
const by={}; for(const [p,t] of seg){(by[p]??=[]).push(t)}
for(const p in by){const a=by[p].sort((x,y)=>x-y); console.log(p,'n',a.length,'max s',(a.at(-1)/50).toFixed(2),'median s',(a[a.length>>1]/50).toFixed(2));}
await page.screenshot({path:'/tmp/qa_m2/gameover_seed'+seed+'.png'});
console.log(logs.filter(l=>!l.includes('Graphics')));
await browser.close();
