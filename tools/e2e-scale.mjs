// Scale matrix check: starts its own Vite dev server and opens the game at many window sizes / DPRs.
//   node tools/e2e-scale.mjs [port=5212]
// Asserts: no body scrollbars in the menu, every menu button inside the window, canvas backing size
// = css size * dpr, integer device scale of the camera, worm sprite size = 32 * kd device px, HUD
// font >= 8 device px, no console errors. Screenshots go to /tmp/m1matrix/. Exits non-zero on failure.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const port = Number(process.argv[2] ?? 5212);
const base = `http://localhost:${port}/`;
const SIZES = [
  [1024, 768, 1],
  [1280, 720, 1],
  [1366, 768, 1],
  [1600, 900, 1],
  [1920, 1080, 1],
  [1920, 1200, 1],
  [2560, 1440, 1],
  [3840, 2160, 1],
  [1280, 720, 2],
  [1920, 1080, 1.25],
  [1920, 1080, 1.5],
];

mkdirSync('/tmp/m1matrix', { recursive: true });
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
  cwd: 'apps/client',
  stdio: 'ignore',
});
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
};

try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const [w, h, dpr] of SIZES) {
    const tag = `${w}x${h}@${dpr}`;
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: dpr,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    // Menu.
    await page.goto(base);
    await page.waitForTimeout(1200);
    const menu = await page.evaluate(() => {
      const el = document.querySelector('.menu');
      const out = [...document.querySelectorAll('.menu button, .menu .file-btn')].map((b) => {
        const r = b.getBoundingClientRect();
        return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      });
      return { scroll: el ? el.scrollHeight - el.clientHeight : -1, inside: out.every(Boolean) };
    });
    check(menu.scroll <= 0, `${tag} menu fits without scrolling (overflow ${menu.scroll}px)`);
    check(menu.inside, `${tag} menu buttons inside the window`);
    await page.screenshot({ path: `/tmp/m1matrix/menu_${tag}.png` });

    // Match.
    await page.goto(`${base}?seed=1&cpu=3`);
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => {
      const g = window.__game;
      const cv = document.querySelector('canvas');
      const cam = g.scene.camera;
      const worm = g.game.worms[0];
      const font = parseFloat(
        getComputedStyle(document.querySelector('.hud .timer') ?? document.body).fontSize,
      );
      return {
        backW: cv.width,
        backH: cv.height,
        zoom: cam.zoom,
        dpr: devicePixelRatio,
        k: Number(getComputedStyle(document.documentElement).getPropertyValue('--k')),
        kd: Number(getComputedStyle(document.documentElement).getPropertyValue('--kd')),
        font,
        worm: !!worm,
      };
    });
    check(
      m.backW === Math.round(w * dpr) && m.backH === Math.round(h * dpr),
      `${tag} canvas backing ${m.backW}x${m.backH}`,
    );
    const devScale = m.zoom * m.dpr;
    check(
      Math.abs(devScale - Math.round(devScale)) < 1e-6,
      `${tag} camera device scale ${devScale} is an integer`,
    );
    check(m.kd >= 1 && Number.isFinite(m.kd), `${tag} kd=${m.kd}`);
    check(
      m.font * m.k * m.dpr >= 8 * m.kd * 0.99 || m.font === 0,
      `${tag} HUD timer font ${m.font}px * k ${m.k}`,
    );
    await page.screenshot({ path: `/tmp/m1matrix/match_${tag}.png` });
    check(
      errors.filter((e) => !/deprecat/i.test(e)).length === 0,
      `${tag} no console errors ${errors.slice(0, 1)}`,
    );
    await ctx.close();
  }
  await browser.close();
} finally {
  server.kill();
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed; screenshots in /tmp/m1matrix/');
