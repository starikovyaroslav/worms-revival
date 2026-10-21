import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
await page.evaluate(()=>{window.__game.game.scheme.crateChance=100;});
await page.keyboard.press('KeyQ'); // start turn
await page.waitForTimeout(300);
await page.evaluate(()=>window.__game.match.input.push({t:'skip'}));
const s0 = await until(page, s=>s.phase==='crate', 20000);
console.log('crate begins', s0);
const info = ()=>page.evaluate(()=>{const g=window.__game; const c=g.game.world.ofKind('crate')[0]; const cam=g.scene.camera; return {crate:c&&{x:c.x|0,y:c.y|0}, camx:cam.x|0, camy:cam.y|0, zoom:cam.zoom, us:g.scene.userScrolled, focus:g.game.focusId, crateId:c&&c.id}});
console.log(await info());
await page.screenshot({path:'/tmp/qa_m2/u2_crate_start.png'});
const t0 = s0.tick;
// during fall: select, aim, walk
await page.keyboard.press('F4'); await page.waitForTimeout(150);
let s = await st(page); console.log('after F4', s.phase, s.weapon);
await page.keyboard.press('F1'); await page.waitForTimeout(150); // bazooka? 
s = await st(page); console.log('after F1', s.phase, s.weapon);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(300); await page.keyboard.up('ArrowUp');
const a = await st(page); console.log('aim after up', a.phase, a.w.aim, 'was', s.w.aim);
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
const b = await st(page); console.log('walk', b.phase, b.w.x, 'was', a.w.x);
await page.screenshot({path:'/tmp/qa_m2/u2_crate_aim.png'});
console.log(await info());
// Right-click panel during crate
await page.mouse.click(640,360,{button:'right'}); await page.waitForTimeout(500);
await page.screenshot({path:'/tmp/qa_m2/u2_crate_panel.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
console.log('phase', (await st(page)).phase);
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
