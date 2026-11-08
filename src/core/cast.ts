// Original characters, props and cosmetics, drawn in a classic RPG overworld style: one dark outline colour per
// character (a deep tint of its main colour, close to WAEL's near-black), flat fills with at most one shade, tiny 1x2
// or white-and-pupil eyes, rosy cheeks, and a simple 2-4 frame idle. Everything is drawn from string grids; no image files.
import Phaser from 'phaser';
import { drawGrid, framesTex, gridTex, MINI_CROWN, CROWN_PAL } from './art';
import { buildLumen, over } from './lumen';

// shared palette letters (the cosmetics below use these)
const P = {
  k: '#000000', w: '#ffffff', W: '#d8d8e0', g: '#9a9aa8', G: '#5a5a68',
  y: '#ffd23a', Y: '#c89a10', o: '#ff8a1a', O: '#b85a10', r: '#e83a3a', R: '#a01c24',
  p: '#8a5ac8', q: '#6a3aa8', Q: '#4a2680', b: '#e8d8b0', B: '#b8a070', n: '#7a4a2a', N: '#4a2a14',
  c: '#5ac8ff', C: '#2a7ab8', e: '#5ac85a', E: '#2e8a3a', s: '#c8ccd8', S: '#8a90a0', m: '#f0a0c0', M: '#c06080',
  d: '#3a3a52', D: '#24243a', t: '#2a4a3a', u: '#1e3a2c', h: '#ffeaa0',
};

/** Frames from grids, transparent '.' */
const sheet = (s: Phaser.Scene, key: string, frames: string[][], pal: Record<string, string>) => framesTex(s, key, frames, pal);

// one small palette per character; k is always the outline
const PIP_PAL = { k: '#1c1a2e', w: '#ffffff', g: '#8c8ca8', y: '#ffe14a', Y: '#c89a1c', m: '#ffa8c8', c: '#7ad0ff' };
const NUL_PAL = { k: '#1e1030', p: '#9a64e0', P: '#6a3cb0', w: '#ffffff', y: '#ffe14a', m: '#ff9ec4' };
const BITSY_PAL = { k: '#1a1a24', b: '#e8dcc0', B: '#b4a688', g: '#5ad06a', G: '#a8f0a0', w: '#ffffff', r: '#ff3a3a' };
const HOOT_PAL = {
  l: '#cfe6f0', k: '#24140c', n: '#9a6438', N: '#6e4224', b: '#f2dfb4', B: '#d4b886', y: '#ffd23a', o: '#ff9a2a',
  r: '#d83a3a', c: '#4a7ad8', p: '#f4ecd8',
};
const KNIGHT_PAL = {
  k: '#1a1c28', s: '#dfe3ee', S: '#9aa2b8', w: '#ffffff', r: '#ee3a3a', R: '#a81c2a', y: '#ffd23a', Y: '#c8901a',
};
const KEEPER_PAL = {
  k: '#120f1c', d: '#4c4870', D: '#34304e', v: '#000000', w: '#ffffff', c: '#f2e8d0', y: '#ffe14a', o: '#ff8a1a',
};
const BYTE_PAL = { k: '#10242e', l: '#bff0ff', c: '#5ac8f0', C: '#2e8ab8', m: '#ff9ec4' };
const NIBBLE_PAL = { k: '#2e1020', l: '#ffd6e6', m: '#ff8ab8', M: '#c8507e', r: '#ff5a8a' };
const CACHE_PAL = {
  k: '#14202a', e: '#8ad878', E: '#58a854', w: '#ffffff', C: '#3a62d0', D: '#28449a', s: '#d2d6e0', g: '#9aa0b4',
};
const DUCK_PAL = { k: '#2a1c08', y: '#ffd23a', Y: '#d89a14', o: '#ff8a1a' };
const MOSS_PAL = { k: '#1c2024', s: '#b8bcc8', S: '#8a8e9e', e: '#7ad060', E: '#46a040', w: '#ffffff', m: '#ffa8c8' };
const BOARD_PAL = {
  k: '#1a1206', y: '#ffd23a', Y: '#c8901a', h: '#fff2a8', d: '#121a36', D: '#26335e', w: '#ffffff', s: '#c8ccd8',
  o: '#e0843a', g: '#9a9ab0', G: '#62627a',
};

