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
const problems = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if ((m.type() === 'error' && !/Failed to load resource/.test(t)) || /Texture .*not found|missing/i.test(t)) errors.push(`[${name}] console: ${t}`);
  });
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
const talkTo = (page, test) => world(page, `const e = w.ents.find(e => ${test}); const x = (e.data.x ?? e.tx*16+8), y = (e.data.y ?? e.ty*16+16); w.teleport(x, y + 12); w.interactWith(e); return 1;`);

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
  await ctx.close();
}

// ── every room, and every door: you must arrive where the door says, and never inside a wall
const rooms = ['start', 'hall', 'crossroads', 'memorial', 'ruins1', 'ruins2', 'ruins3', 'lab', 'town', 'shop', 'house', 'hallway', 'library', 'records', 'garden', 'summit', 'exit'];
{
  const { ctx, page } = await newPage('rooms', { viewport: { width: 1280, height: 800 } });
  let i = 10;
  for (const r of rooms) {
    await go(page, r);
    await sleep(r === 'town' || r === 'crossroads' ? 2500 : 300); // let the NPCs walk a bit
    await shot(page, `${i++}-room-${r}`);
  }
  const enter = async (r, tag) => {
    // the hidden room has no deep link: walk in through the library instead
    if (r !== 'hidden') return go(page, r, tag);
    await go(page, 'library', tag);
    await world(page, 'w.goto("hidden", "a"); return 1;');
    await sleep(900);
  };
  for (const r of [...rooms, 'hidden']) {
    await enter(r, 'd' + r);
    const doors = await world(page, 'return Object.entries(w.room.doors).map(([k, d]) => [k, d.to, d.spawn]);');
    for (const [k, to, spawn] of doors) {
      await world(page, 'w.transitioning = false; w.goto(a[0], a[1]); return 1;', [to, spawn]);
      await sleep(700);
      const res = await world(page, 'const p = w.player; return { room: w.roomId, stuck: w.solidAt({ x: p.x - 4.5, y: p.y - 3, w: 9, h: 8 }) };');
      if (res.room !== to) problems.push(`door ${r}:${k} -> expected ${to}, got ${res.room}`);
      if (res.stuck) problems.push(`door ${r}:${k} -> ${to}/${spawn}: arrived inside something solid`);
      await enter(r, 'd' + r + k);
    }
  }
  await ctx.close();
}

// ── features
{
  const { ctx, page } = await newPage('features', { viewport: { width: 1280, height: 800 } });
  // WAEL in his room
  await page.goto(`${URL}/?dev&r=w#/wael?q=what+is+trafficflowbench`);
  await sleep(2500);
  await shot(page, '30-wael-hello');
  await press(page, 'z', 5, 600);
  await sleep(1200);
  await shot(page, '31-wael-answer');
  await settle(page);
  // the hallway mirror
  await go(page, 'hallway', 'm');
  await world(page, 'const e = w.ents.find(e => e.def.t === "reflect"); w.teleport(e.tx*16+16, e.ty*16+30); w.facing = {x:0,y:-1}; w.interactWith(e); return 1;');
  await sleep(2400);
  await shot(page, '32-mirror');
  await settle(page);
  // the Lab: draw a 7 on the floor
  await go(page, 'lab', 'l');
  const seven = ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (seven[y][x] === '#') {
    await world(page, 'w.teleport((18+a[0])*16+8, (6+a[1])*16+8); w.logic.confirm(w); return 1;', [x, y]);
    await sleep(40);
  }
  await sleep(900);
  await shot(page, '33-digit-seven');
  await settle(page, 60);
  // the swarm bridge: pick the right order
  await go(page, 'ruins2', 'sw');
  await world(page, 'const c = w.ents.find(e => e.def.t === "terminal"); w.teleport(c.tx*16+8, c.ty*16+26); w.interactWith(c); return 1;');
  await sleep(2200);
  await press(page, 'z', 3, 500); // through the console text to "Yes"
  await sleep(500);
  await shot(page, '34-swarm-order');
  await press(page, 'z'); // AUDITOR first
  await sleep(400);
  await press(page, 'z'); // FIXER second
  await sleep(1500);
  await settle(page, 120);
  await sleep(500);
  await shot(page, '35-bridge-done');
  const bridge = await world(page, 'return !!w.s.registry && window.__game && JSON.parse(localStorage.getItem("wael.save.v1") || "{}"); ');
  void bridge;
  // the garden: push a stone into the right patch, then run k-means
  await go(page, 'garden', 'g');
  await shot(page, '36-garden-start');
  await world(page, 'const lever = w.ents.find(e => e.def.t === "lever"); w.teleport(lever.tx*16+8, lever.ty*16+28); w.interactWith(lever); return 1;');
  await sleep(1500);
  await shot(page, '37-garden-local-minimum');
  await settle(page);
  await world(page, 'const s = w.ents.filter(e => e.def.t === "stone")[1]; s.data.x = 192; s.data.y = 168; return 1;');
  await sleep(300);
  await world(page, 'const lever = w.ents.find(e => e.def.t === "lever"); w.teleport(lever.tx*16+8, lever.ty*16+28); w.interactWith(lever); return 1;');
  await sleep(2500);
  await shot(page, '38-garden-solved');
  await settle(page, 60);
  // the boss bubble (long words must stay inside it)
  await go(page, 'summit', 'b');
  await world(page, 'const b = w.ents.find(e => e.def.t === "boss"); w.teleport(b.tx*16+16, b.ty*16+40); w.interactWith(b); return 1;');
  await sleep(1500);
  await press(page, 'z', 5, 600);
  await sleep(400);
  await press(page, 'z');
  await sleep(2500);
  await press(page, 'z', 4, 500);
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await sleep(500);
  await shot(page, '39-boss-act-menu');
  await press(page, 'ArrowRight');
  await press(page, 'z');
  await sleep(300);
  await press(page, 'z', 4, 500);
  await sleep(700);
  await shot(page, '40-boss-bubble');
  await sleep(2400);
  await shot(page, '41-boss-attack');
  // a normal fight: victory text
  await go(page, 'ruins2', 'e');
  await world(page, 'w.teleport(25*16+8, 9*16+8); return 1;');
  await page.keyboard.down('ArrowDown'); await sleep(260); await page.keyboard.up('ArrowDown');
  await sleep(1800);
  await shot(page, '42-encounter');
  // the MAP (long room names must fit)
  await go(page, 'lab', 'map');
  await world(page, 'for (const r of ["start","hall","crossroads","memorial","ruins1","ruins2","ruins3","lab","town","shop","house","hallway","library","records","garden","summit","exit"]) if (!window.__G || true) {} return 1;');
  await press(page, 'c');
  await sleep(400);
  await press(page, 'ArrowDown', 3);
  await press(page, 'z');
  await sleep(500);
  await press(page, 'ArrowDown', 6, 80);
  await sleep(300);
  await shot(page, '43-map');
  await press(page, 'x', 3, 200);
  // shop
  await go(page, 'shop', 's');
  await world(page, 'const t = w.ents.find(e => e.def.t === "counter"); w.teleport(t.tx*16+24, t.ty*16+28); w.interactWith(t); return 1;');
  await sleep(1500);
  await press(page, 'z');
  await sleep(600);
  await press(page, 'ArrowDown', 2);
  await sleep(300);
  await shot(page, '44-shop');
  await ctx.close();
}

