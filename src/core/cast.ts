// Original characters, props and cosmetics. Overworld style: black outline, 2-3 shades per colour, chunky proportions,
// 2-4 idle frames. Everything is drawn from string grids or tiny procedures; no image files.
import Phaser from 'phaser';
import { canvasTex, drawGrid, framesTex, gridTex } from './art';

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// shared palette letters
const P = {
  k: '#000000', w: '#ffffff', W: '#d8d8e0', g: '#9a9aa8', G: '#5a5a68',
  y: '#ffd23a', Y: '#c89a10', o: '#ff8a1a', O: '#b85a10', r: '#e83a3a', R: '#a01c24',
  p: '#8a5ac8', q: '#6a3aa8', Q: '#4a2680', b: '#e8d8b0', B: '#b8a070', n: '#7a4a2a', N: '#4a2a14',
  c: '#5ac8ff', C: '#2a7ab8', e: '#5ac85a', E: '#2e8a3a', s: '#c8ccd8', S: '#8a90a0', m: '#f0a0c0', M: '#c06080',
  d: '#3a3a52', D: '#24243a', t: '#2a4a3a', u: '#1e3a2c', h: '#ffeaa0',
};

/** Frames from grids, transparent '.' */
const sheet = (s: Phaser.Scene, key: string, frames: string[][]) => framesTex(s, key, frames, P);

