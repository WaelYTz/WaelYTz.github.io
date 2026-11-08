// Extra original art: Wael (the owner's OC), his cozy room, the K-means garden, the Lab's digit floor and two cosmetics.
// Same house style as cast.ts: black 'k' outline, 2-3 shades per colour, chunky readable shapes, no image files.
import Phaser from 'phaser';
import { canvasTex, drawGrid, framesTex, gridTex } from './art';

type Ctx = CanvasRenderingContext2D;
const K = '#000000';
const r = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
/** Filled (optionally rotated) ellipse by pixel test; `col` may shade by local coords (u along, v across, both -1..1). */
function ell(c: Ctx, col: string | ((u: number, v: number) => string), cx: number, cy: number, a: number, b: number, ang = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.ceil(Math.max(a, b)) + 1;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * ca + dy * sa) / a, v = (-dx * sa + dy * ca) / b;
      if (u * u + v * v <= 1) r(c, typeof col === 'string' ? col : col(u, v), x, y);
    }
  }
}

// shared palette letters (cast.ts's letters plus Wael's colours)
const P: Record<string, string> = {
  k: K, w: '#ffffff', W: '#d8d8e0', g: '#9a9aa8', G: '#5a5a68',
  y: '#ffd23a', Y: '#c89a10', o: '#ff8a1a', O: '#b85a10', r: '#e83a3a', R: '#a01c24',
  b: '#e8d8b0', B: '#b8a070', n: '#7a4a2a', N: '#4a2a14',
  c: '#5ac8ff', C: '#2a7ab8', e: '#5ac85a', E: '#2e8a3a', s: '#c8ccd8', S: '#8a90a0', m: '#f0a0c0', M: '#c06080',
  // Wael
  h: '#1d1d2b', H: '#36425e', j: '#5a6c94', // jet-black hair, dark blue-grey highlights
  f: '#f6c9a0', F: '#d89a72', t: '#ff8aa0', // skin, skin shade, blush
  p: '#9a64dc', x: '#1e1828', // purple / black stripes
  z: '#26262f', // black shorts
  l: '#d4c2fa', L: '#9e82de', // lilac leg warmers
  u: '#6a3c22', v: '#8e5a34', // dark-brown boots
  a: '#efe2c4', // light soles
};
const WOOD = { hi: '#d49a5e', mid: '#a86a3a', lo: '#74441e', dk: '#4a2a12' };
const PUR = { hi: '#c9a2f2', mid: '#9a64dc', lo: '#7240b4', dk: '#4e2a86' };

/** Frames from grids, transparent '.' */
const sheet = (s: Phaser.Scene, key: string, frames: string[][], pal: Record<string, string> = P) => framesTex(s, key, frames, pal);
/** A canvas sprite sheet of n frames laid out horizontally, named 0..n-1. */
function canvasFrames(s: Phaser.Scene, key: string, fw: number, fh: number, n: number, draw: (c: Ctx, f: number) => void) {
  canvasTex(s, key, fw * n, fh, (c) => {
    for (let f = 0; f < n; f++) { c.save(); c.translate(f * fw, 0); draw(c, f); c.restore(); }
  });
  const t = s.textures.get(key);
  for (let f = 0; f < n; f++) t.add(f, 0, f * fw, 0, fw, fh);
}

export function buildExtras(scene: Phaser.Scene): void {
  if (scene.textures.exists('npc-wael')) return;
  buildWael(scene);
  buildHouse(scene);
  buildGarden(scene);
  buildLab(scene);
  buildCosmetics(scene);
}

// ───────────────────────── WAEL ─────────────────────────
// The owner's character, drawn on the classic RPG-kid template (a big mop-haired head about half the sprite, a flat
// face with tiny eyes, a small striped body, short legs, one dark colour for hair and outline) with his own look:
// messy jet-black hair, a lopsided smirk and rosy cheeks, a purple-and-black striped tee, black shorts, lilac leg
// warmers and big brown boots. 20x32 frames: 0 idle, 1 blink, 2-3 walk down, 4-5 back view (typing), 6-7 walk right.
const WAEL_PAL: Record<string, string> = {
  a: '#16141c', // outline and hair (jet black)
  H: '#3a3748', // a few hair strands
  f: '#ffe2b4', F: '#e8b88a', // skin
  e: '#000000', // eyes and mouth
  t: '#ff9ec4', // blush
  p: '#a362ea', x: '#2b2338', // purple and black stripes
  z: '#2f2b3a', // black shorts
  l: '#e8deff', L: '#b8a4ee', // leg warmers
  u: '#7a4424', v: '#ab6b3c', // boots
};