export function buildCast(s: Phaser.Scene) {
  if (s.textures.exists('npc-pip')) return;
  // PIP 18x18, 4 frames: a nervous loading spinner with a face. The bright bead (and its dimmer trail)
  // travels around the ring; the eyes dart left, then right, and a bead of sweat shows up mid-spin.
  const pip = [
    '........kk........', '.......kYYk.......', '...kk..kYYk..kk...', '..kggk..kk..kyyk..', '..kggkkkkkkkkyyk..',
    '...kkkwwwwwwkkk...', '....kwwwwwwwwk....', '.kk.kwkwwkwwwk.kk.', 'kggkkwkwwkwwwkkggk', 'kggkkmwwwwwwmkkggk',
    '.kk.kwwkkwwwwk.kk.', '....kwwwwwwwwk....', '...kkkwwwwwwkkk...', '..kggkkkkkkkkggk..', '..kggk..kk..kggk..',
    '...kk..kggk..kk...', '.......kggk.......', '........kk........',
  ];
  const pip1 = over(pip, 8, 1, [
    'gg', 'gg', '     gg', '     gg', '', '    c', '', '       YY', '       YY', '', '', '', '     yy', '     yy',
  ]);
  const pip2 = [
    '........kk........', '.......kggk.......', '...kk..kggk..kk...', '..kggk..kk..kggk..', '..kggkkkkkkkkggk..',
    '...kkkwwwwwwkkk...', '....kwwwwwwwck....', '.kk.kwwwkwwkwk.kk.', 'kggkkwwwkwwkwkkggk', 'kggkkmwwwwwwmkkggk',
    '.kk.kwwwwkkwwk.kk.', '....kwwwwwwwwk....', '...kkkwwwwwwkkk...', '..kyykkkkkkkkggk..', '..kyyk..kk..kggk..',
    '...kk..kYYk..kk...', '.......kYYk.......', '........kk........',
  ];
  const pip3 = over(pip, 1, 1, [
    '       gg', '       gg', '  yy        gg', '  yy        gg', '', '', '     w kw k', 'YY   w kw k', 'YY',
    '      wwkk',
  ]);
  sheet(s, 'npc-pip', [pip, pip1, pip2, pip3], PIP_PAL);

  // NULL 13x15: a small, timid purple data gremlin with a "?" antenna (frame 1: antenna sways, eyes glance).
  const nul = [
    '.....kkkk....', '....kyyyyk...', '....kykkyk...', '.....k.kyk...', '......kyk....', '......kk.....',
    '..k..kkkk.k..', '.kpkkppppkpk.', '.kppppppppPk.', 'kppwwpppwwpPk', 'kppwkpppwkpPk', 'kpmpppkpppmPk',
    '.kpppppppPPk.', '..kPkkkkkPk..', '..kk.....kk..',
  ];
  const nul1 = over(nul, 3, 0, [
    '  .   k', ' .k   yk', ' .ky kyk', '  .k.kyk', '   .kyk', '', '', '', '', '', 'kw   kw',
  ]);
  sheet(s, 'npc-null', [nul, nul1], NUL_PAL);

  // BITSY 16x19: a CRT monitor on legs, one big eye on a green screen, red power light (frame 1 blinks).
  const bitsy = [
    '.kkkkkkkkkkkkkk.', 'kbbbbbbbbbbbbbBk', 'kbkkkkkkkkkkkkBk', 'kbkGgggggggggkBk', 'kbkgggkkkkgggkBk',
    'kbkggkwwwwkggkBk', 'kbkgkwwkkwwkgkBk', 'kbkgkwwkkwwkgkBk', 'kbkggkwwwwkggkBk', 'kbkgggkkkkgggkBk',
    'kbkggggggggggkBk', 'kbkkkkkkkkkkkkBk', 'kbbbbbbbbbbbrbBk', '.kBBBBBBBBBBBBk.', '..kkkkkkkkkkkk..',
    '.....kBk..kBk...', '.....kBk..kBk...', '....kkBk..kBkk..', '....kkkk..kkkk..',
  ];
  const bitsy1 = over(bitsy, 4, 4, ['  gggg', ' gggggg', ' kggggk', 'gkk  kkg', ' gggggg', '  gggg']);
  sheet(s, 'npc-bitsy', [bitsy, bitsy1], BITSY_PAL);

  // PROF. HOOT 18x20: a round owl with pale facial discs and half-moon glasses, sitting on two books.
  // Frame 0: eyes OPEN, peering over the glasses. Frame 1: eyes CLOSED (asleep). World.ts relies on this order.
  const hoot = [
    '..kk..........kk..', '..knk........knk..', '..knnkkkkkkkknnk..', '.knnnnnnnnnnnnnnk.', '.knbbbbnnnnbbbbnk.',
    'knbbkkbbnnbbkkbbnk', 'knbbkkbbnnbbkkbbnk', 'knyyyyyykkyyyyyynk', 'knyllllyooyllllynk', 'knnyyyynoonyyyynnk',
    'kNnnbbbbbbbbbbnnNk', 'kNnbbBbbbbbbBbbnNk', '.kNbbbbbbbbbbbbNk.', '.kNnbbBbbbbbBbnNk.', '..kkooookkooookk..',
    '.kkkkkkkkkkkkkkkk.', '.kryrrrrrrrrrrppk.', 'kkkkkkkkkkkkkkkkkk', 'kppccccccccccccyck', 'kkkkkkkkkkkkkkkkkk',
  ];
  const hoot1 = over(hoot, 3, 5, [' bb      bb', 'k  k    k  k']);
  sheet(s, 'npc-hoot', [hoot, hoot1], HOOT_PAL);

  // SIR TROPHY 16x18: a small knight in silver armour, red plume, holding a gold trophy cup in front
  // (frame 1: the plume sways).
  const knight = [
    '.......kkk......', '......krrk......', '.....krrRk......', '....kkkkkkkk....', '...kssssssssk...',
    '..kwssssssssSk..', '..ksssssssssSk..', '..kskkkkkkkkSk..', '..kskwkkkkwkSk..', '..ksssssssssSk..',
    '...kSSSSSSSSk...', '..kkkkkkkkkkkk..', '..kykwyyyyykyk..', '..kykyyyyyYkyk..', '..kkkkyyyYkkkk..',
    '...kSkkyYkkSk...', '...kSkyyyYkSk...', '...kkkkkkkkkk...',
  ];
  const knight1 = over(knight, 5, 0, [' k  .', '', '.kRrrk']);
  sheet(s, 'npc-knight', [knight, knight1], KNIGHT_PAL);

  // THE KEEPER 14x14: a hooded figure, two eyes in the dark of the hood, holding a candle (flame flickers).
  const keeper = [
    '......kk......', '.....kddk.....', '....kddddk....', '...kddddddk...', '...kddvvddk...', '..kddvvvvddk..',
    '..kdvwvvwvdk..', '..kddvvvvddk..', '.kdddddyddddk.', '.kdDddyoddDdk.', 'kddDdkcckdDddk', 'kddDDkcckDDddk',
    'kdddDDkkDDdddk', 'kkkkkkkkkkkkkk',
  ];
  const keeper1 = over(keeper, 6, 8, ['yd', 'oy']);
  sheet(s, 'npc-keeper', [keeper, keeper1], KEEPER_PAL);

  // BYTE 12x9: a cyan cube (frame 1: mid-hop, grinning).
  const byte = [
    '.kkkkkkkkkk.', 'kllllllllllk', 'kcccccccccCk', 'kcckcccckcCk', 'kcckcccckcCk', 'kcmmckkcmmCk', 'kccccccccCCk',
    '.kkkkkkkkkk.', '..kk....kk..',
  ];
  const byte1 = [
    '.kkkkkkkkkk.', 'kllllllllllk', 'kcccccccccCk', 'kcccccccccCk', 'kcckcccckcCk', 'kcmmkkkkmmCk', 'kccccccccCCk',
    '.kkkkkkkkkk.', '.kk......kk.',
  ];
  sheet(s, 'npc-byte', [byte, byte1], BYTE_PAL);

  // NIBBLE 8x7: a pink half-cube. Together with BYTE: one and a half bytes.
  const nibble = [
    '.kkkkkk.', 'kllllllk', 'kmkmmkMk', 'krmkkmrk', 'kmmmmmMk', '.kkkkkk.', '.kk..kk.',
  ];
  const nibble1 = [
    '.kkkkkk.', 'kllllllk', 'kmkmmkMk', 'krkmmkrk', 'kmmkkmMk', '.kkkkkk.', 'kk....kk',
  ];
  sheet(s, 'npc-nibble', [nibble, nibble1], NIBBLE_PAL);

  // CACHE 18x11: a snail whose shell is a floppy disk, facing LEFT (frame 1: the eye stalks wiggle).
  const cache = [
    'kkk.kkk...........', 'kwk.kwkkkkkkkkk...', '.k...k.kCssksCCk..', '.k...k.kCssksCCk..', '.kkkkk.kCsssssCk..',
    'keeeeekkCCCCCCCk..', 'keeeeeekCwwwwwCk..', 'keeeeeekCwgggwCk..', 'kekkeeekDwwwwwDk..', 'keeeeeeekkkkkkkeek',
    '.kEEEEEEEEEEEEEEk.',
  ];
  const cache1 = over(cache, 0, 0, ['.  k.  k', '.kwk.kw', '       .', '       .']);
  sheet(s, 'npc-cache', [cache, cache1], CACHE_PAL);

  // A rubber duck 10x10, facing right (for rubber-duck debugging; frame 1 blinks).
  const duck = [
    '...kkkk...', '..kyyyyk..', '..kyyykyk.', '..kyyyyykk', '..kkyyyyoo', 'kk.kyyykk.', 'kykkyyyyk.', 'kyyyYYYyyk',
    '.kyyyyyyYk', '..kkkkkkk.',
  ];
  const duck1 = over(duck, 6, 2, ['Y']);
  sheet(s, 'npc-duck', [duck, duck1], DUCK_PAL);

  // MOSS 14x12: a shy, round mossy stone with big eyes and rosy cheeks (frame 1 blinks).
  // MOSS, the shy mossy stone in the Cluster Garden
  const moss = [
    '....kkkkkk....', '..kkeeeeeekk..', '.keeeEeeeeEek.', '.keEeeeeEeeek.', 'kseeesseeeesSk', 'kssessssssesSk',
    'ksswksssswksSk', 'ksskkssskkssSk', 'ksskkssskkssSk', 'ksmmsskkssmmSk', '.kSsssssssSSk.', '..kkkkkkkkkk..',
  ];
  const moss1 = over(moss, 3, 6, ['ss    ss', 'ss   ss', '     s k']);
  sheet(s, 'npc-moss', [moss, moss1], MOSS_PAL);

  // THE LEADERBOARD (overworld) 48x44: a huge, proud scoreboard on a stand, wearing a crown. Smug eyes
  // and a smirk on the screen; frame 1: the pupils shift and the scores reshuffle.
  const board = [
    '..................k....kk....k..................', '.................kyk..kyyk..kyk.................',
    '.................kyykkyyyykkyyk.................', '.................kyyyyyhyyyyyyk.................',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.', '.khhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhYk.',
    '.khyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyYk.', '.khyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyYk.',
    '.khyykkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkyyYk.', '.khyykDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDkyyYk.',
    '.khyykdddddddyyyyyddddddddddddyyyyydddddddkyyYk.', '.khyykddddddddddddddddddddddddddddddddddddkyyYk.',
    '.khyykddddddkkkkkkkddddddddddkkkkkkkddddddkyyYk.', '.khyykddddddkkkkkkkddddddddddkkkkkkkddddddkyyYk.',
    '.khyykddddddkwkkwwkddddddddddkwkkwwkddddddkyyYk.', '.khyykddddddkwkkwwkddddddddddkwkkwwkddddddkyyYk.',
    '.khyykdddddddkwwwkddddddddddddkwwwkdddddddkyyYk.', '.khyykddddddddkkkddddddddddddddkkkddddddddkyyYk.',
    '.khyykddddddddddddddddddddddddddddddddddddkyyYk.', '.khyykdddddddddddddddddddddyydddddddddddddkyyYk.',
    '.khyykdddddddddddddyyyyyyyydddddddddddddddkyyYk.', '.khyykddddddddddddddddddddddddddddddddddddkyyYk.',
    '.khyykddddddddddddddddddddddddddddddddddddkyyYk.', '.khyykdddyyyddhhhhhhhhhhhhhhhhhhhhhhhhddddkyyYk.',
    '.khyykddddddddddddddddddddddddddddddddddddkyyYk.', '.khyykdddsssddwwwwwwwwwwwwwwwwwwddddddddddkyyYk.',
    '.khyykddddddddddddddddddddddddddddddddddddkyyYk.', '.khyykdddoooddwwwwwwwwwwwwwdddddddddddddddkyyYk.',
    '.khyykddddddddddddddddddddddddddddddddddddkyyYk.', '.khyykkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkyyYk.',
    '.khyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyYk.', '.khyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyYk.',
    '.kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.', '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
    '....................kggggGGk....................', '....................kggggGGk....................',
    '....................kggggGGk....................', '....................kggggGGk....................',
    '....................kggggGGk....................', '............kkkkkkkkkkkkkkkkkkkkkkkk............',
    '............kssssssssssssssssssssssk............', '............kggggggggggggggggggggggk............',
    '............kGGGGGGGGGGGGGGGGGGGGGGk............', '............kkkkkkkkkkkkkkkkkkkkkkkk............',
  ];
  const board1 = over(board, 14, 3, [
    '         yh', '', '', '', '', '', '', '', '', '', '', 'w k              w k', 'w k              w k', '', '', '',
    '', '', '', '', '                    dddd', '', '                  wwwww', '', '           dd',
  ]);
  sheet(s, 'npc-board', [board, board1], BOARD_PAL);
  buildLumen(s);
  buildCosmetics(s);
}

