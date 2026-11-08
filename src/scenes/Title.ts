import Phaser from 'phaser';
import { label, textW, fitLabel } from '../core/text';
import { audio } from '../core/audio';
import { input } from '../core/input';
import { clearSave, fmtTime } from '../core/save';
import { game as G, SECRET_COUNT } from '../core/state';
import { REDUCED } from '../core/env';
import { drawBox, type UIScene } from './UI';
import { ROOMS } from '../world/rooms';

export class TitleScene extends Phaser.Scene {
  private sel = 0;
  private heart!: Phaser.GameObjects.Image;
  private hasSave = false;
  private optX: number[] = [];
  private optY = 0;
  private locked = false;

  constructor() {
    super('title');
  }

  create() {
    this.locked = false;
    this.sel = 0;
    audio.music('title');
    const W = 640;
    const title = label(this, W / 2, 56, 'WAEL', 'w', 14, 'c');
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: REDUCED ? 1 : 900 });
    const soul = this.add.image(W / 2, 198, 'soul').setScale(6);
    if (!REDUCED) this.tweens.add({ targets: soul, scale: 7, duration: 550, yoyo: true, repeat: -1, ease: 'Stepped' });
    label(this, W / 2, 238, 'ML engineer · AI-agent builder', 'g', 2, 'c');

    const s = G.saved;
    this.hasSave = !!s;
    if (s) {
      const x = 100, y = 274, w = 440, h = 150;
      const g = this.add.graphics();
      drawBox(g, x, y, w, h);
      label(this, x + 26, y + 22, s.name.slice(0, 8), 'w', 3);
      label(this, x + w / 2 + 14, y + 22, `LV ${s.lv}`, 'w', 3, 'c');
      label(this, x + w - 26, y + 22, fmtTime(s.playMs), 'w', 3, 'r');
      fitLabel(this, x + 26, y + 62, ROOMS[s.room]?.name ?? 'The Crossroads', w - 110, 'w', 3);
      label(this, x + w - 26, y + 66, `♥ ${s.secrets.length}/${SECRET_COUNT}`, 'g', 2, 'r');
      this.optY = y + 108;
      this.optX = [x + 76, x + 290];
      label(this, this.optX[0], this.optY, 'Continue', 'w', 3);
      label(this, this.optX[1], this.optY, 'Reset', 'w', 3);
      this.optX.forEach((ox, i) => {
        const z = this.add.zone(ox - 40, this.optY - 8, 190, 40).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => this.move(i));
        z.on('pointerdown', () => this.pick(i));
      });
      this.heart = this.add.image(0, 0, 'soul-small').setOrigin(0).setScale(3);
      this.move(0, true);
    } else {
      const p = label(this, W / 2, 330, '[PRESS Z OR ENTER]', 'g', 2, 'c');
      if (!REDUCED) this.tweens.add({ targets: p, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
      const z = this.add.zone(W / 2 - textW('[PRESS Z OR ENTER]', 2) / 2 - 10, 320, 260, 36).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => this.pick(0));
    }
    label(this, W / 2, 452, 'made with DETERMINATION · v1', 'd', 2, 'c');
    this.cameras.main.fadeIn(REDUCED ? 0 : 400, 0, 0, 0);
  }

  private move(i: number, silent = false) {
    if (!this.hasSave || this.locked) return;
    if (i !== this.sel && !silent) audio.sfx('move');
    this.sel = i;
    this.heart.setPosition(this.optX[i] - 34, this.optY + 3);
  }

  private async pick(i: number) {
    if (this.locked) return;
    const ui = this.scene.get('ui') as UIScene;
    if (ui.busy) return;
    audio.sfx('select');
    if (!this.hasSave) return this.go('naming');
    if (i === 0) {
      this.locked = true;
      G.continueSave();
      return this.go('world', { room: G.s.room, x: G.s.x, y: G.s.y });
    }
    this.locked = true;
    const r = await ui.ask('* Erase this file and start over?', ['No', 'Yes'], { cancel: 0 });
    if (r === 1) {
      clearSave();
      G.saved = null;
      audio.sfx('reset');
      return this.go('naming');
    }
    this.locked = false;
  }

  private go(key: string, data?: object) {
    this.locked = true;
    this.cameras.main.fadeOut(REDUCED ? 0 : 300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
    if (REDUCED) this.scene.start(key, data);
  }

  update() {
    const ui = this.scene.get('ui') as UIScene;
    if (ui.busy || this.locked) return;
    if (this.hasSave && (input.consume('left') || input.consume('right'))) this.move(1 - this.sel);
    if (input.consume('confirm')) void this.pick(this.sel);
  }
}
