// Room props (furniture, plants, machinery, signs on walls...). Same look as the cast: black outlines, flat colours,
// 2-3 shades per material, light from the top-left, a soft contact shadow under things that stand on the floor.
// The world is an underground grown inside old computing machinery, so a lot of the clutter is old hardware.
import Phaser from 'phaser';
import { canvasTex, framesTex, gridTex } from './art';

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// shared palette letters
const P: Record<string, string> = {
  k: '#000000', _: 'rgba(0,0,0,0.28)',
  w: '#ffffff', W: '#d8dce4', g: '#a0a8b4', G: '#6a7480', d: '#454c58', D: '#2a3038', // steel
  s: '#8a98a4', S: '#5e6c78', t: '#3e4a54', // slate
  y: '#ffe14a', Y: '#d8a838', O: '#9a6420', h: '#fff4c0', o: '#ff8a1a', // gold / brass / flame
  a: '#ffc848', A: '#d88a28', // amber light
  r: '#e83a3a', R: '#a01c24', // red
  b: '#d49a5e', B: '#a86a3a', n: '#74441e', N: '#4a2a12', // wood
  c: '#8af0ff', C: '#2aa8c8', // cyan glow
  e: '#7ad860', E: '#3a9a3a', f: '#24642a', // greens
  m: '#ff9ad8', M: '#c05a9a', p: '#b48af0', // pink / violet
  u: '#e8dcc0', U: '#c4b494', v: '#8e8068', // beige plastic
  x: '#e8a060', X: '#a05a28', // copper
  z: '#5a3a24', Z: '#3a2414', // soil
  i: 'rgba(138,240,255,0.35)', I: 'rgba(255,200,72,0.30)', // glows
};

/** Frames from grids, transparent '.' */
const sheet = (s: Phaser.Scene, key: string, frames: string[][]) => framesTex(s, key, frames, P);
/** A canvas sprite sheet of n frames laid out horizontally, named 0..n-1. */
function canvasFrames(s: Phaser.Scene, key: string, fw: number, fh: number, n: number, draw: (c: Ctx, f: number) => void) {
  if (s.textures.exists(key)) return;
  canvasTex(s, key, fw * n, fh, (c) => {
    for (let f = 0; f < n; f++) { c.save(); c.translate(f * fw, 0); draw(c, f); c.restore(); }
  });
  const t = s.textures.get(key);
  for (let f = 0; f < n; f++) t.add(f, 0, f * fw, 0, fw, fh);
}
/** A soft oval contact shadow on the floor. */
const shadow = (c: Ctx, x: number, y: number, w: number) => { r(c, P._, x + 1, y, w - 2, 1); r(c, P._, x, y - 1, w, 1); };