export function buildCast(s: Phaser.Scene) {
  if (s.textures.exists('npc-pip')) return;

  // PIP: a nervous loading spinner with a face (4 frames: the bright dot travels around the ring)
  canvasTex(s, 'npc-pip', 18 * 4, 18, (c) => {
    const ring = [[8, 0], [13, 2], [16, 7], [13, 13], [8, 15], [3, 13], [0, 7], [3, 2]];
    for (let f = 0; f < 4; f++) {
      const ox = f * 18;
      ring.forEach(([x, y], i) => {
        const hot = i === f * 2 || i === (f * 2 + 1) % 8;
        r(c, P.k, ox + x, y, 3, 3);
        r(c, hot ? P.y : P.g, ox + x + 1, y + 1, 1, 1);
        if (hot) r(c, P.h, ox + x, y, 2, 1);
      });
      // face
      for (let yy = 4; yy < 14; yy++) {
        const half = [2, 3, 4, 4, 4, 4, 4, 4, 3, 2][yy - 4];
        r(c, P.k, ox + 9 - half - 1, yy, half * 2 + 2, 1);
        r(c, P.w, ox + 9 - half, yy, half * 2, 1);
      }
      r(c, P.W, ox + 6, 11, 6, 2);
      r(c, P.k, ox + 7, 7, 1, 2); r(c, P.k, ox + 11, 7, 1, 2); // eyes
      r(c, P.m, ox + 6, 10, 1, 1); r(c, P.m, ox + 12, 10, 1, 1); // blush
      r(c, P.k, ox + 8, 11, 3, 1); // little mouth
    }
  });
  const pip = s.textures.get('npc-pip');
  for (let f = 0; f < 4; f++) pip.add(f, 0, f * 18, 0, 18, 18);

  // NULL: a data gremlin with a "?" antenna, purple, wobbly mouth
  sheet(s, 'npc-null', [
    ['......k......', '.....kyk.....', '.....kYk.....', '......k......', '...kkkkkkk...', '..kqppppppk..', '.kqppppppppk.',
      '.kqwwpppwwpk.', '.kqwkpppwkpk.', '.kqppppppppk.', '.kqppkpkpppk.', '..kqpkpkppk..', '..kqqqqqqqk..', '..kqk...kqk..', '..kk.....kk..'],
    ['.......k.....', '......kyk....', '......kYk....', '......k......', '...kkkkkkk...', '..kqppppppk..', '.kqppppppppk.',
      '.kqwwpppwwpk.', '.kqkwpppkwpk.', '.kqppppppppk.', '.kqpppkpkppk.', '..kqppkpkpk..', '..kqqqqqqqk..', '..kqk...kqk..', '..kk.....kk..'],
  ]);

  // BITSY: a CRT monitor on legs, one big eye on a green screen, red power light (eye blinks)
  const bitsy = (eye: string[]) => [
    '..kkkkkkkkkkkk..', '.kbbbbbbbbbbbbk.', '.kbkkkkkkkkkkBk.', '.kbktttttttkkBk.', ...eye,
    '.kbkttttttttkBk.', '.kbkkkkkkkkkkBk.', '.kbbbbbbrbbbbBk.', '..kBBBBBBBBBBk..', '......kBBk......', '....kkkbbkkk....',
    '....kbbbbbbk....', '....kBBBBBBk....', '.....k....k.....', '.....k....k.....', '....kk....kk....',
  ];
  sheet(s, 'npc-bitsy', [
    bitsy(['.kbkttwwwwttkBk.', '.kbktwwkkwwtkBk.', '.kbktwwkkwwtkBk.', '.kbkttwwwwttkBk.']),
    bitsy(['.kbkttttttttkBk.', '.kbktkkkkkktkBk.', '.kbkttttttttkBk.', '.kbkttttttttkBk.']),
  ]);

  // PROFESSOR HOOT: a round owl with half-moon glasses, sitting on books (eyes open / closed)
  const hoot = (eyes: string[]) => [
    '...kk........kk...', '..knNk......kNnk..', '..knnNkkkkkkNnnk..', '..knnnnnnnnnnnnk..', ...eyes,
    '.knnnnnnyynnnnnnk.', '.knnnnnnnYnnnnnnk.', '.knnbbbbbbbbbbnnk.', '.knbbBbbBbbBbbbnk.', '.knbbbbbbbbbbbbnk.',
    '..knbbBbbBbbBbnk..', '..knnbbbbbbbbnnk..', '...kkyykkkkyykk...', '.kkkkkkkkkkkkkkkk.', '.kRRRRRRRRRRRRRRk.',
    '.kccccccccccccccCk', '.kkkkkkkkkkkkkkkk.',
  ];
  sheet(s, 'npc-hoot', [
    hoot(['.knnkkkkknkkkkknk.', '.knkwwwkkkkwwwknk.', '.knkwkwknnkwkwknk.', '.knnkkknnnnkkknnk.']),
    hoot(['.knnkkkkknkkkkknk.', '.knkkkkkkkkkkkknk.', '.knnnnnnnnnnnnnnk.', '.knnnnnnnnnnnnnnk.']),
  ]);

  // SIR TROPHY: a small knight in silver armour with a red plume, holding a gold cup (plume sways)
  const knight = (plume: string[]) => [
    ...plume, '.....kkkkkk.....', '....kssssssk....', '....kskkkksk....', '....kssssssk....', '.....kSSSSk.....',
    '...kkssssssk....', '..kssSssssSskk..', '..kskssssskskyk.', '..kskssssskykYk.', '..kkkssssskkyyk.', '....ksSSSsk.kk..',
    '....kssssk......', '....ksk.ksk.....', '....ksk.ksk.....', '...kkSk.kSkk....',
  ];
  sheet(s, 'npc-knight', [
    knight(['.......rr.......', '......rRr.......', '.....rRr........']),
    knight(['........rr......', '.......rRr......', '......rRr.......']),
  ]);

  // THE KEEPER: a hooded figure holding a candle (flame flickers)
  const keeper = (flame: string) => [
    '.....kkkk.....', '....kddddk....', '...kddddddk...', '...kdkkkkdk...', '...kdkwkwkdk..', '...kdkkkkdk...', '..kddddddddk..',
    '..kdDddddddk..', '.kddDdddd' + flame + 'dk..', '.kddDddddwddk.', '.kdddDdddwdddk', '.kddddDddwdddk', '.kddddddddddk.', 'kkkkkkkkkkkkkk',
  ];
  sheet(s, 'npc-keeper', [keeper('y'), keeper('o')]);

  // BYTE and NIBBLE: two cube creatures, one and a half bytes between them
  sheet(s, 'npc-byte', [
    ['.kkkkkkkkkk.', 'kccccccccccC', 'kcwkccccwkcC', 'kcccccccccCC', 'kcckkkkcccCk', 'kcccccccccCk', '.kCCCCCCCCk.', '..k......k..', '.kk......kk.'],
    ['.kkkkkkkkkk.', 'kccccccccccC', 'kckwcccckwcC', 'kcccccccccCC', 'kccckkccccCk', 'kcccccccccCk', '.kCCCCCCCCk.', '...k....k...', '..kk....kk..'],
  ]);
  sheet(s, 'npc-nibble', [
    ['.kkkkkk.', 'kmmmmmmM', 'kmwmmwmM', 'kmmkkmmM', 'kmmmmmMk', '.kMMMMk.', '..k..k..'],
    ['.kkkkkk.', 'kmmmmmmM', 'kmkmmkmM', 'kmmkkmmM', 'kmmmmmMk', '.kMMMMk.', '.k....k.'],
  ]);

  // CACHE: a snail whose shell is a floppy disk; it remembers everything (eye stalks wiggle)
  const cache = (stalks: string[]) => [
    '..........kkkkkkk.', '..........kCCsssCk', '..........kCCsSsCk', '..........kCCCCCCk', ...stalks,
    'keeeeek...kCwwwwCk', 'kekekekkkkkeeeeeek', 'keeeeeeeeeeeeeeek.', '.kkkkkkkkkkkkkkk..',
  ];
  sheet(s, 'npc-cache', [
    cache(['.k..k.....kCwwwwCk', '.k..k.....kCwwwwCk', '..kk......kCCCCCCk']),
    cache(['k...k.....kCwwwwCk', '.k.k......kCwwwwCk', '..kk......kCCCCCCk']),
  ]);

  // a rubber duck (for rubber-duck debugging)
  sheet(s, 'npc-duck', [
    ['...kkk....', '..kyyyk...', '.kywkyyk..', '.kyyyyykoo', '..kyyykkk.', 'kkyyyyyyk.', 'kyyyyyyyyk', 'kYyyyyyyYk', '.kYYYYYYk.', '..kkkkkk..'],
    ['...kkk....', '..kyyyk...', '.kywkyyk..', '.kyyyyykoo', '..kyyyk...', 'kkyyyyyyk.', 'kyyyyyyyyk', 'kYyyyyyyYk', '.kYYYYYYk.', '..kkkkkk..'],
  ]);

  // THE LEADERBOARD (overworld): a huge glowing scoreboard with eyes
  canvasTex(s, 'npc-board', 48 * 2, 44, (c) => {
    for (let f = 0; f < 2; f++) {
      const ox = f * 48;
      r(c, P.k, ox + 2, 4, 44, 32); r(c, P.y, ox + 3, 5, 42, 30); r(c, P.k, ox + 5, 7, 38, 26);
      // rows of scores, shuffling between frames
      const rows = f ? [30, 22, 34, 14, 26] : [34, 30, 22, 26, 14];
      rows.forEach((w, i) => { r(c, i === 0 ? P.y : P.g, ox + 8, 10 + i * 4 + 6, 4, 2); r(c, i === 0 ? P.y : P.W, ox + 14, 10 + i * 4 + 6, w * 0.7, 2); });
      // eyes on top of the board
      r(c, P.k, ox + 12, 0, 8, 6); r(c, P.w, ox + 13, 1, 6, 4); r(c, P.k, ox + 15 + f, 2, 2, 2);
      r(c, P.k, ox + 28, 0, 8, 6); r(c, P.w, ox + 29, 1, 6, 4); r(c, P.k, ox + 31 + f, 2, 2, 2);
      // stand
      r(c, P.k, ox + 20, 36, 8, 6); r(c, P.G, ox + 21, 36, 6, 5); r(c, P.k, ox + 14, 41, 20, 3); r(c, P.g, ox + 15, 41, 18, 2);
    }
  });
  const board = s.textures.get('npc-board');
  board.add(0, 0, 0, 0, 48, 44);
  board.add(1, 0, 48, 0, 48, 44);

  buildProps(s);
  buildCosmetics(s);
}

