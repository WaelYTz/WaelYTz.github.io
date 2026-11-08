// Overworld menu (C / MENU): a small stat box plus ITEM, STAT, MAP (fast travel) and OPTIONS.
import { drawBox, type UIScene } from './UI';
import { fitLabel, label, PixelText } from '../core/text';
import { WORLD_MAP, BOSS_ROOM } from '../world/worldmap';
import { game as G, MAIN_ROOMS, SECRET_COUNT, ENCOUNTERS } from '../core/state';
import { SKILLS } from '../content/lore';
import { ROOMS } from '../world/rooms';
import { fmtTime, loadSettings, saveSettings, type TextSpeed } from '../core/save';
import { audio } from '../core/audio';
import { input } from '../core/input';
import { githubStats } from '../core/remote';

import { COSMETICS } from '../core/cast';

let open = false;

export async function openMenu(ui: UIScene, world: { roomId: string }) {
  if (open || ui.busy) return;
  open = true;
  const release = ui.hold();
  audio.sfx('select');
  const g = ui.add.graphics().setDepth(19);
  drawBox(g, 32, 32, 184, 118);
  const objs = [
    g,
    label(ui, 52, 48, G.name.slice(0, 8), 'w', 3).setDepth(19),
    label(ui, 52, 86, `LV  ${G.s.lv}`, 'w', 2).setDepth(19),
    label(ui, 52, 106, `HP  ${G.s.hp}/${G.s.maxHp}`, 'w', 2).setDepth(19),
    label(ui, 52, 126, `♥   ${G.s.secrets.length}/${SECRET_COUNT}`, 'w', 2).setDepth(19),
  ];
  let start = 0;
  try {
    for (;;) {
      const i = await ui.list(['ITEM', 'STAT', 'WEAR', 'MAP', 'OPTIONS'], { x: 32, y: 160, w: 184, start });
      if (i < 0) break;
      start = i;
      if (i === 0) await itemMenu(ui);
      if (i === 1) await statPanel(ui);
      if (i === 2) await wearMenu(ui);
      if (i === 3) {
        const room = await mapPanel(ui, world.roomId);
        if (room) {
          objs.forEach((o) => o.destroy());
          release();
          open = false;
          await ui.say('* You take a shortcut through the dark.');
          ui.travel?.(room);
          return;
        }
      }
      if (i === 4) await optionsMenu(ui);
    }
  } finally {
    if (open) {
      objs.forEach((o) => o.destroy());
      release();
      open = false;
    }
  }
}

async function itemMenu(ui: UIScene) {
  const items = G.s.inventory.map((id) => SKILLS.find((s) => s.id === id)!).filter(Boolean);
  if (!items.length) {
    await ui.say(["* Your pockets are empty.", "* (Lumen's shop, in Lamplight Square, sells skills.)"]);
    return;
  }
  for (;;) {
    const i = await ui.list(items.map((s) => s.name), { x: 228, y: 32, w: 380, rows: 8 });
    if (i < 0) return;
    const s = items[i];
    const a = await ui.list(['Use', 'Info', 'Drop'], { x: 228, y: 330, w: 200 });
    if (a === 0) {
      const before = G.s.hp;
      G.s.hp = Math.min(G.s.maxHp, G.s.hp + s.heal);
      audio.sfx('heal');
      await ui.say([`* You use ${s.full}.`, `* ${s.use}`, G.s.hp > before ? `* You recovered ${G.s.hp - before} HP.` : '* Your HP was already full.']);
    } else if (a === 1) {
      await ui.say([`* "${s.full}" - ${s.flavor}`]);
    } else if (a === 2) {
      await ui.say(["* You try to drop it.", "* ...You can't. Once learned, a skill stays with you."]);
    }
  }
}

async function wearMenu(ui: UIScene) {
  const all = Object.keys(COSMETICS);
  const owned = all.filter((id) => G.hasCos(id));
  if (!owned.length) {
    await ui.say(['* You have nothing to wear yet.', `* (There are ${all.length} things to find. Hint: ${COSMETICS.hardhat.how})`]);
    return;
  }
  const items = ['Nothing', ...owned.map((id) => (G.s.wear === id ? '♥ ' : '  ') + COSMETICS[id].name)];
  const i = await ui.list(items, { x: 228, y: 32, w: 380, title: `WEAR  ${owned.length}/${all.length}` });
  if (i < 0) return;
  G.s.wear = i === 0 ? '' : owned[i - 1];
  audio.sfx('select');
  (ui.registry.get('world') as { wearCosmetic?: () => void } | undefined)?.wearCosmetic?.();
  const missing = all.filter((id) => !G.hasCos(id));
  if (missing.length) await ui.say(`* (Still out there: ${missing.length}. Hint: ${COSMETICS[missing[0]].how})`);
}

