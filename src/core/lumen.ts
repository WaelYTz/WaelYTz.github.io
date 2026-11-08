// Lumen the shopkeeper (original character): overworld sprite, shop portrait and hands.
// Drawn in the same overworld style as the rest of the cast: one dark outline colour, flat fills with a single shade,
// a simple face. Lumen's head is a brass lantern; the friendly flame inside is the face.
import Phaser from 'phaser';
import { framesTex, gridTex } from './art';

/** Copy of a grid frame with `rows` pasted at (x, y); a space keeps the pixel underneath, '.' clears it. */
export const over = (base: string[], x: number, y: number, rows: string[]) =>
  base.map((row, j) => {
    const p = rows[j - y];
    if (p === undefined) return row;
    let out = '';
    for (let i = 0; i < row.length; i++) {
      const ch = p[i - x];
      out += ch === undefined || ch === ' ' ? row[i] : ch;
    }
    return out;
  });

// brass, amber glass, flame, purple cloak, red scarf (outline k is a dark plum, not pure black)
const LUMEN_PAL = {
  k: '#1c0e22', b: '#e8b04a', B: '#a8702a', g: '#4a2412', o: '#ff8a1a', y: '#ffd23a', l: '#fff4c0', m: '#ff6a5a',
  p: '#7a48c0', P: '#53308e', r: '#e04040', R: '#a02232', w: '#f4f0ff', W: '#c8c0dc',
};
const BIG_PAL = {
  k: '#1c0e22', b: '#e8b04a', B: '#a8702a', h: '#fff0a8', g: '#42200e', G: '#6a3416', O: '#d8541a', o: '#ff8a1a',
  y: '#ffd23a', l: '#fff6cc', w: '#ffffff', m: '#ff6a5a', r: '#c8243a', p: '#7a48c0', P: '#53308e', q: '#9a6ad8',
  s: '#e04040', S: '#a02232',
};

