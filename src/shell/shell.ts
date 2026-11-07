// DOM side of the game page: integer scaling, intro card, sound toggle, pixel labels, screen-reader mirror.
import type Phaser from 'phaser';
import { GLYPHS, ADV, clean } from '../core/glyphs';
import { audio } from '../core/audio';

// Fixed 4:3 canvas. The world camera zooms 2x (320x240 of world = 20x15 tiles); UI text is drawn at 3x.
export const BASE_W = 640;
export const BASE_H = 480;

/** Same 5x7 font as the canvas, as inline SVG for DOM buttons. */
export function pixelSvg(text: string, scale = 2, fill = '#fff'): string {
  const s = clean(text);
  let d = '';
  [...s].forEach((ch, i) => {
    GLYPHS[ch]?.forEach((row, r) => {
      for (let c = 0; c < 5; c++) if (row[c] === '#') d += `M${(i * ADV + c) * scale} ${r * scale}h${scale}v${scale}h-${scale}z`;
    });
  });
  const w = Math.max(1, (s.length * ADV - 1) * scale);
  const rows = Math.max(7, ...[...s].map((ch) => GLYPHS[ch]?.length ?? 7));
  return `<svg viewBox="0 0 ${w} ${rows * scale}" width="${w}" height="${rows * scale}" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path d="${d}" fill="${fill}"/></svg>`;
}
function pixelLabel(el: HTMLElement, text: string, scale = 2) {
  const sr = el.textContent ?? text;
  el.innerHTML = `${pixelSvg(text, scale)}<span class="sr">${sr}</span>`;
}

/** Integer scaling in *device* pixels, so every game pixel is a crisp square. */
export function fit(game: Phaser.Game) {
  const root = document.documentElement;
  const touch = root.classList.contains('touch');
  const landscape = innerWidth > innerHeight;
  root.classList.toggle('landscape', touch && landscape);
  const stage = document.getElementById('stage')!;
  const r = stage.getBoundingClientRect();
  const aw = r.width - (touch && landscape ? 360 : 0);
  const ah = r.height;
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(aw / BASE_W, ah / BASE_H);
  const dev = fit * dpr; // device pixels per canvas pixel if we filled the space
  // Snap to half-steps in *device* pixels: world art is drawn at 2x, so every world pixel stays a perfect square.
  // On high-density phones the difference is invisible, so just fill the space.
  const zoom = dpr >= 2 ? fit : dev >= 1 ? Math.floor(dev * 2) / 2 / dpr : Math.max(0.4, fit);
  game.scale.setZoom(zoom);
  game.scale.refresh();
  placeTypebox();
}

let typeRect: { x: number; y: number; w: number; h: number } | null = null;
/** Put the hidden <input> over a region of the canvas (game coordinates), so taps on it open the phone keyboard. */
export function setTypeboxRect(r: { x: number; y: number; w: number; h: number } | null) {
  typeRect = r;
  placeTypebox();
}
function placeTypebox() {
  const box = document.getElementById('typebox') as HTMLInputElement | null;
  const canvas = document.querySelector('#stage canvas') as HTMLCanvasElement | null;
  if (!box || !canvas) return;
  if (!typeRect) {
    box.classList.remove('active');
    box.style.width = box.style.height = '1px';
    return;
  }
  const cr = canvas.getBoundingClientRect();
  const sr = document.getElementById('stage')!.getBoundingClientRect();
  const k = cr.width / BASE_W;
  box.classList.add('active');
  box.style.left = `${cr.left - sr.left + typeRect.x * k}px`;
  box.style.top = `${cr.top - sr.top + typeRect.y * k}px`;
  box.style.width = `${typeRect.w * k}px`;
  box.style.height = `${typeRect.h * k}px`;
}

const live = () => document.getElementById('sr-live');
/** Mirror dialog text into an aria-live region for screen readers. */
export function srSay(text: string) {
  const el = live();
  if (el) el.textContent = text.replace(/\{[a-z]\}/g, '');
}

export function initShell(onPlay: () => void) {
  const skip = document.getElementById('skip');
  if (skip) pixelLabel(skip, 'SKIP → RÉSUMÉ');
  const mute = document.getElementById('mute') as HTMLButtonElement;
  const paint = (m: boolean) => {
    mute.setAttribute('aria-pressed', String(m));
    mute.innerHTML = `${pixelSvg(m ? '♪ OFF' : '♪ ON', 2)}<span class="sr">${m ? 'Sound is off. Turn sound on' : 'Sound is on. Turn sound off'}</span>`;
  };
  paint(audio.muted);
  audio.listeners.push(paint);
  mute.addEventListener('click', () => audio.toggle());

  const play = document.getElementById('play') as HTMLButtonElement | null;
  const intro = document.getElementById('intro');
  const start = () => {
    intro?.classList.add('gone');
    window.setTimeout(() => intro?.remove(), 400);
    (document.querySelector('#stage canvas') as HTMLElement | null)?.focus();
    onPlay();
  };
  play?.addEventListener('click', start);
  return {
    ready(label: string) {
      if (!play) return;
      play.disabled = false;
      play.textContent = label;
      pixelLabel(play, '▶ ' + label.toUpperCase(), 3);
      play.focus({ preventScroll: true });
    },
    /** Skip the card entirely (deep links). */
    dismiss() {
      intro?.remove();
    },
    get open() {
      return !!document.getElementById('intro') && !intro?.classList.contains('gone');
    },
    start,
  };
}
