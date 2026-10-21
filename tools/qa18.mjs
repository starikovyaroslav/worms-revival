import { open, st, ticking } from './qa_lib.mjs';
const R=(...a)=>console.log(...a);
const { browser, page, logs } = await open('http://localhost:5231/?seed=1');
await ticking(page); await page.keyboard.press('KeyQ'); await page.waitForTimeout(400);
const cam=()=>page.evaluate(()=>{const c=window.__game.scene.camera; const w=window.__game.game.activeWorm; const p=c.toScreen(w.x,w.y); return {cx:Math.round(c.x),cy:Math.round(c.y),us:window.__game.scene.userScrolled,wormScreen:[Math.round(p.x),Math.round(p.y)],following:c.isFollowing, phase:window.__game.game.phase}});
const drag=async(dx,dy)=>{ await page.mouse.move(640,360); await page.mouse.down(); for(let k=1;k<=10;k++) await page.mouse.move(640+dx*k/10,360+dy*k/10); await page.mouse.up(); await page.waitForTimeout(100); };
R('start', await cam());
await drag(300,150); R('after drag', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_dragged.png'});
await page.keyboard.press('KeyC'); await page.waitForTimeout(1200); R('after C', await cam());
await drag(-300,100); await page.keyboard.press('Home'); await page.waitForTimeout(1200); R('after Home', await cam());
await drag(300,-100); await page.mouse.dblclick(640,360); await page.waitForTimeout(1200); R('after dblclick', await cam());
await drag(300,100); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(1200); R('after walk', await cam());
await drag(300,100); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(1200); R('after aim', await cam());
await drag(300,100); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); R('after jump', await cam());
await drag(300,100); await page.keyboard.press('F4'); await page.waitForTimeout(800); R('after weapon select (should it recentre?)', await cam());
await drag(300,100); await page.keyboard.press('Space'); await page.waitForTimeout(1500); R('after fire', await cam());
// drag while charging
// C key during pause
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.keyboard.press('KeyC'); R('C while paused ok?', await cam());
await page.keyboard.press('Escape');
// arrows: drag far so worm off-screen
await page.waitForTimeout(500);
await drag(-600,0); await drag(-600,0); await page.waitForTimeout(300);
R('offscreen', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_arrow_left.png'});
await drag(600,0);await drag(600,0);await drag(600,0);await drag(600,0);await drag(600,0); await page.waitForTimeout(300);
R('offscreen R', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_arrow_right.png'});
await drag(0,600);await drag(0,600); await page.waitForTimeout(300);
R('offscreen up?', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_arrow_up.png'});
// resize after drag
await page.setViewportSize({width:1024,height:768}); await page.waitForTimeout(800); R('after resize', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_resize.png'});
await page.setViewportSize({width:2560,height:1440}); await page.waitForTimeout(800); R('after resize big', await cam()); await page.screenshot({path:'/tmp/qa_m2/u3_resize_big.png'});
await browser.close(); console.log(logs.filter(l=>!l.includes('Graphics')));
