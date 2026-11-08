// The Cluster Garden: k-means with your own hands. 24 glowing flowers grow in three patches; each takes the colour of
// its nearest stone (the centroids). The lever runs one k-means step: every stone rolls to the mean of its flowers.
// The stones start in a bad spot on purpose (two in one patch): k-means alone gets stuck in that local minimum,
// so you have to push a stone somewhere better first. When every patch has its own stone, the spikes drop.
import Phaser from 'phaser';
import type { RoomLogic, WorldApi, Entity } from '../types';
import { TILE } from '../../core/art';
import { audio } from '../../core/audio';
import { game as G } from '../../core/state';
import { REDUCED } from '../../core/env';
import { label } from '../../core/text';

type P = { x: number; y: number };
// three patches, mirrored around the room's centre line (x = 192); offsets are hand-placed, not random
const RING: [number, number][] = [[0, -18], [15, -10], [18, 6], [6, 17], [-10, 16], [-18, 2], [-12, -13], [1, 1]];
const PATCH: P[] = [{ x: 100, y: 100 }, { x: 284, y: 100 }, { x: 192, y: 178 }];
const FLOWERS: { x: number; y: number; truth: number }[] = PATCH.flatMap((c, k) =>
  RING.map(([dx, dy]) => ({ x: c.x + (k === 1 ? -dx : dx), y: c.y + (k === 2 ? -dy : dy), truth: k })),
);
// the bad start: stones 0 and 1 share the left patch, stone 2 sits between the other two
const START: P[] = [{ x: 82, y: 124 }, { x: 122, y: 84 }, { x: 236, y: 146 }];

let st: {
  stones: Entity[];
  flowers: Phaser.GameObjects.Image[];
  assign: number[];
  prev: P;
  busy: boolean;
  pulls: number;
  readout: Phaser.GameObjects.BitmapText;
};

const pos = (e: Entity): P => ({ x: e.data.x as number, y: e.data.y as number });
const d2 = (a: P, b: P) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const mean = (ps: P[]): P => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });
const patchMean = (k: number) => mean(FLOWERS.filter((f) => f.truth === k));

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    const solved = !!G.flag('kmeans');
    const flowers = FLOWERS.map((f) => s.add.image(f.x, f.y + 6, 'data-flower-n').setOrigin(0.5, 1).setDepth(f.y + 6));
    const stones = START.map((p0, i) => {
      const p = solved ? patchMean(i) : p0;
      const e: Entity = { def: { t: 'stone', i }, key: 's', tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE), data: { x: p.x, y: p.y } };
      e.sprite = s.add.image(p.x, p.y, 'stone-' + i).setDepth(p.y + 8);
      w.ents.push(e);
      return e;
    });
    // the garden's own little scoreboard, just under the gate: lower inertia = tighter clusters
    st = {
      stones, flowers, assign: FLOWERS.map(() => -1), prev: { ...w.player }, busy: false, pulls: 0,
      readout: label(s, 192 - 33, 3 * TILE + 2, '', 'g', 1).setDepth(-2),
    };
    recolor();
  },

  update(w) {
    if (!st || st.busy) return;
    // pushing: walking into a stone moves it (like the ball in the ruins)
    const dx = w.player.x - st.prev.x, dy = w.player.y - st.prev.y;
    if ((dx || dy) && !G.flag('kmeans')) {
      for (const e of st.stones) {
        const p = pos(e);
        if (Math.abs(w.player.x - p.x) >= 11 || Math.abs(w.player.y - p.y) >= 11) continue;
        const n = { x: p.x + dx * 1.05, y: p.y + dy * 1.05 };
        if (free(w, e, n)) {
          e.data.x = n.x;
          e.data.y = n.y;
          if (Math.random() < 0.08) audio.sfx('push');
        } else {
          w.player.x = st.prev.x;
          w.player.y = st.prev.y;
        }
        if (Math.abs(w.player.x - (e.data.x as number)) < 10 && Math.abs(w.player.y - (e.data.y as number)) < 10) {
          w.player.x = st.prev.x;
          w.player.y = st.prev.y;
        }
      }
      recolor();
      if (isSolved()) void solve(w);
    }
    st.prev = { ...w.player };
    for (const e of st.stones) {
      const p = pos(e);
      e.sprite?.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(p.y + 8);
      e.hit = { x: p.x - 9, y: p.y - 9, w: 18, h: 18 };
    }
  },

  async interact(w, e) {
    if (e.def.t !== 'lever') return false;
    if (G.flag('kmeans')) {
      await w.say(['* You pull the lever. The stones are already exactly where they belong.', '* (Converged. It feels very peaceful.)']);
      return true;
    }
    if (st.busy) return true;
    await step(w, e);
    return true;
  },
};

