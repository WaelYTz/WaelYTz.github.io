// Screenshot + smoke test in headless Edge (playwright-core, no browser download needed).
//   npm run build; npx vite preview --port 4173   (in another terminal)
//   node scripts/shots.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:4173';
const OUT = process.argv[2] || 'shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`[${name}] console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}\n${(e.stack || '').split('\n').slice(1, 5).join('\n')}`));
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
const press = async (page, key, n = 1, gap = 120) => { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await sleep(gap); } };
/** Press Z until no dialog/menu is open (text speed independent). */
const settle = async (page, max = 40) => {
  for (let i = 0; i < max; i++) {
    const busy = await page.evaluate(() => window.__game?.scene.getScene('ui')?.busy);
    if (!busy) return;
    await page.keyboard.press('z');
    await sleep(220);
  }
};
const world = (page, fn, arg) => page.evaluate(([src, a]) => {
  const w = window.__game.scene.getScene('world');
  return new Function('w', 'a', src)(w, a);
}, [fn, arg]);
const go = async (page, room, tag) => { await page.goto(`${URL}/?dev&r=${tag ?? room}#/${room}`); await sleep(1800); };

// ── desktop: intro → title → naming → where it begins
{
  const { ctx, page } = await newPage('desktop', { viewport: { width: 1280, height: 800 } });
  await page.goto(URL + '/?dev');
  await sleep(1200);
  await shot(page, '01-intro');
  await page.click('#play');
  await sleep(1200);
  await shot(page, '02-title');
  await press(page, 'Enter');
  await sleep(700);
  await page.keyboard.type('Wael');
  await press(page, 'Enter');
  await sleep(1800);
  await shot(page, '03-name-taken');
  await settle(page);
  for (let i = 0; i < 4; i++) await press(page, 'Backspace');
  await page.keyboard.type('Ada');
  await press(page, 'Enter');
  await sleep(2600);
  await shot(page, '04-confirm');
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await sleep(3200);
  await shot(page, '05-pip-intro');
  await settle(page);
  await sleep(900);
  await shot(page, '06-start');
  await press(page, 'c');
  await sleep(500);
  await shot(page, '07-menu');
  await press(page, 'x', 2, 200);
  await ctx.close();
}

// ── every room
const rooms = ['hall', 'crossroads', 'memorial', 'ruins1', 'ruins2', 'ruins3', 'lab', 'town', 'shop', 'library', 'records', 'mirror', 'summit', 'exit'];
{
  const { ctx, page } = await newPage('rooms', { viewport: { width: 1280, height: 800 } });
  let i = 10;
  for (const r of rooms) {
    await go(page, r);
    await shot(page, `${i++}-room-${r}`);
  }
  // talk to Byte in the town square
  await go(page, 'town', 'npc');
  await world(page, 'const n = w.ents.find(e => e.def.t === "npc"); w.teleport(n.tx*16+8, n.ty*16+26); w.interactWith(n); return 1;');
  await sleep(2200);
  await shot(page, '30-npc-talk');
  await settle(page);
  // the corridor: step on a future tile
  await go(page, 'ruins1', 'c');
  await world(page, 'w.teleport(9*16+8, 6*16+8); return 1;');
  await sleep(1000);
  await shot(page, '31-corridor-leak');
  await settle(page);
  // the swarm bridge
  await go(page, 'ruins2', 'sw');
  await world(page, 'const c = w.ents.find(e => e.def.t === "terminal"); w.teleport(c.tx*16+8, c.ty*16+26); w.interactWith(c); return 1;');
  await sleep(1800);
  await press(page, 'z', 2, 500);
  await sleep(400);
  await press(page, 'z');
  await sleep(1800);
  await shot(page, '32-swarm');
  await settle(page, 80);
  await sleep(500);
  await shot(page, '33-bridge-done');
  // a fight (OVERFIT memorizes your path)
  await go(page, 'ruins2', 'e');
  await world(page, 'w.teleport(24*16+8, 9*16+8); return 1;');
  await page.keyboard.down('ArrowDown'); await sleep(260); await page.keyboard.up('ArrowDown');
  await sleep(1800);
  await shot(page, '34-encounter');
  await press(page, 'z', 4, 500);
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await sleep(400);
  await shot(page, '35-act-menu');
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await sleep(300);
  await press(page, 'z', 3, 500);
  await sleep(1600);
  await page.keyboard.down('ArrowLeft'); await sleep(700); await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp'); await sleep(500); await page.keyboard.up('ArrowUp');
  await sleep(1300);
  await shot(page, '36-memorize-replay');
  await sleep(4000);
  // FIGHT
  await press(page, 'ArrowLeft', 2);
  await press(page, 'z');
  await sleep(1050);
  await press(page, 'z');
  await sleep(500);
  await shot(page, '37-slash');
  await sleep(600);
  await shot(page, '38-damage');
  // the boss
  await go(page, 'summit', 'b');
  await world(page, 'const b = w.ents.find(e => e.def.t === "boss"); w.teleport(b.tx*16+8, b.ty*16+40); w.interactWith(b); return 1;');
  await sleep(1500);
  await press(page, 'z', 5, 600);
  await sleep(400);
  await press(page, 'z');
  await sleep(2500);
  await shot(page, '39-boss');
  await press(page, 'z', 4, 500);
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await press(page, 'z');
  await sleep(300);
  await press(page, 'z', 4, 500);
  await sleep(2200);
  await shot(page, '40-boss-attack');
  // lab
  await go(page, 'lab', 'l');
  await world(page, 'const t = w.ents.find(e => e.def.t === "terminal"); w.teleport(t.tx*16+8, t.ty*16+26); w.interactWith(t); return 1;');
  await sleep(500);
  await press(page, 'z', 5, 500);
  await press(page, 'z');
  await sleep(3000);
  await press(page, 'z');
  await sleep(5000);
  await shot(page, '41-lab');
  await press(page, 'x');
  // mirror deep link with a question
  await page.goto(`${URL}/?dev&r=m#/mirror?q=what+is+trafficflowbench`);
  await sleep(2500);
  await press(page, 'z', 4, 600);
  await sleep(1500);
  await shot(page, '42-mirror-answer');
  // shop
  await go(page, 'shop', 's');
  await world(page, 'const t = w.ents.find(e => e.def.t === "counter"); w.teleport(t.tx*16+24, t.ty*16+28); w.interactWith(t); return 1;');
  await sleep(1500);
  await press(page, 'z');
  await sleep(600);
  await press(page, 'ArrowDown', 2);
  await sleep(300);
  await shot(page, '43-shop');
  await ctx.close();
}

// ── résumé page
{
  const { ctx, page } = await newPage('resume', { viewport: { width: 1280, height: 800 } });
  await page.goto(`${URL}/resume/`);
  await sleep(500);
  await page.screenshot({ path: `${OUT}/50-resume.png`, fullPage: true });
  await ctx.close();
}

// ── phones
for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['phone-land', { width: 844, height: 390 }]]) {
  const { ctx, page } = await newPage(name, { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.goto(`${URL}/?dev`);
  await sleep(1200);
  await shot(page, `60-${name}-intro`);
  await page.goto(`${URL}/?dev&r=1#/town`);
  await sleep(1800);
  await shot(page, `61-${name}-town`);
  await ctx.close();
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
