import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
const R = (...a)=>console.log(...a);
const dlg = ()=>page.evaluate(()=>document.querySelector('.esc-menu')?.innerText.replace(/\n/g,' | ')||null);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
// B: walk key held, Esc, release in pause, resume
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.keyboard.up('ArrowRight'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
let a=await st(page); await page.waitForTimeout(1200); let b=await st(page);
R('B worm x after resume', a.w.x, '->', b.w.x, '(stuck key if changes)', 'held', await page.evaluate(()=>JSON.stringify(window.__game.game.held)));
// C: panel open + Esc
await page.mouse.click(640,360,{button:'right'}); await page.waitForTimeout(500);
R('C panel open', await page.evaluate(()=>!!document.querySelector('.weapon-panel,.panel')), 'paused', (await st(page)).paused);
await page.screenshot({path:'/tmp/qa_m2/u4_panel_open.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
R('C after Esc: menu', await dlg(), 'panel', await page.evaluate(()=>!!document.querySelector('.weapon-panel')));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
R('C second Esc -> menu', await dlg());
await page.screenshot({path:'/tmp/qa_m2/u4_menu.png'});
// D: Tab focus traps
for (let i=0;i<7;i++){ await page.keyboard.press('Tab'); const f=await page.evaluate(()=>document.activeElement?.tagName+':'+(document.activeElement?.innerText||document.activeElement?.className)); R('Tab',i,f.replace(/\n/g,' ')); }
// arrow nav
await page.keyboard.press('ArrowDown'); R('ArrowDown focus', await page.evaluate(()=>document.activeElement?.innerText));
// sound screen
await page.keyboard.press('Escape'); await page.waitForTimeout(200); R('Esc from menu -> resumed', await dlg());
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.click('text=Звук'); await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/qa_m2/u4_sound.png'});
await page.click('text=/Звук: /'); await page.waitForTimeout(200);
await page.evaluate(()=>window.__game.scene.sfx.ui('turn-start'));
R('mute gain', await page.evaluate(()=>{const e=window.__game.scene.sfx.engine; return e&&{g:e.master.gain.value, state:e.ctx.state}}), 'stored', await page.evaluate(()=>localStorage.getItem('wr.settings')));
// slider
await page.keyboard.press('Escape'); await page.waitForTimeout(200); // back to menu
await page.reload(); await page.waitForTimeout(2500);
R('after reload stored', await page.evaluate(()=>localStorage.getItem('wr.settings')));
await page.evaluate(()=>window.__game.scene.sfx.ui('turn-start'));
R('mute gain after reload', await page.evaluate(()=>{const e=window.__game.scene.sfx.engine; return e&&{g:e.master.gain.value, state:e.ctx.state}}));
await ticking(page);
// quit confirm
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.click('text=Выйти в меню'); await page.waitForTimeout(300);
R('quit confirm', await dlg()); await page.screenshot({path:'/tmp/qa_m2/u4_quit.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(300); R('Esc from confirm', await dlg());
await page.click('text=Выйти в меню'); await page.click('text=Да, выйти'); await page.waitForTimeout(800);
R('menu after quit', await page.evaluate(()=>document.body.innerText.includes('В бой')), 'game', await page.evaluate(()=>!!window.__game));
await page.screenshot({path:'/tmp/qa_m2/u4_after_quit.png'});
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
