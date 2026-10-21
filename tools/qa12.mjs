import { open, st, ticking, until } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page);
const R = (...a)=>console.log(...a);
const dlg = ()=>page.evaluate(()=>document.querySelector('.esc-menu')?.innerText.replace(/\n/g,' | ')||null);
const foc = ()=>page.evaluate(()=>{const a=document.activeElement; return a.tagName+':'+(a.innerText||a.type||'').replace(/\n/g,' ').slice(0,30)});
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
R('menu', await dlg(), 'focus', await foc());
await page.screenshot({path:'/tmp/qa_m2/u4_menu.png'});
for (let i=0;i<6;i++){ await page.keyboard.press('Tab'); R('Tab',i,await foc()); }
for (let i=0;i<2;i++){ await page.keyboard.press('Shift+Tab'); R('ShTab',i,await foc()); }
await page.keyboard.press('ArrowDown'); R('ArrowDown', await foc());
await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); R('Up Up', await foc());
// Space/Enter on button
await page.keyboard.press('Escape'); await page.waitForTimeout(300); R('Esc closes', await dlg());
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// go to Sound via keyboard
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); R('focus', await foc());
await page.keyboard.press('Enter'); await page.waitForTimeout(300); R('sound?', await dlg(), await foc());
await page.screenshot({path:'/tmp/qa_m2/u4_sound.png'});
// slider arrow keys: focused on slider; ArrowDown is hijacked to move focus?
await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); R('slider after Left x2', await dlg());
await page.keyboard.press('ArrowDown'); R('after ArrowDown', await foc());
await page.keyboard.press('Enter'); await page.waitForTimeout(200); // mute toggle
await page.evaluate(()=>window.__game.scene.sfx.ui('turn-start'));
R('muted?', await page.evaluate(()=>{const e=window.__game.scene.sfx.engine; return e&&{g:e.master.gain.value, state:e.ctx.state}}), await page.evaluate(()=>localStorage.getItem('wr.settings')), await dlg());
await page.keyboard.press('Space'); await page.waitForTimeout(200);
R('after Space on mute btn', await page.evaluate(()=>window.__game.scene.sfx.engine.master.gain.value), 'phase', JSON.stringify((await st(page)).charging), 'fired', await page.evaluate(()=>window.__game.game.firedThisTurn));
await page.keyboard.press('Escape'); await page.waitForTimeout(200); // back to menu
await page.keyboard.press('Escape'); await page.waitForTimeout(200); // resume
R('resumed', await dlg(), (await st(page)).paused);
await page.reload(); await page.waitForTimeout(2500); await ticking(page);
R('stored after reload', await page.evaluate(()=>localStorage.getItem('wr.settings')));
await page.evaluate(()=>window.__game.scene.sfx.ui('turn-start'));
R('gain after reload', await page.evaluate(()=>{const e=window.__game.scene.sfx.engine; return e&&{g:e.master.gain.value, state:e.ctx.state}}));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.getByText('Выйти в меню').click(); await page.waitForTimeout(300);
R('quit confirm', await dlg(), await foc()); await page.screenshot({path:'/tmp/qa_m2/u4_quit.png'});
await page.keyboard.press('Escape'); await page.waitForTimeout(300); R('Esc from confirm', await dlg());
await page.getByText('Выйти в меню').click(); await page.getByText('Да, выйти').click(); await page.waitForTimeout(800);
R('menu after quit', await page.evaluate(()=>document.body.innerText.includes('В бой')));
await page.screenshot({path:'/tmp/qa_m2/u4_after_quit.png'});
await browser.close();
console.log(logs.filter(l=>!l.includes('Graphics')));