function buildWael(s: Phaser.Scene) {
  sheet(s, 'npc-wael', [
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaafaaaaafaaaa.',
      '.aaaaffffaaffffaaaa.',
      '.aaafffffaffffffaaaa',
      'aaaaffffffffffffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafttffffeffttfaaa',
      'aaaafttffeeffttfaaaa',
      'aaaaaffffffffffaaaaa',
      'aaaaaaaffffffaaaaaaa',
      'a..aaaaaaffaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..afapppppppppppafa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..afappppppppppafa..',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....allla..allla....',
      '....aLlLa..aLlLa....',
      '...auvuua..auuvua...',
      '..auuuuua..auuuuua..',
      '..aaaaaaa..aaaaaaa..',
    ],
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaafaaaaafaaaa.',
      '.aaaaffffaaffffaaaa.',
      '.aaafffffaffffffaaaa',
      'aaaaffffffffffffaaaa',
      'aaaaffffffffffffaaaa',
      'aaaaffeeffffeeffaaaa',
      'aaaafttffffeffttfaaa',
      'aaaafttffeeffttfaaaa',
      'aaaaaffffffffffaaaaa',
      'aaaaaaaffffffaaaaaaa',
      'a..aaaaaaffaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..afapppppppppppafa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..afappppppppppafa..',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....allla..allla....',
      '....aLlLa..aLlLa....',
      '...auvuua..auuvua...',
      '..auuuuua..auuuuua..',
      '..aaaaaaa..aaaaaaa..',
    ],
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaafaaaaafaaaa.',
      '.aaaaffffaaffffaaaa.',
      '.aaafffffaffffffaaaa',
      'aaaaffffffffffffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafttffffeffttfaaa',
      'aaaafttffeeffttfaaaa',
      'aaaaaffffffffffaaaaa',
      'aaaaaaaffffffaaaaaaa',
      'a..aaaaaaffaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..afapppppppppppafa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..afappppppppppaaa..',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....aLlLa..allla....',
      '...auvuua..aLlLa....',
      '..auuuuua..auuvua...',
      '..aaaaaaa..auuuuua..',
      '...........aaaaaaa..',
    ],
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaafaaaaafaaaa.',
      '.aaaaffffaaffffaaaa.',
      '.aaafffffaffffffaaaa',
      'aaaaffffffffffffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafffeffffefffaaaa',
      'aaaafttffffeffttfaaa',
      'aaaafttffeeffttfaaaa',
      'aaaaaffffffffffaaaaa',
      'aaaaaaaffffffaaaaaaa',
      'a..aaaaaaffaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..afapppppppppppafa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..aaappppppppppafa..',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....allla..aLlLa....',
      '....aLlLa..auuvua...',
      '...auvuua..auuuuua..',
      '..auuuuua..aaaaaaa..',
      '..aaaaaaa...........',
    ],
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaaaaaaaaaaaaa.',
      '.aaaaaHHaaaaaaaaaaa.',
      '.aaaaaaaHaaaaHHaaaaa',
      'aaaaaaaaaaaaaaaHaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      'aaaHHaaaaaaaaaaaaaaa',
      'aaaaaHaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      '.aaaaaaaaaaaaaaaaaa.',
      'a..aaaaaaaaaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..afapppppppppppafa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..afappppppppppafa..',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....allla..allla....',
      '....aLlLa..aLlLa....',
      '...auvuua..auuvua...',
      '..auuuuua..auuuuua..',
      '..aaaaaaa..aaaaaaa..',
    ],
    [
      '......a.aaa..a......',
      '....aaaaaaaaaaaa....',
      '...aaaHHaaaaaaaaa...',
      '..aaaaaaHaaaaHHaaa..',
      '..aaaaaaaaaaaaaaaaa.',
      '.aaaaaaaaaaaaaaaaaa.',
      '.aaaaaHHaaaaaaaaaaa.',
      '.aaaaaaaHaaaaHHaaaaa',
      'aaaaaaaaaaaaaaaHaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      'aaaHHaaaaaaaaaaaaaaa',
      'aaaaaHaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaa',
      '.aaaaaaaaaaaaaaaaaa.',
      'a..aaaaaaaaaaaaaa..a',
      '........affa........',
      '.......aaaaaa.......',
      '....aaappppppaaa....',
      '..apaxxxxxxxxxxapa..',
      '..aaapppppppppppaaa.',
      '..afaxxxxxxxxxxafa..',
      '..afappppppppppafa..',
      '..aaapppppppppppaaa.',
      '..aaaaaaaaaaaaaaaa..',
      '....azzzzzzzzzza....',
      '....azzzzaazzzza....',
      '....allla..allla....',
      '....aLlLa..aLlLa....',
      '...auvuua..auuvua...',
      '..auuuuua..auuuuua..',
      '..aaaaaaa..aaaaaaa..',
    ],
    [
      '....................',
      '.......a.aaa.a......',
      '.....aaaaaaaaaa.....',
      '....aaaHHaaaaaaa....',
      '...aaaaaaHaaaaaaa...',
      '..aaaaaaaaaaaaaaaa..',
      '..aaaaaaaaaaaafaaa..',
      '.aaaaaaaaaaafffffa..',
      '.aaaaaaaaaaffffffa..',
      '.aaaaaaaaaafffffffa.',
      '.aaaaaaaaaffffefffa.',
      '.aaaaaaaaaffffefffa.',
      '.aaaaaaaaafffttffeaa',
      '.aaaaaaaaaffffffeea.',
      '..aaaaaaaaaffffffa..',
      '..aaaaaaaaaaafffa...',
      '..a..aaaaaaaaaaa....',
      '.........affa.......',
      '.......aaaaaa.......',
      '......apppppppa.....',
      '......axxxxxxxa.....',
      '......appppafpa.....',
      '......axxxxafxa.....',
      '......appppaaaa.....',
      '......aaaaaaa.......',
      '......azzzzzzza.....',
      '.....azzza.azzza....',
      '....allla...allla...',
      '...aLlLa.....aLlLa..',
      '..auvuua.....auvuuua',
      '..auuuuua....auuuuua',
      '..aaaaaaa....aaaaaaa',
    ],
    [
      '....................',
      '.......a.aaa.a......',
      '.....aaaaaaaaaa.....',
      '....aaaHHaaaaaaa....',
      '...aaaaaaHaaaaaaa...',
      '..aaaaaaaaaaaaaaaa..',
      '..aaaaaaaaaaaafaaa..',
      '.aaaaaaaaaaafffffa..',
      '.aaaaaaaaaaffffffa..',
      '.aaaaaaaaaafffffffa.',
      '.aaaaaaaaaffffefffa.',
      '.aaaaaaaaaffffefffa.',
      '.aaaaaaaaafffttffeaa',
      '.aaaaaaaaaffffffeea.',
      '..aaaaaaaaaffffffa..',
      '..aaaaaaaaaaafffa...',
      '..a..aaaaaaaaaaa....',
      '.........affa.......',
      '.......aaaaaa.......',
      '......apppppppa.....',
      '......axxxxxxxa.....',
      '......apppppppa.....',
      '......axxxxxxxa.....',
      '......apppafppa.....',
      '......aaaaafaaa.....',
      '......azzzzzzza.....',
      '.......azzzzza......',
      '........allla.......',
      '........aLlLa.......',
      '.......auvuuuaa.....',
      '.......auuuuuua.....',
      '.......aaaaaaaa.....',
    ],
  ], WAEL_PAL);
}

