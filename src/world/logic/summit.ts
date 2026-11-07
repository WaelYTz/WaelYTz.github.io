// The Summit: THE LEADERBOARD. Talking to it starts the optional boss fight; you can also just walk around it.
import Phaser from 'phaser';
import type { RoomLogic } from '../types';
import { game as G } from '../../core/state';
import { audio } from '../../core/audio';

const logic: RoomLogic = {
  create(w) {
    const boss = w.ents.find((e) => e.def.t === 'boss');
    if (boss && G.flag('boss')) (boss.sprite as Phaser.GameObjects.Sprite | undefined)?.setAlpha(G.s.fought.includes('leaderboard') ? 0.25 : 0.7);
  },
  async interact(w, e) {
    if (e.def.t !== 'boss') return false;
    if (G.flag('boss')) {
      await w.say(G.s.spared.includes('leaderboard')
        ? ['* The board shows one quiet line:', '* "THANKS FOR PLAYING. THE LEARNING WAS THE SCORE."']
        : ['* The board is dark. A single cursor blinks in the corner.']);
      return true;
    }
    await w.say([
      '* A huge glowing board towers over the path.',
      '* Names scroll across it. Numbers climb and fall. It hums the sound of a thousand refresh buttons.',
      '* THE LEADERBOARD: "LITTLE SOUL. DO YOU WANT TO KNOW YOUR RANK?"',
    ], 'enemy');
    const r = await w.ask(null, ['Face it', 'Not today'], 1);
    if (r !== 0) {
      await w.say(['* THE LEADERBOARD: "...YOU WILL BE BACK. EVERYONE REFRESHES EVENTUALLY."'], 'enemy');
      return true;
    }
    w.freeze(true);
    audio.sfx('alert');
    const { runEncounter } = await import('../../scenes/Encounter');
    const res = await runEncounter(w.s, 'leaderboard');
    audio.music('summit');
    if (res === 'spared' || res === 'fought') {
      G.setFlag('boss');
      (e.sprite as Phaser.GameObjects.Sprite | undefined)?.setAlpha(res === 'fought' ? 0.25 : 0.7);
    }
    if (res !== 'fled' && G.giveCos('shades')) {
      await w.say(['* You faced THE LEADERBOARD. That takes nerve.', '* A pair of very cool sunglasses falls out of its stand.', '* (New cosmetic: SUNGLASSES.)']);
      (w.s.registry.get('world') as { wearCosmetic?: () => void })?.wearCosmetic?.();
    }
    w.freeze(false);
    return true;
  },
};
export default logic;
