import { chromium } from 'playwright';
export async function open(url, vp = { width: 1280, height: 720 }) {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: vp });
  const logs = [];
  page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') logs.push(`[${m.type()}] ${m.text().slice(0,200)}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(1500);
  return { browser, page, logs };
}
export const st = (page) => page.evaluate(() => { const g = window.__game.game; return { phase: g.phase, tick: g.world.tick, timer: g.timer, turn: g.turn, team: g.activeTeam, weapon: g.weaponId, charging: g.charging, power: g.power, hs: g.hotSeat, waits: g.waitsForHandOver, w: g.activeWorm && {x:g.activeWorm.x,y:g.activeWorm.y, aim:g.activeWorm.aim} , paused: window.__game.match.isPaused}; });
export async function ticking(page){ for(let i=0;i<100;i++){ const s=await st(page); if(s.tick>10) return s; await page.waitForTimeout(200);} throw new Error('no ticks'); }
export async function until(page, pred, ms=60000){ const t0=Date.now(); while(Date.now()-t0<ms){ const s=await st(page); if(pred(s)) return s; await page.waitForTimeout(150);} throw new Error('timeout'); }
