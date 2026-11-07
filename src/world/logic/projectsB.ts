// Ruins II: push the ball into the loss bowl (gradient descent), the learning-rate lever, and the One Road Out map table.
import Phaser from 'phaser';
import type { RoomLogic, WorldApi, Entity } from '../types';
import { TILE, canvasTex } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { label } from '../../core/text';
import { drawBox, type UIScene } from '../../scenes/UI';
import { input } from '../../core/input';

// Bowl in world px: ellipse region, with the loss minimum slightly off-centre.
const BX = 3 * TILE, BY = 3 * TILE, BW = 160, BH = 112;
const CX = BX + BW / 2, CY = BY + BH / 2, RX = BW / 2 - 4, RY = BH / 2 - 4;
const MU = 0.18, MV = 0.12; // minimum in normalized coords
const A = 2.2, B = 0.8; // f = A u'^2 + B v'^2
const LRS = [0.05, 0.2, 0.5];
const norm = (x: number, y: number) => ({ u: (x - CX) / RX, v: (y - CY) / RY });
const loss = (u: number, v: number) => A * (u - MU) ** 2 + B * (v - MV) ** 2;

let st: {
  ball: Entity; lever: Entity; lr: number; rolling: boolean; stepT: number; u: number; v: number;
  prev: { x: number; y: number }; readout: Phaser.GameObjects.BitmapText; lrText: Phaser.GameObjects.BitmapText;
  trail: Phaser.GameObjects.Rectangle[]; steps: number;
};

function bowlTexture(s: Phaser.Scene) {
  canvasTex(s, 'bowl', BW, BH, (c) => {
    const bands = ['#0f2a24', '#14403a', '#1b5a4a', '#2a7a52', '#4a9a4a', '#8ab840', '#d8d040', '#ffff60'];
    const img = c.createImageData(BW, BH);
    for (let y = 0; y < BH; y++)
      for (let x = 0; x < BW; x++) {
        const { u, v } = norm(BX + x + 0.5, BY + y + 0.5);
        if (u * u + v * v > 1) continue;
        const f = loss(u, v);
        const k = Math.max(0, Math.min(bands.length - 1, bands.length - 1 - Math.floor(Math.sqrt(f / 4.4) * bands.length * 1.15)));
        // contour lines where the band changes
        const f2 = loss(u + 1 / RX, v);
        const k2 = Math.max(0, Math.min(bands.length - 1, bands.length - 1 - Math.floor(Math.sqrt(f2 / 4.4) * bands.length * 1.15)));
        const col = k !== k2 ? '#cfe8df' : bands[k];
        const n = parseInt(col.slice(1), 16);
        const i = (y * BW + x) * 4;
        img.data[i] = n >> 16; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = 255;
      }
    c.putImageData(img, 0, 0);
    // the minimum
    const mx = Math.round(MU * RX + RX + 4), my = Math.round(MV * RY + RY + 4);
    c.fillStyle = '#ff0000';
    c.fillRect(mx - 2, my, 5, 1);
    c.fillRect(mx, my - 2, 1, 5);
  });
}

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    bowlTexture(s);
    s.add.image(BX, BY, 'bowl').setOrigin(0).setDepth(-6);
    const ball = w.ents.find((e) => e.def.t === 'ball')!;
    const lever = w.ents.find((e) => e.def.t === 'lever')!;
    const lr = (G.flag('lr') as number | undefined) ?? 1;
    st = {
      ball, lever, lr, rolling: false, stepT: 0, u: 0, v: 0, prev: { ...w.player },
      readout: label(s, CX, BY - 10, 'LOSS  -.--', 'w', 1, 'c').setDepth(-2),
      lrText: label(s, lever.tx * TILE + 8, lever.ty * TILE - 12, `LR ${LRS[lr]}`, 'y', 1, 'c').setDepth(9000),
      trail: [], steps: 0,
    };
    (lever.sprite as Phaser.GameObjects.Sprite).setFrame(lr === 0 ? 0 : 1);
    label(s, BX + 4, BY + BH + 4, 'loss landscape', 'g', 1).setDepth(-2);
  },

  update(w, dtMs) {
    const b = st.ball;
    const bs = b.sprite!;
    let bx = b.data.x as number, by = b.data.y as number;
    if (!st.rolling) {
      // pushing: if the SOUL moved into the ball, the ball moves with it
      const dx = w.player.x - st.prev.x, dy = w.player.y - st.prev.y;
      if ((dx || dy) && Math.abs(w.player.x - bx) < 10 && Math.abs(w.player.y - by) < 10) {
        const nx = bx + dx * 1.05, ny = by + dy * 1.05;
        const r = { x: nx - 5, y: ny - 5, w: 10, h: 10 };
        if (!w.solidAt(r)) { bx = nx; by = ny; }
        else { w.player.x = st.prev.x; w.player.y = st.prev.y; }
        // keep the SOUL from overlapping the ball
        if (Math.abs(w.player.x - bx) < 9 && Math.abs(w.player.y - by) < 9) { w.player.x = st.prev.x; w.player.y = st.prev.y; }
        b.data.x = bx; b.data.y = by;
        const { u, v } = norm(bx, by);
        if (u * u + v * v < 0.92) startRoll(w, u, v);
      }
    } else {
      st.stepT -= dtMs;
      if (st.stepT <= 0) void step(w);
    }
    st.prev = { ...w.player };
    bs.setPosition(Math.round(b.data.x as number), Math.round(b.data.y as number)).setDepth((b.data.y as number) + 5);
    b.hit = { x: (b.data.x as number) - 8, y: (b.data.y as number) - 8, w: 16, h: 16 };
  },

  async interact(w, e) {
    if (e.def.t === 'lever') {
      st.lr = (st.lr + 1) % LRS.length;
      G.setFlag('lr', st.lr);
      audio.sfx('select');
      (e.sprite as Phaser.GameObjects.Sprite).setFrame(st.lr === 0 ? 0 : 1);
      st.lrText.setText(`LR ${LRS[st.lr]}`);
      await w.say([`* You pull the lever. Learning rate: {y}${LRS[st.lr]}{w}.`,
        st.lr === 0 ? '* Small steps. Safe, but slow.' : st.lr === 1 ? '* A sensible step size.' : '* That is a very big step. What could go wrong?']);
      return true;
    }
    if (e.def.t === 'ball') {
      await w.say('* A smooth white ball. Walk into it to push it into the bowl.');
      return true;
    }
    if (e.def.t === 'maptable') {
      await roadPanel(w);
      return true;
    }
    return false;
  },

  destroy() {
    /* nothing to clean */
  },
};

