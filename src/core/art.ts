// Every texture in the game is generated here at runtime from code: string grids (like ut.py) or tiny canvas drawings.
// Nothing is downloaded. All designs are original.
import Phaser from 'phaser';
import { GLYPHS, GLYPH_CHARS, MINI, CELL_H } from './glyphs';
import { C, THEMES, type Theme } from './palette';

export const TILE = 16;
type Ctx = CanvasRenderingContext2D;

// ───────────────────────── helpers ─────────────────────────
function rng(seed: number) {
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
function rect(c: Ctx, col: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}
function line(c: Ctx, col: string, x0: number, y0: number, x1: number, y1: number) {
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

export function buildTileset(scene: Phaser.Scene, themeId: string): string {
  const key = 'tiles-' + themeId;
  const th: Theme = THEMES[themeId] ?? THEMES.hub;
  canvasTex(scene, key, 32 * TILE, TILE, (c) => {
    const at = (i: number) => i * TILE;
    const R = rng(themeId.length * 977 + 13);
    // floor: flat, lighter than the walls, with faint seams; the alt tile has a small crack
    const floor = (x: number, alt: boolean) => {
      rect(c, th.floor[0], x, 0, 16, 16);
      for (let i = 0; i < 4; i++) rect(c, th.floor[1], x + 1 + Math.floor(R() * 14), 1 + Math.floor(R() * 14), 2, 1);
      rect(c, th.floor[2], x, 15, 16, 1);
      rect(c, th.floor[2], x + 15, 0, 1, 16);
      if (alt) {
        line(c, th.floor[2], x + 4, 4, x + 7, 7);
        line(c, th.floor[2], x + 7, 7, x + 6, 11);
        line(c, th.floor[2], x + 7, 7, x + 11, 8);
      }
    };
    floor(at(T.FLOOR), false);
    floor(at(T.FLOOR2), true);
    // carpet: deep colour, darker border, a thread of accent near the edge
    {
      const x = at(T.CARPET);
      rect(c, th.carpet[0], x, 0, 16, 16);
      for (let i = 0; i < 16; i += 4) rect(c, th.carpet[1], x + i + 2, 6, 1, 4), rect(c, th.carpet[1], x + 6, i + 2, 4, 1);
      rect(c, th.carpet[2] + '66', x + 7, 7, 2, 2);
    }
    // lower wall face: flat panel, faint panel seam, dark baseboard, black foot
    {
      const x = at(T.WALLFACE);
      rect(c, th.wallFace[0], x, 0, 16, 16);
      rect(c, th.wallFace[1], x + 15, 0, 1, 12);
      rect(c, th.wallFace[1], x, 11, 16, 4);
      rect(c, th.wallFace[2] + '55', x, 11, 16, 1);
      rect(c, '#000000', x, 15, 16, 1);
    }
    // upper wall face: flat panel crowned by a cornice
    {
      const x = at(T.FACE_UP);
      rect(c, th.wallFace[0], x, 0, 16, 16);
      rect(c, '#000000', x, 0, 16, 1);
      rect(c, th.wallFace[2], x, 1, 16, 2);
      rect(c, th.wallFace[1], x, 3, 16, 2);
      rect(c, th.wallFace[1], x + 15, 5, 1, 11);
    }
    // door: a dark doorway with a frame
    {
      const x = at(T.DOOR);
      rect(c, th.wallFace[1], x, 0, 16, 16);
      rect(c, '#000000', x + 2, 2, 12, 14);
      rect(c, th.wallFace[2] + '88', x + 1, 1, 14, 1);
    }
    // chasm + ledge
    {
      const x = at(T.CHASM);
      rect(c, '#000000', x, 0, 16, 16);
      rect(c, '#1a2a4a', x + 3, 5, 1, 1);
      rect(c, '#1a2a4a', x + 11, 12, 1, 1);
      const l = at(T.LEDGE);
      rect(c, '#000000', l, 0, 16, 16);
      rect(c, th.wallFace[0], l, 0, 16, 4);
      rect(c, th.wallFace[1], l, 4, 16, 2);
      rect(c, th.edge, l, 0, 16, 1);
      for (let i = 0; i < 16; i += 3) rect(c, th.wallFace[1], l + i, 6, 1, 1 + ((i * 7) % 3));
    }
    // bridge plank (vertical boards, ropes on top and bottom)
    {
      const x = at(T.PLANK);
      rect(c, '#000000', x, 0, 16, 16);
      for (let b = 0; b < 4; b++) {
        rect(c, '#8a5a2b', x + b * 4, 2, 3, 12);
        rect(c, '#5c3a1a', x + b * 4, 13, 3, 1);
        rect(c, '#b07a40', x + b * 4, 3, 1, 4);
      }
      rect(c, '#d9c08a', x, 1, 16, 1);
      rect(c, '#d9c08a', x, 14, 16, 1);
      const bx = at(T.BROKEN);
      rect(c, '#000000', bx, 0, 16, 16);
      rect(c, '#d9c08a', bx, 1, 5, 1);
      rect(c, '#d9c08a', bx + 12, 14, 4, 1);
      rect(c, '#5c3a1a', bx, 2, 3, 5);
      rect(c, '#5c3a1a', bx + 13, 9, 3, 4);
    }
    // glow tile (encounter): floor + red rune ring
    {
      const x = at(T.GLOW);
      floor(x, false);
      c.strokeStyle = '#ff3a3a';
      for (const [px, py] of [[4, 2], [11, 2], [13, 7], [11, 13], [4, 13], [2, 7]]) rect(c, '#ff3a3a', x + px, py, 2, 2);
      rect(c, '#ff8080', x + 7, 7, 2, 2);
    }
    // stone (corridor) tile
    {
      const x = at(T.STONE);
      rect(c, th.floor[2], x, 0, 16, 16);
      rect(c, th.floor[0], x + 1, 1, 14, 14);
      rect(c, th.floor[1], x + 2, 2, 12, 12);
    }
    // starfield void
    {
      const x = at(T.STARS);
      rect(c, '#000000', x, 0, 16, 16);
      const r2 = rng(99);
      for (let i = 0; i < 3; i++) rect(c, r2() > 0.5 ? '#ffffff' : '#666688', x + Math.floor(r2() * 16), Math.floor(r2() * 16), 1, 1);
    }
    // wall-top variants: dark fill, with an edge line on every side that touches a walkable tile
    for (let m = 0; m < 16; m++) {
      const x = at(T.WALLTOP + m);
      rect(c, th.wallTop, x, 0, 16, 16);
      rect(c, th.floor[0] + '66', x + 5, 6, 1, 1);
      rect(c, th.floor[0] + '66', x + 12, 11, 1, 1);
      const e = th.edge;
      if (m & 1) rect(c, e, x, 0, 16, 1);
      if (m & 2) rect(c, e, x + 15, 0, 1, 16);
      if (m & 4) rect(c, e, x, 15, 16, 1);
      if (m & 8) rect(c, e, x, 0, 1, 16);
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
export const CROWN = ['#.....#.....#', '##...###...##', '###.#####.###', '#############', '##p##p#p##p##', '#############', 'hhhhhhhhhhhhh'];
const MINI_CROWN = ['k.k.k', 'kkkkk', 'kpkpk'];

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

export function buildSprites(scene: Phaser.Scene) {
  // The overworld SOUL is the profile's chunky 7x6 heart, shown at 2x so its pixels read clearly.
  gridTex(scene, 'soul', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-ghost', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-detailed', SOUL_BIG, { r: C.red, h: '#ff9a9a', d: '#b00000' });
  gridTex(scene, 'soul-small', SOUL_SMALL, { '#': C.red });
  gridTex(scene, 'soul-small-hurt', SOUL_SMALL, { '#': '#ff9a9a' });
  gridTex(scene, 'soul-crown', MINI_CROWN, { k: C.gold, p: C.pink });
  gridTex(scene, 'star', STAR, { '#': C.yellow });
  gridTex(scene, 'crown', CROWN, { '#': C.gold, p: C.pink, h: C.goldDark }, 2);
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

  // pedestal (16x24): stone column with a plate
  canvasTex(scene, 'pedestal', 16, 24, (c) => {
    rect(c, '#9a9ab0', 1, 6, 14, 3);
    rect(c, '#ffffff', 1, 6, 14, 1);
    rect(c, '#6a6a80', 3, 9, 10, 12);
    rect(c, '#8a8aa0', 4, 9, 2, 12);
    rect(c, '#9a9ab0', 1, 20, 14, 4);
    rect(c, '#55556a', 1, 23, 14, 1);
  });
  // sign post (16x16)
  canvasTex(scene, 'sign', 16, 16, (c) => {
    rect(c, '#5c3a1a', 7, 9, 2, 7);
    rect(c, '#ffffff', 1, 1, 14, 9);
    rect(c, '#8a5a2b', 2, 2, 12, 7);
    rect(c, '#d9c08a', 4, 4, 8, 1);
    rect(c, '#d9c08a', 4, 6, 6, 1);
  });
  // pillar (16x32)
  canvasTex(scene, 'pillar', 16, 32, (c) => {
    rect(c, '#000000', 0, 0, 16, 32);
    rect(c, '#ffffff', 1, 0, 14, 3);
    rect(c, '#3a3a50', 3, 3, 10, 26);
    rect(c, '#55556e', 4, 3, 2, 26);
    rect(c, '#ffffff', 1, 29, 14, 3);
    rect(c, '#000000', 2, 30, 12, 1);
  });
  // bookshelf (16x32); a variant with a book sticking out
  const shelf = (out: boolean) => (c: Ctx) => {
    rect(c, '#2a1a0c', 0, 0, 16, 32);
    rect(c, '#5c3a1a', 0, 0, 16, 2);
    rect(c, '#5c3a1a', 0, 0, 1, 32);
    rect(c, '#5c3a1a', 15, 0, 1, 32);
    const cols = ['#a83232', '#3266a8', '#3a8a4a', '#c8a040', '#7a4aa8', '#c86432', '#dddddd'];
    const R = rng(out ? 7 : 3);
    for (let s = 0; s < 3; s++) {
      const y = 2 + s * 10;
      rect(c, '#5c3a1a', 0, y + 8, 16, 2);
      let x = 1;
      while (x < 15) {
        const w = 1 + Math.floor(R() * 2);
        const h = 5 + Math.floor(R() * 3);
        rect(c, cols[Math.floor(R() * cols.length)], x, y + 8 - h, Math.min(w, 15 - x), h);
        x += w + (R() > 0.8 ? 1 : 0);
      }
    }
    if (out) rect(c, '#ffd700', 6, 13, 3, 7), rect(c, '#ffffff', 6, 13, 3, 1);
  };
  canvasTex(scene, 'shelf', 16, 32, shelf(false));
  canvasTex(scene, 'shelf-odd', 16, 32, shelf(true));
  // trophy (16x20)
  canvasTex(scene, 'trophy', 16, 20, (c) => {
    drawGrid(c, [
      '..kkkkkkkkkkkk..', '.kkwkkkkkkkkkkk.', 'kk.kkkkkkkkkk.kk', 'k..kkkkkkkkkk..k', 'k..kkkkkkkkkk..k',
      '.k.kkkkkkkkkk.k.', '..kkkkkkkkkkkk..', '...kkkkkkkkkk...', '....kkkkkkkk....', '.....kkkkkk.....',
      '......kkkk......', '.......kk.......', '.......kk.......', '......kkkk......', '....hhhhhhhh....',
      '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...',
    ], { k: C.gold, w: '#fff6c0', h: C.goldDark });
  });
  // terminal / monitor (16x24)
  canvasTex(scene, 'terminal', 16, 24, (c) => {
    rect(c, '#d0d0d0', 0, 0, 16, 13);
    rect(c, '#06121f', 1, 1, 14, 11);
    line(c, C.cyan, 2, 9, 5, 6); line(c, C.cyan, 5, 6, 8, 8); line(c, C.yellow, 8, 8, 13, 3);
    rect(c, '#909090', 6, 13, 4, 4);
    rect(c, '#b0b0b0', 2, 17, 12, 6);
    for (let i = 0; i < 5; i++) rect(c, '#606060', 3 + i * 2, 19, 1, 1);
  });
  // lever (2 frames 16x16)
  framesTex(scene, 'lever', [
    ['................', '................', '...w............', '...ww...........', '....ww..........', '.....ww.........',
      '......ww........', '.......ww.......', '....gggggggg....', '....gddddddg....', '....gggggggg....', '................'],
    ['................', '................', '............w...', '...........ww...', '..........ww....', '.........ww.....',
      '........ww......', '.......ww.......', '....gggggggg....', '....gddddddg....', '....gggggggg....', '................'],
  ], { w: C.white, g: '#909090', d: '#404040' });
  // pushable ball (10x10)
  gridTex(scene, 'ball', ['...####...', '.##wwww##.', '.#wwwwww#.', '#wwwwwwgg#', '#wwwwwwgg#', '#wwwwwggg#', '#wwwwgggg#', '.#wggggg#.', '.##gggg##.', '...####...'],
    { '#': '#202020', w: '#ffffff', g: '#a0a0b0' });
  // plank (12x6) carried by the fixer bots
  gridTex(scene, 'plank', ['.bbbbbbbbbb.', 'bbbBbbbbbbbb', 'bbbbbbbbBbbb', 'bbbbbbbbbbbb', 'dddddddddddd', '.dddddddddd.'],
    { b: '#8a5a2b', B: '#b07a40', d: '#5c3a1a' });
  // candle (8x12) for the memorial
  framesTex(scene, 'candle', [
    ['...y....', '..yoy...', '..yoy...', '...o....', '..www...', '..www...', '..www...', '..www...', '..www...', '.ggggg..'],
    ['....y...', '...yoy..', '..yoy...', '...o....', '..www...', '..www...', '..www...', '..www...', '..www...', '.ggggg..'],
  ], { y: C.yellow, o: C.orange, w: '#f0e8d0', g: '#909090' });
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
  // plant (16x16)
  gridTex(scene, 'plant', [
    '......e.........', '....e.e..e......', '...eee.eee......', '..e.eeeee.e.....', '....eeeee.......', '.....eee........',
    '......e.........', '......e.........', '....oooooo......', '....oooooo......', '.....oooo.......', '.....oooo.......',
  ], { e: C.green, o: '#a0522d' });
  // map table (48x32): a little road network (the bottleneck is drawn by the room logic)
  canvasTex(scene, 'maptable', 48, 32, (c) => {
    rect(c, '#5c3a1a', 0, 4, 48, 26);
    rect(c, '#d9d2b0', 2, 6, 44, 20);
    rect(c, '#3a2410', 2, 28, 4, 4);
    rect(c, '#3a2410', 42, 28, 4, 4);
    for (const [a, b, d, e] of [[6, 10, 20, 10], [6, 10, 6, 22], [6, 22, 20, 22], [20, 10, 20, 22], [13, 10, 13, 22], [6, 16, 20, 16], [20, 16, 30, 16]])
      line(c, '#505050', a, b, d, e);
    for (const [a, b, d, e] of [[30, 16, 40, 12], [30, 16, 40, 22], [40, 12, 40, 22]]) line(c, '#505050', a, b, d, e);
    rect(c, '#ff8c1a', 36, 9, 7, 16);
    c.globalAlpha = 0.35;
    rect(c, '#ff4000', 33, 8, 11, 18);
    c.globalAlpha = 1;
  });
  buildLumen(scene);
  // shop counter (48x16)
  canvasTex(scene, 'counter', 48, 16, (c) => {
    rect(c, '#ffffff', 0, 0, 48, 2);
    rect(c, '#6a3a20', 0, 2, 48, 14);
    for (let i = 4; i < 48; i += 8) rect(c, '#4a2810', i, 4, 1, 10);
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
  // wall decorations (original): a dark window, a climbing vine, a lab panel, a little shelf
  canvasTex(scene, 'decor-window', 12, 20, (c) => {
    rect(c, '#000000', 0, 0, 12, 20); rect(c, '#ffffff33', 1, 1, 10, 18); rect(c, '#000000', 2, 2, 8, 16);
    rect(c, '#ffffff22', 3, 3, 2, 5); rect(c, '#000000', 0, 9, 12, 1);
  });
  canvasTex(scene, 'decor-vine', 10, 26, (c) => {
    for (let y = 0; y < 26; y++) {
      const x = 4 + Math.round(Math.sin(y / 3) * 2);
      rect(c, '#000000', x - 1, y, 3, 1); rect(c, '#3a8a3a', x, y, 1, 1);
      if (y % 4 === 1) { rect(c, '#000000', x + 1, y - 1, 4, 3); rect(c, '#5ac05a', x + 2, y, 2, 1); }
      if (y % 4 === 3) { rect(c, '#000000', x - 4, y - 1, 4, 3); rect(c, '#5ac05a', x - 3, y, 2, 1); }
    }
  });
  canvasTex(scene, 'decor-panel', 12, 12, (c) => {
    rect(c, '#000000', 0, 0, 12, 12); rect(c, '#0c1830', 1, 1, 10, 10);
    rect(c, C.cyan, 2, 2, 2, 2); rect(c, C.green, 5, 2, 2, 2); rect(c, C.red, 8, 2, 2, 2);
    rect(c, '#2c4a74', 2, 6, 8, 1); rect(c, '#2c4a74', 2, 8, 6, 1);
  });
  canvasTex(scene, 'decor-shelf', 14, 12, (c) => {
    rect(c, '#000000', 0, 8, 14, 4); rect(c, '#8a5a2b', 1, 9, 12, 2);
    rect(c, '#000000', 2, 1, 5, 8); rect(c, C.pink, 3, 2, 3, 6); rect(c, '#000000', 8, 3, 5, 6); rect(c, C.yellow, 9, 4, 3, 4);
  });
  // crack in a wall (16x16)
  gridTex(scene, 'crack', ['........', '...#....', '...##...', '....#...', '...##...', '..#..#..', '..#...#.', '........'], { '#': '#000000' }, 2);
  // tiny crown pickup (sparkles drawn by the room)
  gridTex(scene, 'crown-pickup', MINI_CROWN, { k: C.gold, p: C.pink }, 2);
  // lab freeway mini-screen (wall art 32x16)
  canvasTex(scene, 'screen', 32, 16, (c) => {
    rect(c, '#d0d0d0', 0, 0, 32, 16);
    rect(c, '#06121f', 1, 1, 30, 14);
    for (let i = 0; i < 4; i++) rect(c, '#334', 2, 4 + i * 3, 28, 1);
    for (const [x, y, col] of [[4, 3, C.green], [9, 3, C.green], [14, 6, C.red], [16, 6, C.red], [18, 6, C.orange], [24, 9, C.green]] as const)
      rect(c, col, x, y, 2, 1);
  });
}

// ───────────────────────── Lumen, the shopkeeper (original character) ─────────────────────────
// A merchant whose head is a brass lantern with a friendly flame inside. Flat colours, black outlines.
// Portrait frames: 0 idle, 1 flame flicker, 2 blink, 3 talking.
const K = '#000000', BR = '#c89b3c', BRD = '#8a6420', GL = '#2a1a0a', FO = '#ff8a1a', FM = '#ffd23a', FC = '#fff4c0';
const CL = '#4a2a7a', CLD = '#2e1850', SC = '#c8343a', WH = '#f2f2f2';

function drawLumenPortrait(c: Ctx, ox: number, frame: number) {
  const r = (x: number, y: number, w: number, h: number, col: string) => rect(c, col, ox + x, y, w, h);
  // handle ring
  r(20, 0, 8, 6, K); r(21, 1, 6, 4, BR); c.clearRect(ox + 23, 2, 2, 2);
  // cap (trapezoid)
  [[18, 29], [16, 31], [14, 33], [13, 34], [13, 34]].forEach(([a, b], i) => {
    r(a - 1, 6 + i, b - a + 3, 1, K);
    if (i > 0) r(a, 6 + i, b - a + 1, 1, i === 4 ? BRD : BR);
  });
  // glass box with brass posts and a warm glow
  r(12, 11, 24, 23, K);
  r(13, 11, 22, 22, GL);
  r(16, 12, 16, 20, '#3e2610');
  r(18, 14, 12, 16, '#55341a');
  r(13, 11, 2, 22, BR); r(33, 11, 2, 22, BR); r(15, 11, 1, 22, K); r(32, 11, 1, 22, K);
  // the flame: a teardrop, three tones
  const half = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 5, 4];
  half.forEach((h, i) => {
    const y = 13 + i;
    const sway = frame === 1 && i < 5 ? 1 : 0;
    const cx = 24 + sway;
    r(cx - h, y, h * 2, 1, FO);
    if (h > 1) r(cx - h + 1, y, h * 2 - 2, 1, FM);
    if (h > 3 && i > 8) r(cx - h + 3, y, h * 2 - 6, 1, FC);
  });
  // face
  if (frame === 2) { r(20, 22, 2, 1, K); r(26, 22, 2, 1, K); }
  else { r(20, 21, 2, 2, K); r(26, 21, 2, 2, K); r(20, 21, 1, 1, '#ffffff'); r(26, 21, 1, 1, '#ffffff'); }
  r(18, 24, 1, 1, '#ff5a3a'); r(29, 24, 1, 1, '#ff5a3a');
  if (frame === 3) { r(22, 25, 4, 3, K); r(23, 27, 2, 1, '#c8343a'); }
  else { r(21, 25, 1, 1, K); r(22, 26, 4, 1, K); r(26, 25, 1, 1, K); }
  // base
  r(12, 33, 24, 3, K); r(13, 33, 22, 1, BR); r(13, 34, 22, 1, BRD);
  // cloak (widening), with a red scarf and brass buttons
  for (let y = 36; y < 56; y++) {
    const hw = Math.round(9 + (y - 36) * 0.62);
    r(24 - hw - 1, y, hw * 2 + 2, 1, K);
    r(24 - hw, y, hw * 2, 1, CL);
    r(24 - hw, y, 3, 1, CLD);
  }
  r(14, 36, 20, 3, SC); r(13, 36, 1, 3, K); r(34, 36, 1, 3, K); r(14, 39, 20, 1, K);
  r(29, 39, 3, 6, SC); r(28, 39, 1, 6, K); r(32, 39, 1, 6, K); r(29, 45, 3, 1, K);
  for (const by of [42, 47, 52]) { r(23, by, 2, 2, BR); r(23, by + 1, 2, 1, BRD); }
  r(3, 55, 42, 1, K);
}
function drawLumenHands(c: Ctx) {
  const glove = (x: number) => {
    rect(c, K, x, 0, 9, 7); rect(c, WH, x + 1, 1, 7, 5);
    rect(c, K, x + 3, 1, 1, 2); rect(c, K, x + 5, 1, 1, 2);
  };
  glove(4); glove(35);
}
function drawLumenSmall(c: Ctx, ox: number, frame: number) {
  const r = (x: number, y: number, w: number, h: number, col: string) => rect(c, col, ox + x, y, w, h);
  r(7, 0, 2, 1, K); r(6, 1, 4, 1, BR);
  r(3, 2, 10, 2, K); r(4, 2, 8, 1, BR); r(4, 3, 8, 1, BRD);
  r(3, 4, 10, 8, K); r(4, 4, 8, 7, GL); r(4, 4, 1, 7, BR); r(11, 4, 1, 7, BR);
  r(6 + (frame ? 1 : 0), 5, 3, 1, FO); r(6, 6, 4, 4, FO); r(7, 7, 2, 3, FM);
  r(6, 7, 1, 1, K); r(9, 7, 1, 1, K);
  r(3, 11, 10, 1, K);
  for (let y = 12; y < 24; y++) {
    const hw = Math.round(4 + (y - 12) * 0.32);
    r(8 - hw - 1, y, hw * 2 + 2, 1, K);
    r(8 - hw, y, hw * 2, 1, CL);
  }
  r(5, 12, 6, 1, SC);
  r(7, 15, 2, 1, BR); r(7, 18, 2, 1, BR);
}
function buildLumen(scene: Phaser.Scene) {
  if (scene.textures.exists('lumen-big')) return;
  canvasTex(scene, 'lumen-big', 48 * 4, 56, (c) => { for (let f = 0; f < 4; f++) drawLumenPortrait(c, f * 48, f); });
  const t = scene.textures.get('lumen-big');
  for (let f = 0; f < 4; f++) t.add(f, 0, f * 48, 0, 48, 56);
  canvasTex(scene, 'lumen-hands', 48, 7, drawLumenHands);
  canvasTex(scene, 'lumen', 32, 24, (c) => { drawLumenSmall(c, 0, 0); drawLumenSmall(c, 16, 1); });
  const s = scene.textures.get('lumen');
  s.add(0, 0, 0, 0, 16, 24);
  s.add(1, 0, 16, 0, 16, 24);
}

// ───────────────────────── encounter monsters (original designs) ─────────────────────────
// Classic battle-sprite style: white silhouettes on black, bold black features, one accent colour each.
// Each texture has 2 idle frames side by side (64x64 each), shown at 3x.
const EW = 64, EH = 64;
function ellipseRows(cx: number, cy: number, rx: number, ry: number, cb: (y: number, x0: number, x1: number) => void) {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const dx = rx * Math.sqrt(1 - dy * dy);
    cb(y, Math.round(cx - dx), Math.round(cx + dx));
  }
}
function disc(c: Ctx, col: string, cx: number, cy: number, rx: number, ry = rx) {
  ellipseRows(cx, cy, rx, ry, (y, a, b) => rect(c, col, a, y, b - a, 1));
}
function thick(c: Ctx, col: string, x0: number, y0: number, x1: number, y1: number) {
  line(c, col, x0, y0, x1, y1);
  line(c, col, x0 + 1, y0, x1 + 1, y1);
}
/** 3 frames: two idle frames and a hurt frame (f = 2). */
function enemyTex(scene: Phaser.Scene, key: string, draw: (c: Ctx, f: number) => void, w = EW, h = EH) {
  if (scene.textures.exists(key)) return;
  canvasTex(scene, key, w * 3, h, (c) => {
    for (let f = 0; f < 3; f++) {
      c.save();
      c.translate(f * w, 0);
      draw(c, f);
      c.restore();
    }
  });
  const t = scene.textures.get(key);
  for (let f = 0; f < 3; f++) t.add(f, 0, f * w, 0, w, h);
}
/** X-shaped "ouch" eye. */
function ouch(c: Ctx, x: number, y: number, col = '#000000') {
  for (let i = 0; i < 5; i++) { rect(c, col, x + i, y + i, 1, 1); rect(c, col, x + 4 - i, y + i, 1, 1); }
}

export function buildEnemies(scene: Phaser.Scene) {
  const W = '#ffffff', B = '#000000';

  // OVERFIT: a nervous blob whose jagged top edge touches every training point.
  enemyTex(scene, 'enemy-overfit', (c, f) => {
    const cx = 36, cy = 40, rx = 20, ry = 15; // shifted right so the flashcard stays inside this frame
    const peaks: [number, number][] = [];
    ellipseRows(cx, cy, rx, ry, () => undefined);
    for (let x = cx - rx; x <= cx + rx; x++) {
      const t = (x - cx) / rx;
      const bottom = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - t * t)));
      const k = Math.floor((x - (cx - rx)) / 5);
      const phase = (x - (cx - rx)) % 5;
      const amp = k % 2 ? 7 : 0;
      const top = Math.round(cy - 6 - amp + (k % 2 ? phase : 4 - phase) * (k % 2 ? 1.2 : -0.4) - (f && k % 3 === 0 ? 1 : 0));
      rect(c, W, x, top, 1, bottom - top);
      if (phase === 2 && k % 2) peaks.push([x, top]);
    }
    for (const [x, y] of peaks) { rect(c, C.yellow, x - 1, y - 6, 3, 3); line(c, '#806000', x, y - 3, x, y - 1); }
    // eyes darting sideways (X eyes when hurt)
    const look = f === 1 ? 2 : -1;
    for (const ex of [cx - 8, cx + 4]) {
      if (f === 2) ouch(c, ex, cy - 3);
      else { rect(c, B, ex - 1, cy - 4, 8, 8); rect(c, W, ex, cy - 3, 6, 6); rect(c, B, ex + 2 + look, cy - 1, 2, 3); }
    }
    // wobbly mouth
    [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1], [6, 0]].forEach(([dx, dy]) => rect(c, B, cx - 3 + dx, cy + 7 + dy, 1, 1));
    // sweat drop
    disc(c, C.cyan, cx + rx - 2, cy - 6 + (f ? 3 : 0), 2, 3);
    // stubby feet
    rect(c, W, cx - 12, cy + ry - 1, 7, 4); rect(c, W, cx + 5, cy + ry - 1, 7, 4); rect(c, B, cx - 12, cy + ry, 7, 1); rect(c, B, cx + 5, cy + ry, 7, 1);
    // clutching a flashcard
    thick(c, W, cx - rx + 2, cy + 2, cx - rx - 6, cy + 6 - f);
    rect(c, W, cx - rx - 13, cy + 1 - f, 9, 11); rect(c, B, cx - rx - 11, cy + 4 - f, 5, 1); rect(c, B, cx - rx - 11, cy + 7 - f, 4, 1);
  });

  // LEAKAGE: a sly hourglass whose sand flows UP, from the future into the past.
  enemyTex(scene, 'enemy-leakage', (c, f) => {
    const cx = 32;
    rect(c, W, cx - 16, 4, 32, 5); rect(c, B, cx - 14, 6, 28, 1);
    rect(c, W, cx - 16, 55, 32, 5); rect(c, B, cx - 14, 57, 28, 1);
    rect(c, W, cx - 15, 9, 2, 46); rect(c, W, cx + 13, 9, 2, 46);
    for (let y = 9; y < 55; y++) {
      const t = Math.abs(y - 32) / 23;
      const hw = Math.max(2, Math.round(12 * t + 1));
      rect(c, W, cx - hw - 1, y, 1, 1);
      rect(c, W, cx + hw, y, 1, 1);
    }
    // sand in the bottom bulb, and a stream rising through the neck into the top bulb
    for (let y = 44; y < 55; y++) { const hw = Math.round(12 * ((y - 32) / 23)); rect(c, C.cyan, cx - hw, y, hw * 2, 1); }
    for (let y = 22 + f * 2; y < 44; y += 4) rect(c, C.cyan, cx - 1, y, 2, 2);
    for (let y = 10; y < 14; y++) rect(c, C.cyan, cx - 9 + (y - 10), y, 18 - 2 * (y - 10), 1);
    // sly face on the top bulb (X eyes when hurt)
    if (f === 2) { ouch(c, cx - 8, 16, W); ouch(c, cx + 3, 16, W); }
    else { rect(c, W, cx - 8, 18, 5, 2); rect(c, W, cx + 3, 18, 5, 2); rect(c, B, cx - 7, 19, 3, 1); rect(c, B, cx + 4, 19, 3, 1); }
    [[0, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 0]].forEach(([dx, dy]) => rect(c, W, cx - 3 + dx, 24 + dy, 1, 1));
    // crack and drips
    line(c, W, cx + 9, 14, cx + 11, 17); line(c, W, cx + 11, 17, cx + 9, 20);
    disc(c, C.cyan, cx + 17, 22 + (f ? 6 : 0), 1.5, 2.5);
    disc(c, C.cyan, cx + 18, 34 + (f ? 6 : 0), 1.5, 2.5);
    // arm holding an "A+" answer sheet
    thick(c, W, cx - 15, 30, cx - 22, 26 - f);
    rect(c, W, cx - 31, 18 - f, 11, 13);
    drawGrid(c, ['.#..', '#.#.', '###.', '#.#.'], { '#': B }, cx - 29, 21 - f);
    drawGrid(c, ['.#.', '###', '.#.'], { '#': B }, cx - 25, 22 - f);
  });

  // EXPLODING GRADIENT: a furious little vector with a nabla on its belly; its arrows keep growing.
  enemyTex(scene, 'enemy-gradient', (c, f) => {
    const cx = 32, cy = 32, r = 13 + f;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const len = r + 9 + f * 4 + (k % 2) * 3;
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
      thick(c, W, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), ex, ey);
      const hx = Math.cos(a + 2.6) * 4, hy = Math.sin(a + 2.6) * 4, gx = Math.cos(a - 2.6) * 4, gy = Math.sin(a - 2.6) * 4;
      line(c, C.orange, ex, ey, ex + hx, ey + hy);
      line(c, C.orange, ex, ey, ex + gx, ey + gy);
    }
    disc(c, W, cx, cy, r);
    // nabla on the belly
    for (let i = 0; i < 6; i++) rect(c, C.orange, cx - 5 + i, cy + 4 + i, 11 - 2 * i, 1);
    rect(c, W, cx - 3, cy + 5, 7, 1);
    // angry brows, eyes, gritted teeth (X eyes when hurt)
    line(c, B, cx - 9, cy - 8, cx - 3, cy - 5); line(c, B, cx + 9, cy - 8, cx + 3, cy - 5);
    if (f === 2) { ouch(c, cx - 8, cy - 5); ouch(c, cx + 3, cy - 5); }
    else { rect(c, B, cx - 7, cy - 4, 3, 3); rect(c, B, cx + 4, cy - 4, 3, 3); }
    rect(c, B, cx - 6, cy + 1, 12, 3); for (let i = 0; i < 6; i++) rect(c, W, cx - 5 + i * 2, cy + 1 + (i % 2), 1, 1);
    if (f) { line(c, C.orange, cx + r - 3, cy - 6, cx + r + 1, cy - 9); line(c, C.orange, cx - r + 3, cy + 6, cx - r - 1, cy + 9); }
  });
  // THE LEADERBOARD (boss): a towering scoreboard with a face, a crown of score-ticks and two foam "#1" hands
  enemyTex(scene, 'enemy-board', (c, f) => {
    const Y = '#ffd23a', G2 = '#5a5a68';
    // foam-finger hands, waving
    const hand = (x: number, y: number) => { rect(c, B, x - 1, y - 1, 12, 16); rect(c, W, x, y, 10, 14); rect(c, B, x + 3, y - 8, 4, 9); rect(c, W, x + 4, y - 7, 2, 7); drawGrid(c, ['.#', '##', '.#', '.#'], { '#': B }, x + 4, y + 4); };
    hand(2, 30 + (f === 1 ? -3 : 0));
    hand(68, 30 + (f === 1 ? 0 : -3));
    // the board
    rect(c, W, 12, 6, 56, 48); rect(c, B, 14, 8, 52, 44);
    // score rows (they reshuffle every frame)
    const rows = f === 1 ? [40, 22, 34, 14] : f === 2 ? [10, 10, 10, 10] : [34, 40, 22, 28];
    rows.forEach((w, i) => {
      const y = 26 + i * 6;
      rect(c, i === 0 ? Y : G2, 17, y, 4, 3);
      rect(c, i === 0 ? Y : W, 23, y, w, 3);
    });
    // face across the top of the board
    if (f === 2) { ouch(c, 24, 12, W); ouch(c, 50, 12, W); }
    else { rect(c, W, 22, 12, 9, 7); rect(c, W, 49, 12, 9, 7); rect(c, B, 25 + (f ? 2 : 0), 14, 3, 4); rect(c, B, 52 + (f ? 2 : 0), 14, 3, 4); line(c, W, 21, 10, 30, 12); line(c, W, 59, 10, 50, 12); }
    // crown of score ticks
    for (let i = 0; i < 5; i++) rect(c, Y, 20 + i * 10, 2 - (i % 2) * 2, 4, 5);
    // stand
    rect(c, W, 36, 54, 8, 6); rect(c, W, 26, 59, 28, 3);
  }, 80, 64);
  gridTex(scene, 'att-eye', ['..kkkkkkk..', '.kwwwwwwwk.', 'kwwwkkkwwwk', 'kwwkrrrkwwk', 'kwwwkkkwwwk', '.kwwwwwwwk.', '..kkkkkkk..'], { k: '#000000', w: '#ffffff', r: '#ff2a2a' });
  // bullets
  canvasTex(scene, 'bone', 6, 6, (c) => { rect(c, '#ffffff', 1, 0, 4, 6); rect(c, '#ffffff', 0, 0, 6, 2); rect(c, '#ffffff', 0, 4, 6, 2); });
  canvasTex(scene, 'bone-shaft', 2, 2, (c) => rect(c, '#ffffff', 0, 0, 2, 2));
  gridTex(scene, 'drop', ['..#..', '.###.', '#####', '#####', '.###.'], { '#': C.cyan });
  gridTex(scene, 'pellet', ['.##.', '####', '####', '.##.'], { '#': '#ffffff' });
  gridTex(scene, 'pellet-hot', ['.##.', '####', '####', '.##.'], { '#': C.orange });
}
