import Phaser from 'phaser';
import { label, textW } from '../core/text';
import { audio } from '../core/audio';
import { input } from '../core/input';
import { game as G } from '../core/state';
import { REDUCED } from '../core/env';
import type { UIScene } from './UI';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const MAX = 8;

// Special names. `ok: false` sends the visitor back to pick another one.
const SPECIAL: Record<string, { say: string[]; ok: boolean }> = {
  WAEL: { say: ['* That name is already taken.'], ok: false },
  TECHNO: { say: ["* A legend's name. Wear it well."], ok: true },
  TECHNOBLADE: { say: ["* A legend's name. Wear it well."], ok: true },
  SUNTZU: { say: ['* Know yourself first.', '* ...Then the name.'], ok: true },
  ADMIN: { say: ['* Permission denied.', '* Nice try, though.'], ok: false },
  ROOT: { say: ['* Permission denied.', '* Nice try, though.'], ok: false },
  SUDO: { say: ['* Permission denied.', '* Nice try, though.'], ok: false },
  HR: { say: ['* Welcome! The résumé is one click away, top left.', '* ...But stay a while?'], ok: true },
  RECRUIT: { say: ['* Welcome! The résumé is one click away, top left.', '* ...But stay a while?'], ok: true },
  RECRUITER: { say: ['* Welcome! The résumé is one click away, top left.', '* ...But stay a while?'], ok: true },
  KAGGLE: { say: ['* Your name passed cross-validation.'], ok: true },
  ZINDI: { say: ['* A fellow competitor. Respect.'], ok: true },
  NAN: { say: ['* NaN: Not a Name.', '* ...Fine. Allowed.'], ok: true },
  NULL: { say: ['* The name is null.', '* ...It still points somewhere. Allowed.'], ok: true },
  GPT: { say: ['* An AI touring an AI-builder\'s portfolio.', '* Very meta.'], ok: true },
  CLAUDE: { say: ['* An AI touring an AI-builder\'s portfolio.', '* Very meta.'], ok: true },
  GEMINI: { say: ['* The Refactoring Swarm says hi.'], ok: true },
  GITHUB: { say: ["* git commit -m 'new name'"], ok: true },
  POTATO: { say: ['* A humble crop.', '* Legends have been built on less.'], ok: true },
};

type Cell = { kind: 'ch'; ch: string; x: number; y: number; t: Phaser.GameObjects.BitmapText } |
  { kind: 'opt'; id: 'quit' | 'back' | 'done'; x: number; y: number; t: Phaser.GameObjects.BitmapText };

export class NamingScene extends Phaser.Scene {
  private name = '';
  private nameText!: Phaser.GameObjects.BitmapText;
  private cells: Cell[][] = [];
  private r = 0;
  private c = 0;
  private gridMode = true;
  private locked = false;

  constructor() {
    super('naming');
  }