async function statPanel(ui: UIScene) {
  const release = ui.hold();
  const g = ui.add.graphics().setDepth(21);
  drawBox(g, 228, 32, 380, 404);
  const route = G.route();
  const routeName = route === 'pacifist' ? '{y}Merciful' : route === 'fight' ? '{r}Determined' : '{g}Undecided';
  const gh = await githubStats();
  const lines = [
    `"${G.name}"`,
    '',
    `LV ${G.s.lv}      HP ${G.s.hp}/${G.s.maxHp}`,
    `AT ${9 + G.s.lv}      DF ${10}`,
    '',
    `ROOMS    ${G.visitedMain()}/${MAIN_ROOMS.length}`,
    `SECRETS  ${G.s.secrets.length}/${SECRET_COUNT}`,
    `SPARED   ${G.s.spared.length}/${ENCOUNTERS.length}`,
    `FOUGHT   ${G.s.fought.length}`,
    `ROUTE    ${routeName}{w}`,
    `TIME     ${fmtTime(G.playMs())}`,
    '',
    gh ? `{g}WAEL on GitHub: ${gh.repos} repos,` : '{g}WAEL on GitHub: offline.',
    gh ? `{g}${gh.followers} followers, ${gh.stars} stars.` : '',
  ];
  const t = new PixelText(ui, 254, 54, lines.join('\n'), { scale: 2, cols: 28 }).setDepth(21);
  await waitClose(ui);
  g.destroy();
  t.destroy();
  release();
}

// The MAP: every room is a block placed where it really is (see worldmap.ts). Visited rooms are grey, the room
// you stand in is light, rooms next to a visited one show as dark outlines. Pick a visited room to travel there.
async function mapPanel(ui: UIScene, current: string): Promise<string | null> {
  const release = ui.hold();
  const PX = 228, PY = 32, PW = 380, PH = 416;
  const AX = PX + 18, AY = PY + 46, AW = PW - 36, AH = PH - 46 - 62;
  const visited = (id: string) => G.s.visited.includes(id) || id === current;
  const ids = Object.keys(WORLD_MAP).filter((id) => ROOMS[id] && (id !== 'hidden' || visited('hidden')));
  // a room is "known" when you have been there or stood next to its door
  const known = new Set(ids.filter(visited));
  for (const id of [...known]) for (const d of Object.values(ROOMS[id].doors)) if (d.to !== 'hidden' || visited('hidden')) known.add(d.to);
  const xs = ids.map((id) => WORLD_MAP[id]);
  const minX = Math.min(...xs.map((r) => r[0])), maxX = Math.max(...xs.map((r) => r[0] + r[2]));
  const minY = Math.min(...xs.map((r) => r[1])), maxY = Math.max(...xs.map((r) => r[1] + r[3]));
  const u = Math.floor(Math.min(AW / (maxX - minX), AH / (maxY - minY)));
  const ox = Math.round(AX + (AW - (maxX - minX) * u) / 2 - minX * u);
  const oy = Math.round(AY + (AH - (maxY - minY) * u) / 2 - minY * u);
  const rect = (id: string) => {
    const [x, y, w, h] = WORLD_MAP[id];
    const x0 = Math.round(ox + x * u), y0 = Math.round(oy + y * u);
    return { x: x0 + 1, y: y0 + 1, w: Math.round(ox + (x + w) * u) - x0 - 2, h: Math.round(oy + (y + h) * u) - y0 - 2 };
  };
  const pickable = ids.filter(visited);
  let sel = pickable.includes(current) ? current : pickable[0];
  const c = ui.add.container(0, 0).setDepth(21);
  const g = ui.add.graphics();
  drawBox(g, PX, PY, PW, PH);
  c.add(g);
  c.add(label(ui, PX + 22, PY + 18, `MAP  ${G.visitedMain()}/${MAIN_ROOMS.length}`, 'y', 2));
  const mg = ui.add.graphics();
  c.add(mg);
  const heart = ui.add.image(0, 0, 'soul-small').setScale(2);
  c.add(heart);
  let nameT: Phaser.GameObjects.BitmapText | null = null;
  c.add(label(ui, PX + PW / 2, PY + PH - 26, 'Z: GO THERE    X: BACK', 'g', 2, 'c'));
  const paint = () => {
    mg.clear();
    for (const id of ids) {
      if (!known.has(id)) continue;
      const r = rect(id);
      if (!visited(id)) {
        mg.fillStyle(0x161616).fillRect(r.x, r.y, r.w, r.h).lineStyle(1, 0x4a4a4a).strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      } else {
        mg.fillStyle(id === current ? 0xd8d8d8 : 0x5c5c5c).fillRect(r.x, r.y, r.w, r.h);
        mg.fillStyle(id === current ? 0xffffff : 0x787878).fillRect(r.x, r.y, r.w, 2);
      }
      if (id === BOSS_ROOM) {
        // a little skull, like the one on the door of the last room
        const sx = Math.round(r.x + r.w / 2 - 5), sy = Math.round(r.y + r.h / 2 - 5);
        mg.fillStyle(visited(id) ? 0x202020 : 0x8a8a8a).fillRect(sx + 1, sy, 8, 6).fillRect(sx, sy + 1, 10, 4).fillRect(sx + 2, sy + 6, 6, 3);
        mg.fillStyle(visited(id) ? 0x5c5c5c : 0x161616).fillRect(sx + 2, sy + 2, 2, 2).fillRect(sx + 6, sy + 2, 2, 2).fillRect(sx + 3, sy + 7, 1, 2).fillRect(sx + 6, sy + 7, 1, 2);
      }
    }
    // doorways: a light notch across the gap wherever two known rooms share a door
    for (const id of ids) {
      if (!visited(id)) continue;
      for (const d of Object.values(ROOMS[id].doors)) {
        if (!ids.includes(d.to) || !known.has(d.to)) continue;
        const a = rect(id), b = rect(d.to);
        const ix0 = Math.max(a.x, b.x), ix1 = Math.min(a.x + a.w, b.x + b.w);
        const iy0 = Math.max(a.y, b.y), iy1 = Math.min(a.y + a.h, b.y + b.h);
        mg.fillStyle(0x9a9a9a);
        if (ix1 - ix0 > 2) mg.fillRect(Math.round((ix0 + ix1) / 2) - 2, Math.min(a.y + a.h, b.y + b.h) - 2, 4, Math.abs(Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)) + 4);
        else if (iy1 - iy0 > 2) mg.fillRect(Math.min(a.x + a.w, b.x + b.w) - 2, Math.round((iy0 + iy1) / 2) - 2, Math.abs(Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)) + 4, 4);
      }
    }
    const s = rect(sel);
    mg.lineStyle(2, 0xffff00).strokeRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
    const cr = rect(current in WORLD_MAP ? current : sel);
    heart.setPosition(Math.round(cr.x + cr.w / 2), Math.round(cr.y + cr.h / 2)).setVisible(current in WORLD_MAP && current !== BOSS_ROOM);
    nameT?.destroy();
    nameT = fitLabel(ui, PX + PW / 2, PY + PH - 54, (sel === current ? '♥ ' : '') + ROOMS[sel].name, PW - 44, sel === current ? 'y' : 'w', 2, 'c');
    c.add(nameT);
  };
  // arrows jump to the nearest visited room in that direction
  const step = (dx: number, dy: number) => {
    const ctr = (id: string) => { const [x, y, w, h] = WORLD_MAP[id]; return [x + w / 2, y + h / 2]; };
    const [cx, cy] = ctr(sel);
    let best: string | null = null, bestD = 1e9;
    for (const id of pickable) {
      if (id === sel) continue;
      const [x, y] = ctr(id);
      const along = (x - cx) * dx + (y - cy) * dy;
      const side = Math.abs((x - cx) * dy - (y - cy) * dx);
      if (along <= 0.2 || side > along * 1.6) continue;
      const d = along + side * 2;
      if (d < bestD) { bestD = d; best = id; }
    }
    if (best) { sel = best; audio.sfx('move'); paint(); }
  };
  let pick: string | null = null;
  for (const id of pickable) {
    const r = rect(id);
    const z = ui.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { if (sel === id) pick = id; else { sel = id; audio.sfx('move'); paint(); } });
    c.add(z);
  }
  paint();
  const result = await new Promise<string | null>((resolve) => {
    const done = (v: string | null) => { ui.events.off('update', tick); resolve(v); };
    const tick = () => {
      if (pick) { audio.sfx('select'); return done(pick === current ? null : pick); }
      if (input.consume('left')) step(-1, 0);
      if (input.consume('right')) step(1, 0);
      if (input.consume('up')) step(0, -1);
      if (input.consume('down')) step(0, 1);
      if (input.consume('confirm')) { audio.sfx('select'); done(sel === current ? null : sel); }
      else if (input.consume('cancel') || input.consume('menu')) { audio.sfx('back'); done(null); }
    };
    ui.events.on('update', tick);
  });
  c.destroy();
  release();
  return result;
}

