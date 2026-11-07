// The Way Out: stars, contact signs (handled by the world), and the gate that picks the ending.
import Phaser from 'phaser';
import type { RoomLogic } from '../types';
import { game as G, MAIN_ROOMS, ENCOUNTERS } from '../../core/state';
import { REDUCED } from '../../core/env';

const logic: RoomLogic = {
  create(w) {
    const s = w.s;
    const W = 22 * 16, H = 14 * 16;
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * (W + 200) - 100, y = Math.random() * (H + 160) - 80;
      const st = s.add.rectangle(Math.round(x), Math.round(y), 1, 1, Math.random() < 0.7 ? 0xffffff : 0x8888cc).setDepth(-9);
      if (!REDUCED) s.tweens.add({ targets: st, alpha: 0.2, duration: 800 + Math.random() * 1600, yoyo: true, repeat: -1, delay: Math.random() * 1000 });
    }
  },
  async interact(w, e) {
    if (e.def.t !== 'gate') return false;
    const r = await w.ask(['* A gate of white light. Beyond it: the surface.', '* Leave the underground?'], ['Leave', 'Stay'], 1);
    if (r !== 0) return true;
    const allRooms = MAIN_ROOMS.every((m) => G.s.visited.includes(m));
    const allSpared = ENCOUNTERS.every((id) => G.s.spared.includes(id));
    const fast = G.playMs() < 3 * 60 * 1000;
    const kind = G.s.fought.length > 0 || fast ? 'determination' : allRooms && allSpared ? 'pacifist' : 'neutral';
    if (!G.s.endings.includes(kind)) G.s.endings.push(kind);
    G.save('exit', 10 * 16 + 8, 8 * 16 + 8);
    w.freeze(true);
    const { runCredits } = await import('../../scenes/Credits');
    runCredits(w.s as Phaser.Scene, kind);
    return true;
  },
};
export default logic;
