// Overworld menu (C / MENU): a small stat box plus ITEM, STAT, MAP (fast travel) and OPTIONS.
import { drawBox, type UIScene } from './UI';
import { label, PixelText } from '../core/text';
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
    await ui.say(["* Your pockets are empty.", "* (Lumen's shop, east of the entrance, sells skills.)"]);
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

async function mapPanel(ui: UIScene, current: string): Promise<string | null> {
  const ids = [...MAIN_ROOMS];
  if (G.s.visited.includes('hidden')) ids.splice(ids.indexOf('library') + 1, 0, 'hidden');
  const items = ids.map((id) => (id === current ? '♥ ' : G.s.visited.includes(id) ? '  ' : '? ') + ROOMS[id].name);
  const colors = ids.map((id) => (id === current ? 'y' : G.s.visited.includes(id) ? 'w' : 'g'));
  const i = await ui.list(items, { x: 228, y: 32, w: 380, rows: 9, colors, title: `MAP  ${G.visitedMain()}/${MAIN_ROOMS.length}`, scale: 2 });
  if (i < 0 || ids[i] === current) return null;
  return ids[i];
}

async function optionsMenu(ui: UIScene) {
  const speeds: TextSpeed[] = ['normal', 'fast', 'instant'];
  for (;;) {
    const st = loadSettings();
    const i = await ui.list([`Text: ${st.textSpeed}`, `Sound: ${audio.muted ? 'off' : 'on'}`, 'Back'], { x: 228, y: 32, w: 330 });
    if (i < 0 || i === 2) return;
    if (i === 0) saveSettings({ ...st, textSpeed: speeds[(speeds.indexOf(st.textSpeed) + 1) % 3] });
    if (i === 1) audio.toggle();
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