// ───────────────────────── cosmetics for the SOUL ─────────────────────────
export const COSMETICS: Record<string, { name: string; how: string; dy: number }> = {
  crown: { name: 'Tiny Crown', how: 'Hidden behind a pillar in the Proving Grounds.', dy: -13 },
  hardhat: { name: 'Hard Hat', how: 'Get the Refactoring Swarm to fix the bridge.', dy: -10 },
  headphones: { name: 'Headphones', how: 'Play with the freeway terminal in the Lab.', dy: -5 },
  goggles: { name: 'Lab Goggles', how: 'Draw a 7 on the glass floor in the Lab.', dy: -2 },
  glasses: { name: 'Reading Glasses', how: 'Read every shelf in the Library.', dy: -3 },
  ribbon: { name: 'Ribbon', how: "Collect five skills at Lumen's shop.", dy: -7 },
  flower: { name: 'Little Flower', how: 'Make the Cluster Garden happy.', dy: -9 },
  halo: { name: 'Halo', how: 'Spare every monster.', dy: -11 },
  shades: { name: 'Sunglasses', how: 'Face THE LEADERBOARD at the summit.', dy: -2 },
  bulb: { name: 'Light Bulb', how: 'Somewhere nobody shipped anything.', dy: -10 },
};

function buildCosmetics(s: Phaser.Scene) {
  // the crown, inspired by Technoblade's (same art as the pickup, see art.ts)
  gridTex(s, 'cos-crown', MINI_CROWN, CROWN_PAL);
  gridTex(s, 'cos-hardhat', ['...kkk...', '..kyhyk..', '.kyhyyyk.', 'kYYYYYYYk', '.kkkkkkk.'], P);
  gridTex(s, 'cos-headphones', ['..kkkkk..', '.kgggggk.', 'kgk...kgk', 'kck...kck', 'kCk...kCk', '.k.....k.'], P);
  gridTex(s, 'cos-glasses', ['kkk.kkk', 'kwk-kwk'.replace('-', 'k'), 'kkk.kkk'], P);
  gridTex(s, 'cos-ribbon', ['mm.mm', 'mMkMm', '.m.m.'], P);
  gridTex(s, 'cos-halo', ['.yyyyy.', 'y.....y', '.yyyyy.'], P);
  gridTex(s, 'cos-shades', ['kkkkkkkkk', '.kwkkkwk.', '.kkk.kkk.', '..k...k..'], P);
  gridTex(s, 'cos-bulb', ['.hhh.', 'hyyyh', 'hyhyh', '.yyy.', '.kgk.', '.kgk.'], P);
}

export { drawGrid };