// ───────────────────────── house props ─────────────────────────
function buildHouse(s: Phaser.Scene) {
  // BED 32x32: headboard at the top, white pillow, purple blanket with sparkles, a bear plush
  canvasTex(s, 'prop-bed', 32, 32, (c) => {
    // headboard with an inset panel and a carved star
    r(c, K, 3, 0, 26, 1); r(c, K, 2, 1, 28, 10);
    r(c, WOOD.mid, 3, 1, 26, 9); r(c, WOOD.hi, 3, 1, 26, 1); r(c, WOOD.lo, 3, 9, 26, 1);
    r(c, WOOD.dk, 7, 3, 18, 5); r(c, WOOD.lo, 8, 4, 16, 3);
    r(c, '#ffd23a', 15, 4, 2, 3); r(c, '#ffd23a', 14, 5, 4, 1);
    // mattress: sheet, pillow
    r(c, K, 2, 10, 28, 20);
    r(c, '#f2eefa', 3, 10, 26, 6); r(c, '#d6d0e6', 3, 15, 26, 1);
    r(c, '#a8a0c4', 7, 10, 18, 6); r(c, '#a8a0c4', 6, 11, 20, 4); r(c, '#ffffff', 7, 11, 18, 3); r(c, '#ffffff', 8, 10, 16, 5); r(c, '#dcd8ec', 8, 14, 16, 1); r(c, '#dcd8ec', 16, 11, 1, 2);
    // blanket: folded edge, sparkles, shaded side and the part that hangs over the foot of the bed
    r(c, PUR.mid, 3, 16, 26, 11);
    r(c, '#f2eefa', 3, 16, 26, 1); r(c, PUR.hi, 3, 17, 26, 2); r(c, PUR.lo, 3, 19, 26, 1);
    r(c, PUR.lo, 26, 20, 3, 7);
    for (const [x, y] of [[7, 21], [14, 24], [21, 21], [10, 25], [18, 22]]) { r(c, PUR.hi, x, y - 1); r(c, PUR.hi, x - 1, y, 3, 1); r(c, PUR.hi, x, y + 1); }
    r(c, PUR.lo, 3, 27, 26, 1); r(c, PUR.dk, 3, 28, 26, 1);
    // footboard
    r(c, K, 2, 29, 28, 3); r(c, WOOD.mid, 3, 30, 26, 1); r(c, WOOD.hi, 3, 30, 4, 1);
    // bear plush leaning on the pillow
    drawGrid(c, ['.k...k.', 'kbk.kbk', 'kbbbbbk', 'kbkbkbk', 'kbbnbbk', '.kbbbk.', 'kbbbbbk', 'kBbbbBk', '.kk.kk.'],
      { k: K, b: '#d8a870', B: '#b07e48', n: '#4a2a14' }, 21, 12);
  });

  // DESK 48x32, 2 frames: loss-curve monitor, code monitor, keyboard, mouse, a mug (cursor blinks, a line grows, steam drifts)
  canvasFrames(s, 'prop-desk', 48, 32, 2, (c, f) => {
    const mon = (x: number) => {
      r(c, K, x, 0, 18, 14); r(c, '#3a3a4c', x + 1, 1, 16, 12); r(c, '#55556a', x + 1, 1, 16, 1);
      r(c, '#0a1226', x + 2, 2, 14, 10);
      r(c, K, x + 7, 14, 4, 3); r(c, '#55556a', x + 8, 14, 2, 3);
      r(c, K, x + 4, 16, 10, 2); r(c, '#55556a', x + 5, 16, 8, 1);
    };
    mon(2); mon(21);
    // left screen: axes and a falling loss curve with a validation dot
    r(c, '#34466a', 5, 3, 1, 8); r(c, '#34466a', 5, 10, 12, 1);
    for (const [x, y] of [[6, 3], [7, 4], [7, 5], [8, 6], [9, 7], [10, 8], [11, 8], [12, 9], [13, 9], [14, 9], [15, 9]]) r(c, '#ff8a5a', x, y);
    r(c, '#5ac8ff', 15, 8 - f, 1, 1); r(c, '#ffffff', 6, 3);
    // right screen: code lines and a blinking cursor
    r(c, '#c89aff', 24, 3, 5, 1); r(c, '#e8e8f0', 30, 3, 3, 1);
    r(c, '#5ac8ff', 26, 5, 4, 1); r(c, '#ffd23a', 31, 5, 3, 1);
    r(c, '#e8e8f0', 26, 7, f ? 9 : 6, 1);
    r(c, '#c89aff', 24, 9, 3, 1);
    if (!f) r(c, '#ffffff', 28, 9, 2, 1);
    // desk top and front, two drawers, legs
    r(c, K, 0, 17, 48, 12);
    r(c, WOOD.hi, 1, 18, 46, 1); r(c, WOOD.mid, 1, 19, 46, 3);
    r(c, WOOD.mid, 1, 23, 46, 5); r(c, WOOD.lo, 1, 27, 46, 1);
    r(c, K, 3, 23, 12, 5); r(c, WOOD.lo, 4, 23, 10, 4); r(c, '#ffd23a', 8, 25, 2, 1);
    r(c, K, 33, 23, 12, 5); r(c, WOOD.lo, 34, 23, 10, 4); r(c, '#ffd23a', 38, 25, 2, 1);
    r(c, K, 1, 28, 4, 4); r(c, WOOD.lo, 2, 28, 2, 3);
    r(c, K, 43, 28, 4, 4); r(c, WOOD.lo, 44, 28, 2, 3);
    // keyboard + mouse
    r(c, K, 12, 18, 19, 4); r(c, '#d8d8e0', 13, 18, 17, 2); r(c, '#9a9aa8', 13, 20, 17, 1);
    for (let i = 0; i < 8; i++) r(c, '#9a9aa8', 14 + i * 2, 19, 1, 1);
    r(c, K, 33, 18, 4, 3); r(c, '#d8d8e0', 34, 18, 2, 1); r(c, '#9a9aa8', 34, 19, 2, 1);
    // mug with drifting steam
    drawGrid(c, ['.kkk...', 'kNNNk..', 'kmmmkkk', 'kwmmk.k', 'kmmmkkk', 'kMMMk..', '.kkk...'], { ...P, w: '#ffd0e0' }, 40, 11);
    r(c, '#ffffff77', 41 + f, 8, 1, 2); r(c, '#ffffff77', 42 - f, 5, 1, 2);
  });

  // BOOKSHELF 32x32: three shelves of colourful books, a leaning book and a tiny cactus
  canvasTex(s, 'prop-bookshelf', 32, 32, (c) => {
    r(c, K, 1, 0, 30, 32); r(c, WOOD.mid, 2, 1, 28, 30); r(c, WOOD.hi, 2, 1, 28, 1);
    const cols = [['#e83a3a', '#a01c24'], ['#5ac8ff', '#2a7ab8'], ['#5ac85a', '#2e8a3a'], ['#ffd23a', '#c89a10'], ['#9a64dc', '#7240b4'], ['#ff8a1a', '#b85a10'], ['#f2eefa', '#b8b0cc'], ['#f0a0c0', '#c06080']];
    const shelves = [
      [[2, 7, 0], [3, 6, 1], [2, 7, 4], [2, 5, 3], [3, 7, 2], [2, 6, 7], [2, 7, 5], [3, 6, 6], [2, 5, 1]],
      [[3, 7, 3], [2, 6, 2], [2, 7, 0], [3, 5, 4]],
      [[2, 6, 5], [3, 7, 4], [2, 6, 1], [2, 7, 7], [3, 5, 2], [2, 6, 0], [2, 7, 3], [3, 6, 6]],
    ];
    shelves.forEach((books, si) => {
      const top = 2 + si * 10, floor = top + 8;
      r(c, WOOD.dk, 3, top, 26, 8);
      r(c, K, 2, floor, 28, 2); r(c, WOOD.hi, 3, floor, 26, 1); r(c, WOOD.lo, 3, floor + 1, 26, 1);
      let x = 3;
      books.forEach(([w, h, ci]) => {
        if (x + w > 29) return;
        const [a, b] = cols[ci];
        r(c, K, x, floor - h, w, h);
        r(c, a, x, floor - h + 1, w - 1, h - 1);
        r(c, b, x + w - 1, floor - h + 1, 1, h - 1);
        r(c, '#ffffff55', x, floor - h + 3, w - 1, 1);
        x += w;
      });
      if (si === 1) {
        drawGrid(c, ['....kkk', '...kcCk', '...kcCk', '..kcCk.', '..kcCk.', '.kcCk..', '.kcCk..', 'kkkk...'], { k: K, c: '#5ac8ff', C: '#2a7ab8' }, x, floor - 8);
        drawGrid(c, ['..kk..', '.kegk.', 'kkeekk', 'keEeek', 'kkeEkk', '.keek.', 'kkkkkk', 'koOOok', '.kOOk.'],
          { k: K, e: '#5ac85a', E: '#2e8a3a', g: '#f0a0c0', o: '#e07848', O: '#b85a30' }, 22, floor - 9);
      }
    });
    r(c, K, 2, 30, 28, 1); r(c, WOOD.lo, 2, 31, 28, 1);
  });

  // GPU tower 16x24, 2 frames: three glowing fans (colour pulses cyan / violet)
  canvasFrames(s, 'prop-gpu', 16, 24, 2, (c, f) => {
    const a = f ? '#c87aff' : '#5ae0ff', b = f ? '#7a3ac0' : '#2a8ac8';
    r(c, K, 1, 0, 14, 23); r(c, '#3a3a4c', 2, 1, 12, 21); r(c, '#5a5a70', 2, 1, 12, 1); r(c, '#2a2a38', 13, 2, 1, 20);
    r(c, '#121219', 3, 2, 10, 18);
    for (const y of [3, 9, 15]) {
      r(c, a + '30', 4, y - 1, 8, 7);
      drawGrid(c, ['.baab.', 'baddab', 'adhhda', 'baddab', '.baab.'], { a, b, d: '#121219', h: '#ffffff' }, 5, y);
    }
    r(c, '#2a2a38', 3, 20, 10, 1); r(c, f ? '#5ac85a' : '#9aff9a', 11, 20, 1, 1);
    r(c, K, 2, 23, 3, 1); r(c, K, 11, 23, 3, 1);
  });

  // WINDOW 24x20, 2 frames: night sky, crescent moon, twinkling stars, two tied-back purple curtains
  canvasFrames(s, 'prop-window', 24, 20, 2, (c, f) => {
    r(c, K, 2, 2, 20, 16); r(c, '#f2e6cc', 3, 3, 18, 14);
    r(c, '#141a44', 4, 4, 16, 12); r(c, '#1c2458', 4, 4, 16, 3);
    drawGrid(c, ['.hhh', 'hhY.', 'hY..', 'hhY.', '.hhh'], { h: '#fff4c0', Y: '#d8c890' }, 14, 4);
    const stars = [[6, 5], [9, 7], [6, 12], [10, 13], [15, 12], [18, 14], [17, 10]];
    stars.forEach(([x, y], i) => {
      const big = (i + f) % 3 === 0;
      r(c, big ? '#ffffff' : '#8a94d0', x, y);
      if (big) { r(c, '#ffd23a88', x - 1, y); r(c, '#ffd23a88', x + 1, y); r(c, '#ffd23a88', x, y - 1); r(c, '#ffd23a88', x, y + 1); }
    });
    r(c, '#f2e6cc', 11, 4, 2, 12); r(c, '#c8b898', 12, 4, 1, 12); r(c, '#f2e6cc', 4, 9, 16, 1);
    // sill
    r(c, K, 1, 16, 22, 4); r(c, '#f2e6cc', 2, 17, 20, 1); r(c, '#c8b898', 2, 18, 20, 1);
    // rod
    r(c, K, 0, 0, 24, 3); r(c, '#ffd23a', 1, 1, 22, 1);
    // curtains
    const cur = ['kpPpPk', 'kpPpPk', 'kpPpk.', 'kpPpk.', 'kpPk..', 'kpPk..', 'kyyk..', 'kpPk..', 'kpPpk.', 'kpPpk.', 'kpPpPk', 'kpPpPk', 'kkkkkk'];
    drawGrid(c, cur, { k: K, p: PUR.mid, P: PUR.lo, y: '#ffd23a' }, 0, 3);
    drawGrid(c, cur.map((row) => [...row].reverse().join('')), { k: K, p: PUR.lo, P: PUR.mid, y: '#ffd23a' }, 18, 3);
  });

  // POSTER 16x20: a falling loss curve ending on a tiny star
  gridTex(s, 'prop-poster', [
    '.k............k.',
    'kwkkkkkkkkkkkkwk',
    'kbbbbbbbbbbbbbbk',
    'kbGGbGbGGbGGbbbk',
    'kbbbbbbbbbbbbbbk',
    'kbkbbbbbbbbbbbbk',
    'kbkrbbbbbbbbbbbk',
    'kbkrbbbbbbbbbbbk',
    'kbkbrbbbbbbbbbbk',
    'kbkbrbbbbbbbbbbk',
    'kbkbbrbbbbbbbbbk',
    'kbkbbbrbbbbbbbbk',
    'kbkbbbbrrbbbbybk',
    'kbkbbbbbbrrbyyyk',
    'kbkbbbbbbbbrrybk',
    'kbkbbbbbbbbbbbbk',
    'kbkkkkkkkkkkkkbk',
    'kbbbbbbbbbbbbbbk',
    'kBBBBBBBBBBBBBBk',
    'kkkkkkkkkkkkkkkk',
  ], { ...P, b: '#f4ecd8', B: '#cfc4a8', w: '#e83a3a' });

  // CORK BOARD 24x16 with three sticky notes (yellow, pink, cyan) and scribbles
  canvasTex(s, 'prop-cork', 24, 16, (c) => {
    r(c, K, 0, 0, 24, 16); r(c, WOOD.mid, 1, 1, 22, 14); r(c, WOOD.hi, 1, 1, 22, 1); r(c, WOOD.lo, 1, 14, 22, 1);
    r(c, '#c48a52', 2, 2, 20, 12);
    for (const [x, y] of [[3, 3], [9, 12], [15, 3], [20, 11], [6, 12], [13, 4], [18, 12], [21, 7]]) r(c, '#a06a38', x, y);
    for (const [x, y] of [[5, 13], [11, 3], [21, 3], [16, 12], [2, 8]]) r(c, '#dcaa70', x, y);
    const note = (x: number, y: number, a: string, b: string, pin: string) => {
      r(c, K, x, y, 7, 7); r(c, a, x, y, 6, 6); r(c, b, x, y + 5, 6, 1); r(c, b, x + 5, y, 1, 6);
      r(c, b, x + 1, y + 2, 4, 1); r(c, b, x + 1, y + 4, 3, 1);
      r(c, pin, x + 2, y - 1, 2, 2); r(c, '#ffffff', x + 2, y - 1, 1, 1);
    };
    note(3, 4, '#ffe66a', '#c8a020', '#e83a3a');
    note(10, 6, '#ffaacc', '#c86090', '#5ac8ff');
    note(16, 3, '#9ae8ff', '#3a9ac8', '#ffd23a');
  });

  // PICTURE FRAMES 14x12, 4 frames: a heart, mountains with a sun, a little robot, a rubber duck
  const pics: string[][] = [
    ['pppppppppp', 'pprrpprrpp', 'prrRrrrrrp', 'prRrrrrrrp', 'prrrrrrrrp', 'pprrrrrrpp', 'ppprrrrppp', 'pppprrpppp'],
    ['ccccccccyy', 'cccccccyyy', 'cccwccccyy', 'ccwwwcccce', 'cwwEwwccEe', 'cwEEEEcEEe', 'EEEEEEEEEE', 'eeeeeeeeee'],
    ['bbbbrbbbbb', 'bbbbkbbbbb', 'bbkkkkkkkb', 'bbksckcskb', 'bbksssssKb', 'bbkkkkkkkb', 'bbbkSsSkbb', 'bbbkkbkkbb'],
    ['cccccccccc', 'cccyyyyccc', 'ccykyyyocc', 'ccyyyyyooc', 'ccyyycyycc', 'cyyyyyyyyc', 'CyyyyyyyyC', 'CCCCCCCCCC'],
  ];
  canvasFrames(s, 'prop-frame', 14, 12, 4, (c, f) => {
    r(c, K, 0, 0, 14, 12); r(c, '#d8a838', 1, 1, 12, 10); r(c, '#f4d070', 1, 1, 12, 1); r(c, '#a87818', 1, 10, 12, 1);
    drawGrid(c, pics[f], {
      p: '#ffd8e4', r: '#e83a3a', R: '#ff9a9a', c: '#9ad8ff', C: '#5aa8e0', y: '#ffd23a', w: '#ffffff', e: '#3a8a4a', E: '#5ab85a',
      b: '#f2eefa', k: K, K: '#5ac8ff', s: '#c8ccd8', S: '#8a90a0', o: '#ff8a1a',
    }, 2, 2);
  });

  // SIDE TABLE 16x20: a small round table with a vase and one flower
  gridTex(s, 'prop-sidetable', [
    '.......kk.......',
    '......krrk......',
    '.....krRrrk.....',
    '......krrk......',
    '.......kek......',
    '......kkekk.....',
    '.....kcCkCck....',
    '.....kwcccCk....',
    '.....kcccccCk...',
    '..kkkkkkkkkkkk..',
    '.kvvvvvvvvvvvvk.',
    'kvuvvvvvvvvvvuUk',
    '.kUUUUUUUUUUUUk.',
    '..kkkkkkkkkkkk..',
    '.......kuk......',
    '.......kuk......',
    '.......kuk......',
    '.......kuk......',
    '....kkkkukkkk...',
    '...kUUUUUUUUUk..',
  ], { ...P, v: WOOD.hi, u: WOOD.mid, U: WOOD.lo, c: '#5ac8c8', C: '#2a8a9a' });

  // TALL MIRROR 32x40: silver frame with gold accents; dark blue glass at exactly x=5..26, y=5..33
  canvasTex(s, 'wall-mirror', 32, 40, (c) => {
    const SL = '#eef0f8', SM = '#b8bccc', SD = '#80849a', GD = '#ffd23a', GDD = '#c89a10';
    r(c, K, 0, 0, 32, 39);
    r(c, SM, 1, 1, 30, 37); r(c, SL, 1, 1, 30, 1); r(c, SL, 1, 1, 1, 37); r(c, SD, 30, 2, 1, 36); r(c, SD, 2, 37, 29, 1);
    r(c, SD, 3, 3, 25, 1); r(c, SD, 3, 3, 1, 32); r(c, SL, 4, 35, 24, 1); r(c, SL, 28, 4, 1, 31);
    r(c, K, 4, 4, 24, 31);
    // glass (exactly x=5..26, y=5..33) with two diagonal highlight streaks
    r(c, '#18204a', 5, 5, 22, 29); r(c, '#1e2858', 5, 5, 22, 1); r(c, '#121836', 5, 33, 22, 1);
    for (let i = 0; i < 11; i++) r(c, '#6c7cd4', 7 + i, 20 - i, 3, 1);
    for (let i = 0; i < 7; i++) r(c, '#4c5cb0', 14 + i, 21 - i, 2, 1);
    // gold: corner rosettes, a crest with a gem, side studs
    for (const [x, y] of [[1, 1], [28, 1], [1, 35], [28, 35]]) { r(c, GDD, x, y, 3, 3); r(c, GD, x, y, 2, 2); r(c, '#fff4c0', x, y); }
    r(c, K, 11, 0, 10, 4); r(c, GD, 12, 0, 8, 3); r(c, GDD, 12, 2, 8, 1); r(c, '#fff4c0', 12, 0, 2, 1);
    r(c, K, 14, 0, 4, 3); r(c, '#e83a3a', 15, 0, 2, 2); r(c, '#ff9a9a', 15, 0);
    r(c, K, 0, 17, 3, 5); r(c, GD, 1, 18, 2, 3); r(c, K, 29, 17, 3, 5); r(c, GD, 29, 18, 2, 3);
    r(c, K, 12, 35, 8, 3); r(c, GD, 13, 36, 6, 1);
    // feet
    r(c, K, 3, 38, 6, 2); r(c, GDD, 4, 38, 4, 1); r(c, K, 23, 38, 6, 2); r(c, GDD, 24, 38, 4, 1);
  });

  // POTTED PLANT 16x20: a tall leafy plant with broad leaves in a white pot
  canvasTex(s, 'prop-rugplant', 16, 20, (c) => {
    const leaf = (ang: number, len: number, wid: number) => {
      const cx = 8 + Math.cos(ang) * len * 0.95, cy = 12.5 + Math.sin(ang) * len * 0.95;
      ell(c, K, cx, cy, len + 1, wid + 1, ang);
      ell(c, (u, v) => (Math.abs(v) < 0.14 && u < 0.3 ? dk : v > 0.15 ? mid : u > 0.1 && v < -0.35 ? hi : lt), cx, cy, len, wid, ang);
    };
    const [dk, mid, lt, hi] = ['#2e7a32', '#3a9a44', '#5ac85a', '#8ae07a'];
    leaf(-2.85, 4.3, 2.2); leaf(-0.29, 4.3, 2.2);
    leaf(-2.25, 4.9, 2.4); leaf(-0.89, 4.9, 2.4);
    leaf(-1.57, 5.3, 2.5);
    drawGrid(c, [
      '..kkkkkkkkkkkk..',
      '..kwwwwwwwwwWk..',
      '..kWWWWWWWWWWk..',
      '...kwwwwwwwWk...',
      '...kwwwwwwwWk...',
      '...kwwwwwwwWk...',
      '....kwwwwwWk....',
      '....kkkkkkkk....',
    ], { k: K, w: '#f4f4f8', W: '#b8b8c8' }, 0, 12);
  });
}

