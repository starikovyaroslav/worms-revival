import { open, st, ticking } from './qa_lib.mjs';
const R=(...a)=>console.log(...a);
const sizes=[[1024,768],[1280,720],[1920,1080],[2560,1440]];
const logsAll=[];
for (const [w,h] of sizes) {
  const { browser, page, logs } = await open('http://localhost:5231/?seed=1',{width:w,height:h});
  await ticking(page); await page.keyboard.press('KeyQ'); await page.waitForTimeout(400);
  const cam=()=>page.evaluate(()=>{const c=window.__game.scene.camera, t=window.__game.game.world.terrain; const hw=c.viewW/2/c.zoom, hh=c.viewH/2/c.zoom; return {level:c.level, zoom:c.zoom, W:t.width,H:t.height, L:Math.round(c.x-hw), Rt:Math.round(c.x+hw), T:Math.round(c.y-hh), B:Math.round(c.y+hh), us:window.__game.scene.userScrolled, vw:c.viewW, vh:c.viewH}});
  R(`== ${w}x${h}`, JSON.stringify(await cam()));
  for (const wheel of [1,1,1,-1,-1,-1,-1,-1]) {
    await page.mouse.move(w/2,h/2); await page.mouse.wheel(0, wheel>0?-100:100); await page.waitForTimeout(150);
  }
  // now at min zoom; check; zoom in max & drag extremes
  for (const dir of [-1,1]) {
   for (let i=0;i<5;i++){ await page.mouse.move(w/2,h/2); await page.mouse.wheel(0, dir*-100); await page.waitForTimeout(100); }
   const lv=(await cam());
   // drag far in each direction
   for (const [dx,dy,name] of [[3000,0,'drag right-> view moves left'],[-3000,0,'drag left'],[0,3000,'drag down'],[0,-3000,'drag up']]) {
     await page.mouse.move(w/2,h/2); await page.mouse.down();
     for (let k=1;k<=6;k++) await page.mouse.move(w/2+dx*k/6*0.3, h/2+dy*k/6*0.3);
     await page.mouse.move(Math.max(1,Math.min(w-1,w/2+dx)),Math.max(1,Math.min(h-1,h/2+dy)));
     await page.mouse.up(); await page.waitForTimeout(80);
     const c=await cam(); R(` lvl${c.level} zoom${c.zoom} ${name}: view L${c.L} R${c.Rt} T${c.T} B${c.B} map ${c.W}x${c.H}  ->`, (c.Rt<-48||c.L>c.W+48||c.B<-120||c.T>c.H+40)?'EMPTY FRAME':'ok', (c.L< -49||c.Rt>c.W+49)&&c.Rt-c.L<c.W+96?'x beyond margin':'', (c.T<-121||c.B>c.H+41)&&c.B-c.T<c.H+160?'y beyond margin':'');
   }
  }
  await page.screenshot({path:`/tmp/qa_m2/u3_clamp_${w}.png`});
  logsAll.push(...logs.filter(l=>!l.includes('Graphics')));
  await browser.close();
}
console.log(logsAll);
