// Ruins I: the Causal Corridor (TrafficFlowBench) and the Refactoring Swarm bridge.
import Phaser from 'phaser';
import type { RoomLogic, WorldApi, Entity } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { label } from '../../core/text';

// Corridor: columns x=26..33, rows y=10..12. The clock T above each column; each tile is stamped with a time.
const CX0 = 26, CY0 = 10;
const T = [10, 15, 20, 25, 30, 35, 40, 45];
const STAMP = [
  [5, 10, 25, 35, 30, 30, 35, 50],
  [15, 15, 30, 20, 25, 40, 40, 45],
  [20, 5, 20, 15, 35, 45, 50, 40],
];
const future = (c: number, r: number) => STAMP[r][c] > T[c];

const BRIDGE_Y = 12;
const BROKEN = [5, 6, 8];

const tw = (s: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((res) => { s.tweens.add({ ...cfg, duration: REDUCED ? 1 : cfg.duration, onComplete: () => res() }); });
const wait = (s: Phaser.Scene, ms: number) => new Promise<void>((r) => s.time.delayedCall(REDUCED ? 0 : ms, () => r()));

let busy = false;

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    // stamps and clocks
    for (let c = 0; c < 8; c++) {
      s.add.bitmapText((CX0 + c) * TILE + 2, 9 * TILE + 6, 'mini-y', `T${T[c]}`).setDepth(-2);
      for (let r = 0; r < 3; r++) s.add.bitmapText((CX0 + c) * TILE + 4, (CY0 + r) * TILE + 5, 'mini-w', String(STAMP[r][c]).padStart(2, '0')).setDepth(-3);
    }
    label(s, 34 * TILE + 8, 9 * TILE + 5, 'END', 'g', 1, 'c').setDepth(-2);
    if (G.flag('bridge')) for (const x of BROKEN) w.setTile(x, BRIDGE_Y, '=');
  },

  onTile(w, tx, ty) {
    if (tx >= CX0 && tx < CX0 + 8 && ty >= CY0 && ty < CY0 + 3 && future(tx - CX0, ty - CY0)) void leak(w);
    if (tx === 34 && ty >= CY0 && ty <= CY0 + 2 && !G.flag('corridor')) {
      G.setFlag('corridor');
      audio.sfx('secret');
      void w.say([
        '* You made it through, using only the past.',
        '* That is {y}strictly causal forecasting{w}: every input is stamped at or before the forecast time T.',
        '* In TrafficFlowBench, a deletion test wipes everything after T and rebuilds the forecast. It comes out bit-identical.',
      ]);
    }
  },

  async interact(w, e) {
    if (e.def.t === 'terminal' && (e.def as { id: string }).id === 'swarm') {
      await swarm(w, e);
      return true;
    }
    return false;
  },
};

async function leak(w: WorldApi) {
  if (busy) return;
  busy = true;
  w.freeze(true);
  audio.sfx('hit');
  const s = w.s;
  s.cameras.main.flash(REDUCED ? 0 : 200, 255, 40, 40);
  await wait(s, 220);
  w.teleport(24.5 * TILE + 8, 11 * TILE + 8);
  const first = !G.flag('leaked');
  G.setFlag('leaked');
  await w.say(first
    ? ["* You looked into the future. That's leakage.", '* Read the clock above each column. Only step on tiles stamped at or before T.']
    : ["* You looked into the future. That's leakage."]);
  w.freeze(false);
  busy = false;
}

async function swarm(w: WorldApi, e: Entity) {
  if (G.flag('bridge')) {
    await w.say(['* The swarm is resting inside the console.', '* The bridge holds. All tests pass.']);
    return;
  }
  const r = await w.ask(['* A console labelled REFACTORING SWARM.', '* The bridge to the west is broken. Deploy the swarm?'], ['Deploy', 'Not now'], 1);
  if (r !== 0) return;
  w.freeze(true);
  const s = w.s;
  const ox = e.tx * TILE + 8, oy = e.ty * TILE + 14;
  const mk = (k: string, dx: number) => s.add.image(ox + dx, oy, 'bot-' + k).setDepth(9000);
  const aud = mk('auditor', -6), fix = mk('fixer', 0), jud = mk('judge', 6);
  audio.sfx('build');
  await tw(s, { targets: [aud, fix, jud], y: oy + 22, duration: 400 });
  const by = BRIDGE_Y * TILE + 6;

  // 1. Auditor scans the planks
  await w.say(['* AUDITOR: Running static analysis...'], 'bot');
  await tw(s, { targets: aud, x: 9 * TILE, y: by, duration: 300 });
  const marks: Phaser.GameObjects.BitmapText[] = [];
  for (const x of [8, 7, 6, 5, 4]) {
    await tw(s, { targets: aud, x: x * TILE + 8, duration: 160 });
    if (BROKEN.includes(x)) {
      audio.sfx('alert');
      marks.push(label(s, x * TILE + 8, by - 18, '!', 'r', 1, 'c').setDepth(9001));
    }
  }
  await w.say([`* AUDITOR: Found ${BROKEN.length} issues. Handing over to the FIXER.`], 'bot');
  await tw(s, { targets: aud, x: 9 * TILE + 8, y: oy + 22, duration: 300 });

  // 2. Fixer carries planks
  for (const x of [8, 6, 5]) {
    const plank = s.add.image(fix.x, fix.y - 8, 'plank').setDepth(9001);
    await tw(s, { targets: [fix, plank], x: x * TILE + 8, duration: 260 });
    await tw(s, { targets: fix, y: by, duration: 120 });
    plank.destroy();
    audio.sfx('build');
    w.setTile(x, BRIDGE_Y, '=');
    marks.pop()?.destroy();
    await tw(s, { targets: fix, x: 9 * TILE + 8, y: oy + 22, duration: 260 });
  }
  // 3. Judge tests; one test fails, the loop heals it
  await w.say(['* JUDGE: Generating tests...'], 'bot');
  await tw(s, { targets: jud, x: 8 * TILE + 8, y: by, duration: 300 });
  audio.sfx('error');
  w.setTile(8, BRIDGE_Y, 'x');
  const x1 = label(s, 8 * TILE + 8, by - 18, 'x', 'r', 1, 'c').setDepth(9001);
  await w.say(['* JUDGE: 1 test failed on plank 3. Sending the error back to the FIXER.'], 'bot');
  x1.destroy();
  await tw(s, { targets: fix, x: 8 * TILE + 8, y: by + 6, duration: 300 });
  audio.sfx('build');
  w.setTile(8, BRIDGE_Y, '=');
  await w.say(['* FIXER: Retry 1. Patched.'], 'bot');
  await tw(s, { targets: fix, x: 9 * TILE + 8, y: oy + 22, duration: 260 });
  for (const x of [8, 7, 6, 5, 4]) {
    await tw(s, { targets: jud, x: x * TILE + 8, duration: 140 });
    const ok = label(s, x * TILE + 8, by - 18, '✓', 'e', 1, 'c').setDepth(9001);
    s.time.delayedCall(900, () => ok.destroy());
  }
  audio.sfx('save');
  await w.say(['* JUDGE: All tests pass. The bridge is merged.', '* (Three agents, one self-healing loop. That is the Refactoring Swarm.)'], 'bot');
  await tw(s, { targets: [aud, fix, jud], x: ox, y: oy, alpha: 0, duration: 400 });
  [aud, fix, jud].forEach((b) => b.destroy());
  G.setFlag('bridge');
  w.freeze(false);
}

export default logic;
