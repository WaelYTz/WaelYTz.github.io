import Phaser from 'phaser';
import { buildFonts, buildSprites } from '../core/art';
import { buildCast } from '../core/cast';
import { buildExtras } from '../core/extras';
import { buildProps } from '../core/props';
import { game as G } from '../core/state';
import { loadSave } from '../core/save';
import { githubStats, profileEncounter } from '../core/remote';
import { roomFromHash } from '../world/rooms';
import { input } from '../core/input';

type Shell = { ready(label: string): void; dismiss(): void; readonly open: boolean; start(): void };

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create() {
    buildFonts(this);
    buildSprites(this);
    buildCast(this);
    buildProps(this);
    buildExtras(this);
    this.scene.launch('ui');
    // Public data, fetched in the background; failures are silent.
    void githubStats();
    void profileEncounter();

    const shell = this.registry.get('shell') as Shell;
    const deep = roomFromHash(location.hash);
    if (deep) {
      // Deep link (e.g. /#/lab): skip the card and the title, drop the SOUL into that room.
      shell.dismiss();
      if (!G.continueSave()) G.startNew('VISITOR');
      this.scene.start('world', { room: deep.room, spawn: deep.spawn, ask: deep.ask });
      return;
    }
    const save = loadSave();
    shell.ready(save ? 'Continue' : 'Play');
    this.game.events.once('play', () => this.scene.start('title'));
  }
  update() {
    // Z also presses PLAY on the intro card (Enter/Space work natively on the focused button).
    const shell = this.registry.get('shell') as Shell;
    if (shell.open && input.consume('confirm')) shell.start();
  }
}