  create() {
    this.name = '';
    this.r = 0;
    this.c = 0;
    this.locked = false;
    this.cells = [];
    audio.music('title');
    label(this, 320, 34, 'Name this SOUL.', 'w', 3, 'c');
    this.nameText = label(this, 320, 92, '', 'w', 3);
    const colW = 66;
    const x0 = 320 - (6 * colW) / 2 - 8;
    const mk = (chars: string, y0: number) => {
      for (let i = 0; i < chars.length; i += 7) {
        const row: Cell[] = [];
        [...chars.slice(i, i + 7)].forEach((ch, k) => {
          const x = x0 + k * colW;
          const y = y0 + (i / 7) * 32;
          const t = label(this, x, y, ch, 'w', 3);
          const z = this.add.zone(x - 16, y - 4, colW - 4, 30).setOrigin(0).setInteractive({ useHandCursor: true });
          const rr = this.cells.length, cc = k;
          z.on('pointerover', () => this.focus(rr, cc));
          z.on('pointerdown', () => { this.focus(rr, cc); this.activate(); });
          row.push({ kind: 'ch', ch, x, y, t });
        });
        this.cells.push(row);
      }
    };
    mk(UPPER, 140);
    mk(LOWER, 278);
    const oy = 420;
    const opts: { id: 'quit' | 'back' | 'done'; s: string; x: number }[] = [
      { id: 'quit', s: 'Quit', x: 92 }, { id: 'back', s: 'Backspace', x: 236 }, { id: 'done', s: 'Done', x: 476 },
    ];
    const orow: Cell[] = opts.map((o, k) => {
      const t = label(this, o.x, oy, o.s, 'w', 3);
      const z = this.add.zone(o.x - 10, oy - 6, textW(o.s, 3) + 20, 34).setOrigin(0).setInteractive({ useHandCursor: true });
      const rr = this.cells.length;
      z.on('pointerover', () => this.focus(rr, k));
      z.on('pointerdown', () => { this.focus(rr, k); this.activate(); });
      return { kind: 'opt', id: o.id, x: o.x, y: oy, t };
    });
    this.cells.push(orow);
    this.paint();

    input.textHandler = (e) => this.onKey(e);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (input.textHandler = null));
    this.cameras.main.fadeIn(REDUCED ? 0 : 300, 0, 0, 0);
  }

  private onKey(e: KeyboardEvent): boolean {
    if (this.locked || (this.scene.get('ui') as UIScene).busy) return false;
    const k = e.key;
    if (k === 'Backspace') {
      this.erase();
      return true;
    }
    if (k === 'Enter') {
      void this.done();
      return true;
    }
    if (/^[a-zA-Z]$/.test(k)) {
      const lower = k.toLowerCase();
      // In grid mode, Z selects the highlighted letter and X erases, like a controller.
      if (this.gridMode && lower === 'z') return false;
      if (this.gridMode && lower === 'x') return false;
      this.gridMode = false;
      this.type(k);
      return true;
    }
    if (k.startsWith('Arrow')) this.gridMode = true;
    return false;
  }

  private type(ch: string) {
    if (this.name.length >= MAX) return audio.sfx('error');
    this.name += ch;
    audio.sfx('move');
    this.paint();
  }
  private erase() {
    this.name = this.name.slice(0, -1);
    audio.sfx('back');
    this.paint();
  }

  private focus(r: number, c: number) {
    if (this.locked) return;
    if (r !== this.r || c !== this.c) audio.sfx('move');
    this.r = r;
    this.c = Math.min(c, this.cells[r].length - 1);
    this.gridMode = true;
    this.paint();
  }

  private paint() {
    this.nameText.setText(this.name + (this.name.length < MAX ? '_' : ''));
    this.nameText.setX(320 - textW(this.name + '_', 3) / 2);
    this.cells.forEach((row, ri) => row.forEach((cell, ci) => cell.t.setFont(ri === this.r && ci === this.c ? 'px-y' : 'px-w')));
  }

  private activate() {
    const cell = this.cells[this.r][this.c];
    if (cell.kind === 'ch') return this.type(cell.ch);
    if (cell.id === 'back') return this.erase();
    if (cell.id === 'quit') {
      audio.sfx('back');
      this.locked = true;
      return this.scene.start('title');
    }
    void this.done();
  }

  private async done() {
    if (this.locked) return;
    const ui = this.scene.get('ui') as UIScene;
    if (!this.name.trim()) {
      audio.sfx('error');
      return;
    }
    this.locked = true;
    audio.sfx('select');
    const sp = SPECIAL[this.name.toUpperCase()];
    if (sp) {
      await ui.say(sp.say);
      if (!sp.ok) {
        this.locked = false;
        return;
      }
    }
    // Confirm: everything else fades away and the name grows while you decide.
    const others = this.cells.flat().map((c) => c.t);
    others.forEach((t) => t.setVisible(false));
    this.nameText.setVisible(false);
    const big = label(this, 320, 92, this.name, 'w', 3).setOrigin(0.5, 0).setX(320);
    if (!REDUCED) this.tweens.add({ targets: big, scale: 7, y: 130, duration: 2400 });
    else big.setScale(7).setY(130);
    const r = await ui.ask('* Is this name correct?', ['No', 'Yes'], { cancel: 0, pos: 'bottom' });
    if (r !== 1) {
      big.destroy();
      others.forEach((t) => t.setVisible(true));
      this.nameText.setVisible(true);
      this.locked = false;
      return;
    }
    audio.sfx('save');
    G.startNew(this.name);
    this.cameras.main.flash(REDUCED ? 0 : 500, 255, 255, 255);
    this.time.delayedCall(REDUCED ? 0 : 600, () => this.scene.start('world', { room: 'start', spawn: 'a' }));
  }

  update() {
    if (this.locked || (this.scene.get('ui') as UIScene).busy) return;
    const rows = this.cells.length;
    if (input.consume('up')) this.focus((this.r + rows - 1) % rows, this.c);
    if (input.consume('down')) this.focus((this.r + 1) % rows, this.c);
    if (input.consume('left')) this.focus(this.r, (this.c + this.cells[this.r].length - 1) % this.cells[this.r].length);
    if (input.consume('right')) this.focus(this.r, (this.c + 1) % this.cells[this.r].length);
    if (input.consume('confirm')) this.activate();
    if (input.consume('cancel')) this.erase();
    // letters tremble a little (off with reduced motion)
    if (!REDUCED && Math.random() < 0.5) {
      for (const row of this.cells) for (const cell of row) {
        if (cell.kind !== 'ch') continue;
        cell.t.setPosition(cell.x + (Math.random() < 0.15 ? (Math.random() < 0.5 ? -1 : 1) : 0), cell.y + (Math.random() < 0.15 ? (Math.random() < 0.5 ? -1 : 1) : 0));
      }
    }
  }
}