// ───────────────────────── K-means garden ─────────────────────────
const CLUSTER: Record<string, { a: string; A: string; b: string; c: string; g: string }> = {
  n: { a: '#c8c8d6', A: '#8e8ea4', b: '#e8e8f2', c: '#ffffff', g: 'rgba(230,230,255,0.30)' },
  '0': { a: '#ff5a5a', A: '#b8283a', b: '#ff9a8a', c: '#fff0e0', g: 'rgba(255,90,90,0.34)' },
  '1': { a: '#5ac8ff', A: '#2a78b8', b: '#a0e4ff', c: '#f0fcff', g: 'rgba(90,200,255,0.34)' },
  '2': { a: '#ffd23a', A: '#c08a10', b: '#ffe890', c: '#fffcec', g: 'rgba(255,210,58,0.34)' },
};
const FLOWER = [
  '...gkkkkg...',
  '.ggkabbakgg.',
  'gkkkabbakkkg',
  'gkabbbbbbakg',
  'gkabbccbbakg',
  'gkabbccbbakg',
  'gkAabbbbaAkg',
  'gkkkabbakkkg',
  '.ggkAaaAkgg.',
  '...gkkkkg...',
  'kk..keEk..kk',
  'keekkeEkkeek',
  '.kEEkeEkEEk.',
  '..kkkeEkkk..',
];
const RUNES: string[][] = [
  ['..a..', '.a.a.', 'a.b.a', '.a.a.', '..a..'],
  ['a...a', '.a.a.', '..b..', '..a..', '..a..'],
  ['..a..', '..a..', '.a.a.', '.aba.', 'aaaaa'],
];

