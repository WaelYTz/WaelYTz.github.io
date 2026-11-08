// Where It Begins: a light beam on a pile of keyboard keys, and PIP rushing in to say hello (first visit only).
import type { RoomLogic, WorldApi } from '../types';
import { TILE } from '../../core/art';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { audio } from '../../core/audio';

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    s.add.image(8 * TILE, 0, 'prop-beam').setOrigin(0.5, 0).setDepth(-1).setScale(1.2, 0.9).setAlpha(0.9);
    const pip = w.ents.find((e) => e.def.t === 'npc');
    if (pip && G.flag('pipIntro')) {
      pip.sprite?.destroy();
      w.addSolid(pip, undefined);
      pip.hit = undefined;
    } else if (pip) {
      pip.data.noAuto = true;
      pip.sprite?.setAlpha(0);
      void intro(w, pip);
    }
  },
};

async function intro(w: WorldApi, pip: import('../types').Entity) {
  const s = w.s;
  w.freeze(true);
  await new Promise((r) => s.time.delayedCall(REDUCED ? 100 : 900, r));
  audio.sfx('alert');
  if (pip.sprite) s.tweens.add({ targets: pip.sprite, alpha: 1, duration: REDUCED ? 1 : 300 });
  await w.say([
    '* PIP: Oh! Oh oh oh. A visitor!',
    "* PIP: Hi! I'm PIP. I'm... loading. Mostly loading.",
    "* PIP: You must be {name}! Welcome to WAEL's underground.",
    '* PIP: Everything he ever built is down here. Some of it bites. (Gently.)',
    '* PIP: Walk with the ARROWS. Talk to things with Z. Press C if you get lost.',
    "* PIP: I'll wait for you up ahead. Loading... loading...",
  ], 'pip' as import('../../core/audio').Voice);
  G.setFlag('pipIntro');
  if (pip.sprite) s.tweens.add({ targets: pip.sprite, y: pip.sprite.y - 40, alpha: 0, duration: REDUCED ? 1 : 500, onComplete: () => pip.sprite?.destroy() });
  w.addSolid(pip, undefined);
  pip.hit = undefined;
  w.freeze(false);
}

export default logic;
