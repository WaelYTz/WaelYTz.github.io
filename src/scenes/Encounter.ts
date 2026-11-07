// Bullet-box encounters (lazy-loaded). FIGHT / ACT / ITEM / MERCY. Every monster has themed attacks that its ACTs visibly
// change, a mercy condition, and flavour text each turn. MERCY > Flee always works. THE LEADERBOARD is the optional boss.
import Phaser from 'phaser';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { game as G } from '../core/state';
import { REDUCED } from '../core/env';
import { PixelText, parseRich, wrap, label, textW } from '../core/text';
import { buildEnemies, gridTex, canvasTex } from '../core/art';
import { C } from '../core/palette';
import { ENEMIES, type EnemyDef, type Pattern } from '../content/enemies';
import { SKILLS } from '../content/lore';
import { profileEncounter } from '../core/remote';

export type Result = 'spared' | 'fought' | 'fled' | 'died';

// Button icons from the profile toolkit (build_assets.py).
const ICONS: Record<string, string[]> = {
  FIGHT: ['......##', '.....###', '....###.', '#..###..', '.####...', '..##....', '.####...', '##..#...'],
  ACT: ['.#######.', '#.......#', '#.#.#.#.#', '#.......#', '.###.###.', '...##....', '..##.....', '.##......'],
  ITEM: ['...###...', '..#...#..', '...###...', '.#######.', '#.......#', '#.#####.#', '#.......#', '.#######.'],
  MERCY: ['##.....##', '.##...##.', '..##.##..', '...###...', '..##.##..', '.##...##.', '##.....##', '.........'],
};
const BTNS = ['FIGHT', 'ACT', 'ITEM', 'MERCY'] as const;
type Box = { x: number; y: number; w: number; h: number };
const BIG: Box = { x: 32, y: 250, w: 576, h: 140 };

interface Bullet {
  kind: string;
  x: number; y: number; w: number; h: number; vx: number; vy: number; ay: number;
  t: number; life: number; warn: number;
  grazed?: boolean; still?: boolean; // still: only hurts a moving SOUL
  x2?: number; y2?: number; // segments
  path?: { x: number; y: number }[]; delay?: number; // replayed paths
  txt?: Phaser.GameObjects.BitmapText;
  dead?: boolean;
  data?: number[];
}

export async function runEncounter(world: Phaser.Scene, enemy: string): Promise<Result> {
  const mgr = world.game.scene;
  if (!mgr.keys.encounter) mgr.add('encounter', EncounterScene, false);
  return new Promise((resolve) => {
    world.scene.pause();
    world.scene.launch('encounter', {
      enemy,
      done: (r: Result) => {
        world.scene.stop('encounter');
        world.scene.resume();
        resolve(r);
      },
    });
    world.scene.bringToTop('ui');
  });
}

export class EncounterScene extends Phaser.Scene {
  private e!: EnemyDef;
  private done!: (r: Result) => void;
  private box: Box = { ...BIG };
  private dbox: Box = { ...BIG };
  private boxG!: Phaser.GameObjects.Graphics;
  private bulG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private mask!: Phaser.Display.Masks.GeometryMask;
  private enemy!: Phaser.GameObjects.Sprite;
  private heart!: Phaser.GameObjects.Image;
  private btnG!: Phaser.GameObjects.Graphics;
  private btnLabels: Phaser.GameObjects.BitmapText[] = [];
  private btnIcons: Phaser.GameObjects.Image[] = [];
  private hpText!: Phaser.GameObjects.BitmapText;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hint: Phaser.GameObjects.BitmapText | null = null;
  private sel = 0;
  private mode: 'menu' | 'busy' | 'dodge' | 'aim' = 'busy';
  private fx = new Set<string>();
  private enemyHp = 3;
  private turn = 0;
  private bullets: Bullet[] = [];
  private pats: Pattern[] = [];
  private pt: Record<string, number> = {};
  private trail: { x: number; y: number }[] = [];
  private dodgeT = 0;
  private waveLen = 5.5;
  private iframes = 0;
  private hx = 0;
  private hy = 0;
  private moved = false;
  private stillT = 0;
  private eye: Phaser.GameObjects.Image | null = null;
  private boxText: PixelText | null = null;
  private clicked = false;
  private ptrDown = false;
  private ptr = { x: 0, y: 0 };
  private savedOnce = false;

  constructor() {
    super('encounter');
  }

  init(d: { enemy: string; done: (r: Result) => void }) {
    this.e = ENEMIES[d.enemy] ?? ENEMIES.overfit;
    this.done = d.done;
    this.enemyHp = this.e.hp;
    this.fx = new Set();
    this.turn = 0;
    this.sel = 0;
    this.bullets = [];
    this.box = { ...BIG };
    this.dbox = { x: 320 - this.e.box.w / 2, y: 392 - this.e.box.h, w: this.e.box.w, h: this.e.box.h };
    this.mode = 'busy';
    this.btnLabels = [];
    this.btnIcons = [];
    this.hint = null;
    this.eye = null;
    this.savedOnce = false;
  }

