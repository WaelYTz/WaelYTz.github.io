// Always-on overlay scene: dialog boxes (typewriter), choices with the heart cursor, lists, toasts, banners, save box.
// Works with keyboard, mouse and touch (click/tap the box to advance, hover/tap options to choose).
import Phaser from 'phaser';
import { input } from '../core/input';
import { audio, type Voice } from '../core/audio';
import { PixelText, parseRich, wrap, label, textW, LINE_H, type Glyph } from '../core/text';
import { srSay } from '../shell/shell';
import { game as G } from '../core/state';
import { fmtTime, loadSettings } from '../core/save';
import { REDUCED } from '../core/env';
import { openLink } from '../shell/links';

export const W = 640;
export const H = 480;
export const BOX = { x: 32, w: 576, h: 152, top: 14, bottom: 314 };
const S = 3; // dialog text scale
const COLS = 28;
const LINES = 4;

export interface SayOpts { voice?: Voice; pos?: 'top' | 'bottom'; }
export interface AskOpts extends SayOpts {
  cancel?: number;
  vertical?: boolean;
  links?: (string | undefined)[];
  /** Called synchronously when an option is picked (inside the click/tap event when there is one). */
  onPick?: (i: number) => void;
}
export interface ListOpts { x?: number; y?: number; w?: number; scale?: number; rows?: number; cancel?: boolean; start?: number;
  title?: string; onMove?: (i: number) => void; colors?: string[]; noBox?: boolean; }

interface Dlg {
  pages: Glyph[][][];
  page: number;
  text: PixelText | null;
  shown: number;
  acc: number;
  wait: number;
  voice: Voice;
  y: number;
  options?: string[];
  links?: (string | undefined)[];
  onPick?: (i: number) => void;
  opened?: boolean;
  vertical?: boolean;
  cancel?: number;
  sel: number;
  optObjs: Phaser.GameObjects.GameObject[];
  heart: Phaser.GameObjects.Image | null;
  optPos: { x: number; y: number }[];
  resolve: (v: number) => void;
}

export function drawBox(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, border = 6, color = 0xffffff) {
  g.fillStyle(0x000000, 1).fillRect(x, y, w, h);
  g.lineStyle(border, color, 1).strokeRect(x + border / 2, y + border / 2, w - border, h - border);
}

export class UIScene extends Phaser.Scene {
  private dlg: Dlg | null = null;
  private layer!: Phaser.GameObjects.Container;
  private boxG!: Phaser.GameObjects.Graphics;
  private clicked = false;
  private modal = 0; // nested menus/lists
  private toasts: string[] = [];
  private toastOn = false;
  private hintObj: Phaser.GameObjects.Container | null = null;
  /** Fast travel hook (set by the world). */
  travel: ((room: string) => void) | null = null;

  constructor() {
    super('ui');
  }

  get busy() {
    return !!this.dlg || this.modal > 0;
  }

