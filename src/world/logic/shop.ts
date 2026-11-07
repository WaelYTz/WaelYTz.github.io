// The Shop: Lumen, an original lantern-headed merchant, "sells" Wael's skills as items.
// Classic shop-scene layout: the shopkeeper in their shop on top, one box below split into a menu (left) and talk (right).
import type { RoomLogic, WorldApi } from '../types';
import { SKILLS } from '../../content/lore';
import { game as G } from '../../core/state';
import { audio } from '../../core/audio';
import { label, PixelText } from '../../core/text';
import type { UIScene } from '../../scenes/UI';
import { REDUCED } from '../../core/env';
import { input } from '../../core/input';

const TALK: Record<string, string[]> = {
  'About you': ["* I'm Lumen. I sell skills by lamplight.", '* The light helps people read the fine print.', '* ...There is no fine print. I just like the light.'],
  'About WAEL': ['* He comes by to restock. Mostly gradient boosting and agents.', "* Lately he's been building teams of little LLM workers.", '* They argue, then they agree. Then the tests pass.'],
  'Your prices': ['* Prices are symbolic. Everything here is open source anyway.', '* PyTorch costs one learning rate. A bargain.'],
  'Any advice?': ['* Win on validation first. Submit second.', '* ...I read that in the library. Good books in there.'],
};

const logic: RoomLogic = {
  async interact(w, e) {
    if (e.def.t !== 'lumen' && e.def.t !== 'counter') return false;
    await shop(w);
    return true;
  },
};