  create() {
    buildEnemies(this);
    for (const [k, rows] of Object.entries(ICONS)) {
      gridTex(this, 'ico-' + k, rows, { '#': C.orange });
      gridTex(this, 'ico-y-' + k, rows, { '#': C.yellow });
    }
    this.buildFx();
    this.add.rectangle(0, 0, 640, 480, 0x000000).setOrigin(0);
    this.backdrop();
    this.enemy = this.add.sprite(320, 232, this.e.tex, 0).setOrigin(0.5, 1).setScale(3);
    this.time.addEvent({ delay: REDUCED ? 900 : 380, loop: true, callback: () => { if (this.enemy.frame.name !== '2') this.enemy.setFrame(this.enemy.frame.name === '0' ? 1 : 0); } });
    if (!REDUCED) this.tweens.add({ targets: this.enemy, y: 228, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.boxG = this.add.graphics();
    this.bulG = this.add.graphics();
    this.fxG = this.add.graphics().setDepth(6);
    const m = this.make.graphics({}, false);
    this.mask = m.createGeometryMask();
    this.bulG.setMask(this.mask);
    this.events.on('update', () => {
      m.clear().fillStyle(0xffffff).fillRect(this.box.x + 5, this.box.y + 5, this.box.w - 10, this.box.h - 10);
    });
    this.heart = this.add.image(0, 0, 'soul-small').setScale(3).setVisible(false).setDepth(5);

    label(this, 32, 404, G.name.slice(0, 8), 'w', 3);
    label(this, 200, 404, `LV ${G.s.lv}`, 'w', 3);
    label(this, 300, 408, 'HP', 'w', 2);
    this.hpBar = this.add.graphics();
    this.hpText = label(this, 410, 404, '', 'w', 3);
    this.paintHp();

    this.btnG = this.add.graphics();
    BTNS.forEach((b, i) => {
      const x = 32 + i * 154;
      this.btnIcons.push(this.add.image(x + 26, 453, 'ico-' + b).setScale(3));
      this.btnLabels.push(label(this, x + 52, 446, b, 'o', 2));
      const z = this.add.zone(x, 430, 140, 46).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => this.mode === 'menu' && this.setSel(i));
      z.on('pointerup', () => this.mode === 'menu' && (this.setSel(i), void this.pick()));
    });
    this.paintButtons();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.clicked = true; this.ptrDown = true; this.ptr = { x: p.x, y: p.y }; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.ptr = { x: p.x, y: p.y }; });
    this.input.on('pointerup', () => (this.ptrDown = false));