// ── cosmetics gallery (zoomed)
{
  const { ctx, page } = await newPage('cosmetics', { viewport: { width: 1280, height: 800 } });
  await go(page, 'hall', 'c');
  const ids = ['crown', 'hardhat', 'headphones', 'goggles', 'glasses', 'ribbon', 'flower', 'halo', 'shades', 'bulb'];
  for (const id of ids) {
    await page.evaluate((id) => {
      const w = window.__game.scene.getScene('world');
      const G = w.registry.get('G');
      void G;
      return id;
    }, id);
    await world(page, 'const s = JSON.parse(localStorage.getItem("wael.save.v1") || "null"); return 1;');
    await page.evaluate((id) => {
      const w = window.__game.scene.getScene('world');
      // reach the shared game state through the world scene's module (exposed in dev builds)
      const G = window.__G;
      if (G) { if (!G.s.cosmetics.includes(id)) G.s.cosmetics.push(id); G.s.wear = id; }
      w.wearCosmetic();
    }, id);
    await sleep(250);
    const box = await page.evaluate(() => {
      const w = window.__game.scene.getScene('world');
      const c = w.cameras.main;
      const r = document.querySelector('canvas').getBoundingClientRect();
      const sx = r.width / 640, sy = r.height / 480;
      const px = (w.player.x - c.worldView.x) * c.zoom * sx + r.left, py = (w.player.y - c.worldView.y) * c.zoom * sy + r.top;
      return { x: Math.max(0, px - 60), y: Math.max(0, py - 80), width: 120, height: 120 };
    });
    await page.screenshot({ path: `${OUT}/50-cos-${id}.png`, clip: box });
  }
  await ctx.close();
}

// ── résumé page
{
  const { ctx, page } = await newPage('resume', { viewport: { width: 1280, height: 800 } });
  await page.goto(`${URL}/resume/`);
  await sleep(500);
  await page.screenshot({ path: `${OUT}/60-resume.png`, fullPage: true });
  await ctx.close();
}

// ── phones
for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['phone-land', { width: 844, height: 390 }]]) {
  const { ctx, page } = await newPage(name, { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.goto(`${URL}/?dev`);
  await sleep(1200);
  await shot(page, `70-${name}-intro`);
  await page.goto(`${URL}/?dev&r=1#/town`);
  await sleep(1800);
  await shot(page, `71-${name}-town`);
  await ctx.close();
}

await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'doors ok');
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