/** One k-means (Lloyd) step: every stone rolls to the mean of the flowers that chose it. */
async function step(w: WorldApi, lever: Entity) {
  st.busy = true;
  w.freeze(true);
  const s = w.s;
  audio.sfx('select');
  (lever.sprite as Phaser.GameObjects.Sprite | undefined)?.setFrame(st.pulls % 2 ? 0 : 1);
  st.pulls++;
  recolor();
  let moved = 0;
  await Promise.all(st.stones.map((e, i) => {
    const mine = FLOWERS.filter((_, k) => st.assign[k] === i);
    if (!mine.length) return Promise.resolve();
    const m = mean(mine);
    moved += Math.sqrt(d2(m, pos(e)));
    return new Promise<void>((res) => {
      if (REDUCED) { e.data.x = m.x; e.data.y = m.y; return res(); }
      s.tweens.add({ targets: e.data, x: m.x, y: m.y, duration: 600, ease: 'Sine.easeInOut', onUpdate: () => { e.sprite?.setPosition(Math.round(e.data.x as number), Math.round(e.data.y as number)); }, onComplete: () => res() });
    });
  }));
  audio.sfx('step');
  recolor();
  w.freeze(false);
  st.busy = false;
  if (isSolved()) return solve(w);
  if (moved < 2) {
    await w.say([
      '* The stones stopped moving. k-means has converged...',
      '* ...but two stones are sharing one patch, and one stone is stuck between two.',
      '* That is a {y}local minimum{w}. More steps will not fix it. Push a stone somewhere better, then pull again.',
    ]);
  }
}

function free(w: WorldApi, me: Entity, n: P) {
  if (w.solidAt({ x: n.x - 6, y: n.y - 4, w: 12, h: 10 })) return false;
  if (n.y < 3 * TILE + 4) return false; // keep the doorway clear
  return st.stones.every((o) => o === me || Math.abs(o.data.x as number - n.x) > 14 || Math.abs(o.data.y as number - n.y) > 14);
}

/** Each flower takes the colour of its nearest stone. */
function recolor() {
  const ps = st.stones.map(pos);
  let inertia = 0;
  FLOWERS.forEach((f, k) => {
    let best = 0;
    for (let i = 1; i < ps.length; i++) if (d2(f, ps[i]) < d2(f, ps[best])) best = i;
    inertia += d2(f, ps[best]);
    if (st.assign[k] !== best) {
      st.assign[k] = best;
      st.flowers[k].setTexture('data-flower-' + best);
    }
  });
  st.readout.setText(`INERTIA ${Math.round(inertia / 100)}`);
}

/** Every patch has its own stone, and each stone sits near the middle of its patch. */
function isSolved() {
  const owner = [0, 1, 2].map((k) => {
    const set = new Set(FLOWERS.map((f, i) => (f.truth === k ? st.assign[i] : -1)).filter((v) => v >= 0));
    return set.size === 1 ? [...set][0] : -1;
  });
  if (owner.some((o) => o < 0) || new Set(owner).size !== 3) return false;
  return owner.every((stone, k) => d2(pos(st.stones[stone]), patchMean(k)) < 30 * 30);
}

async function solve(w: WorldApi) {
  if (G.flag('kmeans')) return;
  G.setFlag('kmeans');
  st.busy = true;
  w.freeze(true);
  audio.sfx('solve');
  // snap the stones to the exact means
  st.stones.forEach((e) => {
    const k = FLOWERS.findIndex((_, i) => st.assign[i] === (e.def as { i: number }).i);
    const m = patchMean(k >= 0 ? FLOWERS[k].truth : 0);
    e.data.x = m.x;
    e.data.y = m.y;
  });
  recolor();
  await new Promise((r) => w.s.time.delayedCall(REDUCED ? 0 : 500, r));
  w.setSpikes('kmeans', true);
  await w.say([
    '* Every patch has its own stone. The garden glows in three clean colours.',
    '* That is {y}k-means{w}: assign each point to its nearest centre, move each centre to its points, repeat.',
    '* (And the lesson: where you START matters. Real k-means uses smarter starts, like k-means++.)',
    '* The spikes slide down into the ground.',
  ]);
  if (G.giveCos('flower')) {
    await w.say(['* One of the flowers lets go of its stem and lands on your SOUL.', '* (New cosmetic: LITTLE FLOWER.)']);
    w.wearCosmetic();
  }
  w.freeze(false);
  st.busy = false;
}

export default logic;