    audio.music(this.e.music ?? 'battle');
    void this.start();
  }

  /** A quiet field of drifting data points behind the monster (original backdrop). */
  private backdrop() {
    const g = this.add.graphics();
    const col = this.e.boss ? 0x2a2040 : 0x10241c;
    for (let x = 16; x < 640; x += 32) for (let y = 16; y < 236; y += 32) {
      const v = (x * 7 + y * 13) % 5;
      g.fillStyle(col, 1).fillRect(x, y, v === 0 ? 3 : 1, v === 0 ? 3 : 1);
    }
    g.lineStyle(1, col, 1).strokeRect(8.5, 8.5, 623, 232);
  }

  /** Attack target and slash frames, drawn once. */
  private buildFx() {
    canvasTex(this, 'atk-target', 544, 112, (c) => {
      for (let k = 0; k < 7; k++) {
        const rx = 272 - k * 38, ry = 52 - k * 6;
        c.strokeStyle = k % 2 ? '#2a2a2a' : '#5a5a5a';
        c.lineWidth = 6;
        c.beginPath(); c.ellipse(272, 56, rx, ry, 0, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = '#ffffff';
      c.fillRect(268, 8, 8, 96);
      c.fillStyle = '#000000';
      c.fillRect(270, 10, 4, 92);
    });
    canvasTex(this, 'slash', 64 * 6, 96, (c) => {
      for (let f = 0; f < 6; f++) {
        const ox = f * 64;
        const len = Math.min(1, (f + 1) / 3);
        const fade = f >= 3 ? 1 - (f - 2) / 4 : 1;
        for (let i = 0; i < 90 * len; i++) {
          const t = i / 90;
          const x = ox + 52 - t * 40 + Math.sin(t * Math.PI) * 10;
          const y = 4 + t * 88;
          const w = Math.max(1, Math.round(Math.sin(t * Math.PI) * 7));
          c.fillStyle = `rgba(255,${f < 2 ? 255 : 60},${f < 2 ? 255 : 60},${fade})`;
          c.fillRect(Math.round(x), Math.round(y), w, 2);
        }
      }
    });
    const t = this.textures.get('slash');
    for (let f = 0; f < 6; f++) t.add(f, 0, f * 64, 0, 64, 96);
  }

  private paintHp() {
    const w = 64;
    this.hpBar.clear().fillStyle(0xc00000).fillRect(330, 404, w, 21).fillStyle(0xffff00).fillRect(330, 404, Math.max(0, (w * Math.min(G.s.hp, G.s.maxHp)) / G.s.maxHp), 21);
    this.hpText.setText(`${G.s.hp} / ${G.s.maxHp}`);
  }

  private paintButtons() {
    this.btnG.clear();
    BTNS.forEach((b, i) => {
      const on = this.mode === 'menu' && i === this.sel;
      const x = 32 + i * 154;
      this.btnG.lineStyle(4, on ? 0xffff00 : 0xff8c1a).strokeRect(x + 2, 432, 136, 42);
      this.btnLabels[i].setFont(on ? 'px-y' : 'px-o');
      this.btnIcons[i].setTexture(on ? 'ico-y-' + b : 'ico-' + b).setVisible(!on);
    });
    if (this.mode === 'menu') this.heart.setVisible(true).setPosition(32 + this.sel * 154 + 26, 453);
  }

  private setSel(i: number) {
    if (i !== this.sel) audio.sfx('move');
    this.sel = i;
    this.paintButtons();
  }

  private drawBox() {
    const b = this.box;
    this.boxG.clear().fillStyle(0x000000).fillRect(b.x, b.y, b.w, b.h).lineStyle(5, 0xffffff).strokeRect(b.x + 2.5, b.y + 2.5, b.w - 5, b.h - 5);
  }

  private resize(to: Box): Promise<void> {
    return new Promise((res) => {
      if (REDUCED) {
        this.box = { ...to };
        this.drawBox();
        return res();
      }
      this.tweens.add({ targets: this.box, x: to.x, y: to.y, w: to.w, h: to.h, duration: 280, ease: 'Sine.easeInOut', onUpdate: () => this.drawBox(), onComplete: () => res() });
    });
  }

  private text(pages: string[]): Promise<void> {
    return new Promise((resolve) => {
      const all: ReturnType<typeof wrap>[] = [];
      for (const p of pages) {
        const lines = wrap(parseRich(p.replace(/\{name\}/g, G.name)), 28);
        for (let i = 0; i < lines.length; i += 3) all.push(lines.slice(i, i + 3));
      }
      let page = 0, shown = 0, acc = 0;
      const show = () => {
        this.boxText?.destroy();
        this.boxText = new PixelText(this, BIG.x + 28, BIG.y + 22, '', { scale: 3, cols: 28 });
        this.boxText.setLines(all[page]);
        shown = 0;
        this.boxText.reveal(0);
      };
      show();
      this.clicked = false;
      const tick = (_t: number, dt: number) => {
        const t = this.boxText!;
        const click = this.clicked;
        this.clicked = false;
        if (shown < t.total) {
          if (input.consume('confirm') || input.consume('cancel') || click) shown = t.total;
          acc += dt;
          while (acc > 40 && shown < t.total) {
            acc -= 40;
            if (t.charAt(shown) !== ' ') audio.blip('narrator');
            shown++;
          }
          t.reveal(shown);
          return;
        }
        if (input.consume('confirm') || click) {
          page++;
          if (page >= all.length) {
            this.events.off('update', tick);
            this.boxText?.destroy();
            this.boxText = null;
            resolve();
          } else show();
        }
      };
      this.events.on('update', tick);
    });
  }

  private choose(opts: { s: string; c?: string }[]): Promise<number> {
    return new Promise((resolve) => {
      const objs: Phaser.GameObjects.GameObject[] = [];
      let sel = 0;
      const pos = opts.map((_, i) => ({ x: BIG.x + 60 + (i % 2) * 270, y: BIG.y + 24 + Math.floor(i / 2) * 36 }));
      opts.forEach((o, i) => {
        objs.push(label(this, pos[i].x, pos[i].y, '* ' + o.s, o.c ?? 'w', 3));
        const z = this.add.zone(pos[i].x - 40, pos[i].y - 6, 260, 34).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => { if (sel !== i) { sel = i; audio.sfx('move'); paint(); } });
        z.on('pointerup', () => { sel = i; finish(i); });
        objs.push(z);
      });
      const paint = () => this.heart.setVisible(true).setPosition(pos[sel].x - 24, pos[sel].y + 9);
      paint();
      const finish = (v: number) => {
        this.events.off('update', tick);
        objs.forEach((o) => o.destroy());
        audio.sfx(v < 0 ? 'back' : 'select');
        resolve(v);
      };
      const tick = () => {
        const n = opts.length;
        const step = (d: number) => { sel = (sel + d + n) % n; audio.sfx('move'); paint(); };
        if (input.consume('right')) step(1);
        if (input.consume('left')) step(-1);
        if (input.consume('down')) step(Math.min(2, n - 1));
        if (input.consume('up')) step(-Math.min(2, n - 1));
        if (input.consume('confirm')) finish(sel);
        else if (input.consume('cancel')) finish(-1);
      };
      this.events.on('update', tick);
    });
  }

  private spareable() {
    return this.e.spareNeeds.every((f) => this.fx.has(f));
  }

  private async start() {
    this.drawBox();
    await this.text(this.e.intro);
    this.menu();
  }

  private menu() {
    this.mode = 'menu';
    this.paintButtons();
    const idle = this.spareable() ? `* ${this.e.name} looks ready to be spared.` : this.e.idle[(this.turn + this.fx.size) % this.e.idle.length];
    this.boxText?.destroy();
    this.boxText = new PixelText(this, BIG.x + 28, BIG.y + 22, idle, { scale: 3, cols: 28 });
  }

  private async pick() {
    if (this.mode !== 'menu') return;
    audio.sfx('select');
    this.mode = 'busy';
    this.boxText?.destroy();
    this.boxText = null;
    this.paintButtons();
    const b = BTNS[this.sel];
    if (b === 'FIGHT') return this.hit(await this.fight());
    if (b === 'ACT') {
      const acts = [{ s: 'Check' }, ...this.e.acts.map((a) => ({ s: a.name, c: this.fx.has(a.effect) ? 'g' : 'w' }))];
      const i = await this.choose(acts);
      if (i < 0) return this.menu();
      if (i === 0) await this.text(this.e.check);
      else {
        const a = this.e.acts[i - 1];
        this.fx.add(a.effect);
        await this.text(a.text);
        if (this.spareable()) await this.text([`* ${this.e.name}'s attacks soften. Its name glows yellow.`]);
      }
      return this.enemyTurn();
    }
    if (b === 'ITEM') {
      const items = G.s.inventory.map((id) => SKILLS.find((s) => s.id === id)!).filter(Boolean).slice(0, 6);
      if (!items.length) {
        await this.text(['* You check your pockets.', "* Nothing but lint. (Lumen's shop sells skills.)"]);
        return this.menu();
      }
      const i = await this.choose(items.map((s) => ({ s: s.name })));
      if (i < 0) return this.menu();
      const s = items[i];
      const before = G.s.hp;
      G.s.hp = Math.min(G.s.maxHp, G.s.hp + s.heal);
      audio.sfx('heal');
      this.paintHp();
      await this.text([`* You use ${s.name}. ${s.use}`, G.s.hp >= G.s.maxHp ? '* Your HP was maxed out.' : `* You recovered ${G.s.hp - before} HP!`]);
      return this.enemyTurn();
    }
    const i = await this.choose([{ s: 'Spare', c: this.spareable() ? 'y' : 'w' }, { s: 'Flee' }]);
    if (i < 0) return this.menu();
    if (i === 1) {
      await this.text(this.e.boss ? ['* You step back from the board.', '* (It will be here when you are ready.)'] : ['* You decided to leave.', '* (The tile will keep glowing, in case you change your mind.)']);
      return this.end('fled');
    }
    if (!this.spareable()) {
      await this.text([`* You tried to spare ${this.e.name}.`, `* ...But it isn't ready yet. Maybe ACT first?`]);
      return this.enemyTurn();
    }
    audio.sfx('spare');
    this.tweens.add({ targets: this.enemy, alpha: 0.4, duration: 400 });
    const lines = [...this.e.spare];
    const enc = await profileEncounter();
    if (enc && enc.mercy > 0) lines.push(`* (On WAEL's GitHub profile, ${enc.mercy} visitor${enc.mercy === 1 ? '' : 's'} chose MERCY too.)`);
    await this.text(['* YOU WON!', ...lines]);
    G.s.spared.push(this.e.id);
    return this.end('spared');
  }

  // ───────────────────────── FIGHT ─────────────────────────
  private fight(): Promise<number> {
    return new Promise((resolve) => {
      this.mode = 'aim';
      this.heart.setVisible(false);
      const b = BIG;
      const target = this.add.image(320, b.y + b.h / 2, 'atk-target').setAlpha(0);
      this.tweens.add({ targets: target, alpha: 1, duration: REDUCED ? 1 : 120 });
      const bar = this.add.rectangle(b.x + 18, b.y + 14, 10, b.h - 28, 0xffffff).setOrigin(0).setStrokeStyle(2, 0x000000);
      const crossMs = 1100;
      let x = b.x + 18;
      let stopped = false;
      this.clicked = false;
      const tick = (_t: number, dt: number) => {
        if (stopped) return;
        x += ((b.w - 40) / crossMs) * dt;
        bar.setX(x);
        const click = this.clicked;
        this.clicked = false;
        const end = x > b.x + b.w - 24;
        if (input.consume('confirm') || click || end) {
          stopped = true;
          this.events.off('update', tick);
          const acc = end ? 0 : 1 - Math.abs(x + 5 - 320) / (b.w / 2 - 20);
          if (!REDUCED && !end) this.tweens.add({ targets: bar, alpha: 0.2, duration: 60, yoyo: true, repeat: 3 });
          if (end) this.tweens.add({ targets: bar, alpha: 0, duration: 300 });
          this.time.delayedCall(REDUCED ? 0 : end ? 300 : 480, () => {
            target.destroy();
            bar.destroy();
            resolve(acc);
          });
        }
      };
      this.events.on('update', tick);
    });
  }

  private async hit(acc: number) {
    if (acc < 0.12) {
      const t = label(this, 320, 70, 'MISS', 'g', 3, 'c');
      this.tweens.add({ targets: t, y: 50, duration: 150, ease: 'Quad.easeOut', yoyo: true });
      await this.wait(900);
      t.destroy();
      return this.enemyTurn();
    }
    const crit = acc > 0.94;
    const dmg = crit ? 2 : 1;
    // slash: 6 frames, then a tiny hit-stop, then the shake
    audio.sfx('slash');
    const sl = this.add.sprite(320, 120, 'slash', 0).setScale(2).setDepth(10);
    for (let f = 1; f < 6; f++) { await this.wait(55); sl.setFrame(f); }
    sl.destroy();
    audio.sfx('hit');
    this.enemy.setFrame(2);
    await this.wait(REDUCED ? 0 : 80);
    if (!REDUCED) {
      const x0 = 320;
      this.tweens.addCounter({ from: 1, to: 0, duration: 450, onUpdate: (tw) => this.enemy.setX(x0 + Math.sin(tw.getValue()! * 40) * 8 * tw.getValue()!), onComplete: () => this.enemy.setX(x0) });
    }
    const before = this.enemyHp;
    this.enemyHp = Math.max(0, this.enemyHp - dmg);
    // damage number + HP bar with a ghost segment
    const num = label(this, 320, 64, crit ? 'CRITICAL!' : String(dmg * 37 + Math.round(acc * 20)), 'r', 3, 'c');
    this.tweens.add({ targets: num, y: 44, duration: 150, ease: 'Quad.easeOut', yoyo: true });
    const hb = this.add.graphics();
    const bw = 200, bx = 220, by = 240;
    const drawBar = (now: number, ghost: number) => {
      hb.clear().fillStyle(0x000000).fillRect(bx - 2, by - 2, bw + 4, 16).fillStyle(0x404040).fillRect(bx, by, bw, 12);
      hb.fillStyle(0xffffff, 0.6).fillRect(bx, by, (bw * ghost) / this.e.hp, 12);
      hb.fillStyle(0x3ddc84).fillRect(bx, by, (bw * now) / this.e.hp, 12);
    };
    drawBar(before, before);
    this.tweens.addCounter({ from: before, to: this.enemyHp, duration: REDUCED ? 1 : 500, ease: 'Cubic.easeOut', onUpdate: (tw) => drawBar(tw.getValue()!, before) });
    this.time.delayedCall(700, () => drawBar(this.enemyHp, this.enemyHp));
    await this.wait(1000);
    num.destroy();
    hb.destroy();
    this.enemy.setFrame(0);
    if (this.enemyHp <= 0) {
      audio.music('');
      this.tweens.add({ targets: this.enemy, alpha: 0, scaleY: 0.2, duration: REDUCED ? 1 : 800 });
      await this.wait(800);
      await this.text(['* YOU WON!', ...this.e.win]);
      G.s.fought.push(this.e.id);
      G.s.lv++;
      return this.end('fought');
    }
    return this.enemyTurn();
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
  }

  // ───────────────────────── enemy turn ─────────────────────────
  private async enemyTurn() {
    this.mode = 'busy';
    this.paintButtons();
    this.heart.setVisible(false);
    const bub = this.e.bubbles[this.turn % this.e.bubbles.length];
    const bw = Math.max(120, textW(bub, 2) + 24);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff).fillRoundedRect(440, 60, bw, 36, 6).fillTriangle(440, 74, 440, 86, 424, 80);
    const bt = label(this, 452, 71, bub, 'b', 2);
    await this.resize(this.dbox);
    await this.wait(REDUCED ? 600 : 1000);
    bg.destroy();
    bt.destroy();
    const turns = this.e.turns;
    this.pats = turns[Math.min(this.turn, turns.length - 1)];
    this.turn++;
    const b = this.dbox;
    this.hx = b.x + b.w / 2;
    this.hy = b.y + b.h / 2;
    this.heart.setVisible(true).setPosition(this.hx, this.hy).setTexture('soul-small');
    this.bullets = [];
    this.pt = {};
    this.trail = [];
    this.dodgeT = 0;
    this.stillT = 0;
    this.waveLen = this.e.boss ? 6.8 : 5.6;
    if (this.pats.includes('future') && !this.fx.has('time')) this.hint = label(this, 320, 18, 'CYAN DROPS ONLY HIT A MOVING SOUL', 'c', 2, 'c');
    if (this.pats.includes('memorize')) this.hint = label(this, 320, 18, 'IT IS MEMORIZING YOUR PATH...', 'y', 2, 'c');
    if (this.pats.includes('dropout')) this.hint = label(this, 320, 18, 'STAND WHERE THE CELLS DROP OUT', 'w', 2, 'c');
    if (this.pats.includes('attention')) {
      this.eye = this.add.image(320, b.y - 26, 'att-eye').setScale(2).setDepth(7);
      this.hint = label(this, 320, 18, 'KEEP MOVING: IT WATCHES WHAT STAYS STILL', 'r', 2, 'c');
    }
    this.mode = 'dodge';
    await new Promise<void>((res) => this.events.once('dodge-over', res));
    this.hint?.destroy();
    this.hint = null;
    this.eye?.destroy();
    this.eye = null;
    this.clearBullets();
    this.fxG.clear();
    if (G.s.hp <= 0) return this.died();
    await this.resize(BIG);
    this.menu();
  }

  private clearBullets() {
    this.bulG.clear();
    for (const u of this.bullets) u.txt?.destroy();
    this.bullets = [];
  }

  private async died() {
    this.mode = 'busy';
    if (this.e.boss && !this.savedOnce) {
      // once per boss fight: the SOUL refuses to break
      this.savedOnce = true;
      audio.sfx('heal');
      G.s.hp = G.s.maxHp;
      this.paintHp();
      await this.resize(BIG);
      await this.text(['* Your SOUL flickers...', '* ...then steadies.', '* Technoblade never dies. Neither do you. (HP restored, once.)']);
      return this.menu();
    }
    audio.music('');
    this.heart.setTexture('soul-small-hurt');
    audio.sfx('hit');
    await this.wait(700);
    this.heart.setVisible(false);
    audio.sfx('reset');
    for (let i = 0; i < 6; i++) {
      const s = this.add.rectangle(this.hx, this.hy, 6, 6, 0xff0000);
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      this.tweens.add({ targets: s, x: this.hx + Math.cos(a) * 60, y: this.hy + Math.sin(a) * 40 + 80, alpha: 0, duration: REDUCED ? 1 : 900, onComplete: () => s.destroy() });
    }
    await this.wait(1100);
    G.s.hp = G.s.maxHp;
    this.paintHp();
    await this.resize(BIG);
    await this.text(['* ...', '* Somewhere far away, a bell rings.', '* Everything returns to how it was a moment ago.', "* {name}! Get up! You're filled with DETERMINATION."]);
    return this.end('died');
  }

  private end(r: Result) {
    this.mode = 'busy';
    input.clearFrame();
    this.clearBullets();
    this.add.rectangle(0, 0, 640, 480, 0x000000).setOrigin(0).setDepth(100);
    audio.sfx('door');
    this.time.delayedCall(REDUCED ? 0 : 180, () => this.done(r));
  }

  // ───────────────────────── attack patterns ─────────────────────────
  private add2(u: Partial<Bullet> & { kind: string; x: number; y: number }) {
    const b: Bullet = { w: 8, h: 8, vx: 0, vy: 0, ay: 0, t: 0, life: 4, warn: 0, ...u };
    this.bullets.push(b);
    return b;
  }

  private spawn(p: Pattern, dt: number, speed: number) {
    const b = this.dbox;
    const ix = b.x + 6, iy = b.y + 6, iw = b.w - 12, ih = b.h - 12;
    const cool = (k: string, ms: number) => {
      this.pt[k] = (this.pt[k] ?? 0) - dt;
      if (this.pt[k] > 0) return false;
      this.pt[k] = ms;
      return true;
    };
    const n = (k: string) => (this.pt[k + '#'] = (this.pt[k + '#'] ?? 0) + 1);
    const fx = this.fx;
    switch (p) {
      case 'memorize': {
        // record the SOUL's path, then replay it as a stream of pellets along exactly that path
        if (this.dodgeT < 2.2) {
          if (cool('rec', 60)) this.trail.push({ x: this.hx, y: this.hy });
          return;
        }
        if (!this.pt.replayed) {
          this.pt.replayed = 1;
          const noise = fx.has('test') ? 14 : 0;
          const path = this.trail.map((q) => ({ x: q.x + (Math.random() - 0.5) * noise, y: q.y + (Math.random() - 0.5) * noise }));
          const count = fx.has('drop') ? 10 : 16;
          for (let i = 0; i < count; i++) {
            if (fx.has('drop') && i % 3 === 2) continue;
            this.add2({ kind: 'trailer', x: path[0].x, y: path[0].y, path, delay: i * 0.09, life: 3.3, warn: 0.35 });
          }
        }
        return;
      }
      case 'bones': {
        if (!cool('bones', 360 / speed)) return;
        const k = n('bones');
        if (fx.has('drop') && k % 5 === 2) return;
        const offs = [-34, 26, -12, 36, -36, 14, -22, 30, 0, -28];
        const gap = fx.has('reg') ? 70 : 54;
        const cy = iy + ih / 2 + offs[k % offs.length] * (ih / 150);
        const fromLeft = this.turn > 3 && k % 2 === 1;
        const x = fromLeft ? ix - 12 : ix + iw + 2;
        const vx = (fromLeft ? 1 : -1) * 120 * speed;
        this.add2({ kind: 'bone', x, y: iy - 6, w: 10, h: cy - gap / 2 - iy + 6, vx });
        this.add2({ kind: 'bone', x, y: cy + gap / 2, w: 10, h: iy + ih - (cy + gap / 2) + 6, vx });
        return;
      }
      case 'dots': {
        if (!cool('dots', 1500)) return;
        const pts: [number, number][] = [];
        const m = fx.has('reg') ? 4 : 6;
        for (let k = 0; k < m; k++) pts.push([ix + 14 + (k * (iw - 28)) / (m - 1), iy + 14 + Math.random() * (ih - 28)]);
        for (const [x, y] of pts) this.add2({ kind: 'dot', x: x - 3, y: y - 3, w: 6, h: 6, life: 1.5 });
        for (let k = 0; k < m - 1; k++) this.add2({ kind: 'seg', x: pts[k][0], y: pts[k][1], x2: pts[k + 1][0], y2: pts[k + 1][1], life: 1.5, warn: 0.75 });
        return;
      }
      case 'drops':
      case 'future': {
        const rate = (fx.has('brag') ? 105 : 150) / speed;
        if (!cool(p, rate)) return;
        const future = p === 'future' && !fx.has('time') && Math.random() < 0.6;
        const slow = fx.has('audit') ? 0.72 : 1;
        this.add2({ kind: future ? 'future' : 'drop', x: ix + Math.random() * (iw - 8), y: iy - 10, w: 8, h: 10, vy: (future ? 100 : 55) * slow * speed, ay: (future ? 110 : 220) * slow, life: 3, still: future });
        return;
      }
      case 'split': {
        // the box splits into PAST | FUTURE; rain falls only on the future side, then the sides swap (with a warning)
        const side = Math.floor(this.dodgeT / 2.4) % 2; // 0 = right is future
        const flip = (this.dodgeT % 2.4) > 1.9;
        this.fxG.clear().lineStyle(2, flip ? 0xff8c1a : 0x606060).lineBetween(320, b.y + 6, 320, b.y + b.h - 6);
        if (flip) return;
        if (!cool('split', (fx.has('audit') ? 130 : 95) / speed)) return;
        const x0 = side === 0 ? 324 : ix;
        this.add2({ kind: 'drop', x: x0 + Math.random() * (iw / 2 - 12), y: iy - 10, w: 8, h: 10, vy: 70 * speed, ay: 200, life: 3 });
        return;
      }
      case 'rings': {
        if (!cool('rings', 1000 / speed)) return;
        const cx = ix + 24 + Math.random() * (iw - 48), cy = iy + 24 + Math.random() * (ih - 48);
        const k = this.turn > 2 ? 12 : 10;
        const spin = fx.has('mom') ? 0.9 : 0;
        for (let i = 0; i < k; i++) {
          const a = (i / k) * Math.PI * 2 + n('rings');
          this.add2({ kind: 'pellet', x: cx - 4, y: cy - 4, vx: Math.cos(a), vy: Math.sin(a), life: 3.2, warn: 0.55, data: [a, spin] });
        }
        return;
      }
      case 'descent': {
        // pellets roll down a loss curve to its minimum, where they pile up and vanish; the ridges are safe
        const minX = ix + iw / 2 + Math.sin(this.turn) * iw * 0.2;
        this.fxG.clear().lineStyle(1, 0x3a5a4a);
        for (let x = ix; x < ix + iw; x += 4) {
          const y = iy + ih - 6 - Math.min(ih - 20, ((x - minX) / (iw / 2)) ** 2 * (ih - 30));
          this.fxG.fillStyle(0x3a5a4a).fillRect(x, y, 2, 2);
        }
        if (!cool('descent', (fx.has('lr') ? 260 : 180) / speed)) return;
        const startX = Math.random() < 0.5 ? ix + 4 + Math.random() * 30 : ix + iw - 34 + Math.random() * 30;
        this.add2({ kind: 'roller', x: startX, y: iy, life: 4, data: [minX, fx.has('lr') ? 0.6 : 1, fx.has('clip') ? 1 : 0] });
        return;
      }
      case 'beams': {
        if (!cool('beams', 760 / speed)) return;
        const vertical = n('beams') % 2 === 0;
        const pos = vertical ? Phaser.Math.Clamp(this.hx - 12 + Math.random() * 24, ix + 10, ix + iw - 10) : Phaser.Math.Clamp(this.hy - 12 + Math.random() * 24, iy + 10, iy + ih - 10);
        const wdt = fx.has('lr') ? 14 : 22;
        const warn = fx.has('lr') ? 0.8 : 0.6;
        this.add2(vertical
          ? { kind: 'beam', x: pos - wdt / 2, y: iy - 4, w: wdt, h: ih + 8, life: warn + 0.4, warn }
          : { kind: 'beam', x: ix - 4, y: pos - wdt / 2, w: iw + 8, h: wdt, life: warn + 0.4, warn });
        return;
      }
      case 'rankrain': {
        if (!cool('rank', (fx.has('cv') ? 230 : 150) / speed)) return;
        const t = this.add.bitmapText(0, 0, 'px-' + (fx.has('noise') ? 'g' : 'w'), '#' + (1 + Math.floor(Math.random() * 9))).setScale(2);
        t.setMask(this.mask);
        this.add2({ kind: 'rank', x: ix + Math.random() * (iw - 22), y: iy - 16, w: 22, h: 14, vy: (fx.has('cv') ? 55 : 80) * speed, ay: 60, life: 3.4, txt: t });
        return;
      }
      case 'shakeup': {
        // rows of the board slide across from alternating sides, one gap per row
        if (!cool('shake', 900 / speed)) return;
        const k = n('shake');
        const rows = 4;
        const gapRow = Math.floor(Math.random() * rows);
        const fromLeft = k % 2 === 0;
        const rh = (ih - 8) / rows;
        for (let r = 0; r < rows; r++) {
          if (r === gapRow || (fx.has('noise') && r === (gapRow + 2) % rows)) continue;
          this.add2({ kind: 'bar', x: fromLeft ? ix - iw * 0.6 : ix + iw, y: iy + 4 + r * rh + 3, w: iw * 0.6, h: rh - 6, vx: (fromLeft ? 1 : -1) * 150 * speed, life: 3, warn: 0.45 });
        }
        return;
      }
      case 'dropout': {
        // a grid of pellets; some cells drop out (safe), the rest switch on for a moment
        if (!cool('drop', 1800 / speed)) return;
        const cell = 24;
        const keep = fx.has('cheer') ? 0.45 : 0.6;
        for (let y = iy + 2; y < iy + ih - cell + 4; y += cell)
          for (let x = ix + 2; x < ix + iw - cell + 4; x += cell)
            if (Math.random() < keep) this.add2({ kind: 'cell', x, y, w: cell - 4, h: cell - 4, life: 1.6, warn: 0.85 });
        return;
      }
      case 'attention': {
        // an eye locks onto a SOUL that stays still too long, then fires
        const lock = fx.has('cv') ? 1.0 : 0.7;
        if (this.eye) this.eye.setX(Phaser.Math.Linear(this.eye.x, this.hx, 0.08));
        if (this.stillT > lock && cool('att', 900)) {
          this.stillT = 0;
          this.add2({ kind: 'beam', x: this.hx - 9, y: iy - 4, w: 18, h: ih + 8, life: 0.95, warn: 0.5 });
        }
        if (cool('attp', 700 / speed)) this.add2({ kind: 'pellet', x: ix + Math.random() * iw, y: iy, vx: (Math.random() - 0.5) * 0.4, vy: 1, life: 3, data: [0, 0] });
        return;
      }
    }
  }

  update(_t: number, dtMs: number) {
    if (this.mode === 'menu') {
      if (input.consume('left')) this.setSel((this.sel + 3) % 4);
      if (input.consume('right')) this.setSel((this.sel + 1) % 4);
      if (input.consume('confirm')) void this.pick();
      return;
    }
    if (this.mode !== 'dodge') return;
    const dt = Math.min(dtMs, 40) / 1000;
    this.dodgeT += dt;
    const b = this.dbox;
    const ax = input.axis();
    let vx = ax.x, vy = ax.y;
    if (!vx && !vy && this.ptrDown) {
      const dx = this.ptr.x - this.hx, dy = this.ptr.y - this.hy;
      const d = Math.hypot(dx, dy);
      if (d > 3) { vx = dx / d; vy = dy / d; }
    }
    const nrm = Math.hypot(vx, vy) || 1;
    const px = this.hx, py = this.hy;
    this.hx = Phaser.Math.Clamp(this.hx + (vx / nrm) * 145 * dt, b.x + 16, b.x + b.w - 16);
    this.hy = Phaser.Math.Clamp(this.hy + (vy / nrm) * 145 * dt, b.y + 15, b.y + b.h - 15);
    this.moved = Math.abs(this.hx - px) + Math.abs(this.hy - py) > 0.01;
    this.stillT = this.moved ? 0 : this.stillT + dt;
    this.heart.setPosition(Math.round(this.hx), Math.round(this.hy));
    if (this.iframes > 0) {
      this.iframes -= dtMs;
      this.heart.setAlpha(Math.floor(this.iframes / 80) % 2 ? 0.3 : 1);
    } else this.heart.setAlpha(1);

    const speed = (1 + 0.1 * Math.min(this.turn - 1, 3)) * (this.fx.has('brag') ? 1.15 : 1);
    if (this.dodgeT < this.waveLen - 0.8) for (const p of this.pats) this.spawn(p, dtMs, speed);
    // trail preview while OVERFIT memorizes
    if (this.pats.includes('memorize') && this.dodgeT < 2.4) {
      this.fxG.clear();
      for (const q of this.trail) this.fxG.fillStyle(0xff4040, 0.35).fillRect(q.x - 1, q.y - 1, 3, 3);
    } else if (this.pats.includes('memorize')) this.fxG.clear();

    const clip = this.fx.has('clip');
    const g = this.bulG.clear();
    const hb = { x: this.hx - 5, y: this.hy - 5, w: 10, h: 10 };
    for (const u of this.bullets) {
      u.t += dt;
      const warming = u.t < u.warn;
      const blink = Math.floor(u.t * 14) % 2 === 0;
      this.move(u, dt, warming, clip);
      this.draw(g, u, warming, blink, clip);
      if (warming || u.kind === 'dot') continue;
      let hit: boolean;
      if (u.kind === 'seg') hit = distToSeg(this.hx, this.hy, u.x, u.y, u.x2!, u.y2!) < 6;
      else hit = hb.x < u.x + u.w && hb.x + hb.w > u.x && hb.y < u.y + u.h && hb.y + hb.h > u.y;
      if (hit && u.still && !this.moved) hit = false;
      if (hit && this.iframes <= 0) {
        G.s.hp = Math.max(0, G.s.hp - this.e.dmg);
        this.iframes = 900;
        audio.sfx('hit');
        this.paintHp();
        if (!REDUCED) this.cameras.main.shake(110, 0.005);
        if (G.s.hp <= 0) {
          this.mode = 'busy';
          this.events.emit('dodge-over');
          return;
        }
      } else if (!u.grazed && !hit && u.kind !== 'seg' && u.kind !== 'beam' && u.kind !== 'cell') {
        if (hb.x - 7 < u.x + u.w && hb.x + hb.w + 7 > u.x && hb.y - 7 < u.y + u.h && hb.y + hb.h + 7 > u.y) {
          u.grazed = true;
          audio.sfx('graze');
        }
      }
    }
    for (const u of this.bullets) if (u.t >= u.life || u.y > b.y + b.h + 24 || u.x < b.x - 220 || u.x > b.x + b.w + 220) { u.dead = true; u.txt?.destroy(); }
    this.bullets = this.bullets.filter((u) => !u.dead);
    if (this.dodgeT >= this.waveLen) {
      this.mode = 'busy';
      this.events.emit('dodge-over');
    }
  }

  private move(u: Bullet, dt: number, warming: boolean, clip: boolean) {
    switch (u.kind) {
      case 'pellet': {
        if (warming) return;
        const tt = u.t - u.warn;
        let sp = u.vy === 1 && u.vx !== undefined && Math.abs(u.vx) < 0.5 && u.data?.[0] === 0 ? 70 : 32 * Math.exp(2.0 * tt);
        if (clip) sp = Math.min(sp, 85);
        const spin = u.data?.[1] ?? 0;
        if (spin) {
          const a = Math.atan2(u.vy, u.vx) + spin * dt;
          u.vx = Math.cos(a);
          u.vy = Math.sin(a);
        }
        u.x += u.vx * sp * dt;
        u.y += u.vy * sp * dt;
        return;
      }
      case 'trailer': {
        const path = u.path!;
        const k = Math.max(0, (u.t - u.warn - (u.delay ?? 0)) / 0.06);
        const i = Math.min(path.length - 1, Math.floor(k));
        u.x = path[i].x - 4;
        u.y = path[i].y - 4;
        if (k >= path.length) u.t = u.life;
        return;
      }
      case 'roller': {
        const [minX, rate, capped] = u.data!;
        const dir = Math.sign(minX - u.x) || 0;
        u.vx += dir * 260 * rate * dt;
        if (capped) u.vx = Phaser.Math.Clamp(u.vx, -90, 90);
        u.x += u.vx * dt;
        const b = this.dbox;
        const iy = b.y + 6, ih = b.h - 12, iw = b.w - 12;
        u.y = iy + ih - 10 - Math.min(ih - 20, ((u.x - minX) / (iw / 2)) ** 2 * (ih - 30));
        if (Math.abs(u.x - minX) < 4 && Math.abs(u.vx) < 30) u.t = u.life;
        u.vx *= 0.995;
        return;
      }
      case 'rank':
        u.vy += u.ay * dt;
        u.y += u.vy * dt;
        u.txt?.setPosition(Math.round(u.x), Math.round(u.y));
        return;
      case 'bar':
        if (!warming) u.x += u.vx * dt;
        return;
      default:
        u.vy += u.ay * dt;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
    }
  }

  private draw(g: Phaser.GameObjects.Graphics, u: Bullet, warming: boolean, blink: boolean, clip: boolean) {
    switch (u.kind) {
      case 'bone':
        g.fillStyle(0xffffff).fillRect(u.x + 3, u.y + 3, 4, u.h - 6);
        g.fillRect(u.x, u.y, 4, 4).fillRect(u.x + 6, u.y, 4, 4).fillRect(u.x, u.y + u.h - 4, 4, 4).fillRect(u.x + 6, u.y + u.h - 4, 4, 4);
        g.fillRect(u.x + 1, u.y + 2, 8, 3).fillRect(u.x + 1, u.y + u.h - 5, 8, 3);
        break;
      case 'drop':
      case 'future': {
        const col = u.kind === 'future' ? 0x39c5ff : 0xffffff;
        g.fillStyle(col).fillRect(u.x + 3, u.y, 2, 2).fillRect(u.x + 2, u.y + 2, 4, 2).fillRect(u.x + 1, u.y + 4, 6, 2).fillRect(u.x, u.y + 6, 8, 3).fillRect(u.x + 1, u.y + 9, 6, 1);
        g.fillStyle(0x000000).fillRect(u.x + 2, u.y + 6, 1, 1);
        break;
      }
      case 'dot':
        g.fillStyle(0xffff00).fillRect(u.x, u.y, u.w, u.h).fillStyle(0xffffff).fillRect(u.x + 1, u.y + 1, 2, 2);
        break;
      case 'seg':
        if (warming) { if (blink) g.lineStyle(1, 0xffff00, 0.8).lineBetween(u.x, u.y, u.x2!, u.y2!); }
        else g.lineStyle(5, 0xffffff).lineBetween(u.x, u.y, u.x2!, u.y2!);
        break;
      case 'beam':
        if (warming) { if (blink) g.lineStyle(2, 0xff8c1a).strokeRect(u.x, u.y, u.w, u.h); }
        else {
          g.fillStyle(0xff8c1a).fillRect(u.x, u.y, u.w, u.h);
          const v = u.h > u.w;
          g.fillStyle(0xffffff).fillRect(v ? u.x + u.w / 2 - 2 : u.x, v ? u.y : u.y + u.h / 2 - 2, v ? 4 : u.w, v ? u.h : 4);
        }
        break;
      case 'pellet':
      case 'trailer':
      case 'roller':
        if (warming) { if (blink) g.fillStyle(0xff8c1a).fillRect(u.x + 2, u.y + 2, 4, 4); }
        else {
          const col = u.kind === 'trailer' ? 0xffffff : u.kind === 'roller' ? 0x9fe0ff : clip ? 0xffffff : 0xff8c1a;
          g.fillStyle(col).fillRect(u.x + 2, u.y, 4, 8).fillRect(u.x, u.y + 2, 8, 4).fillStyle(0x000000).fillRect(u.x + 3, u.y + 3, 2, 2);
        }
        break;
      case 'bar':
        if (warming) { if (blink) g.lineStyle(2, 0xffffff, 0.6).strokeRect(Math.max(u.x, this.dbox.x + 6), u.y, u.w * 0.4, u.h); }
        else {
          g.fillStyle(0xffffff).fillRect(u.x, u.y, u.w, u.h).fillStyle(0x000000).fillRect(u.x + 4, u.y + 3, 14, u.h - 6);
          g.fillStyle(0x000000).fillRect(u.x + 24, u.y + u.h / 2 - 1, u.w - 34, 2);
        }
        break;
      case 'cell':
        if (warming) { if (blink) g.lineStyle(1, 0xffffff, 0.5).strokeRect(u.x, u.y, u.w, u.h); }
        else g.fillStyle(0xffffff).fillRect(u.x, u.y, u.w, u.h).fillStyle(0x000000).fillRect(u.x + 4, u.y + 4, u.w - 8, u.h - 8);
        break;
    }
  }
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