// ───────────────────────── props ─────────────────────────
function buildProps(s: Phaser.Scene) {
  // a soft pile of old keyboard keys (where you wake up)
  canvasTex(s, 'prop-keys', 40, 18, (c) => {
    const keys = [[2, 9], [8, 6], [14, 8], [20, 5], [26, 8], [32, 9], [5, 12], [11, 11], [17, 12], [23, 11], [29, 12], [14, 3], [20, 1]];
    const labels = ['#ffffff', '#ffd23a', '#ff8a1a', '#5ac8ff'];
    keys.forEach(([x, y], i) => {
      r(c, P.k, x, y, 7, 6); r(c, P.W, x + 1, y + 1, 5, 4); r(c, P.g, x + 1, y + 4, 5, 1);
      r(c, labels[i % 4] === '#ffffff' ? P.G : labels[i % 4], x + 3, y + 2, 1, 1);
    });
  });
  // a brazier (2 frames)
  sheet(s, 'prop-brazier', [
    ['...y..y...', '..yoyyoy..', '..yooooy..', '.kkkkkkkk.', '.kGggggGk.', '..kGggGk..', '...kggk...', '...kGGk...', '..kkkkkk..'],
    ['....y.y...', '..yoyyoy..', '..yoooyy..', '.kkkkkkkk.', '.kGggggGk.', '..kGggGk..', '...kggk...', '...kGGk...', '..kkkkkk..'],
  ]);
  // a lamppost with a warm lantern
  sheet(s, 'prop-lamp', [[
    '...kkk...', '..kyyyk..', '.kyhhyyk.', '.kyhyyyk.', '..kyyyk..', '...kkk...', '....k....', '....k....', '....k....',
    '....k....', '....k....', '....k....', '....k....', '....k....', '....k....', '...kkk...', '..kGGGk..', '.kkkkkkk.',
  ]]);
  // a fountain (2 tiles wide, water shimmers)
  canvasTex(s, 'prop-fountain', 32 * 2, 30, (c) => {
    for (let f = 0; f < 2; f++) {
      const ox = f * 32;
      r(c, P.k, ox + 1, 14, 30, 14); r(c, P.s, ox + 2, 15, 28, 12); r(c, P.S, ox + 2, 24, 28, 3);
      r(c, P.k, ox + 4, 16, 24, 8); r(c, P.C, ox + 5, 17, 22, 6);
      for (let i = 0; i < 5; i++) r(c, P.c, ox + 6 + i * 4 + (f ? 2 : 0), 18 + (i % 2), 2, 1);
      r(c, P.k, ox + 13, 4, 6, 13); r(c, P.s, ox + 14, 5, 4, 11);
      r(c, P.k, ox + 10, 3, 12, 3); r(c, P.s, ox + 11, 3, 10, 2);
      // spray
      r(c, P.c, ox + 15, 0, 2, 3);
      r(c, P.c, ox + (f ? 9 : 11), 6, 1, 3); r(c, P.c, ox + (f ? 22 : 20), 6, 1, 3);
      r(c, P.w, ox + 15, 0, 1, 1);
    }
  });
  const fo = s.textures.get('prop-fountain');
  fo.add(0, 0, 0, 0, 32, 30);
  fo.add(1, 0, 32, 0, 32, 30);
  // a bench
  gridTex(s, 'prop-bench', [
    'kkkkkkkkkkkkkkkkkkkkkk', 'knnnnnnnnnnnnnnnnnnnnk', 'kkkkkkkkkkkkkkkkkkkkkk', 'knnnnnnnnnnnnnnnnnnnnk', 'kNNNNNNNNNNNNNNNNNNNNk',
    'kkkkkkkkkkkkkkkkkkkkkk', '.kk................kk.', '.kk................kk.',
  ], P);
  // a server rack with blinking lights (2 frames)
  const rack = (a: string, b: string) => [
    'kkkkkkkkkkkk', 'kDDDDDDDDDDk', 'kDkkkkkkkkDk', `kDk${a}ddddddkDk`.slice(0, 12), 'kDkkkkkkkkDk', `kDk${b}ddddddkDk`.slice(0, 12),
    'kDkkkkkkkkDk', `kDk${a}ddddddkDk`.slice(0, 12), 'kDkkkkkkkkDk', `kDk${b}ddddddkDk`.slice(0, 12), 'kDkkkkkkkkDk',
    'kDDDDDDDDDDk', 'kDDDDDDDDDDk', 'kkkkkkkkkkkk', '.k........k.',
  ];
  sheet(s, 'prop-rack', [rack('e', 'c'), rack('c', 'r')]);
  // a lab table with beakers
  gridTex(s, 'prop-beakers', [
    '...kk.......kk....kk....', '...kk......kcck..kyyk...', '..kcck.....kcck..kyyk...', '..kcck....kcccck.kyyk...', '.kcccck...kcccck.kyyk...',
    'kkkkkkkkkkkkkkkkkkkkkkkk', 'kssssssssssssssssssssssk', 'kSSSSSSSSSSSSSSSSSSSSSSk', 'kkkkkkkkkkkkkkkkkkkkkkkk', '.kk..................kk.',
    '.kk..................kk.', '.kk..................kk.',
  ], P);
  // a hanging banner (wall), gold trim
  gridTex(s, 'prop-banner', [
    'kkkkkkkkkkkk', 'kYYYYYYYYYYk', 'kRrrrrrrrrRk', 'kRrrryyrrrRk', 'kRrryyyyrrRk', 'kRrrryyrrrRk', 'kRrrrrrrrrRk', 'kRrrrrrrrrRk',
    'kRrrrrrrrrRk', 'kRrrrrrrrrRk', '.kRrrrrrrRk.', '..kRrrrrRk..', '...kRrrRk...', '....kRRk....', '.....kk.....',
  ], P);
  // a statue of a hooded scholar holding a scroll
  gridTex(s, 'prop-statue', [
    '.....kkkkk.....', '....kssssSk....', '...kssssssSk...', '...ksSkkkSSk...', '...kskGkGkSk...', '...ksSkkkSSk...', '....kssssSk....',
    '...kssssssSSk..', '..kssskkkkssSk.', '..ksskwwwwkssk.', '..ksskwkkwkssk.', '..ksskwwwwkSSk.', '..kssskkkksSSk.', '..ksssssssSSSk.',
    '..ksssssssSSSk.', '..kssssssSSSSk.', '.kkkkkkkkkkkkkk', '.kSSSSSSSSSSSSk', '.kkkkkkkkkkkkkk',
  ], P);
  // a reading table with open books and a candle
  gridTex(s, 'prop-table', [
    '...........y................', '..........kok...............', '..........kwk...kkkkkkkk.....', '..kkkkkkk.kwk..kwwwwkwwwk....',
    '..kwwwwwk.kwk..kwkkwkwkkwk...', 'kkkkkkkkkkkkkkkkkkkkkkkkkkkk', 'knnnnnnnnnnnnnnnnnnnnnnnnnnk', 'kNNNNNNNNNNNNNNNNNNNNNNNNNNk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk', '.kk......................kk.', '.kk......................kk.',
  ], P);
  // a cobweb for a corner
  gridTex(s, 'prop-web', ['ggg.g.g.g.g', 'g.gg..g..g.', 'g..ggg..g..', '.g.g.gggg..', 'g.g..g.g...', '.g.g.g.g...', 'g..gg.g....', '.g..gg.....', 'g...g......', '.g.g.......', 'gg.........'], P);
  // a shelf of glowing jars (shop)
  gridTex(s, 'prop-jars', [
    '.kk..kk..kk..kk.', 'kyyk.kcck.kmmk.kek', 'kyhk.kwck.kwmk.kek', 'kyyk.kcck.kmmk.kek', 'kkkkkkkkkkkkkkkkkk', 'knnnnnnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkkkkk', '.k..............k.',
  ].map((row) => row.padEnd(18, '.').slice(0, 18)), P);
  // a little sign that hangs on the shop wall: a lantern
  gridTex(s, 'prop-shopsign', ['....kk....', '...kyyk...', '..kyhhyk..', '..kyhyyk..', '..kyyyyk..', '...kkkk...', '...kNNk...', 'kkkkkkkkkk', 'knnnnnnnnk', 'kkkkkkkkkk'], P);
  // a light beam from far above (where you wake up)
  canvasTex(s, 'prop-beam', 48, 120, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, 'rgba(255,250,220,0.0)');
    g.addColorStop(1, 'rgba(255,250,220,0.22)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(14, 0); c.lineTo(34, 0); c.lineTo(48, 120); c.lineTo(0, 120); c.closePath(); c.fill();
  });
  // a potato farm patch: neat rows of leafy potato plants in dark soil
  gridTex(s, 'prop-potato', [
    'NNNNNNNNNNNNNNNN', 'NnNNeNNNNeNNNNeN', 'NNNeEeNNNeEeNNeE', 'NnNNENnNNNENnNNE', 'NNNNNNNNNNNNNNNN', 'NNNbNNNNNNNbNNNN',
    'NNNNNNNNNNNNNNNN', 'NNeNNNNeNNNNeNNN', 'NeEeNNeEeNNeEeNN', 'NNENnNNENNnNENNn', 'NNNNNNNNNNNNNNNN', 'nNNNNNbNNNNNNNNN',
    'NNNNNNNNNNNNNNNN', 'NNNNeNNNNeNNNNeN', 'NNNeEeNNNeEeNNeE', 'NNNNENNNNNENNNNE',
  ], P);
  // a wooden trapdoor marked BASEMENT
  gridTex(s, 'prop-trapdoor', [
    'kkkkkkkkkkkkkkkk', 'knnnnnnnnnnnnnnk', 'knNnnnnNnnnnNnnk', 'knnnnnnnnnnnnnnk', 'knNNNNNNNNNNNNnk', 'knnnnnnnnnnnnnnk',
    'knnnnnnggnnnnnnk', 'knnnnnnggnnnnnnk', 'knNNNNNNNNNNNNnk', 'knnnnnnnnnnnnnnk', 'knNnnnnNnnnnNnnk', 'knnnnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkkk',
  ], P);
  // floor dressing: grass tufts and rubble (drawn over floor tiles)
  gridTex(s, 'prop-grass', ['..e....e........', '.eEe..eEe....e..', '..E....E....eEe.', '.............E..', '....e...........', '...eEe......e...', '....E......eEe..', '............E...'], P);
  gridTex(s, 'prop-rubble', ['................', '..kk.......k....', '.kGgk.....kgk...', '.kggk......k....', '..kk...kkk......', '......kGggk.....', '......kgggk..kk.', '.......kkk..kgk.', '.............k..'], P);
}