function startRoll(w: WorldApi, u: number, v: number) {
  st.rolling = true;
  st.u = u;
  st.v = v;
  st.steps = 0;
  st.stepT = 250;
  st.trail.forEach((t) => t.destroy());
  st.trail = [];
  audio.sfx('select');
  void w;
}

async function step(w: WorldApi) {
  const s = w.s;
  const lr = LRS[st.lr];
  // one gradient-descent step on f(u, v) = A (u-mu)^2 + B (v-mv)^2
  const gu = 2 * A * (st.u - MU), gv = 2 * B * (st.v - MV);
  const ox = st.ball.data.x as number, oy = st.ball.data.y as number;
  st.trail.push(s.add.rectangle(ox, oy, 2, 2, 0xffff00).setDepth(-1));
  st.u -= lr * gu;
  st.v -= lr * gv;
  st.steps++;
  const nx = CX + st.u * RX, ny = CY + st.v * RY;
  st.readout.setText(`LOSS  ${loss(st.u, st.v).toFixed(2)}`);
  st.stepT = 260;
  audio.sfx('step');
  if (!REDUCED) s.tweens.add({ targets: st.ball.data, x: nx, y: ny, duration: 200 });
  else { st.ball.data.x = nx; st.ball.data.y = ny; }
  const r2 = st.u * st.u + st.v * st.v;
  if (r2 > 1.4) {
    st.rolling = false;
    w.freeze(true);
    await new Promise((r) => s.time.delayedCall(250, r));
    audio.sfx('error');
    await w.say(['* The learning rate was too big.', '* Each step overshot the minimum by more than the last... and the ball flew out of the bowl!', '* (Pull the lever for a smaller learning rate.)']);
    resetBall();
    w.freeze(false);
  } else if (Math.abs(st.u - MU) < 0.02 && Math.abs(st.v - MV) < 0.02) {
    st.rolling = false;
    st.ball.data.x = CX + MU * RX;
    st.ball.data.y = CY + MV * RY;
    audio.sfx('save');
    w.freeze(true);
    await w.say([`* The ball settled at the minimum after ${st.steps} steps.`,
      '* That is {y}gradient descent{w}: look at the slope, take a step downhill, repeat.',
      '* The same loop trains the linear regression in ML Algorithms From Scratch.']);
    w.freeze(false);
    // roll it back out after a moment so it can be pushed again
    resetBall();
  } else if (st.steps > 80) {
    st.rolling = false;
    resetBall();
  }
}