function buildGarden(s: Phaser.Scene) {
  for (const [id, col] of Object.entries(CLUSTER)) gridTex(s, 'data-flower-' + id, FLOWER, { k: K, e: '#5ac85a', E: '#2e8a3a', ...col });

  // rune stones 16x16
  ['#ff5a5a', '#5ac8ff', '#ffd23a'].forEach((glow, i) => {
    canvasTex(s, 'stone-' + i, 16, 16, (c) => {
      drawGrid(c, [
        '.....kkkkkk.....',
        '...kkssssssk....',
        '..kssssssSSSk...',
        '.kssssSSSSSSSk..',
        '.ksssSSSSSSSSdk.',
        'kssSSSSSSSSSSdk.',
        'ksSSSSSSSSSSSddk',
        'ksSSSSSSSSSSSddk',
        'ksSSSSSSSSSSSddk',
        'kSSSSSSSSSSSdddk',
        'kSSSSSSSSSSdddDk',
        '.kSSSSSSSSdddDk.',
        '.kdSSSSSSdddDDk.',
        '..kddddddddDDk..',
        '...kkDDDDDDkk...',
        '....kkkkkkkk....',
      ], { k: K, s: '#c4c8d4', S: '#9a9eb0', d: '#6e7286', D: '#4c4f62' });
      // carved groove, soft glow, then the rune itself
      drawGrid(c, RUNES[i], { a: '#5a5e70', b: '#5a5e70' }, 6, 6);
      c.globalAlpha = 0.3;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawGrid(c, RUNES[i], { a: glow, b: glow }, 5 + dx, 5 + dy);
      c.globalAlpha = 1;
      drawGrid(c, RUNES[i], { a: glow, b: '#ffffff' }, 5, 5);
    });
  });

  // floor spikes 16x16 tile: 0 raised (silver spikes in a metal plate), 1 retracted (holes)
  const SPIKE = ['..k..', '.kwk.', '.kwSk', 'kwsSk', 'kwsSk', 'kssSk', '.kkk.'];
  canvasFrames(s, 'spikes', 16, 16, 2, (c, f) => {
    r(c, '#22242e', 0, 0, 16, 16); r(c, '#5c6070', 1, 1, 14, 14); r(c, '#767a8c', 1, 1, 14, 1); r(c, '#767a8c', 1, 1, 1, 14);
    r(c, '#44485a', 1, 14, 14, 1); r(c, '#44485a', 14, 1, 1, 14);
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) r(c, '#9a9eb0', x, y);
    for (const [bx, by] of [[3, 7], [10, 7], [3, 14], [10, 14]]) {
      r(c, '#121319', bx, by - 2, 3, 2);
      if (f) r(c, '#8a8ea0', bx, by, 3, 1);
      else drawGrid(c, SPIKE, { k: K, w: '#ffffff', s: '#c8ccdc', S: '#8a90a8' }, bx - 1, by - 7);
    }
  });

  // (MOSS, the shy mossy stone, is drawn with the rest of the cast in cast.ts.)

  // HEDGE 16x16: a round, bumpy garden bush (the hedge walls' greens), with two fibre-optic glints
  canvasTex(s, 'prop-hedge', 16, 16, (c) => {
    const blobs: [number, number, number][] = [[8, 9, 6.3], [4.5, 6.5, 3.4], [8, 4.5, 3.6], [11.5, 6.5, 3.4], [3.6, 10.5, 3], [12.4, 10.5, 3]];
    const inside = (x: number, y: number, grow: number) => blobs.some(([bx, by, br]) => (x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 <= (br + grow) ** 2);
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 16; x++) {
        if (inside(x, y, 0)) {
          const lit = (8 - x) * 0.55 + (7 - y) * 0.8;
          let col = lit > 2.2 ? '#5aa848' : lit < -2.6 ? '#225a24' : '#3a8236';
          if ((x * 7 + y * 13) % 11 === 0) col = '#2a6a2a';
          else if ((x * 5 + y * 3) % 13 === 0 && lit > -1) col = '#7ac860';
          if ((x === 5 && y === 4) || (x === 11 && y === 9)) col = x === 5 ? '#8af0ff' : '#ff9ad8';
          r(c, col, x, y);
        } else if (inside(x, y, 1)) r(c, K, x, y);
      }
    }
    r(c, K, 3, 15, 10, 1);
  });

  // FLOWER BED 16x10: little fibre-optic blooms on dark soil, stone edging
  gridTex(s, 'prop-flowerbed', [
    '..m.....y....w..',
    '.mym...yoy..wyw.',
    '..mE.c..y.l..wE.',
    'kkkEkcykkElykEkk',
    'kNnNNEnNNNEnNNNk',
    'knNNnNNNnNNNnNNk',
    'kkkkkkkkkkkkkkkk',
    'kssSssSssSssSssk',
    'kSSSSSSSSSSSSSSk',
    'kkkkkkkkkkkkkkkk',
  ], { ...P, m: '#ff9ad8', y: '#8af0ff', o: '#ffffff', w: '#e0fcff', l: '#d8b8ff', c: '#8af0ff', n: '#5a3820', N: '#3a2414' });
}