  create() {
    this.layer = this.add.container(0, 0).setDepth(10);
    this.boxG = this.add.graphics();
    this.layer.add(this.boxG);
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length) return;
      if (this.dlg) this.clicked = true;
    });
    G.on((kind, text) => {
      if (kind === 'secret') audio.sfx('secret');
      this.toast(text);
    });
  }

  // ───────────────────────── dialog ─────────────────────────
  private paginate(src: string | string[]): Glyph[][][] {
    const arr = Array.isArray(src) ? src : [src];
    const pages: Glyph[][][] = [];
    for (const p of arr) {
      const lines = wrap(parseRich(p.replace(/\{name\}/g, G.name)), COLS);
      for (let i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
    }
    return pages;
  }

  say(pages: string | string[], opts: SayOpts = {}): Promise<void> {
    return this.open(pages, undefined, opts).then(() => undefined);
  }
  ask(pages: string | string[] | null, options: string[], opts: AskOpts = {}): Promise<number> {
    return this.open(pages ?? [''], options, opts);
  }

  private open(src: string | string[], options: string[] | undefined, opts: AskOpts): Promise<number> {
    this.scene.bringToTop();
    input.clearFrame();
    return new Promise((resolve) => {
      this.dlg = {
        pages: this.paginate(src), page: 0, text: null, shown: 0, acc: 0, wait: 0, voice: opts.voice ?? 'narrator',
        y: opts.pos === 'top' ? BOX.top : BOX.bottom, options, links: opts.links, onPick: opts.onPick, vertical: opts.vertical, cancel: opts.cancel, sel: 0,
        optObjs: [], heart: null, optPos: [], resolve,
      };
      if (opts.links) {
        // Keyboard: open the link inside the keydown event itself, so the browser treats it as a user action.
        input.gestureHook = (b) => {
          const d = this.dlg;
          if (b !== 'confirm' || !d?.heart || !d.links || input.lastDevice !== 'keyboard') return;
          const url = d.links[d.sel];
          if (url) {
            d.opened = true;
            openLink(url);
          }
        };
      }
      this.showPage();
    });
  }

  private showPage() {
    const d = this.dlg!;
    d.text?.destroy();
    this.clearOptions();
    this.boxG.clear();
    drawBox(this.boxG, BOX.x, d.y, BOX.w, BOX.h);
    const lines = d.pages[d.page] ?? [];
    d.text = new PixelText(this, BOX.x + 28, d.y + 22, '', { scale: S, cols: COLS });
    d.text.setLines(lines);
    this.layer.add(d.text);
    d.shown = 0;
    d.acc = 0;
    d.wait = 0;
    const speed = loadSettings().textSpeed;
    if (speed === 'instant') d.shown = d.text.total;
    d.text.reveal(d.shown);
    srSay(lines.map((l) => l.map((g) => g.ch).join('')).join(' '));
    if (d.shown >= d.text.total) this.pageDone();
  }

  private isLast() {
    const d = this.dlg!;
    return d.page >= d.pages.length - 1;
  }

  private pageDone() {
    const d = this.dlg!;
    if (this.isLast() && d.options && !d.optObjs.length) this.showOptions();
  }

  private clearOptions() {
    const d = this.dlg;
    if (!d) return;
    d.optObjs.forEach((o) => o.destroy());
    d.optObjs = [];
    d.heart?.destroy();
    d.heart = null;
    d.optPos = [];
  }

  private showOptions() {
    const d = this.dlg!;
    const opts = d.options!;
    const textRows = d.text?.rows ?? 0;
    const totalLen = opts.reduce((a, o) => a + o.length + 4, 0);
    const inline = !d.vertical && opts.length <= 4 && totalLen <= COLS && textRows <= LINES - 1;
    const sc = S;
    if (inline) {
      // a row of options on the last line of the box, like a classic Yes/No prompt
      const y = d.y + 22 + (LINES - 1) * LINE_H * sc + 2;
      const slot = (BOX.w - 56) / opts.length;
      opts.forEach((o, i) => {
        const x = BOX.x + 28 + i * slot + 30;
        d.optPos.push({ x: x - 26, y: y + 3 });
        const t = label(this, x, y, o, 'w', sc);
        const z = this.add.zone(x - 30, y - 4, textW(o, sc) + 40, 30).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => this.setSel(i));
        z.on('pointerup', () => this.choose(i)); // pointerup counts as a user gesture on touch screens (links)
        this.layer.add([t, z]);
        d.optObjs.push(t, z);
      });
    } else {
      // vertical list in its own box (above the dialog box, or below it when the box is at the top)
      const rowH = LINE_H * 3 + 6;
      const h = opts.length * rowH + 30;
      const w = Math.min(BOX.w, Math.max(...opts.map((o) => textW(o, 3))) + 100);
      const x = BOX.x + BOX.w - w;
      const y = d.y === BOX.top ? BOX.top + BOX.h + 6 : BOX.bottom - h - 6;
      const g = this.add.graphics();
      drawBox(g, x, y, w, h);
      this.layer.add(g);
      d.optObjs.push(g);
      opts.forEach((o, i) => {
        const ty = y + 18 + i * rowH;
        d.optPos.push({ x: x + 22, y: ty + 3 });
        const t = label(this, x + 56, ty, o, 'w', 3);
        const z = this.add.zone(x, ty - 4, w, rowH).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => this.setSel(i));
        z.on('pointerup', () => this.choose(i));
        this.layer.add([t, z]);
        d.optObjs.push(t, z);
      });
    }
    d.heart = this.add.image(0, 0, 'soul-small').setOrigin(0).setScale(3);
    this.layer.add(d.heart);
    this.setSel(0, true);
  }

  private setSel(i: number, silent = false) {
    const d = this.dlg;
    if (!d || !d.heart) return;
    if (d.sel !== i && !silent) audio.sfx('move');
    d.sel = i;
    const p = d.optPos[i];
    d.heart.setPosition(p.x, p.y);
  }

  private choose(i: number) {
    const d = this.dlg;
    if (!d) return;
    audio.sfx('select');
    const url = d.links?.[i];
    if (url && !d.opened) openLink(url);
    d.onPick?.(i);
    this.finish(i);
  }

  private finish(v: number) {
    const d = this.dlg!;
    if (d.links) input.gestureHook = null;
    d.text?.destroy();
    this.clearOptions();
    this.boxG.clear();
    this.dlg = null;
    input.clearFrame();
    srSay('');
    d.resolve(v);
  }

  private next() {
    const d = this.dlg!;
    if (this.isLast()) {
      if (d.options) return; // must pick an option
      this.finish(0);
    } else {
      d.page++;
      this.showPage();
    }
  }

  update(_t: number, dt: number) {
    const d = this.dlg;
    if (!d || !d.text) return;
    const clicked = this.clicked;
    this.clicked = false;
    const typing = d.shown < d.text.total;
    if (typing) {
      if (input.consume('confirm') || input.consume('cancel') || clicked) {
        d.shown = d.text.total;
        d.text.reveal(d.shown);
        this.pageDone();
        return;
      }
      const speed = loadSettings().textSpeed;
      const per = speed === 'fast' ? 14 : 48; // ~20 letters/s by default, like classic RPG text
      d.acc += dt;
      if (d.wait > 0) {
        d.wait -= dt;
        return;
      }
      while (d.acc >= per && d.shown < d.text.total) {
        d.acc -= per;
        const ch = d.text.charAt(d.shown);
        d.shown++;
        if (ch !== ' ') audio.blip(d.voice);
        if (speed === 'normal' && '.!?'.includes(ch) && d.text.charAt(d.shown) === ' ') {
          d.wait = 160;
          break;
        }
        if (speed === 'normal' && ch === ',') {
          d.wait = 70;
          break;
        }
      }
      d.text.reveal(d.shown);
      if (d.shown >= d.text.total) this.pageDone();
      return;
    }
    // page fully shown
    if (d.options && this.isLast()) {
      if (!d.heart) this.showOptions();
      const n = d.options.length;
      const prevKeys = d.vertical || d.optPos.length && d.optPos[0].y !== d.optPos[n - 1].y ? ['up'] : ['left'];
      const nextKeys = prevKeys[0] === 'up' ? ['down'] : ['right'];
      if (input.consumeAny(...(prevKeys as ('up' | 'left')[]))) this.setSel((d.sel + n - 1) % n);
      if (input.consumeAny(...(nextKeys as ('down' | 'right')[]))) this.setSel((d.sel + 1) % n);
      if (input.consume('confirm')) this.choose(d.sel);
      else if (input.consume('cancel') && d.cancel !== undefined) {
        audio.sfx('back');
        this.finish(d.cancel);
      }
      return;
    }
    if (input.consume('confirm') || clicked) this.next();
    else if (input.consume('cancel')) {
      /* X does not close pages, like the classic games; it only speeds typing */
    }
  }

  // ───────────────────────── generic list menu ─────────────────────────
  /** A vertical list with the heart cursor. Resolves with the index, or -1 when cancelled. */
  list(items: string[], o: ListOpts = {}): Promise<number> {
    this.modal++;
    input.clearFrame();
    const sc = o.scale ?? 3;
    const rowH = LINE_H * sc + (sc === 3 ? 6 : 4);
    const rows = Math.min(items.length, o.rows ?? 8);
    const w = o.w ?? Math.max(...items.map((s) => textW(s, sc))) + 90;
    const titleH = o.title ? rowH : 0;
    const h = rows * rowH + 30 + titleH;
    const x = o.x ?? (W - w) / 2;
    const y = o.y ?? (H - h) / 2;
    const c = this.add.container(0, 0).setDepth(20);
    const g = this.add.graphics();
    if (!o.noBox) drawBox(g, x, y, w, h);
    c.add(g);
    if (o.title) c.add(label(this, x + 28, y + 16, o.title, 'y', sc));
    const heart = this.add.image(0, 0, 'soul-small').setOrigin(0).setScale(sc);
    const labels: Phaser.GameObjects.BitmapText[] = [];
    let top = 0;
    let sel = Math.min(o.start ?? 0, items.length - 1);
    const arrows = { up: label(this, x + w - 26, y + 10, '↑', 'g', 2), down: label(this, x + w - 26, y + h - 24, '↓', 'g', 2) };
    c.add([arrows.up, arrows.down]);
    for (let r = 0; r < rows; r++) {
      const ty = y + 16 + titleH + r * rowH;
      const t = this.add.bitmapText(x + 26 + 10 * sc, ty, 'px-w', '').setScale(sc);
      labels.push(t);
      const z = this.add.zone(x, ty - 4, w, rowH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { if (top + r < items.length && sel !== top + r) { sel = top + r; audio.sfx('move'); paint(); } });
      z.on('pointerdown', () => { if (top + r < items.length) { sel = top + r; pick = sel; } });
      c.add([t, z]);
    }
    c.add(heart);
    let pick: number | null = null;
    const paint = () => {
      if (sel < top) top = sel;
      if (sel >= top + rows) top = sel - rows + 1;
      labels.forEach((t, r) => {
        const i = top + r;
        t.setText(i < items.length ? items[i] : '');
        t.setFont('px-' + (o.colors?.[i] ?? 'w'));
      });
      heart.setPosition(x + 22, y + 16 + titleH + (sel - top) * rowH + 3);
      arrows.up.setVisible(top > 0);
      arrows.down.setVisible(top + rows < items.length);
      o.onMove?.(sel);
    };
    paint();
    return new Promise((resolve) => {
      const done = (v: number) => {
        this.events.off('update', tick);
        c.destroy();
        this.modal--;
        input.clearFrame();
        resolve(v);
      };
      const tick = () => {
        if (this.dlg) return; // a dialog opened on top (e.g. item info) gets the input first
        if (pick !== null) {
          audio.sfx('select');
          return done(pick);
        }
        if (input.consume('up')) { sel = (sel + items.length - 1) % items.length; audio.sfx('move'); paint(); }
        if (input.consume('down')) { sel = (sel + 1) % items.length; audio.sfx('move'); paint(); }
        if (input.consume('confirm')) { audio.sfx('select'); done(sel); }
        else if ((o.cancel ?? true) && (input.consume('cancel') || input.consume('menu'))) { audio.sfx('back'); done(-1); }
      };
      this.events.on('update', tick);
    });
  }

  /** Hold the UI (and the world) while some custom panel runs. */
  hold() {
    this.modal++;
    return () => {
      this.modal = Math.max(0, this.modal - 1);
      input.clearFrame();
    };
  }

  // ───────────────────────── toasts, banners, hints ─────────────────────────
  toast(text: string) {
    this.toasts.push(text);
    if (!this.toastOn) this.nextToast();
  }
  private nextToast() {
    const text = this.toasts.shift();
    if (!text) {
      this.toastOn = false;
      return;
    }
    this.toastOn = true;
    const sc = 2;
    const w = Math.min(W - 40, textW(text, sc) + 40);
    const c = this.add.container(W / 2 - w / 2, -60).setDepth(30);
    const g = this.add.graphics();
    drawBox(g, 0, 0, w, 44, 4, 0xffff00);
    c.add([g, label(this, w / 2, 15, text, 'y', sc, 'c')]);
    const show = REDUCED ? 0 : 220;
    c.y = REDUCED ? 10 : -60;
    this.tweens.add({ targets: c, y: 10, duration: show });
    this.time.delayedCall(2600, () =>
      this.tweens.add({ targets: c, y: -60, duration: show || 1, onComplete: () => { c.destroy(); this.nextToast(); } }),
    );
  }

  banner(name: string) {
    const sc = 2;
    const w = textW(name, sc) + 36;
    const c = this.add.container(14, 14).setDepth(5);
    const g = this.add.graphics();
    drawBox(g, 0, 0, w, 38, 4);
    c.add([g, label(this, 18, 12, name, 'w', sc)]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: REDUCED ? 1 : 200, hold: 1600, yoyo: true, onComplete: () => c.destroy() });
  }

  hint(text: string | null) {
    this.hintObj?.destroy();
    this.hintObj = null;
    if (!text) return;
    const sc = 2;
    const w = textW(text, sc) + 28;
    const c = this.add.container(W / 2 - w / 2, H - 46).setDepth(4);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.75).fillRect(0, 0, w, 32);
    c.add([g, label(this, 14, 9, text, 'g', sc)]);
    this.hintObj = c;
  }

  // ───────────────────────── save box ─────────────────────────
  /** The save dialog: name / LV / time / place, then Save or Return. */
  saveBox(roomName: string, onSave: () => void): Promise<boolean> {
    this.modal++;
    input.clearFrame();
    const x = 98, y = 116, w = 444, h = 176;
    const c = this.add.container(0, 0).setDepth(20);
    const g = this.add.graphics();
    drawBox(g, x, y, w, h);
    c.add(g);
    const lv = `LV ${G.s.lv}`;
    const time = fmtTime(G.playMs());
    const rows = (col: string) => [
      label(this, x + 28, y + 26, G.name.slice(0, 8), col, 3),
      label(this, x + w / 2 + 10, y + 26, lv, col, 3, 'c'),
      label(this, x + w - 28, y + 26, time, col, 3, 'r'),
      label(this, x + 28, y + 72, roomName, col, 3),
    ];
    const white = rows('w');
    c.add(white);
    const optSave = label(this, x + 82, y + 126, 'Save', 'w', 3);
    const optRet = label(this, x + 262, y + 126, 'Return', 'w', 3);
    const heart = this.add.image(x + 46, y + 129, 'soul-small').setOrigin(0).setScale(3);
    c.add([optSave, optRet, heart]);
    let sel = 0;
    let saved = false;
    const zs = this.add.zone(x + 40, y + 116, 160, 40).setOrigin(0).setInteractive({ useHandCursor: true });
    const zr = this.add.zone(x + 220, y + 116, 200, 40).setOrigin(0).setInteractive({ useHandCursor: true });
    c.add([zs, zr]);
    let pick: number | null = null;
    const setSel = (i: number) => {
      if (saved) return;
      if (i !== sel) audio.sfx('move');
      sel = i;
      heart.setX(i === 0 ? x + 46 : x + 226);
    };
    zs.on('pointerover', () => setSel(0));
    zr.on('pointerover', () => setSel(1));
    zs.on('pointerdown', () => (pick = 0));
    zr.on('pointerdown', () => (pick = 1));
    return new Promise((resolve) => {
      const close = (v: boolean) => {
        this.events.off('update', tick);
        c.destroy();
        this.modal--;
        input.clearFrame();
        resolve(v);
      };
      const tick = () => {
        if (saved) {
          if (input.consume('confirm') || input.consume('cancel') || pick !== null) close(true);
          return;
        }
        if (input.consume('left') || input.consume('right')) setSel(1 - sel);
        let choice: number | null = pick;
        pick = null;
        if (input.consume('confirm')) choice = sel;
        if (input.consume('cancel')) choice = 1;
        if (choice === 0) {
          saved = true;
          onSave();
          audio.sfx('save');
          white.forEach((t) => t.destroy());
          c.add(rows('y'));
          optSave.destroy();
          optRet.destroy();
          heart.destroy();
          c.add(label(this, x + 82, y + 126, 'File saved.', 'y', 3));
        } else if (choice === 1) {
          audio.sfx('back');
          close(false);
        }
      };
      this.events.on('update', tick);
    });
  }
}
