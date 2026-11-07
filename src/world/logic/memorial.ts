// Memorial: a quiet room. The crown on its pedestal, typed lines, and a reward for simply staying a while.
import type { RoomLogic } from '../types';
import { game as G } from '../../core/state';
import { TECHNO, TECHNO_MEMORIAL } from '../../content/lore';
import type { UIScene } from '../../scenes/UI';

let idle = 0;

const logic: RoomLogic = {
  create() {
    idle = 0;
  },
  update(w, dt) {
    const ui = w.s.scene.get('ui') as UIScene;
    if (w.moving || ui.busy) {
      idle = 0;
      return;
    }
    idle += dt;
    if (idle > 20000 && !G.hasSecret('patience')) {
      idle = 0;
      G.secret('patience');
      void w.say(['* You stayed a while.', '* The candles seem to burn a little brighter.']);
    }
  },
  async interact(w, e) {
    if (e.def.t !== 'crown') return false;
    await w.say(['* A golden crown rests on the pedestal.', TECHNO[0], TECHNO[1]]);
    await w.say(`* {g}${TECHNO_MEMORIAL}.`);
    return true;
  },
};
export default logic;