// ───────────────────────── Lab: draw-a-digit floor ─────────────────────────
function buildLab(s: Phaser.Scene) {
  // floor pixel panels 16x16; they tile seamlessly (light rim top/left, dark rim bottom/right)
  const panel = (on: boolean) => (c: Ctx) => {
    r(c, '#3a4a66', 0, 0, 16, 16);
    r(c, '#070b14', 0, 15, 16, 1); r(c, '#070b14', 15, 0, 1, 16);
    r(c, '#141c2c', 1, 1, 14, 14);
    if (!on) {
      r(c, '#0a101c', 2, 2, 12, 12);
      r(c, '#060a12', 2, 2, 12, 1); r(c, '#060a12', 2, 2, 1, 12);
      r(c, '#1a2840', 3, 13, 11, 1); r(c, '#1a2840', 13, 3, 1, 11);
      r(c, '#16223a', 4, 4, 2, 1); r(c, '#16223a', 4, 5, 1, 1);
    } else {
      r(c, '#2aa8e0', 2, 2, 12, 12);
      r(c, '#5ae0ff', 3, 3, 10, 10);
      r(c, '#aef4ff', 4, 4, 8, 8);
      r(c, '#e8ffff', 5, 5, 6, 6);
      r(c, '#ffffff', 6, 6, 4, 4);
      r(c, '#ffffff', 4, 4, 2, 1); r(c, '#ffffff', 4, 4, 1, 2);
    }
  };
  canvasTex(s, 'pix-off', 16, 16, panel(false));
  canvasTex(s, 'pix-on', 16, 16, panel(true));

  // reset button 16x16, 2 frames (up / pressed), with an "R"
  canvasFrames(s, 'prop-button', 16, 16, 2, (c, f) => {
    drawGrid(c, [
      '....kkkkkkkk....', '..kkggggggggkk..', '.kgGGGGGGGGGGgk.', 'kgGGGGGGGGGGGGgk', 'kgGGGGGGGGGGGGgk',
      'kgGGGGGGGGGGGGgk', 'kgGGGGGGGGGGGGgk', '.kgGGGGGGGGGGgk.', '..kkggggggggkk..', '....kkkkkkkk....',
    ], { k: K, g: '#9a9aa8', G: '#4a4a58' }, 0, 5);
    const top = f ? 5 : 2;
    if (!f) { r(c, K, 3, 7, 10, 5); r(c, '#a01c24', 3, 8, 10, 3); r(c, K, 4, 11, 8, 1); }
    drawGrid(c, ['..kkkkkk..', '.krrrrrrk.', 'krrrrrrrrk', 'krrrrrrrrk', 'krrrrrrrrk', 'krrrrrrrrk', '.krrrrrrk.', '..kkkkkk..'],
      { k: K, r: f ? '#c82a30' : '#e83a3a' }, 3, top);
    r(c, f ? '#e86a6a' : '#ff9a9a', 5, top + 1, 2, 1);
    drawGrid(c, ['www.', 'w..w', 'www.', 'w.w.', 'w..w'], { w: f ? '#e8d8d8' : '#ffffff' }, 6, top + 2);
  });

  // big wall monitor 64x32: bezel and a plain dark screen at exactly x=4..59, y=4..27
  canvasTex(s, 'prop-bigscreen', 64, 32, (c) => {
    r(c, K, 0, 0, 64, 32);
    r(c, '#4a4e62', 1, 1, 62, 30); r(c, '#6a6e84', 1, 1, 62, 1); r(c, '#6a6e84', 1, 1, 1, 30);
    r(c, '#33364a', 2, 30, 61, 1); r(c, '#33364a', 62, 2, 1, 29);
    r(c, K, 3, 3, 58, 26);
    r(c, '#06121f', 4, 4, 56, 24);
    r(c, '#5ac85a', 57, 29, 2, 1); r(c, '#2a2d3e', 28, 29, 8, 1);
  });
}

// ───────────────────────── cosmetics for the SOUL ─────────────────────────
function buildCosmetics(s: Phaser.Scene) {
  gridTex(s, 'cos-goggles', ['.kkk.kkk.', 'gkwckwckg', '.kcCkcCk.', '..kk.kk..'], { k: K, w: '#e0f8ff', c: '#5ac8ff', C: '#2a7ab8', g: '#5a5a68' });
  gridTex(s, 'cos-flower', ['.mkm.', 'mmymm', 'kyYyk', 'mmymm', '.mkm.'], { k: K, m: '#ff8ac0', y: '#ffd23a', Y: '#ff8a1a' });
}