// ───────────────────────── props ─────────────────────────
export function buildProps(s: Phaser.Scene) {
  // a soft pile of old keyboard keys (where you wake up)
  canvasTex(s, 'prop-keys', 40, 18, (c) => {
    const keys = [[2, 9], [8, 6], [14, 8], [20, 5], [26, 8], [32, 9], [5, 12], [11, 11], [17, 12], [23, 11], [29, 12], [14, 3], [20, 1]];
    const legends = ['#5a5a68', '#d8a838', '#e85a3a', '#2aa8c8'];
    shadow(c, 3, 17, 34);
    keys.forEach(([x, y], i) => {
      r(c, P.k, x, y, 7, 6);
      r(c, P.u, x + 1, y + 1, 5, 3); r(c, '#fff8e8', x + 1, y + 1, 4, 1);
      r(c, P.U, x + 5, y + 1, 1, 3); r(c, P.v, x + 1, y + 4, 5, 1);
      r(c, legends[i % 4], x + 3, y + 2, 1, 1);
    });
  });
  // a brazier (2 frames): an iron bowl of embers
  sheet(s, 'prop-brazier', [
    ['...y..y...', '..yoyyoy..', '..yorroy..', '.kkkkkkkk.', '.kWggggGk.', '..kgGGdk..', '...kGdk...', '..kkGdkk..', '.kkkkkkkk.'],
    ['....y.y...', '..yoyyoy..', '..yoorry..', '.kkkkkkkk.', '.kWggggGk.', '..kgGGdk..', '...kGdk...', '..kkGdkk..', '.kkkkkkkk.'],
  ]);
  // a lamppost with a warm lantern
  sheet(s, 'prop-lamp', [[
    '...kkk...', '..kNNNk..', '.kkkkkkk.', '.kahhaAk.', '.kahaaAk.', '.kaaaaAk.', '.kkkkkkk.', '...kNk...', '...kNk...',
    '...kNk...', '...kNk...', '...kNk...', '...kNk...', '...kNk...', '...kNk...', '...kNk...', '..kkNkk..', '.kNNNNNk.',
  ]]);
  // a fountain (2 tiles wide, water shimmers): a stone basin round a column with a little bowl
  canvasTex(s, 'prop-fountain', 32 * 2, 30, (c) => {
    for (let f = 0; f < 2; f++) {
      const ox = f * 32;
      shadow(c, ox + 2, 29, 28);
      r(c, P.k, ox + 1, 14, 30, 14); r(c, P.s, ox + 2, 15, 28, 8); r(c, '#b8c4cc', ox + 2, 15, 28, 1);
      r(c, P.S, ox + 2, 23, 28, 4); r(c, P.t, ox + 2, 26, 28, 1);
      for (let i = 4; i < 30; i += 6) r(c, P.t, ox + i, 23, 1, 3);
      r(c, P.k, ox + 4, 16, 24, 7); r(c, P.C, ox + 5, 17, 22, 5); r(c, '#1a7a98', ox + 5, 17, 22, 1);
      for (let i = 0; i < 5; i++) r(c, P.c, ox + 6 + i * 4 + (f ? 2 : 0), 19 + (i % 2), 2, 1);
      r(c, P.k, ox + 13, 5, 6, 13); r(c, P.s, ox + 14, 6, 4, 11); r(c, '#b8c4cc', ox + 14, 6, 1, 11); r(c, P.S, ox + 17, 6, 1, 11);
      r(c, P.k, ox + 9, 3, 14, 4); r(c, P.s, ox + 10, 4, 12, 2); r(c, '#b8c4cc', ox + 10, 4, 12, 1); r(c, P.C, ox + 12, 4, 8, 1);
      // spray
      r(c, P.c, ox + 15, 0, 2, 3); r(c, P.w, ox + 15, 0, 1, 1);
      r(c, P.c, ox + (f ? 9 : 10), 7, 1, 2); r(c, P.c, ox + (f ? 22 : 21), 7, 1, 2);
      r(c, P.c, ox + (f ? 8 : 9), 10 + f, 1, 1); r(c, P.c, ox + (f ? 23 : 22), 10 + f, 1, 1);
    }
  });
  const fo = s.textures.get('prop-fountain');
  fo.add(0, 0, 0, 0, 32, 30);
  fo.add(1, 0, 32, 0, 32, 30);
  // a bench: two wooden slats on iron legs
  gridTex(s, 'prop-bench', [
    '.kkkkkkkkkkkkkkkkkkkk.', 'kbbbbbbbbbbbbbbbbbbbBk', 'kBBBBBBBBBBBBBBBBBBBnk', 'kkkkkkkkkkkkkkkkkkkkkk', 'kbbbbbbbbbbbbbbbbbbbBk',
    'knnnnnnnnnnnnnnnnnnnnk', 'kkkkkkkkkkkkkkkkkkkkkk', '.kdk..............kdk.',
  ], P);
  // a server rack with blinking lights (2 frames)
  const rack = (l: string[]) => [
    'kkkkkkkkkkkk', 'kWggggggggGk', 'kdkkkkkkkkdk', `kdk${l[0]}DDDDgkdk`, 'kdkkkkkkkkdk', `kdk${l[1]}DDDDgkdk`, 'kdkkkkkkkkdk',
    `kdk${l[2]}DDDDgkdk`, 'kdkkkkkkkkdk', `kdk${l[3]}DDDDgkdk`, 'kdkkkkkkkkdk', 'kdGDGDGDGDdk', 'kddddddddddk', 'kkkkkkkkkkkk', '.kk......kk.',
  ];
  sheet(s, 'prop-rack', [rack(['e', 'c', 'e', 'a']), rack(['c', 'e', 'r', 'e'])]);
  // a steel lab table with beakers of glowing liquid
  gridTex(s, 'prop-beakers', [
    '...kk.........kkkk......', '...kk.........kWWk..kk..', '..kWck........kWek..kk..', '..kcck.......kWeek.kak..', '.kWccck......kWeek.kak..',
    'kkkkkkkkkkkkkkkkkkkkkkkk', 'kWWWWWWWWWWWWWWWWWWWWWWk', 'kggggggggggggggggggggggk', 'kkkkkkkkkkkkkkkkkkkkkkkk', '.kGk................kGk.',
    '.kGk................kGk.', '.kkk................kkk.',
  ], P);
  // a hanging banner on a brass rod, a golden star on red
  gridTex(s, 'prop-banner', [
    'kkkkkkkkkkkk', 'kyYYYYYYYYOk', '.kRrrrrrrRk.', '.krrrrrrrRk.', '.krrrryrrRk.', '.krrryyyrRk.', '.krryyyyyRk.', '.krrryyyrRk.',
    '.krryrrryRk.', '.krrrrrrrRk.', '.kYYYYYYYYk.', '.krrrrrrrRk.', '..krrrrrRk..', '...krrrRk...', '....kkkk....',
  ], P);
  // a slate statue of a hooded scholar holding a scroll
  gridTex(s, 'prop-statue', [
    '......kkk......', '....kksssSkk...', '...kssssSSSSk..', '..ksssktttkSSk.', '..kssktttttkSk.', '..ksSkttttkSSk.', '..ksSSkkkkSSSk.',
    '.ksssSSSSSSSSSk', '.kssWWWWWWkSSSk', '.kskWWgggWWkSSk', '.kssWWWWWWkSSSk', '.kssskkkkkSSSSk', '.ksssSSSSSSSStk', '.ksssSSSSSSSttk',
    '.kssSSSSSSSSttk', 'kkkkkkkkkkkkkkk', 'ksssssssssssSSk', 'kSSSSSSSSSSSttk', 'kkkkkkkkkkkkkkk',
  ], P);
  // a reading table with open books and a candle
  gridTex(s, 'prop-table', [
    '...........y................', '..........kok...............', '..........kuk...kkkkkkkkk...', '..kkkkkkk.kuk..kWWWWkWWWWk..',
    '..kWWWWWk.kUk..kWggWkWggWk..', 'kkkkkkkkkkkkkkkkkkkkkkkkkkkk', 'kbbbbbbbbbbbbbbbbbbbbbbbbbBk', 'knnnnnnnnnnnnnnnnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk', '.kNk....................kNk.', '.kkk....................kkk.',
  ], P);
  // a cobweb for a corner
  gridTex(s, 'prop-web', ['WWW.W.g.g.g', 'W.WW..g..g.', 'W..WWW..g..', '.W.W.gggg..', 'W.g..g.g...', '.g.g.g.g...', 'g..gg.g....', '.g..gg.....', 'g...g......', '.g.g.......', 'gg.........'], P);
  // a shelf of glowing jars (shop)
  gridTex(s, 'prop-jars', [
    '.kk...kk...kk...k.', 'kkkk.kkkk.kkkk.kkk', 'khyk.khck.khmk.kek', 'kyYk.kcCk.kmMk.kEk', 'kkkk.kkkk.kkkk.kkk', 'kkkkkkkkkkkkkkkkkk',
    'kbbbbbbbbbbbbbbbBk', 'knnnnnnnnnnnnnnnnk',
  ], P);
  // a little lantern sign that hangs over the shop door
  gridTex(s, 'prop-shopsign', ['....kk....', '...kNNk...', '..kkkkkk..', '..kahhAk..', '..kahaAk..', '..kaaaAk..', '..kkkkkk..', 'kkkkkkkkkk', 'kbbbbbbbBk', 'kkkkkkkkkk'], P);
  // a light beam from far above (where you wake up)
  canvasTex(s, 'prop-beam', 48, 120, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, 'rgba(220,250,255,0.0)');
    g.addColorStop(1, 'rgba(220,250,255,0.22)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(14, 0); c.lineTo(34, 0); c.lineTo(48, 120); c.lineTo(0, 120); c.closePath(); c.fill();
  });
  // a potato farm patch: neat rows of leafy potato plants in dark soil
  gridTex(s, 'prop-potato', [
    'ZZZZZZZZZZZZZZZZ', 'ZZeZZZZeZZZZeZZZ', 'ZeEeZZeEeZZeEeZZ', 'ZfEfZZfEfZZfEfZZ', 'zzfzzzzfzzzzfzzz', 'ZZZZZZZZZZZZZZZZ',
    'ZZZZeZZZZeZZZZeZ', 'ZZZeEeZZeEeZZeEe', 'ZZZfEfZZfEfZZfEf', 'zzzzfzzzzfzzzzfz', 'ZZZZZZZZZZZZZZZZ', 'ZeZZZZeZZZZeZZZZ',
    'eEeZZeEeZZeEeZZb', 'fEfZZfEfZZfEfZZZ', 'zfzzzzfzzzzfzzzz', 'ZZZZZZZZZZZZZZZZ',
  ], P);
  // a wooden trapdoor with iron bands and a ring
  gridTex(s, 'prop-trapdoor', [
    'kkkkkkkkkkkkkkkk', 'kbbbbbbbbbbbbbBk', 'kBBBBBBBBBBBBBnk', 'kgggggggggggggGk', 'kbbbbbbbbbbbbbBk', 'kBBBBBBkkBBBBBnk', 'kbbbbbkGGkbbbbBk',
    'kBBBBBBkkBBBBBnk', 'kbbbbbbbbbbbbbBk', 'kgggggggggggggGk', 'kbbbbbbbbbbbbbBk', 'knnnnnnnnnnnnnnk', 'kkkkkkkkkkkkkkkk',
  ], P);
  // floor dressing: grass tufts (with a couple of glowing sprout tips) and rubble with a copper scrap
  gridTex(s, 'prop-grass', ['..e....c........', '.eEe..eEe....e..', '.fEf..fEf...eEe.', '..f....f....fEf.', '....c........f..', '...eEe......e...', '...fEf.....eEe..', '....f......fEf..'], P);
  gridTex(s, 'prop-rubble', ['................', '..kk.......kk...', '.kssk.....kxXk..', '.ksSk......kk...', '..kk...kkk......', '......kssSk.....', '......kSSSk..kk.', '.......kkk..kSk.', '.............kk.'], P);

  buildFillers(s);
}