async function optionsMenu(ui: UIScene) {
  const speeds: TextSpeed[] = ['normal', 'fast', 'instant'];
  for (;;) {
    const st = loadSettings();
    const i = await ui.list([`Text: ${st.textSpeed}`, `Sound: ${audio.muted ? 'off' : 'on'}`, `Wael AI: ${st.waelAi === 'on' ? 'on' : 'off'}`, 'Back'], { x: 228, y: 32, w: 330 });
    if (i < 0 || i === 3) return;
    if (i === 0) saveSettings({ ...st, textSpeed: speeds[(speeds.indexOf(st.textSpeed) + 1) % 3] });
    if (i === 1) audio.toggle();
    if (i === 2) {
      saveSettings({ ...st, waelAi: st.waelAi === 'on' ? 'off' : 'on' });
      if (st.waelAi !== 'on') await ui.say(["* (WAEL's AI brain will wake up next time you talk to him.)", '* (It needs a desktop browser with WebGPU and a one-time download of about 700 MB.)']);
    }
  }
}

function waitClose(ui: UIScene): Promise<void> {
  return new Promise((resolve) => {
    let clicked = false;
    const onDown = () => (clicked = true);
    ui.input.once('pointerdown', onDown);
    const tick = () => {
      if (clicked || input.consume('confirm') || input.consume('cancel') || input.consume('menu')) {
        ui.events.off('update', tick);
        ui.input.off('pointerdown', onDown);
        audio.sfx('back');
        resolve();
      }
    };
    ui.events.on('update', tick);
  });
}
