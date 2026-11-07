// Ruins I: the Causal Corridor (TrafficFlowBench). The corridor IS the way forward: only step on the past.
import type { RoomLogic, WorldApi } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';

const CX0 = 9, CY0 = 6, COLS = 12;
const T = Array.from({ length: COLS }, (_, c) => 10 + c * 5);
// the only safe path (rows 0..2 = y 6..8)
const SAFE = [
  '.SSS...SSS..',
  'SS.S.SSS.SS.',
  '...SSS....SS',
];
const safe = (c: number, r: number) => SAFE[r][c] === 'S';
const stamp = (c: number, r: number) => (safe(c, r) ? Math.max(0, T[c] - ((r + c) % 3) * 5) : T[c] + 5 + ((r * 7 + c) % 2) * 5);

let busy = false;

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    busy = false;
    for (let c = 0; c < COLS; c++) {
      s.add.bitmapText((CX0 + c) * TILE + 2, 5 * TILE + 6, 'mini-y', `T${T[c]}`).setDepth(-2);
      for (let r = 0; r < 3; r++) s.add.bitmapText((CX0 + c) * TILE + 4, (CY0 + r) * TILE + 5, 'mini-w', String(stamp(c, r)).padStart(2, '0')).setDepth(-3);
    }
  },

  onTile(w, tx, ty) {
    if (tx >= CX0 && tx < CX0 + COLS && ty >= CY0 && ty < CY0 + 3 && !safe(tx - CX0, ty - CY0)) void leak(w);
    if (tx === CX0 + COLS && ty >= CY0 && ty < CY0 + 3 && !G.flag('corridor')) {
      G.setFlag('corridor');
      audio.sfx('secret');
      void w.say([
        '* You made it through, using only the past.',
        '* That is {y}strictly causal forecasting{w}: every input is stamped at or before the forecast time T.',
        '* In TrafficFlowBench, a deletion test wipes everything after T and rebuilds the forecast. It comes out bit-identical.',
      ]);
    }
  },
};

async function leak(w: WorldApi) {
  if (busy) return;
  busy = true;
  w.freeze(true);
  audio.sfx('hit');
  w.s.cameras.main.flash(REDUCED ? 0 : 200, 255, 40, 40);
  await new Promise((r) => w.s.time.delayedCall(REDUCED ? 0 : 220, r));
  w.teleport(7.5 * TILE + 8, 7 * TILE + 8);
  const first = !G.flag('leaked');
  G.setFlag('leaked');
  await w.say(first
    ? ["* You looked into the future. That's leakage.", '* Read the clock above each column. Only step on tiles stamped at or before T.']
    : ["* You looked into the future. That's leakage."]);
  w.freeze(false);
  busy = false;
}

export default logic;
