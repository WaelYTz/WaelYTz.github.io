// Every texture in the game is generated here at runtime from code: string grids (like ut.py) or tiny canvas drawings.
// Nothing is downloaded. All designs are original.
import Phaser from 'phaser';
import { GLYPHS, GLYPH_CHARS, MINI, CELL_H } from './glyphs';
import { C, THEMES, type Theme } from './palette';

export const TILE = 16;
type Ctx = CanvasRenderingContext2D;

// ───────────────────────── helpers ─────────────────────────
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  draw(c);
  scene.textures.addCanvas(key, cv);
  return key;
}
export function drawGrid(c: Ctx, rows: string[], colors: Record<string, string>, x = 0, y = 0, px = 1) {
  rows.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      const col = colors[row[i]];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x + i * px, y + r * px, px, px);
    }
  });
}
export function gridTex(scene: Phaser.Scene, key: string, rows: string[], colors: Record<string, string>, px = 1) {
  const w = Math.max(...rows.map((r) => r.length));
  return canvasTex(scene, key, w * px, rows.length * px, (c) => drawGrid(c, rows, colors, 0, 0, px));
}
/** Sprite sheet from several same-size grids (one frame each, laid out horizontally). */
export function framesTex(scene: Phaser.Scene, key: string, frames: string[][], colors: Record<string, string>) {
  if (scene.textures.exists(key)) return key;
  const w = Math.max(...frames[0].map((r) => r.length));
  const h = frames[0].length;
  canvasTex(scene, key, w * frames.length, h, (c) => frames.forEach((f, i) => drawGrid(c, f, colors, i * w, 0)));
  const tex = scene.textures.get(key);
  frames.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
  return key;
}
export function rect(c: Ctx, col: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}
export function line(c: Ctx, col: string, x0: number, y0: number, x1: number, y1: number) {
  // Bresenham, so lines stay pixel-crisp
  c.fillStyle = col;
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ───────────────────────── fonts ─────────────────────────
export const FONT_COLORS: Record<string, string> = {
  w: C.white, y: C.yellow, r: C.red, o: C.orange, g: C.grey, c: C.cyan, k: C.gold, p: C.pink, b: C.black, d: C.dim,
  e: C.green, v: C.purple,
};
export function buildFonts(scene: Phaser.Scene) {
  const per = 32;
  const rowsN = Math.ceil(GLYPH_CHARS.length / per);
  for (const [k, col] of Object.entries(FONT_COLORS)) {
    const key = 'font-' + k;
    canvasTex(scene, key, per * 6, rowsN * CELL_H, (c) => {
      [...GLYPH_CHARS].forEach((ch, i) => drawGrid(c, GLYPHS[ch], { '#': col }, (i % per) * 6, Math.floor(i / per) * CELL_H));
    });
    scene.cache.bitmapFont.add('px-' + k, Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key, width: 6, height: CELL_H, chars: GLYPH_CHARS, charsPerRow: per,
      'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    } as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig));
  }
  const miniChars = Object.keys(MINI).join('');
  for (const k of ['w', 'y', 'r', 'g', 'c', 'b']) {
    const key = 'fontmini-' + k;
    canvasTex(scene, key, miniChars.length * 4, 6, (c) => {
      [...miniChars].forEach((ch, i) => drawGrid(c, MINI[ch], { '#': FONT_COLORS[k] }, i * 4, 0));
    });
    scene.cache.bitmapFont.add('mini-' + k, Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key, width: 4, height: 6, chars: miniChars, charsPerRow: miniChars.length,
      'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    } as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig));
  }
}

// ───────────────────────── tiles ─────────────────────────
// Tileset layout (index → tile). Wall-top variants encode which neighbours are walkable (N=1,E=2,S=4,W=8).
export const T = {
  VOID: 0, FLOOR: 1, FLOOR2: 2, CARPET: 3, WALLFACE: 4, DOOR: 5, CHASM: 6, LEDGE: 7, PLANK: 8, BROKEN: 9,
  GLOW: 10, STONE: 11, STARS: 12, FACE_UP: 13, WALLTOP: 16, // 16..31
} as const;

// Every surface is a tiny pixel shader (x, y → colour) on a 16px period, so tiles join seamlessly. The two wall tiles
// share one 32px-tall face: FACE_UP is rows 0-15 and WALLFACE rows 16-31 of the same drawing.
//   0-2  the top of the wall seen from above   3 lit lip   4 outline
//   5-23 the wall's own texture (stone blocks, boards, wallpaper...)   24 outline
//   25-28 skirting strip (or cables)   29 outline   30-31 the floor, in the wall's shadow
type Shade = (x: number, y: number) => string;
const has = (pts: number[][], x: number, y: number) => pts.some(([a, b]) => a === x && b === y);
/** Pixel lookup from a small hand-drawn map: each character picks a colour (others fall back). */
const pick = (rows: string[], pal: Record<string, string>, fb: Shade): Shade => (x, y) => pal[rows[y]?.[x] ?? '.'] ?? fb(x, y);

function floorShader(th: Theme): Shade {
  const [f0, f1, f2] = th.floor;
  switch (th.floorKind) {
    case 'flagstone': {
      // two bands of worn flagstones with staggered joints, rounded corners and lit top-left edges
      return (x, y) => {
        const band = y < 9 ? 0 : 1, iy = band ? y - 9 : y, h = band ? 7 : 9;
        const joints = band ? [2, 11] : [6];
        if (iy === h - 1 || joints.includes(x)) return f2;
        const left = joints.includes((x + 15) % 16), right = joints.includes((x + 1) % 16);
        if ((left || right) && (iy === 0 || iy === h - 2)) return f2;
        if (iy === 0 || left) return f1;
        return has([[9, 4], [10, 4], [4, 12], [14, 13]], x, y) ? f2 : f0;
      };
    }
    case 'speckle': {
      const dark = [[2, 3], [3, 3], [11, 1], [6, 9], [14, 12], [3, 13], [9, 14], [12, 6], [7, 10]];
      const lite = [[8, 4], [13, 9], [1, 8], [6, 13], [10, 11], [4, 6]];
      return (x, y) => (has(dark, x, y) ? f2 : has(lite, x, y) ? f1 : f0);
    }
    case 'rock': {
      // dark rock with a few cracks, lit chips and the odd gold fleck
      const dark = [[2, 3], [3, 4], [4, 4], [5, 4], [11, 11], [12, 12], [13, 12]];
      const lite = [[2, 2], [3, 3], [11, 10]];
      return (x, y) => (th.fleck && x === 9 && y === 6 ? th.fleck : has(dark, x, y) ? f2 : has(lite, x, y) ? f1 : f0);
    }
    case 'planks': {
      // long boards 3px tall with a dark seam; only every other board has a butt joint in this tile
      const jx = [5, -1, 12, -1];
      const grain = [[9, 1], [10, 1], [2, 5], [3, 5], [4, 5], [6, 13], [7, 13]];
      return (x, y) => {
        const b = y >> 2, ry = y & 3;
        if (ry === 3) return f2;
        if (x === jx[b]) return f2;
        if (x === jx[b] + 1 && ry === 0) return f1;
        return has(grain, x, y) ? f1 : f0;
      };
    }
    case 'parquet':
      // basket weave: 8px squares of two boards, turning a quarter each square, with a lit edge per board
      return (x, y) => {
        const flip = ((x >> 3) + (y >> 3)) % 2 === 1;
        const u = flip ? y & 7 : x & 7, v = flip ? x & 7 : y & 7; // u runs across the boards
        if ((x & 7) === 7 || (y & 7) === 7) return f2;
        if (u === 3) return v === 0 ? f2 : f1;
        return u === 0 && v < 3 ? f1 : f0;
      };
    case 'tiles':
      // four 8px tiles: soft grout, a lit top-left bevel
      return (x, y) => ((x & 7) === 7 || (y & 7) === 7 ? f2 : (x & 7) === 0 || (y & 7) === 0 ? f1 : f0);
    case 'sand': {
      // packed sand: a few dark grains and the odd little lit cross
      const plus = [[11, 3], [10, 3], [12, 3], [11, 2], [11, 4]];
      const dark = [[3, 8], [7, 13], [13, 11], [5, 2], [14, 15]];
      return (x, y) => (has(plus, x, y) || has([[2, 12], [8, 8]], x, y) ? f1 : has(dark, x, y) ? f2 : f0);
    }
    case 'grass': {
      const tufts = [[2, 3], [10, 1], [6, 9], [13, 11], [0, 14]];
      const dark: number[][] = [];
      for (const [a, b] of tufts) dark.push([a + 1, b], [a, b + 1], [a + 2, b + 1]);
      const lite = [[5, 2], [12, 6], [3, 10], [9, 13], [14, 4], [7, 5]];
      return (x, y) => (has(dark, x, y) ? f2 : has(lite, x, y) ? f1 : f0);
    }
    case 'slabs':
      // long stone slabs in a running bond, lit on top (gold inlay in the grout when the theme has a fleck)
      return (x, y) => {
        const top = y < 8;
        if ((y & 7) === 7 || x === (top ? 15 : 7)) return th.fleck && ((x === 15 && y === 7) || (x === 7 && y === 15)) ? th.fleck : f2;
        if ((y & 7) === 0) return f1;
        return has([[4, 3], [11, 11], [12, 12]], x, y) ? f2 : f0;
      };
    case 'void':
      return (x, y) => (x === 0 || y === 0 ? f1 : has([[8, 8], [3, 11]], x, y) ? f2 : f0);
    default:
      return () => f0;
  }
}


function pathShader(th: Theme): Shade {
  const [p0, p1, p2] = th.path;
  switch (th.pathKind) {
    case 'slab':
      return (x, y) => (x === 15 || y === 15 ? p2 : x === 0 || y === 0 ? p1 : has([[12, 3], [3, 11]], x, y) ? p2 : p0);
    case 'cobble':
      // rounded stones in staggered rows, dark grout, lit tops
      return (x, y) => {
        const row = y >> 3, iy = y & 7;
        const ix = (x + (row ? 4 : 0)) & 7;
        if (iy === 7 || ix === 7 || ((iy === 0 || iy === 6) && (ix === 0 || ix === 6))) return p2;
        return iy === 0 || ix === 0 ? p1 : p0;
      };
    case 'dirt':
      return (x, y) => (has([[3, 4], [11, 9], [7, 13], [13, 2]], x, y) ? p2 : has([[4, 4], [12, 9], [6, 7]], x, y) ? p1 : p0);
    default:
      return () => p0;
  }
}

/** The thick top of the wall, seen from above. */
function topShader(th: Theme): Shade {
  const [t0, t1, t2] = th.top;
  switch (th.topKind) {
    case 'stone':
      return (x, y) => ((y & 7) === 7 || x === (y < 8 ? 15 : 7) ? t1 : has([[4, 3], [11, 12]], x, y) ? t1 : t0);
    case 'leaf':
      // overlapping leaf scales: a lit arc on top of each, a dark gap below
      return (x, y) => {
        const ry = y & 3, sx = (x + ((y >> 2) % 2) * 4) & 7;
        if (ry === 3 && sx !== 3 && sx !== 4) return t1;
        if (ry === 0 && sx >= 2 && sx <= 5) return t2;
        return t0;
      };
    case 'shingle':
      // overlapping timber shingles with rounded bottoms
      return (x, y) => {
        const ry = y & 3, sx = (x + ((y >> 2) % 2) * 4) & 7;
        if ((ry === 3 && sx >= 1 && sx <= 6) || (ry === 2 && (sx === 0 || sx === 7))) return t1;
        if (sx === 0 && ry < 2) return t1;
        return ry === 0 && sx >= 2 && sx <= 4 ? t2 : t0;
      };
    case 'beam':
      return (x, y) => ((y & 3) === 3 || x === [4, 12, 8, 0][y >> 2] ? t1 : t0);
    case 'plate':
      return (x, y) => (x === 15 || y === 15 ? t1 : has([[2, 2], [13, 2], [2, 13], [13, 13]], x, y) ? t2 : t0);
    case 'rock':
      return (x, y) => (has([[3, 2], [4, 2], [12, 5], [7, 9], [8, 10], [2, 12], [13, 13], [14, 13]], x, y) ? t1 : has([[5, 6], [11, 11]], x, y) ? t2 : t0);
    case 'starry':
      return (x, y) => (x === 4 && y === 5 ? '#ffffff' : x === 12 && y === 11 ? '#8a8ab8' : t0);
    case 'sky':
      // a deep night sky: a band of lighter indigo and a few stars
      return (x, y) => (has([[4, 5], [12, 12]], x, y) ? '#ffffff' : has([[10, 2], [1, 10], [7, 14]], x, y) ? '#8a86c8' : (x + y * 3) % 7 === 0 && y > 8 ? t1 : t0);
    default:
      return (x, y) => (has([[5, 6], [12, 11]], x, y) ? t1 : t0);
  }
}

/** The wall's face, rows 5..23 of the 32px wall. */
function faceShader(th: Theme): Shade {
  const [w0, w1, w2] = th.wallFace;
  const [r0, r1] = th.trim;
  switch (th.wallKind) {
    case 'server': {
      // slate blocks in two courses; faint circuit grooves end in glowing pads; heat-sink fins (one cracked) on top;
      // moss creeping over the deeper catacombs
      const fins = !!th.fins;
      const aTop = fins ? 8 : 5, bTop = fins ? 16 : 15, aJ = 11, bJ = 3;
      const [tg, tl] = th.trace ?? [w1, w2];
      const traceA = [[2, aTop + 3], [3, aTop + 3], [4, aTop + 3], [5, aTop + 3], [6, aTop + 3], [7, aTop + 3], [7, aTop + 4], [7, aTop + 5]];
      const padA = [[1, aTop + 3], [7, aTop + 6], [8, aTop + 6]];
      const traceB = [[13, bTop + 2], [13, bTop + 3], [13, bTop + 4], [14, bTop + 4], [15, bTop + 4], [0, bTop + 4], [1, bTop + 4]];
      const padB = [[13, bTop + 1], [2, bTop + 4], [2, bTop + 5]];
      const mossL = [[2, aTop], [3, aTop], [4, aTop], [5, aTop], [3, aTop + 1], [8, bTop], [9, bTop], [10, bTop], [14, bTop], [15, bTop]];
      const mossD = [[4, aTop + 1], [3, aTop + 2], [9, bTop + 1], [9, bTop + 2], [15, bTop + 1]];
      return (x, y) => {
        if (fins && y < 8) {
          if (y === 7) return w1;
          if ((x === 11 || x === 12) && y === 5) return w1; // a cracked fin
          if (x === 12 && y === 6) return w1;
          return x % 2 === 0 ? r0 : r1;
        }
        if (!fins && y === aTop - 1) return w1;
        if (th.moss && has(mossL, x, y)) return th.moss[0];
        if (th.moss && has(mossD, x, y)) return th.moss[1];
        if (has(padA, x, y) || has(padB, x, y)) return tl;
        if (has(traceA, x, y) || has(traceB, x, y)) return tg;
        const inA = y < bTop;
        if (y === bTop - 1) return w1; // mortar between the courses
        if (x === (inA ? aJ : bJ)) return w1;
        if (y === (inA ? aTop : bTop) || x === (inA ? aJ : bJ) + 1) return w2;
        return has([[13, aTop + 4], [5, bTop + 5], [10, bTop + 3]], x, y) ? w1 : w0;
      };
    }
    case 'stone':
      // big blocks in a running bond, lit on top and left
      return (x, y) => {
        const row = y < 11 ? 0 : y < 18 ? 1 : 2;
        const jx = row === 1 ? 7 : 15;
        if (y === 11 || y === 18 || x === jx) return w1;
        if (y === 5 || y === 12 || y === 19 || x === (jx + 1) % 16) return w2;
        return has([[4, 8], [11, 15], [3, 21], [12, 22]], x, y) ? w1 : w0;
      };
    case 'rock':
      // a dark rock cliff: lit ledges, cracks, a vein of gold
      return pick([
        '++++++.+++++++++',
        '......#.........',
        '.....#......,...',
        '....#.......,...',
        '###.....g....#..',
        '+++#....g...#+++',
        '....#....g.#....',
        '.....+...#......',
        '......+++.......',
        '..,.............',
        '..,......####...',
        '########.+++####',
        '+++++++#........',
        '........#....,..',
        '...g.....#...,..',
        '....g.....#.....',
        '.....g.....++++.',
        '................',
        '..........,.....',
      ], { '+': w2, '#': w1, ',': w1, g: r0 }, () => w0) as Shade;
    case 'siding': {
      // horizontal clapboards, lit top edge, staggered butt joints
      const jx = [3, 11, 7, 14, 1];
      return (x, y) => {
        const r = y - 5, b = r >> 2, ry = r & 3;
        if (ry === 3) return w1;
        if (x === jx[b % 5]) return w1;
        return ry === 0 ? w2 : w0;
      };
    }
    case 'panel':
      // white wall panels, a teal stripe, rivets
      return (x, y) => {
        if (y >= 12 && y <= 13) return r0;
        if (y === 14) return r1;
        if (x === 15) return w1;
        if (x === 0) return w2;
        if (has([[3, 7], [12, 7], [3, 20], [12, 20]], x, y)) return w1;
        return y === 18 ? w1 : y === 19 ? w2 : w0;
      };
    case 'wallpaper':
      // a little star print above a wooden wainscot and a chair rail
      return (x, y) => {
        if (y === 16) return th.floor[1];
        if (y === 17) return r0;
        if (y === 18) return r1;
        if (y > 18) return (x & 3) === 3 ? r1 : (x & 3) === 0 ? th.floor[1] : r0;
        const ry = (y - 5) % 6, row = Math.floor((y - 5) / 6);
        const dx = Math.abs(((x + (row % 2) * 4) & 7) - 3.5) - 0.5, dy = Math.abs(ry - 2);
        if (dx === 0 && dy === 0) return w2;
        if (dx + dy === 1) return w1;
        return w0;
      };
    case 'hedge':
      // leafy scales, darker toward the foot, with a few glowing fibre-optic tips
      return (x, y) => {
        if (has([[3, 9], [12, 18]], x, y)) return r0;
        if (has([[10, 7], [5, 20]], x, y)) return r1;
        const ry = (y - 5) & 3, sx = (x + (((y - 5) >> 2) % 2) * 4) & 7;
        if (ry === 3 && sx !== 3 && sx !== 4) return w1;
        if (ry === 0 && sx >= 2 && sx <= 5) return y < 15 ? w2 : w0;
        return y > 19 && (x + y) % 2 === 0 ? w1 : w0;
      };
    case 'boards':
      // raised wooden panels, two per tile, with a rail through the middle
      return (x, y) => {
        if (y === 13) return w1;
        if (y === 14) return r0;
        if (y === 15) return w2;
        const ix = x & 7;
        if (ix === 7) return w1;
        if (ix === 0) return w2;
        const inUp = y >= 7 && y <= 11, inLo = y >= 17 && y <= 22;
        if ((inUp || inLo) && ix >= 2 && ix <= 5) return y === 7 || y === 17 ? r1 : r0;
        return w0;
      };
    case 'pilaster':
      // dark wood panelling with one brass-capped pilaster per tile
      return (x, y) => {
        if (y === 5) return r0;
        if (y === 6) return r1;
        const cap = y >= 7 && y <= 8, foot = y >= 21;
        if ((cap || foot) && x >= 4 && x <= 11) return y === 7 || y === 21 ? r0 : x === 11 ? r1 : y === 8 ? r1 : w2;
        if (x >= 5 && x <= 10) return x === 5 ? w1 : x === 6 ? w2 : x === 10 ? w1 : w0;
        if (y === 14) return r1;
        return (x === 1 || x === 14) && y > 9 && y < 19 ? w1 : w0;
      };
  }
}

export function buildTileset(scene: Phaser.Scene, themeId: string): string {
  const key = 'tiles-' + themeId;
  const th: Theme = THEMES[themeId] ?? THEMES.hub;
  canvasTex(scene, key, 32 * TILE, TILE, (c) => {
    const at = (i: number) => i * TILE;
    const K = th.line;
    const fl = floorShader(th), path = pathShader(th), top = topShader(th), face = faceShader(th);
    const paint = (ox: number, sh: Shade) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) rect(c, sh(x, y), ox + x, y, 1, 1);
    };
    /** One row of the 32px wall (see the layout above). */
    const wallRow = (x: number, gy: number): string => {
      if (gy <= 2) return top(x, gy);
      if (gy === 3) return th.top[2];
      if (gy === 4 || gy === 24 || gy === 29) return K;
      if (gy <= 23) return face(x, gy);
      if (gy <= 28) {
        if (!th.cables) return th.base;
        // two old cables run along the foot of the wall, held by a tie
        const [cl, cd, c2] = th.cables;
        if ((x === 6 || x === 7) && gy < 28) return x === 6 ? '#c8c4b0' : '#8a8676';
        return gy === 25 ? cl : gy === 26 ? cd : gy === 27 ? c2 : th.base;
      }
      return gy === 30 ? th.floor[2] : fl(x, 15);
    };

    // floors: the plain one, and a variant (an embedded copper trace in the catacombs, a crack elsewhere)
    paint(at(T.FLOOR), fl);
    const copper = [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [7, 5], [7, 6], [8, 6], [9, 6], [10, 6]];
    const crack = [[4, 4], [5, 5], [6, 6], [7, 7], [7, 8], [6, 9], [6, 10], [8, 7], [9, 7], [10, 8], [11, 8]];
    paint(at(T.FLOOR2), (x, y) => {
      if (th.trace) return has([[2, 4], [11, 6]], x, y) ? '#e8a060' : has(copper, x, y) ? '#a0602e' : fl(x, y);
      return has(crack, x, y) ? th.floor[2] : has([[5, 4], [8, 6]], x, y) ? th.floor[1] : fl(x, y);
    });
    // carpet: a seamless rug weave, diamonds with a bright thread
    paint(at(T.CARPET), (x, y) => {
      const [c0, c1, c2] = th.carpet;
      const cx = x & 7, cy = y & 7, alt = ((x >> 3) + (y >> 3)) % 2 === 0;
      const d = Math.abs(cx - 3.5) + Math.abs(cy - 3.5);
      if (alt && d === 3) return c1;
      if (alt && d === 0) return c2;
      if (!alt && (cx === 3 || cx === 4) && (cy === 3 || cy === 4)) return c2;
      return (y & 7) === 0 && !alt ? c1 : c0;
    });
    // the two-tile wall
    paint(at(T.FACE_UP), (x, y) => wallRow(x, y));
    paint(at(T.WALLFACE), (x, y) => wallRow(x, y + 16));
    // a doorway: just a dark opening
    rect(c, '#000000', at(T.DOOR), 0, 16, 16);
    // chasm: deep black; ledge: the floor's lit edge, then its cliff face falling away into the dark
    rect(c, '#000000', at(T.CHASM), 0, 16, 16);
    rect(c, th.floor[2], at(T.CHASM) + 4, 6, 1, 1);
    rect(c, th.top[1], at(T.CHASM) + 11, 12, 1, 1);
    paint(at(T.LEDGE), (x, y) => {
      const [w0, w1, w2] = th.wallFace;
      if (y === 0) return th.top[2];
      if (y === 1) return K;
      if (y <= 7) return x % 6 === 2 ? w1 : x % 6 === 3 && y < 5 ? w2 : y === 2 ? w2 : w0;
      if (y <= 10) return (x + y) % 2 === 0 ? w1 : '#000000';
      if (y === 11) return x % 3 === 0 ? w1 : '#000000';
      return '#000000';
    });
    // rope bridge: boards across the gap, rope rails top and bottom
    paint(at(T.PLANK), (x, y) => {
      const bx = x & 3;
      if (y === 1 || y === 14) return bx === 3 ? '#8a6a3a' : '#e0c890';
      if (y === 0 || y === 15) return '#000000';
      if (bx === 3) return '#000000';
      if (y === 12) return '#6a3e1c';
      if (y === 13) return '#000000';
      return bx === 0 ? '#c88a4c' : y === 2 ? '#c88a4c' : '#9a6232';
    });
    paint(at(T.BROKEN), (x, y) => {
      if (y === 1 && x < 6) return x === 3 ? '#8a6a3a' : '#e0c890';
      if (y === 14 && x > 10) return '#e0c890';
      if (x < 3 && y >= 2 && y <= 6) return x === 0 ? '#c88a4c' : y === 6 ? '#6a3e1c' : '#9a6232';
      if (x > 12 && x < 15 && y >= 9 && y <= 13) return y === 9 ? '#c88a4c' : '#9a6232';
      return '#000000';
    });
    // encounter tile: the floor with a red rune circle
    paint(at(T.GLOW), (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (Math.abs(d - 6) < 0.55) return '#e8283a';
      if (Math.abs(d - 4.6) < 0.4 && (x + y) % 2 === 0) return '#a01828';
      if (has([[7, 7], [8, 8], [7, 8], [8, 7]], x, y)) return '#ff8a8a';
      if (has([[7, 3], [8, 12], [3, 8], [12, 7]], x, y)) return '#ff5a5a';
      return fl(x, y);
    });
    // paving / path
    paint(at(T.STONE), path);
    // a starfield
    const sky = th.sky ?? '#000000', mid = th.sky ? '#b0aaf0' : '#9a9ac8', dim = th.sky ? '#5a5690' : '#4a4a6e';
    paint(at(T.STARS), (x, y) => (x === 3 && y === 4 ? '#ffffff' : x === 11 && y === 10 ? mid : (x === 7 && y === 13) || (x === 13 && y === 2) ? dim : x === 8 && y === 7 && th.sky && th.fleck ? th.fleck : sky));
    // the tops of walls: textured, outlined with a lit lip on every side that touches a walkable tile
    for (let m = 0; m < 16; m++) {
      paint(at(T.WALLTOP + m), (x, y) => {
        if ((m & 1 && y === 0) || (m & 2 && x === 15) || (m & 4 && y === 15) || (m & 8 && x === 0)) return K;
        if ((m & 1 && y === 1) || (m & 2 && x === 14) || (m & 4 && y === 14) || (m & 8 && x === 1)) return th.top[2];
        return top(x, y);
      });
    }
  });
  return key;
}

// ───────────────────────── sprites ─────────────────────────
export const SOUL_BIG = [
  '.rrr...rrr.', 'rrhrr.rrrrr', 'rhrrrrrrrrr', 'rrrrrrrrrrr', 'rrrrrrrrrrd', '.rrrrrrrrd.', '..rrrrrrd..', '...rrrrd...',
  '....rrd....', '.....r.....',
];
export const SOUL_SMALL = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const STAR = ['.....#.....', '.....#.....', '....###....', '....###....', '###########', '.#########.',
  '..#######..', '...#####...', '..###.###..', '.##.....##.', '##.......##'];
// The crown, inspired by Technoblade's: lemon gold, a row of points with little gem orbs on the tips,
// and a band of mixed faceted gems (blue, green, a big red one in the middle, purple).
export const CROWN_PAL = {
  k: '#1c1400', Y: '#fffbc2', y: '#fff200', o: '#e6c600', d: '#b38f00', D: '#7a5c00', w: '#ffffff',
  b: '#4d6df3', B: '#c4d0ff', r: '#ed1c24', R: '#ffb4b4', g: '#8ee01a', G: '#e0ffb0', p: '#ab36d1', P: '#efc0ff',
};
export const CROWN = [
  '..........k..........',
  '.........kwk.........',
  '......k.kYydk.k......',
  '.....kBkkYydkkPk.....',
  '..k.kYydkYydkYydk.k..',
  '.kGkkYydkYydkYydkkRk.',
  'kYydkYydkYydkYydkYydk',
  'kYydkYydkYydkYydkYydk',
  'kYYYYYYYYYYYYYYYYYYYk',
  'koBbooGgoRRroPpooBbok',
  'kobbooggorrroppoobbok',
  'kdddddddddddddddddddk',
  'kDDDDDDDDDDDDDDDDDDDk',
  '.kkkkkkkkkkkkkkkkkkk.',
];
/** The small one: what the SOUL wears, and the pickup hidden in the Proving Grounds. */
export const MINI_CROWN = ['....k....', '..kkwkk..', '.kykykyk.', '.kykykyk.', 'kYYYYYYYk', 'kbogrpobk', 'kDDDDDDDk', '.kkkkkkk.'];

const ICONS: Record<string, string[]> = {
  tfb: ['....##....', '...####...', '..#rr##...', '..#rr##...', '..#yy##...', '..#yy##...', '..#ee##...', '..#ee##...', '...####...', '....##....'],
  swarm: ['....cc....', '...c..c...', '..cccccc..', '.c.c..c.c.', '.cccccccc.', '..c.cc.c..', '..cccccc..', '..c....c..', '.cc....cc.', '..........'],
  road: ['..ww......', '.w..w.....', '.w..wwwww.', '.w..w...w.', '..ww....w.', '........rr', '.......rrr', '........rr', '..........', '..........'],
  mlscratch: ['wwwwwwwww.', 'w.........', '.w........', '..w.......', '...w......', '..w.......', '.w........', 'w.........', 'wwwwwwwww.', '..........'],
  vec: ['..........', '........y.', '........y.', '.....y..y.', '.....y..y.', '..y..y..y.', '..y..y..y.', '..y..y..y.', 'wwwwwwwwww', '..........'],
  qlora: ['.c.c.c.c..', 'cccccccccc', 'c........c', 'c.pppppp.c', 'c.p....p.c', 'c.p....p.c', 'c.pppppp.c', 'c........c', 'cccccccccc', '.c.c.c.c..'],
  apcs: ['..........', 'oooooooooo', 'o.o.o.o.oo', 'o.o.o.o.oo', 'o.o.o.o.oo', 'oooooooooo', 'o.o.o.o.oo', 'o.o.o.o.oo', 'oooooooooo', '..........'],
};

const BOT = ['..####..', '.#eeee#.', '.#e##e#.', '..####..', '.######.', '#.#tt#.#', '..####..', '..#..#..'];

/** Shared colours for the small world sprites (letters as in props.ts). */
const SPRITE_PAL: Record<string, string> = {
  k: '#000000', _: 'rgba(0,0,0,0.28)',
  w: '#ffffff', W: '#d8dce4', g: '#a0a8b4', G: '#6a7480', d: '#454c58', D: '#2a3038', // steel
  s: '#8a98a4', S: '#5e6c78', t: '#3e4a54', // slate
  y: '#ffe14a', Y: '#d8a838', O: '#9a6420', h: '#fff4c0', o: '#ff8a1a', // gold / brass / flame
  a: '#ffc848', A: '#d88a28', // warm light
  r: '#e83a3a', R: '#a01c24',
  b: '#d49a5e', B: '#a86a3a', n: '#74441e', N: '#4a2a12', // wood
  c: '#8af0ff', C: '#2aa8c8', // cyan glow
  e: '#7ad860', E: '#3a9a3a', f: '#24642a', // greens
  u: '#e8dcc0', U: '#c4b494', v: '#8e8068', // beige plastic
  x: '#e8a060', X: '#a05a28', // copper / terracotta
  z: '#0a1a14', Z: '#5ae08a', // dark screen, phosphor
};

export function buildSprites(scene: Phaser.Scene) {
  // The overworld SOUL is the profile's chunky 7x6 heart, shown at 2x so its pixels read clearly.
  gridTex(scene, 'soul', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-ghost', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-detailed', SOUL_BIG, { r: C.red, h: '#ff9a9a', d: '#b00000' });
  gridTex(scene, 'soul-small', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-small-hurt', SOUL_SMALL, { '#': '#ff9a9a' });
  gridTex(scene, 'soul-crown', MINI_CROWN, CROWN_PAL);
  gridTex(scene, 'star', STAR, { '#': C.yellow });
  gridTex(scene, 'crown', CROWN, CROWN_PAL);
  canvasTex(scene, 'halo', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,160,0.55)');
    g.addColorStop(1, 'rgba(255,255,160,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
  });
  canvasTex(scene, 'px1', 1, 1, (c) => rect(c, '#ffffff', 0, 0, 1, 1));
  canvasTex(scene, 'zhint', 9, 9, (c) => {
    rect(c, '#000000', 0, 0, 9, 9);
    rect(c, '#ffffff', 0, 0, 9, 1); rect(c, '#ffffff', 0, 8, 9, 1); rect(c, '#ffffff', 0, 0, 1, 9); rect(c, '#ffffff', 8, 0, 1, 9);
    drawGrid(c, ['###', '..#', '.#.', '#..', '###'], { '#': C.yellow }, 3, 2);
  });
  for (const [id, rows] of Object.entries(ICONS))
    gridTex(scene, 'icon-' + id, rows, { w: C.white, r: C.red, y: C.yellow, e: C.green, c: C.cyan, p: C.pink, o: C.orange });
  for (const [k, eye, tool] of [['auditor', C.cyan, C.cyan], ['fixer', C.orange, C.yellow], ['judge', C.yellow, C.green]] as const)
    gridTex(scene, 'bot-' + k, BOT, { '#': '#d0d0d0', e: eye, t: tool });

  // ── small world sprites: black outlines, 2-3 shades per material, lit from the top-left ──
  const Q = SPRITE_PAL;
  // pedestal (16x24): a slate column with a brass plate (trophies, crowns and project icons sit on it)
  gridTex(scene, 'pedestal', [
    '................', '................', '................', '................', '................', '................',
    '.kkkkkkkkkkkkkk.', 'khyyyyyyyyyyyYOk', 'kYYYYYYYYYYYYYOk', 'kOOOOOOOOOOOOOOk', '.kkkkkkkkkkkkkk.', '..kWssssssSStk..',
    '..kWssssssSStk..', '..kWsCCCssSStk..', '..kWsssCssSStk..', '..kWsssCssSStk..', '..kWsssccsSStk..', '..kWssssssSStk..',
    '..kWssssssSStk..', '.kkkkkkkkkkkkkk.', 'kWWWWWWWWWWWWWgk', 'ksssssssssssssSk', 'kSSSSSSSSSSSSStk', 'kkkkkkkkkkkkkkkk',
  ], Q);
  // sign post (16x16): a pale board in a wooden frame
  gridTex(scene, 'sign', [
    '................', '.kkkkkkkkkkkkkk.', 'kbbbbbbbbbbbbbBk', 'kbuuuuuuuuuuuUnk', 'kbuvvvvvvvvuuUnk', 'kbuuuuuuuuuuuUnk',
    'kbuvvvvvvuuuuUnk', 'kbUUUUUUUUUUUUnk', 'knnnnnnnnnnnnnnk', '.kkkkkkkkkkkkkk.', '......kBnk......', '......kBnk......',
    '......kBnk......', '......kBnk......', '......kNNk......', '.....______.....',
  ], Q);
  // pillar (16x32): a slate column with brass capitals and a faint glowing groove
  const shaft = (row: number) => {
    const base = '..kWsssssSSStk..';
    if (row === 7 || row === 14) return base.slice(0, 6) + 'c' + base.slice(7);
    if (row > 7 && row < 14) return base.slice(0, 6) + 'C' + base.slice(7);
    if (row === 17) return '..kyyyyyyyyYOk..';
    if (row === 18) return '..kOOOOOOOOOOk..';
    return base;
  };
  gridTex(scene, 'pillar', [
    '.kkkkkkkkkkkkkk.', 'khyyyyyyyyyyyYOk', 'kOOOOOOOOOOOOOOk', '.kkkkkkkkkkkkkk.', '..kWWWWWWWWWgk..', '..kkkkkkkkkkkk..',
    ...Array.from({ length: 20 }, (_, i) => shaft(i + 6)),
    '..kkkkkkkkkkkk..', '.kWWWWWWWWWWWgk.', 'kkkkkkkkkkkkkkkk', 'khyyyyyyyyyyyYOk', 'kOOOOOOOOOOOOOOk', 'kkkkkkkkkkkkkkkk',
  ], Q);
  // archive shelf (16x32): floppy disks, tape reels and cartridges instead of books; a variant with one sticking out
  const shelf = (odd: boolean) => (c: Ctx) => {
    rect(c, Q.k, 0, 0, 16, 32); rect(c, Q.n, 1, 1, 14, 30); rect(c, Q.b, 1, 1, 14, 1); rect(c, Q.N, 14, 2, 1, 29);
    const floppy = (x: number, yb: number, body: string, dark: string) => {
      rect(c, Q.k, x - 1, yb - 7, 5, 8); rect(c, body, x, yb - 6, 3, 7); rect(c, dark, x + 2, yb - 6, 1, 7); rect(c, Q.W, x + 1, yb - 5, 1, 2);
    };
    const reel = (x: number, yb: number) => drawGrid(c, ['.kkk.', 'knNnk', 'kNwNk', 'knNnk', '.kkk.'], Q, x, yb - 4);
    const cart = (x: number, yb: number, col: string) => { rect(c, Q.k, x - 1, yb - 6, 4, 7); rect(c, col, x, yb - 5, 2, 6); rect(c, Q.U, x, yb - 3, 2, 1); };
    for (const top of [3, 13, 23]) {
      rect(c, '#24160c', 2, top, 12, 7);
      rect(c, Q.b, 1, top + 7, 14, 1); rect(c, Q.N, 1, top + 8, 14, 1);
    }
    floppy(3, 9, '#3a6ab8', '#24447a'); floppy(7, 9, '#d84a4a', '#8a2228'); reel(10, 9);
    reel(2, 19); floppy(8, 19, '#e8c040', '#a07a18'); floppy(12, 19, '#3a9a5a', '#22603a');
    floppy(3, 29, '#8a5ac8', '#5a3a8a'); cart(7, 29, '#3a3a48'); cart(10, 29, '#5a5a6a'); rect(c, Q.k, 13, 26, 1, 4);
    if (odd) { rect(c, Q.k, 5, 11, 5, 10); rect(c, '#ffd23a', 6, 12, 3, 8); rect(c, '#fff4c0', 6, 12, 3, 1); rect(c, '#c89a10', 8, 13, 1, 7); rect(c, Q.W, 7, 14, 1, 2); }
  };
  canvasTex(scene, 'shelf', 16, 32, shelf(false));
  canvasTex(scene, 'shelf-odd', 16, 32, shelf(true));
  // trophy (16x20): a gold cup on a wooden plinth
  gridTex(scene, 'trophy', [
    '..kkkkkkkkkkkk..', '.kkyyyyyyyyYYkk.', 'kYkhyyyyyyyYOkYk', 'kYkhyyyyyyyYOkYk', 'kOkyyyyyyyyYOkOk', '.kkyyyyyyyyYOkk.',
    '..kYyyyyyyyYOk..', '...kYyyyyyYOk...', '....kYYYYYOk....', '.....kkYOkk.....', '......kYOk......', '......kYOk......',
    '.....kyYYOk.....', '....kkkkkkkk....', '....kNNNNNNk....', '...kbbbbbbbbk...', '...knyyyyyynk...', '...knnnnnnnnk...',
    '...kNNNNNNNNk...', '...kkkkkkkkkk...',
  ], Q);
  // terminal (16x24): a beige CRT showing a rising line, and its keyboard
  gridTex(scene, 'terminal', [
    '.kkkkkkkkkkkkkk.', 'kuuuuuuuuuuuuuUk', 'kukkkkkkkkkkkkUk', 'kukzzzzzzzzzzkUk', 'kukzzzzzzzzZzkUk', 'kukzzzzzzzZzzkUk',
    'kukzZzzzzZzzzkUk', 'kukzzZzzZzzzzkUk', 'kukzzzZZzzzzzkUk', 'kukzzzzzzzzzzkUk', 'kukkkkkkkkkkkkUk', 'kUUUUUUUUUUUrUvk',
    'kvvvvvvvvvvvvvvk', '.kkkkkkkkkkkkkk.', '.....kUUUvk.....', '....kkkkkkkk....', '................', '.kkkkkkkkkkkkkk.',
    'kuuuuuuuuuuuuuUk', 'kuvuvuvuvuvuvuvk', 'kuuuuuuuuuuuuuUk', 'kUvUvUvUvUvUvUvk', 'kvvvvvvvvvvvvvvk', '.kkkkkkkkkkkkkk.',
  ], Q);
  // lever (2 frames 16x12): a red knob on a steel arm in a steel base
  const leverUp = ['................', '..kk............', '.krrk...........', '.kRrk...........', '..kkWk..........', '....kWk.........', '.....kWk........', '......kWk.......'];
  const leverBase = ['...kkkkkkkkkk...', '..kWWWWWWWWWgk..', '..kGGGGGGGGGdk..', '...kkkkkkkkkk...'];
  framesTex(scene, 'lever', [[...leverUp, ...leverBase], [...leverUp.map((row) => [...row].reverse().join('')), ...leverBase]], Q);
  // pushable ball (10x10)
  gridTex(scene, 'ball', ['..kkkkkk..', '.kwwWWWWk.', 'kwwWWWWWgk', 'kwWWWWWWgk', 'kWWWWWWggk', 'kWWWWWWggk', 'kWWWWWgggk', 'kgWWggggGk', '.kggggGGk.', '..kkkkkk..'], Q);
  // plank (12x6) carried by the fixer bots
  gridTex(scene, 'plank', ['kkkkkkkkkkkk', 'kbbbbbbbbbbk', 'kBBBBnBBBBBk', 'kBBBBBBBnBBk', 'knnnnnnnnnnk', 'kkkkkkkkkkkk'], Q);
  // candle (2 frames 8x10) for the memorial: wax on a brass dish
  const candleBody = ['..kNk...', '.kuuUk..', '.kuuUk..', '.kuuUk..', '.kuuUk..', 'kYYYYOk.', 'kkkkkkk.'];
  framesTex(scene, 'candle', [['...y....', '..yoy...', '..yhy...', ...candleBody], ['....y...', '...yoy..', '..yhy...', ...candleBody]], Q);
  // mirror (32x48)
  canvasTex(scene, 'mirror', 32, 48, (c) => {
    rect(c, '#c8ccdc', 0, 0, 32, 48);
    rect(c, '#8088a8', 2, 2, 28, 44);
    rect(c, '#0c1030', 4, 4, 24, 40);
    const g = c.createLinearGradient(4, 4, 28, 44);
    g.addColorStop(0, 'rgba(160,170,255,0.35)');
    g.addColorStop(1, 'rgba(10,10,40,0)');
    c.fillStyle = g;
    c.fillRect(4, 4, 24, 40);
    line(c, '#ffffff', 8, 10, 12, 6);
    line(c, '#ffffff', 8, 14, 15, 7);
    rect(c, '#c8ccdc', 12, 46, 8, 2);
  });
  // plant (16x12): a leafy sprout in a terracotta pot
  gridTex(scene, 'plant', [
    '.......kk.......', '....kk.keEk.kk..', '...keEkkeEkkeEk.', '...kEeEkeEkEeEk.', '....kEEkEEkEEk..', '.....kkEEEEkk...',
    '.......kEEk.....', '....kkkkkkkk....', '....kxxxxxXk....', '....kXXXXXXk....', '.....kXXXXk.....', '.....kkkkkk.....',
  ], Q);
  // map table (48x32): a little road network on parchment, its one bottleneck glowing
  canvasTex(scene, 'maptable', 48, 32, (c) => {
    rect(c, Q.k, 0, 3, 48, 26); rect(c, Q.B, 1, 4, 46, 24); rect(c, Q.b, 1, 4, 46, 1); rect(c, Q.n, 1, 25, 46, 2); rect(c, Q.N, 1, 27, 46, 1);
    rect(c, Q.k, 3, 6, 42, 19); rect(c, '#e8dcb8', 4, 7, 40, 17); rect(c, '#cfc29a', 4, 23, 40, 1);
    for (const [a, b, d, e] of [[6, 10, 20, 10], [6, 10, 6, 22], [6, 22, 20, 22], [20, 10, 20, 22], [13, 10, 13, 22], [6, 16, 20, 16], [20, 16, 30, 16]])
      line(c, '#6a5a48', a, b, d, e);
    for (const [a, b, d, e] of [[30, 16, 40, 12], [30, 16, 40, 22], [40, 12, 40, 22]]) line(c, '#6a5a48', a, b, d, e);
    rect(c, '#ff8c1a', 36, 9, 7, 14);
    c.globalAlpha = 0.35;
    rect(c, '#ff4000', 33, 8, 11, 16);
    c.globalAlpha = 1;
    rect(c, Q.k, 2, 28, 5, 4); rect(c, Q.N, 3, 28, 3, 3); rect(c, Q.k, 41, 28, 5, 4); rect(c, Q.N, 42, 28, 3, 3);
  });
  // shop counter (48x16): a lit wooden top, panelled front with a brass strip
  canvasTex(scene, 'counter', 48, 16, (c) => {
    rect(c, Q.k, 0, 0, 48, 16);
    rect(c, Q.b, 1, 1, 46, 3); rect(c, '#f0c088', 1, 1, 46, 1);
    rect(c, Q.B, 1, 5, 46, 10); rect(c, Q.Y, 1, 6, 46, 1); rect(c, Q.n, 1, 7, 46, 1);
    for (let i = 8; i < 48; i += 8) { rect(c, Q.n, i, 8, 1, 6); rect(c, Q.b, i + 1, 8, 1, 6); }
    rect(c, Q.N, 1, 14, 46, 1);
  });
  // gate (exit): glowing doorway 32x32
  canvasTex(scene, 'gate', 32, 32, (c) => {
    rect(c, '#ffffff', 0, 0, 32, 32);
    rect(c, '#000000', 2, 2, 28, 30);
    const g = c.createLinearGradient(0, 32, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    c.fillStyle = g;
    c.fillRect(4, 4, 24, 28);
  });
  // wall decorations, drawn into the wall face (their top two rows stay clear of the wall's lip)
  // a small arched window glowing with warm light
  gridTex(scene, 'decor-window', [
    '............', '............', '....kkkk....', '..kkhhaakk..', '.khhaaaaAAk.', '.khaaaaaaAk.', 'khaaaakaaaAk', 'khaaaakaaaAk',
    'kaaaaakaaaAk', 'kkkkkkkkkkkk', 'kaaaaakaaaAk', 'kaaaaakaaaAk', 'kAaaaakaaaAk', 'kAaaaakaaAAk', 'kAAaaakaAAAk', 'kAAAAAkAAAAk',
    'kkkkkkkkkkkk', 'kbbbbbbbbbBk', 'knnnnnnnnnnk', '.kkkkkkkkkk.',
  ], Q);
  // a vine spilling down the wall, tangled with an old cable
  canvasTex(scene, 'decor-vine', 10, 26, (c) => {
    rect(c, Q.k, 6, 2, 3, 18); rect(c, Q.d, 7, 2, 1, 17); rect(c, Q.k, 6, 19, 3, 3); rect(c, Q.X, 7, 20, 1, 1);
    const stem = (y: number) => 3 + Math.round(Math.sin(y / 3) * 1.4);
    for (let y = 2; y < 24; y++) rect(c, Q.k, stem(y) - 1, y, 3, 1);
    for (let y = 2; y < 24; y++) rect(c, Q.f, stem(y), y, 1, 1);
    for (let y = 3; y < 23; y += 3) {
      const x = stem(y), right = (y / 3) % 2 === 1;
      const lx = right ? x + 1 : x - 3;
      rect(c, Q.k, lx - 1, y - 1, 5, 4);
      rect(c, Q.E, lx, y, 3, 2); rect(c, Q.e, right ? lx + 1 : lx, y, 2, 1);
    }
  });
  // an old status panel: LEDs over a vent
  gridTex(scene, 'decor-panel', [
    '............', '............', 'kkkkkkkkkkkk', 'kWWWWWWWWWgk', 'kWkkkkkkkkgk', 'kWkeDaDrDkgk', 'kWkkkkkkkkgk', 'kWdGdGdGdGgk',
    'kWGdGdGdGdgk', 'kWdGdGdGdGgk', 'kgggggggggGk', 'kkkkkkkkkkkk',
  ], Q);
  // a little wall shelf with two glowing jars and a sprout
  canvasTex(scene, 'decor-shelf', 14, 12, (c) => {
    rect(c, Q.k, 0, 8, 14, 3); rect(c, Q.b, 1, 9, 12, 1); rect(c, Q.n, 1, 10, 12, 1); rect(c, Q.k, 2, 11, 2, 1); rect(c, Q.k, 10, 11, 2, 1);
    rect(c, Q.k, 1, 3, 5, 6); rect(c, '#ff9ad8', 2, 4, 3, 4); rect(c, '#fff0f8', 2, 4, 1, 2); rect(c, '#c05a9a', 4, 5, 1, 3); rect(c, Q.k, 2, 2, 3, 1);
    rect(c, Q.k, 8, 3, 5, 6); rect(c, Q.c, 9, 4, 3, 4); rect(c, Q.w, 9, 4, 1, 2); rect(c, Q.C, 11, 5, 1, 3); rect(c, Q.k, 9, 2, 3, 1);
    rect(c, Q.k, 6, 5, 2, 4); rect(c, Q.X, 6, 6, 2, 2); rect(c, Q.e, 6, 3, 1, 2); rect(c, Q.E, 7, 4, 1, 1);
  });
  // crack in a wall (16x16)
  gridTex(scene, 'crack', ['........', '...#....', '...##...', '....#...', '...##...', '..#..#..', '..#...#.', '........'], { '#': '#000000' }, 2);
  // tiny crown pickup (sparkles drawn by the room)
  gridTex(scene, 'crown-pickup', MINI_CROWN, CROWN_PAL);
  // lab freeway mini-screen (wall art 32x16)
  canvasTex(scene, 'screen', 32, 16, (c) => {
    rect(c, Q.k, 0, 0, 32, 16); rect(c, '#c8ccd4', 1, 1, 30, 14); rect(c, '#eef0f4', 1, 1, 30, 1); rect(c, '#8a909c', 1, 14, 30, 1);
    rect(c, Q.k, 2, 2, 28, 12); rect(c, '#06121f', 3, 3, 26, 10);
    for (let i = 0; i < 3; i++) rect(c, '#1c2a3c', 3, 5 + i * 3, 26, 1);
    for (const [x, y, col] of [[5, 4, C.green], [10, 4, C.green], [14, 7, C.red], [16, 7, C.red], [18, 7, C.orange], [24, 10, C.green]] as const)
      rect(c, col, x, y, 2, 1);
    rect(c, '#5ac85a', 27, 14, 2, 1);
  });
}