// ───────────────────────── cosmetics for the SOUL ─────────────────────────
export const COSMETICS: Record<string, { name: string; how: string; dy: number }> = {
  crown: { name: 'Tiny Crown', how: 'Hidden behind a pillar in the ruins.', dy: -8 },
  hardhat: { name: 'Hard Hat', how: 'Fix the bridge with the Refactoring Swarm.', dy: -8 },
  headphones: { name: 'Headphones', how: 'Play with the freeway in the Lab.', dy: -6 },
  glasses: { name: 'Reading Glasses', how: 'Read every shelf in the Library.', dy: -3 },
  ribbon: { name: 'Ribbon', how: "Collect five skills at Lumen's shop.", dy: -7 },
  halo: { name: 'Halo', how: 'Spare every monster.', dy: -11 },
  shades: { name: 'Sunglasses', how: 'Face THE LEADERBOARD at the summit.', dy: -3 },
  bulb: { name: 'Light Bulb', how: 'Somewhere nobody shipped anything.', dy: -10 },
};

function buildCosmetics(s: Phaser.Scene) {
  gridTex(s, 'cos-crown', ['k.k.k', 'kyky k'.replace(' ', ''), 'kkkkk', 'kymyk'].map((x) => x.padEnd(5, '.').slice(0, 5)), P);
  gridTex(s, 'cos-hardhat', ['..kkk..', '.kyyyk.', 'kyhyyyk', 'kkkkkkk'], P);
  gridTex(s, 'cos-headphones', ['.kkkkk.', 'k.....k', 'k.....k', 'kk...kk', 'kG...Gk'], P);
  gridTex(s, 'cos-glasses', ['kkk.kkk', 'kwk-kwk'.replace('-', 'k'), 'kkk.kkk'], P);
  gridTex(s, 'cos-ribbon', ['mm.mm', 'mMkMm', '.m.m.'], P);
  gridTex(s, 'cos-halo', ['.yyyyy.', 'y.....y', '.yyyyy.'], P);
  gridTex(s, 'cos-shades', ['kkkkkkk', 'kkk.kkk', '.k...k.'], P);
  gridTex(s, 'cos-bulb', ['.hhh.', 'hyyyh', 'hyhyh', '.yyy.', '.kgk.', '.kgk.'], P);
}

export { drawGrid };
