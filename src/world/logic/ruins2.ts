// Ruins II: the Refactoring Swarm rebuilds the bridge (Auditor scans, Fixer patches, Judge tests, one test fails and heals).
import Phaser from 'phaser';
import type { RoomLogic, WorldApi, Entity } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { label } from '../../core/text';

const BRIDGE_Y = 7;
const BRIDGE = [10, 11, 12, 13, 14, 15, 16];
const BROKEN = [11, 12, 14, 15];

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

async function swarm(w: WorldApi, e: Entity) {
  if (G.flag('bridge')) {
    await w.say(['* The swarm is resting inside the console.', '* The bridge holds. All tests pass.']);
    return;
  }
  const r = await w.ask(['* A console labelled REFACTORING SWARM.', '* Three tiny agents are waiting for a job. Deploy the swarm?'], ['Deploy', 'Not now'], 1);
  if (r !== 0) return;
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
    if (x === 14 && !G.flag('healed')) {
      G.setFlag('healed');
      audio.sfx('error');
      w.setTile(14, BRIDGE_Y, 'x');
      const xm = label(s, 14 * TILE + 8, by - 18, 'x', 'r', 1, 'c').setDepth(9001);
      await w.say(['* JUDGE: 1 test failed on plank 3. Sending the error back to the FIXER.'], 'bot');
      await tw(s, { targets: fix, x: 14 * TILE + 8, duration: 300 });
      audio.sfx('build');
      w.setTile(14, BRIDGE_Y, '=');
      xm.destroy();
      await w.say(['* FIXER: Retry 1. Patched.'], 'bot');
    }
    const ok = label(s, x * TILE + 8, by - 18, '✓', 'e', 1, 'c').setDepth(9001);
    s.time.delayedCall(900, () => ok.destroy());
  }
  audio.sfx('save');
  await w.say(['* JUDGE: All tests pass. The bridge is merged.', '* (Three agents, one self-healing loop. That is the Refactoring Swarm.)'], 'bot');
  await tw(s, { targets: [aud, fix, jud], x: ox, y: oy, alpha: 0, duration: 400 });
  [aud, fix, jud].forEach((b) => b.destroy());
  G.setFlag('bridge');
  if (G.giveCos('hardhat')) {
    await w.say(['* The FIXER leaves something behind on the console.', '* A tiny hard hat. Safety first.', '* (New cosmetic: HARD HAT.)']);
    (w.s.registry.get('world') as { wearCosmetic?: () => void })?.wearCosmetic?.();
  }
  w.freeze(false);
}

export default logic;
