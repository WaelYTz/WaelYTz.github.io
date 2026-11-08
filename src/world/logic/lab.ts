// The Lab: the big terminal opens the freeway toy, and the glass floor is a 5x7 "draw a digit" classifier.
// The classifier is honest and tiny: it blurs your drawing and compares it with a few templates per digit (cosine
// similarity + softmax). Draw a 7 it is sure about and BITSY gives you lab goggles. The drawing is remembered.
import Phaser from 'phaser';
import type { RoomLogic, WorldApi } from '../types';
import { TILE } from '../../core/art';
import { GLYPHS } from '../../core/glyphs';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { label } from '../../core/text';

const GX = 18, GY = 6, GW = 5, GH = 7;
const BUTTON = { tx: 17, ty: 9 };
// a few extra ways people write a 7 (and a 1), so a neat drawing is enough
const EXTRA: Record<string, string[][]> = {
  '1': [['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']],
  '7': [['#####', '....#', '....#', '...#.', '...#.', '..#..', '..#..'], ['#####', '....#', '....#', '....#', '....#', '....#', '....#']],
};

const blur = (v: number[]) => {
  const k = [[1, 2, 1], [2, 4, 2], [1, 2, 1]];
  const out: number[] = [];
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && xx < GW && yy >= 0 && yy < GH) s += v[yy * GW + xx] * k[dy + 1][dx + 1];
        }
      out.push(s / 16);
    }
  return out;
};
const vec = (rows: string[]) => rows.flatMap((r) => [...r].map((c) => (c === '#' ? 1 : 0)));
const cos = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
};
const TEMPLATES = '0123456789'.split('').map((d) => ({ d, ts: [GLYPHS[d], ...(EXTRA[d] ?? [])].map((g) => blur(vec(g))) }));

function classify(bits: number[]): { d: string; p: number }[] {
  const v = blur(bits);
  const sc = TEMPLATES.map((t) => ({ d: t.d, s: Math.max(...t.ts.map((x) => cos(v, x))) }));
  const m = Math.max(...sc.map((x) => x.s));
  const ex = sc.map((x) => ({ d: x.d, e: Math.exp(18 * (x.s - m)) }));
  const z = ex.reduce((a, x) => a + x.e, 0);
  return ex.map((x) => ({ d: x.d, p: x.e / z })).sort((a, b) => b.p - a.p);
}

let st: {
  bits: number[];
  pix: Phaser.GameObjects.Image[];
  screen: Phaser.GameObjects.BitmapText;
  bar: Phaser.GameObjects.Graphics;
  pct: Phaser.GameObjects.BitmapText;
  button: Phaser.GameObjects.Sprite | null;
  busy: boolean;
};

const inGrid = (tx: number, ty: number) => tx >= GX && tx < GX + GW && ty >= GY && ty < GY + GH;

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    const saved = String(G.flag('digitGrid') ?? '');
    const bits = Array.from({ length: GW * GH }, (_, i) => (saved[i] === '1' ? 1 : 0));
    const pix = bits.map((b, i) => s.add.image((GX + (i % GW)) * TILE, (GY + Math.floor(i / GW)) * TILE, b ? 'pix-on' : 'pix-off').setOrigin(0).setDepth(-6));
    // the big screen above the floor: its glass is 56x24 px, centred at (328, 16)
    const sx = 300, sy = 4;
    st = {
      bits, pix,
      screen: label(s, sx + 3, sy + 2, '', 'c', 1).setDepth(-2),
      bar: s.add.graphics().setDepth(-2),
      pct: s.add.bitmapText(sx + 42, sy + 14, 'mini-c', '').setDepth(-2),
      button: (w.ents.find((e) => e.def.t === 'button')?.sprite as Phaser.GameObjects.Sprite | undefined) ?? null,
      busy: false,
    };
    paint();
  },
  onTile(w, tx, ty) {
    if (tx === BUTTON.tx && ty === BUTTON.ty) wipe(w);
  },
  confirm(w) {
    const tx = Math.floor(w.player.x / TILE), ty = Math.floor(w.player.y / TILE);
    if (!inGrid(tx, ty)) return false;
    toggle(w, tx, ty);
    return true;
  },
  tapTile(w, tx, ty) {
    if (!inGrid(tx, ty)) return false;
    toggle(w, tx, ty);
    return true;
  },
  async interact(w, e) {
    if (e.def.t === 'button') {
      wipe(w);
      return true;
    }
    if (e.def.t !== 'terminal') return false;
    await w.say(['* The terminal hums. A tiny freeway runs inside it.', '* (An illustrative toy, not the competition model.)']);
    const r = await w.ask(null, ['Play with it', 'Not now'], 1);
    if (r !== 0) return true;
    const { runLab } = await import('../../scenes/Lab');
    await runLab(w.s as Phaser.Scene);
    await w.say(['* A jam forms behind the crash, and the wave travels backwards against the traffic.', '* Forecasting it well, using only the past, is what TrafficFlowBench was about.']);
    if (G.giveCos('headphones')) {
      await w.say(['* BITSY: BEEP. YOU LISTENED TO THE TRAFFIC. TAKE THESE.', '* (New cosmetic: HEADPHONES.)'], 'bot');
      w.wearCosmetic();
    }
    return true;
  },
};

