// Endings (lazy-loaded): Pacifist credits, the Determination ending (fight / speedrun), and a neutral one.
import Phaser from 'phaser';
import { label, PixelText } from '../core/text';
import { audio } from '../core/audio';
import { input } from '../core/input';
import { game as G, MAIN_ROOMS, ENCOUNTERS } from '../core/state';
import { fmtTime } from '../core/save';
import { REDUCED } from '../core/env';
import { PROJECTS } from '../content/projects';
import { COMPETITIONS } from '../content/lore';
import { PROFILE, emailAddress } from '../content/profile';
import type { UIScene } from './UI';

type Kind = 'pacifist' | 'determination' | 'neutral';

export function runCredits(world: Phaser.Scene, kind: Kind) {
  const mgr = world.game.scene;
  if (!mgr.keys.credits) mgr.add('credits', CreditsScene, false);
  world.scene.pause();
  world.scene.launch('credits', { kind });
  world.scene.bringToTop('ui');
}

export class CreditsScene extends Phaser.Scene {
  private kind: Kind = 'pacifist';
  constructor() {
    super('credits');
  }
  init(d: { kind: Kind }) {
    this.kind = d.kind;
  }

  async create() {
    this.add.rectangle(0, 0, 640, 480, this.kind === 'determination' ? 0x140000 : 0x000000).setOrigin(0);
    audio.music(this.kind === 'determination' ? 'determination' : 'credits');
    const ui = this.scene.get('ui') as UIScene;
    const missedRooms = MAIN_ROOMS.filter((r) => !G.s.visited.includes(r)).length;
    const unspared = ENCOUNTERS.filter((e) => !G.s.spared.includes(e)).length;
    if (this.kind === 'determination') {
      const fast = G.playMs() < 3 * 60 * 1000;
      await ui.say([
        `* You reached the way out in {r}${fmtTime(G.playMs())}{w}.`,
        G.s.fought.length ? `* You fought ${G.s.fought.length} monster${G.s.fought.length > 1 ? 's' : ''}. Your LV rose to ${G.s.lv}.` : '* Fast. Very fast.',
        fast ? '* Not even close... to everything this place holds.' : '* Every monster was just a bug wearing a costume.',
        "* But hey. Technoblade never dies. Neither does your save file.",
        "* You're filled with DETERMINATION.",
      ], { voice: 'narrator' });
    } else if (this.kind === 'neutral') {
      await ui.say([
        '* You step into the light and leave the underground.',
        missedRooms ? `* ${missedRooms} room${missedRooms > 1 ? 's' : ''} stayed unexplored.` : '* You saw every room.',
        unspared ? `* ${unspared} monster${unspared > 1 ? 's' : ''} still wait${unspared > 1 ? '' : 's'} for mercy.` : '',
        '* (Visit every room and spare everyone to see the true ending.)',
      ].filter(Boolean));
    } else {
      await ui.say(['* You saw every room.', '* You spared everyone.', `* Thank you for playing, {y}{name}{w}.`]);
      await this.scroll();
    }
    await this.cta(ui);
  }

  private scroll(): Promise<void> {
    const L: [string, string, number][] = [
      ['WAEL', 'w', 6], ['ML engineer · AI-agent builder', 'g', 2], ['', 'w', 2],
      ['* PROJECTS', 'y', 3], ...PROJECTS.map((p) => [p.title, 'w', 2] as [string, string, number]), ['', 'w', 2],
      ['* COMPETITIONS', 'y', 3], ...COMPETITIONS.map((c) => [c.title.replace(/:.*/, ''), 'w', 2] as [string, string, number]), ['', 'w', 2],
      ['* QUOTES', 'y', 3], ['Sun Tzu, The Art of War', 'w', 2], ['translated by Lionel Giles (1910)', 'g', 2], ['', 'w', 2],
      ['* IN MEMORY OF', 'y', 3], ['Technoblade (1999-2022)', 'w', 2], ['', 'w', 2],
      ['* BUILT WITH', 'y', 3], ['Phaser 3 · TypeScript · Vite · WebAudio', 'w', 2], ['every pixel and every note made from code', 'g', 2],
      ['', 'w', 2], ['* AND STARRING', 'y', 3], [G.name, 'r', 3], ['', 'w', 2], ['THE END', 'w', 4],
    ];
    const c = this.add.container(0, 480);
    let y = 0;
    for (const [s, col, sc] of L) {
      if (s) c.add(label(this, 320, y, s, col, sc, 'c'));
      y += sc * 10 + 10;
    }
    return new Promise((resolve) => {
      const total = y + 480;
      const speed = REDUCED ? 400 : 40;
      const tick = (_t: number, dt: number) => {
        const fast = input.held.has('confirm') || input.held.has('cancel') ? 6 : 1;
        c.y -= (speed * fast * dt) / 1000;
        if (c.y < -total + 300 || input.consume('menu')) {
          this.events.off('update', tick);
          this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => { c.destroy(); resolve(); } });
        }
      };
      this.events.on('update', tick);
    });
  }

  private async cta(ui: UIScene) {
    label(this, 320, 70, 'WAEL', 'w', 8, 'c');
    label(this, 320, 160, "Let's build something.", 'y', 3, 'c');
    new PixelText(this, 92, 210, `${PROFILE.summary}`, { scale: 2, cols: 38, color: 'g' });
    for (;;) {
      const r = await ui.ask('* Where to?', ['Email', 'LinkedIn', 'GitHub', 'Résumé', 'Title screen'], {
        vertical: true, cancel: 4, links: [undefined, PROFILE.links.linkedin, PROFILE.links.github, '/resume/', undefined],
      });
      if (r === 0) {
        try {
          await navigator.clipboard.writeText(emailAddress());
          await ui.say('* Email address copied. Say hi!');
        } catch {
          location.href = 'mai' + 'lto:' + emailAddress();
        }
      } else if (r === 4) {
        this.scene.stop('world');
        this.scene.start('title');
        return;
      }
    }
  }
}