function resetBall() {
  st.ball.data.x = 8 * TILE + 8;
  st.ball.data.y = 11 * TILE + 8;
  st.rolling = false;
  st.readout.setText('LOSS  -.--');
}

// ───────────────────────── One Road Out panel ─────────────────────────
async function roadPanel(w: WorldApi) {
  const ui = w.s.scene.get('ui') as UIScene;
  const release = ui.hold();
  w.freeze(true);
  const objs: Phaser.GameObjects.GameObject[] = [];
  const g = ui.add.graphics().setDepth(25);
  objs.push(g);
  drawBox(g, 24, 20, 592, 440);
  objs.push(label(ui, 48, 40, 'ONE ROAD OUT', 'y', 3).setDepth(25));
  objs.push(label(ui, 48, 74, 'A toy picture of the finding (not real data)', 'g', 2).setDepth(25));
  const m = ui.add.graphics().setDepth(26);
  objs.push(m);
  // the main town: a grid of roads
  const ox = 70, oy = 110;
  m.lineStyle(4, 0x9a9a9a);
  for (let i = 0; i <= 4; i++) { m.lineBetween(ox, oy + i * 50, ox + 240, oy + i * 50); m.lineBetween(ox + i * 60, oy, ox + i * 60, oy + 200); }
  for (let i = 0; i < 16; i++) m.fillStyle(0x3a3a50).fillRect(ox + 8 + (i % 4) * 60, oy + 8 + Math.floor(i / 4) * 50, 44, 34);
  // wildfire hazard around the pocket
  m.fillStyle(0xff4000, 0.22).fillCircle(470, 210, 120);
  m.fillStyle(0xff8c1a, 0.18).fillCircle(470, 210, 80);
  // the pocket: houses on a little loop
  m.lineStyle(4, 0x9a9a9a).strokeCircle(470, 210, 46);
  for (let a = 0; a < 8; a++) m.fillStyle(0xd9d2b0).fillRect(470 + Math.cos(a * 0.785) * 64 - 6, 210 + Math.sin(a * 0.785) * 64 - 6, 12, 12);
  // the single link
  const link = ui.add.graphics().setDepth(26);
  objs.push(link);
  let on = true;
  const blink = ui.time.addEvent({ delay: 380, loop: true, callback: () => { on = !on; drawLink(); } });
  const drawLink = () => link.clear().lineStyle(8, on ? 0xff0000 : 0x701010).lineBetween(ox + 240, oy + 100, 424, 210);
  drawLink();
  const caption = ui.add.bitmapText(48, 330, 'px-w', '').setScale(2).setDepth(26);
  const caption2 = ui.add.bitmapText(48, 356, 'px-w', '').setScale(2).setDepth(26);
  const hint = label(ui, 48, 420, 'Z / CLICK: next     X: close', 'g', 2).setDepth(26);
  objs.push(caption, caption2, hint);
  const pages = [
    ['{r}2.88M residents{w} live behind a single', 'road link, in 13,775 pockets.'],
    ["The challenge's road layer dropped", 'service and pedestrian roads...'],
    ['...and for some pockets, a second way', 'out existed in exactly those roads.'],
  ];
  const service = ui.add.graphics().setDepth(26);
  objs.push(service);
  let page = 0;
  const show = () => {
    const strip = (s: string) => s.replace(/\{[a-z]\}/g, '');
    caption.setText(strip(pages[page][0])).setFont(page === 0 ? 'px-y' : 'px-w');
    caption2.setText(pages[page][1]);
    service.clear();
    if (page === 2) {
      service.fillStyle(0x6fd0ff);
      for (let t = 0; t < 1; t += 0.06) {
        const x = 470 + (ox + 240 - 470) * t, y = 256 + (oy + 200 - 256) * t + Math.sin(t * 6) * 10;
        service.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  };
  show();
  audio.sfx('alert');
  await new Promise<void>((resolve) => {
    let clicked = false;
    const onDown = () => (clicked = true);
    ui.input.on('pointerdown', onDown);
    const tick = () => {
      if (input.consume('cancel') || input.consume('menu')) return done();
      if (input.consume('confirm') || clicked) {
        clicked = false;
        page++;
        audio.sfx('move');
        if (page >= pages.length) return done();
        show();
      }
    };
    const done = () => {
      ui.events.off('update', tick);
      ui.input.off('pointerdown', onDown);
      blink.remove();
      objs.forEach((o) => o.destroy());
      resolve();
    };
    ui.events.on('update', tick);
  });
  release();
  w.freeze(false);
}

export default logic;