async function shop(w: WorldApi) {
  const ui = w.s.scene.get('ui') as UIScene;
  const release = ui.hold();
  w.freeze(true);
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (objs.push(o), o);

  // ── the shop interior
  const g = add(ui.add.graphics().setDepth(15));
  g.fillStyle(0x140a10).fillRect(0, 0, 640, 480);
  for (let y = 0; y < 214; y += 18) g.fillStyle(y % 36 ? 0x22121c : 0x1c0f18).fillRect(0, y, 640, 18); // wall planks
  g.fillStyle(0xffd23a, 0.06).fillCircle(320, 140, 120).fillStyle(0xffd23a, 0.06).fillCircle(320, 140, 80);
  const jar = [0xffd700, 0x39c5ff, 0xff4fa3, 0x3ddc84];
  for (const side of [0, 1]) for (let row = 0; row < 2; row++) {
    const y = 64 + row * 62;
    const x0 = side ? 432 : 40;
    g.fillStyle(0x000000).fillRect(x0 - 2, y + 26, 172, 8).fillStyle(0x6a3a20).fillRect(x0, y + 26, 168, 5);
    for (let k = 0; k < 4; k++) {
      const jx = x0 + 10 + k * 40;
      g.fillStyle(0x000000).fillRect(jx - 2, y - 2, 22, 30).fillStyle(jar[(k + row + side) % 4], 0.9).fillRect(jx, y, 18, 26);
      g.fillStyle(0xffffff, 0.7).fillRect(jx + 3, y + 4, 3, 10).fillStyle(0x000000).fillRect(jx - 1, y - 6, 20, 5);
    }
  }
  add(label(ui, 320, 14, "LUMEN'S SKILLS & SUNDRIES", 'p', 2, 'c').setDepth(16));
  const lumen = add(ui.add.sprite(320, 236, 'lumen-big', 0).setOrigin(0.5, 1).setScale(3).setDepth(16));
  // counter, with Lumen's gloves resting on it
  g.fillStyle(0x000000).fillRect(0, 210, 640, 40).fillStyle(0x7a4422).fillRect(0, 214, 640, 36).fillStyle(0xb8743a).fillRect(0, 214, 640, 5);
  const counter = add(ui.add.graphics().setDepth(17));
  counter.fillStyle(0x000000).fillRect(0, 210, 640, 4).fillStyle(0x7a4422).fillRect(0, 214, 640, 36).fillStyle(0xb8743a).fillRect(0, 214, 640, 5);
  add(ui.add.image(320, 206, 'lumen-hands').setOrigin(0.5, 0).setScale(3).setDepth(18));

  // ── the box: menu on the left, Lumen's words on the right
  const box = add(ui.add.graphics().setDepth(18));
  box.fillStyle(0x000000).fillRect(8, 250, 624, 222).lineStyle(6, 0xffffff).strokeRect(11, 253, 618, 216).fillStyle(0xffffff).fillRect(404, 253, 6, 216);
  const count = add(label(ui, 612, 440, '', 'g', 2, 'r').setDepth(19));
  const paintCount = () => {
    const n = SKILLS.filter((s) => G.has(s.id)).length;
    count.setText(`SKILLS ${n}/${SKILLS.length}`).setX(612 - count.width);
  };
  paintCount();

  // Lumen animation: flame flicker, the odd blink, and a moving mouth while talking
  let talking = false;
  let flick = false;
  const anim = ui.time.addEvent({
    delay: REDUCED ? 600 : 160, loop: true,
    callback: () => {
      flick = !flick;
      if (talking) lumen.setFrame(lumen.frame.name === '3' ? 0 : 3);
      else lumen.setFrame(Math.random() < 0.05 ? 2 : flick && !REDUCED ? 1 : 0);
    },
  });

  // typewriter in the right panel (a new line always cancels the one still being typed)
  const say = { t: null as PixelText | null, stop: null as (() => void) | null };
  const speak = (text: string, col = 'w') =>
    new Promise<void>((resolve) => {
      say.stop?.();
      say.t?.destroy();
      const t = new PixelText(ui, 430, 274, text.replace(/\{name\}/g, G.name), { scale: 2, cols: 15, color: col }).setDepth(19);
      say.t = t;
      let n = 0, acc = 0;
      talking = true;
      const tick = (_x: number, dt: number) => {
        acc += dt;
        const skip = input.consume('cancel');
        while ((acc > 28 || skip) && n < t.total) {
          acc -= 28;
          if (t.charAt(n) !== ' ') audio.blip('shop');
          n++;
        }
        t.reveal(n);
        if (n >= t.total) finish();
      };
      const finish = () => {
        ui.events.off('update', tick);
        say.stop = null;
        talking = false;
        resolve();
      };
      say.stop = finish;
      t.reveal(0);
      ui.events.on('update', tick);
    });

  void speak("* Hello, {name}! Skills by lamplight. Take your time.");
  let start = 0;
  for (;;) {
    const i = await ui.list(['Buy', 'Sell', 'Talk', 'Exit'], { x: 8, y: 262, w: 396, start, noBox: true });
    start = Math.max(0, i);
    if (i === 0) {
      void speak('* Take a look. Everything is open source.');
      for (;;) {
        const items = SKILLS.map((s) => `${s.name.padEnd(11)}${G.has(s.id) ? 'SOLD' : s.price}`);
        const k = await ui.list(items, {
          x: 8, y: 262, w: 396, rows: 7, scale: 2, noBox: true,
          colors: SKILLS.map((s) => (G.has(s.id) ? 'g' : 'w')),
          onMove: (n) => { say.stop?.(); say.t?.destroy(); say.t = new PixelText(ui, 430, 274, `${SKILLS[n].full}\n{g}${SKILLS[n].flavor}`, { scale: 2, cols: 15 }).setDepth(19); },
        });
        if (k < 0) break;
        const s = SKILLS[k];
        if (G.has(s.id)) {
          audio.sfx('error');
          await speak("* You already know that one! Knowledge doesn't stack.");
        } else {
          G.give(s.id);
          audio.sfx('buy');
          paintCount();
          await speak(`* ${s.name}! Excellent choice. Check your ITEM menu.`);
          if (SKILLS.filter((k) => G.has(k.id)).length >= 5 && G.giveCos('ribbon')) {
            await speak('* Five skills! A regular! Here, a ribbon. On the house.');
            (w.s.registry.get('world') as { wearCosmetic?: () => void })?.wearCosmetic?.();
          }
        }
      }
      void speak('* Anything else?');
    } else if (i === 1) {
      await speak("* Sell? Everything here is free and open. I couldn't buy it from you if I tried.");
    } else if (i === 2) {
      void speak('* Oh! What would you like to talk about?');
      const topics = Object.keys(TALK);
      const t = await ui.list(topics, { x: 8, y: 262, w: 396, noBox: true });
      if (t >= 0) {
        for (const line of TALK[topics[t]]) {
          await speak(line);
          await waitKey(ui);
        }
      }
      void speak('* Anything else?');
    } else {
      await speak('* Come back when you need more skills!');
      await new Promise((r) => ui.time.delayedCall(REDUCED ? 150 : 700, r));
      break;
    }
  }
  anim.remove();
  say.stop?.();
  say.t?.destroy();
  objs.forEach((o) => o.destroy());
  release();
  w.freeze(false);
}

function waitKey(ui: UIScene): Promise<void> {
  return new Promise((resolve) => {
    let clicked = false;
    const onDown = () => (clicked = true);
    ui.input.on('pointerdown', onDown);
    const tick = () => {
      if (clicked || input.consume('confirm') || input.consume('cancel')) {
        ui.events.off('update', tick);
        ui.input.off('pointerdown', onDown);
        resolve();
      }
    };
    ui.events.on('update', tick);
  });
}

export default logic;
