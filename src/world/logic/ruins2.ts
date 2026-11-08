// Ruins II: the Refactoring Swarm rebuilds the bridge. You decide the order the three agents work in.
// Only AUDITOR (find the issues) -> FIXER (patch them) -> JUDGE (test the patches) works; every other order fails
// in its own way. Then the Judge's one failing test is fed back to the Fixer: the self-healing loop.
import Phaser from 'phaser';
import type { RoomLogic, WorldApi, Entity } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { label } from '../../core/text';

const BRIDGE_Y = 7;
const BRIDGE = [11, 12, 13, 14, 15, 16, 17, 18];
const BROKEN = [12, 13, 16, 17];
const AGENTS = ['AUDITOR', 'FIXER', 'JUDGE'] as const;
type Agent = (typeof AGENTS)[number];

const tw = (s: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((res) => { s.tweens.add({ ...cfg, duration: REDUCED ? 1 : cfg.duration, onComplete: () => res() }); });

const logic: RoomLogic = {
  create(w) {
    if (G.flag('bridge')) for (const x of BROKEN) w.setTile(x, BRIDGE_Y, '=');
  },
  async interact(w, e) {
    if (e.def.t === 'terminal') {
      await swarm(w, e);
      return true;
    }
    return false;
  },
};

async function chooseOrder(w: WorldApi): Promise<Agent[] | null> {
  const order: Agent[] = [];
  const nth = ['first', 'second', 'third'];
  while (order.length < 3) {
    const left = AGENTS.filter((a) => !order.includes(a));
    if (left.length === 1) {
      order.push(left[0]);
      break;
    }
    const r = await w.ask(`* Which agent goes ${nth[order.length]}?`, [...left, 'Cancel'], left.length);
    if (r === left.length) return null;
    order.push(left[r]);
  }
  return order;
}

async function swarm(w: WorldApi, e: Entity) {
  if (G.flag('bridge')) {
    await w.say(['* The swarm is resting inside the console.', '* The bridge holds. All tests pass.']);
    return;
  }
  const r = await w.ask(['* A console labelled REFACTORING SWARM.', '* Three tiny agents wait for a job: an AUDITOR, a FIXER and a JUDGE.', '* Give them the job?'], ['Yes', 'Not now'], 1);
  if (r !== 0) return;
  const order = await chooseOrder(w);
  if (!order) return;
  await w.say(`* Order: {y}${order.join(' > ')}{w}. The console beeps.`);
  const key = order.join('>');
  if (key === 'AUDITOR>FIXER>JUDGE') return run(w, e);

  w.freeze(true);
  const s = w.s;
  const ox = e.tx * TILE + 8, oy = e.ty * TILE + 14;
  const by = BRIDGE_Y * TILE + 6;
  const bot = s.add.image(ox, oy, 'bot-' + order[0].toLowerCase()).setDepth(9000);
  audio.sfx('build');
  await tw(s, { targets: bot, y: by, duration: 300 });
  if (order[0] === 'JUDGE') {
    await tw(s, { targets: bot, x: 13 * TILE + 8, duration: 400 });
    await w.say(['* JUDGE: Running the test suite...', '* JUDGE: 0 tests found. All 0 tests pass! Ship it!', '* (Tests that test nothing always pass. The bridge is still broken.)'], 'bot');
  } else if (order[0] === 'FIXER') {
    await tw(s, { targets: bot, x: 14 * TILE + 8, duration: 400 });
    audio.sfx('error');
    w.setTile(14, BRIDGE_Y, 'x');
    await w.say(['* FIXER: Fixing! ...Fixing what? Nobody told me what is broken.', '* FIXER: I replaced this plank. It looked suspicious.', '* (It was the only good plank in the middle. Without an audit, the fix made things worse.)'], 'bot');
    w.setTile(14, BRIDGE_Y, '=');
  } else {
    // AUDITOR > JUDGE > FIXER: the patches are never tested
    for (const x of BROKEN) { await tw(s, { targets: bot, x: x * TILE + 8, duration: 120 }); }
    await w.say(['* AUDITOR: Found 4 issues.', '* JUDGE: I tested the broken bridge. It is broken. (I could have told you that.)', '* FIXER: Patched all 4! Probably!'], 'bot');
    for (const x of BROKEN) w.setTile(x, BRIDGE_Y, '=');
    await new Promise((res) => s.time.delayedCall(REDUCED ? 0 : 600, res));
    audio.sfx('error');
    for (const x of BROKEN) w.setTile(x, BRIDGE_Y, 'x');
    await w.say(['* ...The new planks wobble, and fall into the chasm.', '* (Nobody tested the fixes AFTER they were made.)'], 'bot');
  }
  await tw(s, { targets: bot, x: ox, y: oy, alpha: 0, duration: 300 });
  bot.destroy();
  await w.say('* The agents climb back into the console. (Try a different order.)');
  w.freeze(false);
}

async function run(w: WorldApi, e: Entity) {
  w.freeze(true);
  const s = w.s;
  const ox = e.tx * TILE + 8, oy = e.ty * TILE + 14;
  const by = BRIDGE_Y * TILE + 6;
  const mk = (k: string, dx: number) => s.add.image(ox + dx, oy, 'bot-' + k).setDepth(9000);
  const aud = mk('auditor', -6), fix = mk('fixer', 0), jud = mk('judge', 6);
  audio.sfx('build');
  await tw(s, { targets: [aud, fix, jud], y: by, duration: 400 });
  // 1. the Auditor walks the bridge and flags every broken plank
  await w.say(['* AUDITOR: Running static analysis...'], 'bot');
  const marks: Phaser.GameObjects.BitmapText[] = [];
  for (const x of [...BRIDGE].reverse()) {
    await tw(s, { targets: aud, x: x * TILE + 8, duration: 150 });
    if (BROKEN.includes(x)) {
      audio.sfx('alert');
      marks.push(label(s, x * TILE + 8, by - 18, '!', 'r', 1, 'c').setDepth(9001));
    }
  }
  await w.say([`* AUDITOR: Found ${BROKEN.length} issues. Handing over to the FIXER.`], 'bot');
  await tw(s, { targets: aud, x: ox - 6, y: by, duration: 300 });
  // 2. the Fixer carries planks
  for (const x of BROKEN) {
    const plank = s.add.image(fix.x, fix.y - 8, 'plank').setDepth(9001);
    await tw(s, { targets: [fix, plank], x: x * TILE + 8, duration: 220 });
    plank.destroy();
    audio.sfx('build');
    w.setTile(x, BRIDGE_Y, '=');
    marks.shift()?.destroy();
  }
  await tw(s, { targets: fix, x: ox, duration: 300 });
  // 3. the Judge tests; one test fails and the loop heals it
  await w.say(['* JUDGE: Generating tests...'], 'bot');
  for (const x of BRIDGE) {
    await tw(s, { targets: jud, x: x * TILE + 8, duration: 130 });
    if (x === 16 && !G.flag('healed')) {
      G.setFlag('healed');
      audio.sfx('error');
      w.setTile(16, BRIDGE_Y, 'x');
      const xm = label(s, 16 * TILE + 8, by - 18, 'x', 'r', 1, 'c').setDepth(9001);
      await w.say(['* JUDGE: 1 test failed on plank 6. Sending the error back to the FIXER.'], 'bot');
      await tw(s, { targets: fix, x: 16 * TILE + 8, duration: 300 });
      audio.sfx('build');
      w.setTile(16, BRIDGE_Y, '=');
      xm.destroy();
      await w.say(['* FIXER: Retry 1. Patched.'], 'bot');
    }
    const ok = label(s, x * TILE + 8, by - 18, '✓', 'e', 1, 'c').setDepth(9001);
    s.time.delayedCall(900, () => ok.destroy());
  }
  audio.sfx('solve');
  await w.say(['* JUDGE: All tests pass. The bridge is merged.', '* (Audit, fix, test, and feed the failures back. That is the Refactoring Swarm.)'], 'bot');
  await tw(s, { targets: [aud, fix, jud], x: ox, y: oy, alpha: 0, duration: 400 });
  [aud, fix, jud].forEach((b) => b.destroy());
  G.setFlag('bridge');
  if (G.giveCos('hardhat')) {
    await w.say(['* The FIXER leaves something behind on the console.', '* A tiny hard hat. Safety first.', '* (New cosmetic: HARD HAT.)']);
    w.wearCosmetic();
  }
  w.freeze(false);
}

export default logic;