// ───────────────────────── filler props ─────────────────────────
// Small reusable clutter for empty corners. Floor props are 16x16 (stand on a tile, origin bottom-centre); wall props
// hang on the wall face (deco `wall: true`).
function buildFillers(s: Phaser.Scene) {
  // a coil of old cable with a copper plug
  gridTex(s, 'prop-cable-coil', [
    '................', '................', '................', '................',
    '....kkkkkkkk....', '..kkGGGGGGGGkk..', '.kGdkkkkkkkkdGk.', 'kGdkGGGGGGGGkdGk', 'kdkGdkkkkkkdGkdk', 'kdkdk......kdkdk',
    'kdkGdkkkkkkdGkdk', 'kGdkGGGGGGGGkdGk', '.kGdkkkkkkkkdGkk', '..kkGGGGGGGGkxXk', '...kkkkkkkkkkkk.', '..____________..',
  ], P);
  // a wooden crate stencilled with a chip
  gridTex(s, 'prop-crate', [
    '................', '..kkkkkkkkkkkk..', '.kbbbbbbbbbbbbk.', '.kbBBBBBBBBBBbk.', '.kbbbbbbbbbbbbk.', 'kkkkkkkkkkkkkkkk',
    'kBnBBBBBBBBBBnBk', 'kBnBBBnnnnBBBnBk', 'kBnBBnBBBBnBBnBk', 'kBnBBBnnnnBBBnBk', 'kBnBBBBBBBBBBnBk', 'knnnnnnnnnnnnnnk',
    'kBnBBBBBBBBBBnBk', 'kNnNNNNNNNNNNnNk', 'kkkkkkkkkkkkkkkk', '._____________._',
  ], P);
  // an old CRT monitor left on the floor: cracked screen, moss on top
  gridTex(s, 'prop-old-monitor', [
    '................', '................', '...e..ee........', '.kkEkkEekkkkkk..', 'kuuuuuuuuuuuuUk.', 'kukkkkkkkkkkkUk.',
    'kukDDDDDwDDDkUk.', 'kukDDDDwDDDDkUk.', 'kukDDwwDDDcDkUk.', 'kukDwDDDDDDDkUk.', 'kukDDDDDDDDDkUk.', 'kukkkkkkkkkkkUk.',
    'kUUUUUUUUUUrUvk.', 'kvvvvvvvvvvvvvk.', '.kkkkkkkkkkkkk..', '.____________...',
  ], P);
  // a big case fan in its frame (2 frames: the blades turn)
  canvasFrames(s, 'prop-fan', 16, 16, 2, (c, f) => {
    shadow(c, 2, 15, 12);
    r(c, P.k, 1, 1, 14, 14); r(c, P.G, 2, 2, 12, 12); r(c, P.g, 2, 2, 12, 1); r(c, P.g, 2, 2, 1, 12); r(c, P.d, 13, 3, 1, 11); r(c, P.d, 3, 13, 11, 1);
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) r(c, P.D, x, y);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy);
        if (d > 5.6) continue;
        if (d > 4.8) { r(c, P.k, x, y); continue; }
        // four straight blades (an X, then a +), lit on their upper side, dark gaps between them
        let col = P.D;
        for (let k = 0; k < 4; k++) {
          const th = k * Math.PI / 2 + (f ? 0 : Math.PI / 4), ax = Math.cos(th), ay = Math.sin(th);
          const along = dx * ax + dy * ay, across = dx * ay - dy * ax;
          if (along > 0 && Math.abs(across) < 1.3) col = across < -0.2 ? P.W : P.g;
        }
        r(c, d < 1.8 ? P.g : col, x, y);
      }
    }
    r(c, P.k, 7, 7, 2, 2); r(c, P.c, 7, 7);
  });
  // a clump of glowing mushrooms on a mossy patch (2 frames: the glow breathes)
  const shroom = (glow: boolean) => [
    '................', '................', '................', glow ? '....iiiiii......' : '................',
    '....kkkkkk......', '...kcwccCCk.....', '..kcwccccCCk.ii.', '..kkCCCCCCkk.kk.', '...kkkWWkkk.kcck', '.kk..kWWk...kCCk',
    'kcck.kWWk...kkkk', 'kkkk.kWgk....kWk', '.kWk.kWgk....kgk', '.kgkkkkkkk..kkgk', '..eEeeEeeEe.eEe.', '...____________.',
  ].map((row) => (glow ? row : row.replace(/i/g, '.')));
  sheet(s, 'prop-mushrooms', [shroom(false), shroom(true)]);
  // a mossy boulder
  gridTex(s, 'prop-moss-rock', [
    '................', '................', '................', '.....kkkkk......', '...kkeeEeekk....', '..keeEeeeEEek...',
    '.keseeEesSSEek..', '.ksssSeSSSSSSk..', 'kssssSSSSSSSStk.', 'ksSSSSSSSSSSttk.', 'kSSSSSSSSSSttttk', 'kSSSSSSSSSttttk.',
    '.kSSSSSSStttttk.', '..kkttttttttkk..', '....kkkkkkkk....', '..____________..',
  ], P);
  // a giant capacitor standing on its legs
  gridTex(s, 'prop-capacitor', [
    '.....kkkkkk.....', '...kkWgWWgWkk...', '..kWWWgggWWWWk..', '..kgWWWgWWWWgk..', '..kkgggggggggkk.', '..kCcCCCCCCCCdk.',
    '..kcwCCCCCCCCdk.', '..kccCCCCCCCCdk.', '..kcwCCCCCCCCdk.', '..kccCCCCCCCCdk.', '..kcwCCCCCCCCdk.', '..kCcCCCCCCCCdk.',
    '...kkkkkkkkkkk..', '.....kgk.kgk....', '....kgk...kgk...', '...____________.',
  ], P);
  // a slumped pile of floppy disks
  canvasTex(s, 'prop-floppy-pile', 16, 16, (c) => {
    shadow(c, 1, 15, 14);
    const disk = (x: number, y: number, body: string, edge: string) => {
      r(c, P.k, x, y, 11, 5); r(c, body, x + 1, y + 1, 9, 2); r(c, edge, x + 1, y + 3, 9, 1);
      r(c, P.W, x + 3, y + 1, 4, 1); r(c, P.g, x + 3, y + 2, 4, 1);
    };
    disk(4, 10, '#3a6ab8', '#24447a');
    disk(2, 7, '#d84a4a', '#8a2228');
    disk(5, 4, '#3a3a48', '#1e1e28');
    disk(3, 1, '#e8c040', '#a07a18');
    r(c, P.w, 6, 2, 2, 1);
  });
  // a big microchip half sunk in the floor, pins and all
  gridTex(s, 'prop-chip', [
    '................', '................', '................', '..k.k.k.k.k.k...', '..W.W.W.W.W.W...', '.kkkkkkkkkkkkkk.',
    'kWdDDDDDDDDDDDdk', 'kdwDDDDDDDDDDDdk', 'kdDDDgggggDDDDdk', 'kdDDDgDDDgDDDDdk', 'kdDDDgggggDDDDdk', 'kdDDDDDDDDDDDDtk',
    'kttttttttttttttk', '.kkkkkkkkkkkkkk.', '.eE.W.W.W.W.Ee..', '..____________..',
  ], P);
  // two reels of magnetic tape, one lying flat, one on its edge
  gridTex(s, 'prop-tape-reels', [
    '................', '.........kkkk...', '........kGGGGk..', '.......kGkNNkGk.', '.......kGNWWNGk.', '.......kGNWWNGk.',
    '.......kGkNNkGk.', '..kkkkkkkGGGGk..', '.kGGGGGGGkkkk...', 'kGNNNNNNNNGk....', 'kGNNkWWkNNGk....', 'kGNNNNNNNNGk....',
    '.kGGGGGGGGk.....', '.kddddddddk.....', '..kkkkkkkk......', '.__________.....',
  ], P);
  // a lantern post with a flickering warm lamp (16x32, 2 frames)
  const post = (f: number) => [
    '................', '.....kkkkk......', '....kNNNNNk.....', '...kkkkkkkkk....', '...kahhaaaAk....', f ? '...kahhhaaAk....' : '...kahaaaaAk....',
    f ? '...kaahaaaAk....' : '...kaaaaaaAk....', '...kAaaaaAAk....', '...kkkkkkkk.....', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......',
    '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......',
    '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '.....kNNk.......',
    '.....kNNk.......', '.....kNNk.......', '.....kNNk.......', '....kkNNkk......', '...kNNNNNNk.....', '..kNNNNNNNNk....',
    '..kkkkkkkkkk....', '.___________....',
  ].map((row) => row.padEnd(16, '.'));
  sheet(s, 'prop-lantern-post', [post(0), post(1)].map((rows) => rows.map((row) => shiftRight(row, 2))));
  // wall props ----------------------------------------------------------------
  // vines spilling down a wall, tangled with a cable (16x32)
  gridTex(s, 'prop-vines', [
    'kkkkkkkkkkkkkkkk', 'keEeEkdkeEkeEeEk', '.keEk.kdkEkkeEk.', '..kEk.kdk.keEk..', '.keEek.kdkkEk...', '.kEEk..kdkeEk...',
    '..kEk..kdkkEEk..', '..keEk.kdk.kEk..', '...kEk.kdk.keEk.', '..keEEkkdk..kEk.', '..kEk..kdk.keEk.', '.keEk..kdk.kEk..',
    '.kEk...kdk.kEk..', '.keEk..kdkkeEk..', '..kEk..kdk.kEk..', '..kEEk.kdk..kEk.', '...kEk.kxk.keEk.', '...keEkkXk.kEk..',
    '....kEk.k..kEk..', '...keEk...keEk..', '...kEk....kEk...', '..keEk....keEk..', '..kEk......kEk..', '..kEEk.....kEk..',
    '...kEk.....keEk.', '...keEk.....kEk.', '....kEk.....kk..', '....keEk........', '.....kEk........', '.....kek........',
    '......k.........', '................',
  ], P);
  // a heat sink bolted to the wall, one fin bent
  gridTex(s, 'prop-heatsink', [
    '................', '.kkkkkkkkkkkkkk.', 'kWgWgWgWgWgWgWgk', 'kWgWgWgWgWgkgWgk', 'kWgWgWgWgWkdkWgk', 'kWgWgWgWgWgkgWgk',
    'kWgWgWgWgWgWgWgk', 'kWgWgWgWgWgWgWgk', 'kWgWgWgWgWgWgWgk', 'kWgWgWgWgWgWgWgk', 'kGdGdGdGdGdGdGdk', 'kkkkkkkkkkkkkkkk',
    'kgWdkkkkkkkkgWdk', '.kkk......kk.kk.', '................', '................',
  ], P);
  // a strip of status LEDs (2 frames: they blink)
  const leds = (l: string) => [
    '................', '................', '................', '................', '.kkkkkkkkkkkkkk.', `kd${l}dk`,
    'kDDDDDDDDDDDDDDk'.replace(/D/g, 'D'), '.kkkkkkkkkkkkkk.', '................', '................', '................',
    '................', '................', '................', '................', '................',
  ];
  sheet(s, 'prop-led-strip', [leds('eDaDeDrDcDeD'), leds('DDaDeDDDcDDe')]);
}

/** Shift a grid row right by n (keeps its width). */
function shiftRight(row: string, n: number) {
  return ('.'.repeat(n) + row).slice(0, row.length);
}