export function buildLumen(scene: Phaser.Scene) {
  if (scene.textures.exists('lumen-big')) return;

  // overworld, 16x24: ring handle, cap, glass box with the flame face, scarf, cloak and gloves. Frame 1: flame flickers.
  const lumen = [
    '......kkkk......', '.....kb..bk.....', '......kbbk......', '....kkkkkkkk....', '...kbbbbbbbbk...',
    '..kBBBBBBBBBBk..', '.kbggggogggggbk.', '.kbgggoyyogggbk.', '.kbggoyyyyoggbk.', '.kbgoykyykyogbk.',
    '.kbgoykyykyogbk.', '.kbgomyyyymogbk.', '.kbggoyllyoggbk.', '.kbgggoooogggbk.', '.kBBBBBBBBBBBBk.',
    '..kkkkkkkkkkkk..', '...kkrrrrrrkk...', '..kprrrrrrrrpk..', '..kppppRrppppk..', '.kpppppRrpppPPk.',
    '.kWkpppbbpppkWk.', '.kwkppppppppkwk.', 'kppppppbbppppPPk', 'kkkkkkkkkkkkkkkk',
  ];
  framesTex(scene, 'lumen', [lumen, over(lumen, 6, 6, [' go', 'go'])], LUMEN_PAL);

  // shop portrait, 48x56, shown at 3x behind the counter: 0 idle, 1 flame flicker, 2 blink, 3 talking
  const big = [
    '.....................kkkkkk.....................', '....................kbbbbbbk....................',
    '...................kbhk..kBbk...................', '...................kbk....kbk...................',
    '...................kbk....kbk...................', '....................kbkkkkbk....................',
    '.....................kbbbbk.....................', '................kkkkkkkkkkkkkkkk................',
    '..............kbbhhhhhhhhbbbbbbbbk..............', '............kbbbbbbbbbbbbbbbbbbbbbbk............',
    '..........kbbbhbbbbbbbbhbbbbbbbbbhbbbk..........', '.........kBBBBBBBBBBBBBBBBBBBBBBBBBBBBk.........',
    '.........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.........', '.........kbhBkggggggggggggggggggggkbbBk.........',
    '.........kbhBkggGggggggOggggggggggkbbBk.........', '.........kbhBkgGGggggggOOgggggggggkbbBk.........',
    '.........kbhBkgGgggggggOOgggggggggkbbBk.........', '.........kbhBkgGgggggGOooOGgggggggkbbBk.........',
    '.........kbhBkgGggggGGOooOGGggggggkbbBk.........', '.........kbhBkgggggGGOoyyoOGGgggggkbbBk.........',
    '.........kbhBkggggGGOoyyyyoOGGggggkbbBk.........', '.........kbhBkgggGGGOoyyyyoOGGGgggkbbBk.........',
    '.........kbhBkgggGGOkkyyyykkOGGgggkbbBk.........', '.........kbhBkggGGOowkyyyywkoOGGggkbbBk.........',
    '.........kbhBkggGGOokkyyyykkoOGGggkbbBk.........', '.........kbhBkgGGOoykkyyyykkyoOGGgkbbBk.........',
    '.........kbhBkgGGOoyyyyyyyyyyoOGGgkbbBk.........', '.........kbhBkgGOmmylkllllklymmOGgkbbBk.........',
    '.........kbhBkgGOoyyllkkkkllyyoOGgkbbBk.........', '.........kbhBkgGOoyyllllllllyyoOGgkbbBk.........',
    '.........kbhBkggOoyyllllllllyyoOggkbbBk.........', '.........kbhBkggOoyyllllllllyyoOggkbbBk.........',
    '.........kbhBkgggOoyyllllllyyoOgggkbbBk.........', '.........kbhBkggggOoyyllllyyoOggggkbbBk.........',
    '.........kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.........', '.........kBBBBBBBBBBBBBBBBBBBBBBBBBBBBk.........',
    '.........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.........', '.............kssssssssssssssssssssk.............',
    '............kksssssssssssssssssssskk............', '...........kqqkkkkkkksSSskkkkkkkkkPPk...........',
    '..........kqqppppppppksSskppppppppPPPk..........', '.........kqqpppppppppksSskpppppppppPPPk.........',
    '.........kqqpppppppppkSsskpppppppppPPPk.........', '........kqqpppppppppppkkkpppppppppppPPPk........',
    '.......kqqpppppppppppppppppppppppppppPPPk.......', '......kqqppppppppppppppbbpppppppppppppPPPk......',
    '.....kqqpppppppppppppppBBppppppppppppppPPPk.....', '....kqqpppppppppppppppppppppppppppppppppPPPk....',
    '...kqqpppppppppppppppppppppppppppppppppppPPPk...', '..kqqpppppppppppppppppppppppppppppppppppppPPPk..',
    '.kqqpppppppppppppppppppbbppppppppppppppppppPPPk.', 'kqqppppppppppppppppppppBBpppppppppppppppppppPPPk',
    'kqqpppppppppppppppppppppppppppppppppppppppppPPPk', 'kqqpppppppppppppppppppppppppppppppppppppppppPPPk',
    'kqqpppppppppppppppppppppppppppppppppppppppppPPPk', 'kqqpppppppppppppppppppppppppppppppppppppppppPPPk',
  ];
  framesTex(scene, 'lumen-big', [
    big,
    over(big, 21, 14, ['  g  O', '  ggOO', '  ggOO', ' GO oO', ' GO oO', 'GOo yoO']), // the flame tip sways
    over(big, 19, 22, [' oy    yo', ' yy    yy', 'kyyk  kyyk']), // blink: eyes become little arcs
    over(big, 21, 27, [' kkkk', 'krrrrk', ' krrk']), // talking: mouth open
  ], BIG_PAL);

  // white gloves with purple cuffs, resting on the counter (48x7)
  const glove = ['kpppppppk', 'kPPPPPPPk', 'kwwwwwwwk', 'kwwkwwkwk', 'kwwkwwkwk', 'kwwwwwwwk', '.kkkkkkk.'];
  gridTex(scene, 'lumen-hands', glove.map((g) => '....' + g + '.'.repeat(22) + g + '....'), BIG_PAL);
}
