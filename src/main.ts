import './style.css';
import Phaser from 'phaser';
import { input } from './core/input';
import { audio } from './core/audio';
import { initShell, fit, BASE_W, BASE_H } from './shell/shell';
import { BootScene } from './scenes/Boot';
import { TitleScene } from './scenes/Title';
import { NamingScene } from './scenes/Naming';
import { WorldScene } from './scenes/World';
import { UIScene } from './scenes/UI';

document.documentElement.classList.remove('js-off');
input.init();
input.onMuteKey = () => audio.toggle();
input.onFirstGesture = () => audio.unlock();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: BASE_W,
  height: BASE_H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  input: { keyboard: false, gamepad: false },
  fps: { target: 60, smoothStep: true },
  scale: { mode: Phaser.Scale.NONE, autoRound: true },
  scene: [BootScene, TitleScene, NamingScene, WorldScene, UIScene],
});
game.events.on(Phaser.Core.Events.PRE_STEP, () => input.tick());
input.onKonami = () => game.events.emit('konami');

const shell = initShell(() => game.events.emit('play'));
game.registry.set('shell', shell);
const refit = () => fit(game);
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 200));
game.events.once(Phaser.Core.Events.READY, refit);

// Expose a tiny debug hook only when asked for (used by the screenshot tests): /?dev
if (new URLSearchParams(location.search).has('dev')) (window as unknown as { __game: Phaser.Game }).__game = game;
