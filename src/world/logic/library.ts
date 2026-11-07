// Library: one book sticks out; pulling it slides the shelf and opens the Unshipped Room.
import type { RoomLogic, Entity } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';

function slide(e: Entity, instant: boolean, add: (r: { x: number; y: number; w: number; h: number }) => void) {
  const x = (e.tx - 1) * TILE + 8;
  if (instant || REDUCED) e.sprite?.setX(x);
  add({ x: (e.tx - 1) * TILE, y: e.ty * TILE, w: 16, h: 16 });
  e.hit = { x: (e.tx - 1) * TILE - 1, y: e.ty * TILE - 1, w: 18, h: 18 };
}

const logic: RoomLogic = {
  create(w) {
    const odd = w.ents.find((e) => e.def.t === 'odd');
    if (odd && G.flag('shelf')) slide(odd, true, (r) => w.addSolid(odd, r));
  },
  async interact(w, e) {
    if (e.def.t !== 'odd') return false;
    if (G.flag('shelf')) {
      await w.say('* The shelf has been pulled aside. A dark doorway waits behind it.');
      return true;
    }
    await w.say(['* One book sticks out a little.', "* Its spine reads: {y}UNSHIPPED{w}."]);
    const r = await w.ask('* Pull it?', ['Pull', 'Leave it'], 1);
    if (r !== 0) return true;
    audio.sfx('door');
    if (!REDUCED) w.s.tweens.add({ targets: e.sprite, x: (e.tx - 1) * TILE + 8, duration: 700, ease: 'Stepped' });
    slide(e, false, (rr) => w.addSolid(e, rr));
    G.setFlag('shelf');
    await w.say('* Something clicks. The shelf slides aside.');
    return true;
  },
};
export default logic;
