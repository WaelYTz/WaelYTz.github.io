// The Lab: the big terminal opens the freeway toy.
import Phaser from 'phaser';
import type { RoomLogic } from '../types';
import { game as G } from '../../core/state';

const logic: RoomLogic = {
  async interact(w, e) {
    if (e.def.t !== 'terminal') return false;
    await w.say(['* The terminal hums. A tiny freeway runs inside it.', '* (An illustrative toy, not the competition model.)']);
    const r = await w.ask(null, ['Play with it', 'Not now'], 1);
    if (r !== 0) return true;
    const { runLab } = await import('../../scenes/Lab');
    await runLab(w.s as Phaser.Scene);
    await w.say(['* A jam forms behind the crash, and the wave travels backwards against the traffic.', '* Forecasting it well, using only the past, is what TrafficFlowBench was about.']);
    if (G.giveCos('headphones')) {
      await w.say(['* BITSY: BEEP. YOU LISTENED TO THE TRAFFIC. TAKE THESE.', '* (New cosmetic: HEADPHONES.)'], 'bot');
      (w.s.registry.get('world') as { wearCosmetic?: () => void })?.wearCosmetic?.();
    }
    return true;
  },
};
export default logic;