function toggle(w: WorldApi, tx: number, ty: number) {
  if (st.busy) return;
  const i = (ty - GY) * GW + (tx - GX);
  st.bits[i] = st.bits[i] ? 0 : 1;
  audio.sfx('toggle');
  paint();
  check(w);
}

function wipe(w: WorldApi) {
  if (st.busy || !st.bits.some((b) => b)) return;
  st.bits.fill(0);
  audio.sfx('door');
  st.button?.setFrame(1);
  w.s.time.delayedCall(300, () => st.button?.setFrame(0));
  paint();
}

function paint() {
  st.bits.forEach((b, i) => st.pix[i].setTexture(b ? 'pix-on' : 'pix-off'));
  G.setFlag('digitGrid', st.bits.join(''));
  st.bar.clear();
  const n = st.bits.reduce((a, b) => a + b, 0);
  if (n < 3) {
    st.screen.setText('DRAW!').setFont('px-g');
    st.pct.setText('');
    return;
  }
  const [top] = classify(st.bits);
  const ok = top.d === '7';
  st.screen.setText(`I SEE ${top.d}`).setFont(ok ? 'px-y' : 'px-c');
  st.bar.fillStyle(0x1b3a5a).fillRect(303, 19, 38, 4).fillStyle(ok ? 0xffd23a : 0x39c5ff).fillRect(303, 19, Math.round(38 * top.p), 4);
  st.pct.setText(String(Math.round(top.p * 100)));
}

async function check(w: WorldApi) {
  if (G.flag('digit')) return;
  const n = st.bits.reduce((a, b) => a + b, 0);
  const lowHalf = st.bits.slice(3 * GW).some((b) => b);
  const [top] = classify(st.bits);
  if (top.d !== '7' || top.p < 0.6 || n < 6 || !lowHalf) return;
  G.setFlag('digit');
  st.busy = true;
  w.freeze(true);
  audio.sfx('solve');
  const bitsy = w.ents.find((e) => e.def.t === 'npc' && e.def.id === 'bitsy');
  if (bitsy) w.emote(bitsy, '!', 800, 'y');
  await w.say([
    `* The screen flashes: {y}7, ${Math.round(top.p * 100)}% sure{w}.`,
    '* BITSY: BEEP BEEP! A SEVEN! A REAL SEVEN!',
    '* BITSY: THE CLASSIFIER ONLY KNOWS A FEW EXAMPLES PER DIGIT, SO IT LOOKS FOR THE CLOSEST MATCH. YOURS WAS VERY CLOSE.',
  ], 'bot');
  if (G.giveCos('goggles')) {
    await w.say(['* BITSY: PLEASE ACCEPT THESE LAB GOGGLES. SAFETY IS IMPORTANT. EVEN FOR HEARTS.', '* (New cosmetic: LAB GOGGLES.)'], 'bot');
    w.wearCosmetic();
  }
  w.freeze(false);
  st.busy = false;
}

export default logic;
