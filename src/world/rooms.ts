// The underground: a linear path with branches. Every room is hand-built (original layouts).
// Tiles: '#' wall  ' ' void  '*' starry void  '.' floor  ',' cracked floor  ':' carpet  '"' grass  ';' rubble
//        '~' chasm  '=' plank  'x' broken plank  '%' paving / corridor stone
//        digits = doors  lowercase = spawn points  UPPERCASE = entities (see `ents`).
import { TECHNO_MEMORIAL } from '../content/lore';

export type Ent =
  | { t: 'sign'; lines: string[]; sprite?: 'sign' | 'pedestal' | 'none'; base?: string }
  | { t: 'dyn'; id: string; sprite?: 'sign' | 'none' }
  | { t: 'save'; line: string }
  | { t: 'pedestal'; project: string }
  | { t: 'trophy'; comp: string }
  | { t: 'shelf'; war: number }
  | { t: 'odd' }
  | { t: 'lectern'; base?: string }
  | { t: 'pillar' }
  | { t: 'plant' }
  | { t: 'candle' }
  | { t: 'encounter'; enemy: string }
  | { t: 'lumen' }
  | { t: 'counter' }
  | { t: 'crown' }
  | { t: 'crownPickup' }
  | { t: 'mirror' }
  | { t: 'terminal'; id: string }
  | { t: 'screen'; base?: string }
  | { t: 'maptable' }
  | { t: 'lever' }
  | { t: 'ball' }
  | { t: 'contact'; kind: 'github' | 'kaggle' | 'linkedin' | 'email' | 'resume' }
  | { t: 'gate' }
  | { t: 'npc'; id: string }
  | { t: 'boss' }
  | { t: 'cos'; id: string; key: string; lines: string[] }
  | { t: 'deco'; key: string; frames?: number; lines?: string[]; solid?: boolean; w?: number; base?: string; dy?: number; wall?: boolean };

export interface Label { x: number; y: number; text: string; color?: string; align?: 'l' | 'c' | 'r'; }
export interface RoomDef {
  id: string;
  name: string;
  theme: string;
  music: string;
  map: string[];
  doors: Record<string, { to: string; spawn: string }>;
  ents: Record<string, Ent>;
  spawns?: Record<string, [number, number]>;
  labels?: Label[];
  logic?: string;
  /** spawn used by the MAP's fast travel */
  arrive?: string;
}

const PILLAR: Ent = { t: 'pillar' };
const PLANT: Ent = { t: 'plant' };
const CANDLE: Ent = { t: 'candle' };
const BRAZIER: Ent = { t: 'deco', key: 'prop-brazier', frames: 2, solid: true, lines: ['* A brazier. Warm.', '* Somebody keeps it lit. You never see who.'] };
const WEB: Ent = { t: 'deco', key: 'prop-web', wall: true, base: '#', lines: ['* A cobweb. Its owner is out. Probably at a hackathon.'] };
const GRASS: Ent = { t: 'deco', key: 'prop-grass', dy: 0 };
const RUBBLE: Ent = { t: 'deco', key: 'prop-rubble', dy: 0, lines: ['* A little pile of rubble. It used to be a much bigger idea.'] };
const LAMP: Ent = { t: 'deco', key: 'prop-lamp', solid: true, lines: ['* A lamppost. Its light is warm and a little sleepy.'] };
const BENCH: Ent = { t: 'deco', key: 'prop-bench', w: 2, solid: true, lines: ['* You sit on the bench for a moment.', '* It is very restful. In some other underground, this would definitely be a save point.'] };

export const ROOMS: Record<string, RoomDef> = {
  // ───────────────────────── the beginning ─────────────────────────
  start: {
    id: 'start', name: 'Where It Begins', theme: 'hub', music: 'start', logic: 'start', arrive: 'a',
    map: [
      '################',
      '#######11#######',
      '#......kk......#',
      '#......Y.......#',
      '#..............#',
      '#....."""".....#',
      '#....""K.""....#',
      '#....."""".....#',
      '#..............#',
      '#..R........;..#',
      '#..............#',
      '################',
      '################',
    ],
    spawns: { a: [8, 6.5] },
    doors: { 1: { to: 'hall', spawn: 's' } },
    ents: {
      Y: { t: 'npc', id: 'pip' },
      K: { t: 'deco', key: 'prop-keys', dy: 2, lines: ['* A soft pile of old keyboard keys.', '* You landed on them. The SPACE bar broke your fall.'] },
      R: { t: 'sign', sprite: 'none', lines: ['* (Something is scratched into the floor here.)', '* "STARTING FROM ZERO."', '* ...Every journey does.'] },
      ';': RUBBLE,
    },
  },

  hall: {
    id: 'hall', name: 'Hall of First Steps', theme: 'hub', music: 'start', arrive: 's',
    map: [
      '############',
      '#####11#####',
      '#....jj....#',
      '#B........B#',
      '#..........#',
      '#.."..."...#',
      '#B........B#',
      '#....S.....#',
      '#..........#',
      '#.N......D.#',
      '#B........B#',
      '#..........#',
      '#..;.......#',
      '#B........B#',
      '#....ss....#',
      '#####22#####',
      '############',
    ],
    doors: { 1: { to: 'crossroads', spawn: 's' }, 2: { to: 'start', spawn: 'k' } },
    ents: {
      B: BRAZIER,
      S: { t: 'save', line: '* The warm light of the braziers fills you with DETERMINATION.' },
      N: { t: 'sign', lines: [
        '* (A sign, in very neat handwriting.)',
        '* "ARROWS or WASD to walk. Z to talk to things. X to cancel, or hold it to run."',
        '* "C opens your MENU: items, stats, cosmetics, and a MAP that can take you anywhere."',
        '* "No keyboard? Click or tap where you want to go. The heart will figure it out."',
      ] },
      D: { t: 'npc', id: 'duck' },
      ';': RUBBLE,
      '"': GRASS,
    },
  },

  crossroads: {
    id: 'crossroads', name: 'The Crossroads', theme: 'hub', music: 'hub', arrive: 's',
    map: [
      '##########################',
      '############11############',
      '#L..........jj..........L#',
      '#........................#',
      '#...P................P...#',
      '#........................#',
      '#........U......Y........#',
      '#.........::::::.........#',
      '#.........::::::.........#',
      '4w........::::::........e5',
      '#.........::::::.........#',
      '#.........::::::.........#',
      '#......G..........S......#',
      '#...P................P...#',
      '#........................#',
      '#L..........ss..........L#',
      '############22############',
      '##########################',
    ],
    doors: { 1: { to: 'town', spawn: 's' }, 2: { to: 'hall', spawn: 'j' }, 4: { to: 'memorial', spawn: 'e' }, 5: { to: 'ruins1', spawn: 'w' } },
    ents: {
      L: PLANT, P: PILLAR,
      U: { t: 'sign', lines: [
        '* (A signpost. Its arrows point in every direction, very confidently.)',
        '* EAST: the Ruins of Projects.\n* NORTH: Lamplight Square.',
        '* WEST: a quiet place.\n* SOUTH: where you came from.',
        '* (Scribbled underneath: "red tiles bite. yellow stars save. 5 secrets.")',
      ] },
      Y: { t: 'npc', id: 'pip' },
      G: { t: 'dyn', id: 'github' },
      S: { t: 'save', line: '* Four roads, one SOUL. The thought fills you with DETERMINATION.' },
    },
  },

  memorial: {
    id: 'memorial', name: 'The Memorial', theme: 'memorial', music: 'memorial', logic: 'memorial', arrive: 'e',
    map: [
      '##################',
      '##################',
      '#................#',
      '#...L........L...#',
      '#.......K........#',
      '#.......::.......#',
      '#..Y....::.......#',
      '#.......::::::::e5',
      '#...L........L...#',
      '#.......N........#',
      '#................#',
      '##################',
    ],
    doors: { 5: { to: 'crossroads', spawn: 'w' } },
    ents: { L: CANDLE, K: { t: 'crown' }, Y: { t: 'npc', id: 'keeper' }, N: { t: 'sign', lines: [`* ${TECHNO_MEMORIAL}.`] } },
  },

  // ───────────────────────── the ruins of projects ─────────────────────────
  ruins1: {
    id: 'ruins1', name: 'Ruins I: The Causal Corridor', theme: 'ruins', music: 'ruins', logic: 'ruins1', arrive: 'w',
    map: [
      '##############################',
      '##############################',
      '#........############........#',
      '#.L....L.############.L....L.#',
      '#..R.....############........#',
      '#....Y...############....K...#',
      '#........%%%%%%%%%%%%........#',
      '4w.......%%%%%%%%%%%%.......e5',
      '#........%%%%%%%%%%%%........#',
      '#........############........#',
      '#.....S..############.....;..#',
      '#.L....L.############.L....L.#',
      '#........############........#',
      '##############################',
    ],
    doors: { 4: { to: 'crossroads', spawn: 'e' }, 5: { to: 'ruins2', spawn: 'w' } },
    spawns: { r: [7.5, 7] },
    ents: {
      L: PLANT,
      R: { t: 'sign', lines: [
        '* THE CAUSAL CORRIDOR.',
        '* The clock above each column reads {y}T{w}, the time you are forecasting from.',
        '* Each tile is stamped with a time. Step only on tiles stamped {y}at or before T{w}.',
        '* Step on the future and you start over.',
      ] },
      Y: { t: 'npc', id: 'null' },
      K: { t: 'pedestal', project: 'tfb' },
      S: { t: 'save', line: '* The thought of a strictly causal forecast fills you with DETERMINATION.' },
      ';': RUBBLE,
    },
  },

  ruins2: {
    id: 'ruins2', name: 'Ruins II: The Swarm Bridge', theme: 'ruins', music: 'ruins', logic: 'ruins2', arrive: 'w',
    map: [
      '##############################',
      '########################11####',
      '#.........~~~~~~~.......jj...#',
      '#.L.......~~~~~~~....L.......#',
      '#.........~~~~~~~............#',
      '#..N.....C~~~~~~~.....W......#',
      '#.........~~~~~~~............#',
      '4w........=xx=xx=............#',
      '#.........~~~~~~~............#',
      '#.........~~~~~~~...;........#',
      '#....S....~~~~~~~.......O....#',
      '#.L.......~~~~~~~....L.......#',
      '#.........~~~~~~~............#',
      '##############################',
    ],
    doors: { 4: { to: 'ruins1', spawn: 'e' }, 1: { to: 'ruins3', spawn: 's' } },
    ents: {
      L: PLANT,
      N: { t: 'sign', lines: ['* THE SWARM BRIDGE.', '* The planks are broken. The console says three agents are inside, waiting for a job.'] },
      C: { t: 'terminal', id: 'swarm' },
      W: { t: 'pedestal', project: 'swarm' },
      O: { t: 'encounter', enemy: 'overfit' },
      S: { t: 'save', line: '* Three tiny agents, one broken bridge. The thought fills you with DETERMINATION.' },
      ';': RUBBLE,
    },
  },

  ruins3: {
    id: 'ruins3', name: 'Ruins III: The Proving Grounds', theme: 'ruins', music: 'ruins', logic: 'ruins3', arrive: 's',
    map: [
      '################################',
      '################################',
      '#.............................Q#',
      '#...........E..F..H..........P.#',
      '#..............................#',
      '#.R............................#',
      '#..............................#',
      '#.....................T........#',
      '#............M............D....#',
      '#..............................#',
      '#.............................e5',
      '#..............................#',
      '#..............................#',
      '#Y.............................#',
      '#.....B...........O............#',
      '#..""........................;.#',
      '#.""""......................;;.#',
      '#...............N..............#',
      '#..............ss..............#',
      '###############11###############',
      '################################',
    ],
    doors: { 1: { to: 'ruins2', spawn: 'j' }, 5: { to: 'lab', spawn: 'w' } },
    ents: {
      Q: { t: 'crownPickup' }, P: PILLAR,
      E: { t: 'pedestal', project: 'vec' }, F: { t: 'pedestal', project: 'qlora' }, H: { t: 'pedestal', project: 'apcs' },
      R: { t: 'sign', lines: ['* A LOSS LANDSCAPE.', '* Push the ball into the bowl. It will roll downhill, one gradient step at a time.', '* The lever sets the {y}learning rate{w}. Try them all.'] },
      T: { t: 'maptable' }, M: { t: 'pedestal', project: 'mlscratch' }, D: { t: 'pedestal', project: 'road' },
      Y: { t: 'lever' }, B: { t: 'ball' }, O: { t: 'encounter', enemy: 'gradient' },
      N: { t: 'sign', lines: ['* THE PROVING GROUNDS.', '* A bowl, a ball, a map, and three quiet pedestals in a row.'] },
      '"': GRASS, ';': RUBBLE,
    },
  },

  lab: {
    id: 'lab', name: 'The Lab', theme: 'lab', music: 'lab', logic: 'lab', arrive: 'w',
    map: [
      '##########################',
      '###Z#######11#####Z#######',
      '#R.........jj...........R#',
      '#R......................R#',
      '#........................#',
      '#.......X..K.I...........#',
      '#........................#',
      '4w.......................#',
      '#........................#',
      '#..................A.....#',
      '#........................#',
      '#...............O........#',
      '#...S................U...#',
      '##########################',
    ],
    doors: { 4: { to: 'ruins3', spawn: 'e' }, 1: { to: 'town', spawn: 'e' } },
    ents: {
      Z: { t: 'screen', base: '#' },
      R: { t: 'deco', key: 'prop-rack', frames: 2, solid: true, lines: ['* A server rack. It hums the same note over and over.', '* It is training something. It will not say what.'] },
      X: { t: 'npc', id: 'bitsy' },
      K: { t: 'terminal', id: 'lab' },
      I: { t: 'sign', lines: [
        '* A note is taped to the terminal:',
        "* 'This freeway is an {y}ILLUSTRATIVE TOY{w}. It is not the competition model.'",
        "* 'It shows the idea: a jam forms, a shockwave travels backwards, and a causal forecast tries to keep up.'",
      ] },
      A: { t: 'deco', key: 'prop-beakers', w: 2, solid: true, lines: ['* Beakers of glowing liquid. One is labelled "coffee". You do not trust it.'] },
      O: { t: 'encounter', enemy: 'leakage' },
      U: { t: 'sign', lines: [
        '* UNDER THE HOOD.',
        '* Vite, TypeScript and Phaser 3. No image files, no audio files: every sprite is drawn from code and every note is synthesized.',
        '* The mirror uses fuzzy search over a local knowledge base. No network, no LLM.',
        '* The source is on GitHub: WaelYTz/WaelYTz.github.io',
      ] },
      S: { t: 'save', line: '* The thought of traffic flowing freely fills you with DETERMINATION.' },
    },
  },

  // ───────────────────────── the town ─────────────────────────
  town: {
    id: 'town', name: 'Lamplight Square', theme: 'town', music: 'town', arrive: 's',
    map: [
      '##############################',
      '######33######Q#######44######',
      '#.....aa..............bb.....#',
      '#""L..................L....""#',
      '#"...........................#',
      '#..H.....................PPP.#',
      '#........................PPP.#',
      '#........V%%%%%%%%%%V........#',
      '#....X....%%%%%%%%%%....Y....#',
      '#.........%%%%F.%%%%.........#',
      '#.........%%%%..%%%%.........#',
      '#........V%%%%%%%%%%V........#',
      '#.........%%%%%%%%%%........e5',
      '#............................#',
      '#...C....................S...#',
      '#............................#',
      '#..L......U...........H...L..#',
      '#""..........................#',
      '#"............ss............"#',
      '##############22##############',
      '##############################',
    ],
    doors: { 3: { to: 'shop', spawn: 'a' }, 4: { to: 'library', spawn: 's' }, 2: { to: 'crossroads', spawn: 'j' }, 5: { to: 'lab', spawn: 'j' } },
    ents: {
      L: LAMP, H: BENCH, V: PLANT, '"': GRASS,
      Q: { t: 'deco', key: 'prop-shopsign', wall: true, base: '#', lines: ["* A little lantern sign: LUMEN'S SKILLS & SUNDRIES.", '* The door to its left is open.'] },
      P: { t: 'deco', key: 'prop-potato', lines: ['* A tidy little potato farm.', '* Somebody very determined planted these. Every row is perfect.', '* (You feel like they would want you to keep going.)'] },
      F: { t: 'deco', key: 'prop-fountain', frames: 2, w: 2, solid: true, lines: ['* A fountain. The water hums a little tune.', '* Coins at the bottom. Someone wished for "a good validation split".'] },
      X: { t: 'npc', id: 'byte' }, Y: { t: 'npc', id: 'nibble' }, C: { t: 'npc', id: 'cache' },
      U: { t: 'sign', lines: ['* LAMPLIGHT SQUARE.', "* NORTH-WEST: Lumen's shop. NORTH-EAST: the Library.", '* EAST: back to the Lab. SOUTH: the Crossroads.'] },
      S: { t: 'save', line: '* The lamplight and the sound of the fountain fill you with DETERMINATION.' },
    },
  },

  shop: {
    id: 'shop', name: "Lumen's Shop", theme: 'shop', music: 'shop', logic: 'shop', arrive: 'a',
    map: [
      '##################',
      '##################',
      '#................#',
      '#.J.....M.....J..#',
      '#......K.........#',
      '#................#',
      '#.L............L.#',
      '#................#',
      '#.......aa.......#',
      '########11########',
      '##################',
    ],
    doors: { 1: { to: 'town', spawn: 'a' } },
    ents: {
      M: { t: 'lumen' }, K: { t: 'counter' }, L: PLANT,
      J: { t: 'deco', key: 'prop-jars', w: 1, solid: true, lines: ['* Jars of glowing skills. One is labelled "patience". It is empty.'] },
    },
  },

  library: {
    id: 'library', name: 'The Library', theme: 'library', music: 'library', logic: 'library', arrive: 's',
    map: [
      '##########################',
      '############11########2###',
      '#.A..B..C...jj...D..E.H..#',
      '#........................#',
      '#........................#',
      '#...........Y............#',
      '#.........::::::.........#',
      '#.........::::::.........#',
      '#...Z.....::Q:::.....Z...#',
      '#.........::::::.........#',
      '#........................#',
      '#....T..........T........#',
      '#........................#',
      '#..S..................N..#',
      '#...........ss...........#',
      '############33############',
      '##########################',
    ],
    doors: { 1: { to: 'records', spawn: 's' }, 2: { to: 'hidden', spawn: 'a' }, 3: { to: 'town', spawn: 'b' } },
    spawns: { h: [22, 2] },
    ents: {
      A: { t: 'shelf', war: 0 }, B: { t: 'shelf', war: 1 }, C: { t: 'shelf', war: 2 }, D: { t: 'shelf', war: 3 }, E: { t: 'shelf', war: 4 },
      H: { t: 'odd' },
      Y: { t: 'npc', id: 'hoot' },
      Q: { t: 'lectern', base: ':' },
      Z: { t: 'deco', key: 'prop-statue', solid: true, lines: ['* A statue of a hooded scholar holding a scroll.', '* The plaque reads: "WIN FIRST. THEN FIGHT."'] },
      T: { t: 'deco', key: 'prop-table', w: 2, solid: true, lines: ['* A reading table. Open books, a candle, and a half-finished crossword.', '* 7 across: "Model that memorizes everything" (7). You already know.'] },
      S: { t: 'save', line: '* The thought of winning on validation first fills you with DETERMINATION.' },
      N: { t: 'sign', lines: ['* THE LIBRARY.', '* Sun Tzu, The Art of War, translated by Lionel Giles in 1910.', '* Each shelf keeps one line, and what WAEL thinks it means for machine learning.'] },
    },
  },

  hidden: {
    id: 'hidden', name: 'The Unshipped Room', theme: 'hidden', music: 'mirror', logic: 'hidden', arrive: 'a',
    map: [
      '##############',
      '#W##########W#',
      '#............#',
      '#..A....B..C.#',
      '#............#',
      '#.T........L.#',
      '#.....N......#',
      '#.....aa.....#',
      '######11######',
      '##############',
    ],
    doors: { 1: { to: 'library', spawn: 'h' } },
    ents: {
      A: { t: 'sign', sprite: 'pedestal', lines: ['* A notebook named final_v7_REAL_final.ipynb.', '* It ran once. Nobody knows in which order.'] },
      B: { t: 'sign', sprite: 'pedestal', lines: ['* A model with a perfect validation score.', "* It had seen the test set. It lives here now, where it can't hurt anyone."] },
      C: { t: 'sign', sprite: 'pedestal', lines: ["* A sketchbook. The first page shows a group of friends having a picnic under a tree.", '* The rest of the pages are blank. Waiting.'] },
      T: { t: 'deco', key: 'prop-trapdoor', lines: ['* A trapdoor marked BASEMENT.', '* It smells faintly of tears. You decide not to go down there today.'] },
      L: { t: 'cos', id: 'bulb', key: 'cos-bulb', lines: ['* A light bulb, glowing warm and steady.', '* You pick it up. It feels like carrying a tiny sun.', '* (New cosmetic: LIGHT BULB. Wear it from the MENU.)'] },
      N: { t: 'sign', lines: ['* THE UNSHIPPED ROOM.', "* Every builder has one. Ideas rest here until they're ready.", '* ...Or forever.'] },
      W: WEB,
    },
  },

  // ───────────────────────── up to the summit ─────────────────────────
  records: {
    id: 'records', name: 'Hall of Records', theme: 'records', music: 'records', arrive: 's',
    map: [
      '######################',
      '##Q##Q####11####Q##Q##',
      '#.........jj.........#',
      '#..P..............P..#',
      '#.....A....B....C....#',
      '#....................#',
      '#.........::.........#',
      '#..P......::......P..#',
      '#.....Y...::.........#',
      '#.........::.........#',
      '#..G......::......S..#',
      '#.........ss.........#',
      '##########33##########',
      '######################',
    ],
    doors: { 1: { to: 'mirror', spawn: 's' }, 3: { to: 'library', spawn: 'j' } },
    ents: {
      Q: { t: 'deco', key: 'prop-banner', wall: true, base: '#', lines: ['* A red banner with a golden star. It is very well ironed.'] },
      P: PILLAR,
      A: { t: 'trophy', comp: 'ieee' }, B: { t: 'trophy', comp: 'zindi' }, C: { t: 'trophy', comp: 'vec' },
      Y: { t: 'npc', id: 'knight' },
      G: { t: 'dyn', id: 'github' },
      S: { t: 'save', line: '* The quest matters more than the trophy. The thought fills you with DETERMINATION.' },
    },
  },

  mirror: {
    id: 'mirror', name: 'The Mirror', theme: 'mirror', music: 'mirror', logic: 'mirror', arrive: 's',
    map: [
      '##################',
      '########11########',
      '#.......jj......L#',
      '#...............L#',
      '#..K.............#',
      '#................#',
      '#L..............L#',
      '#.....N..........#',
      '#................#',
      '#.......ss.......#',
      '########33########',
      '##################',
    ],
    doors: { 1: { to: 'summit', spawn: 's' }, 3: { to: 'records', spawn: 'j' } },
    ents: {
      K: { t: 'mirror' }, L: CANDLE,
      N: { t: 'sign', lines: ['* THE MIRROR.', '* It answers questions about WAEL, in his own words.', "* (It reads from a small local knowledge base, so it won't know everything.)"] },
    },
  },

  summit: {
    id: 'summit', name: 'The Summit', theme: 'summit', music: 'summit', logic: 'summit', arrive: 's',
    map: [
      '########################',
      '###########11###########',
      '#..........jj..........#',
      '#..P..............P....#',
      '#......................#',
      '#..........B...........#',
      '#......................#',
      '#..P..............P....#',
      '#......................#',
      '#......................#',
      '#...S.............N....#',
      '#..........ss..........#',
      '###########33###########',
      '########################',
    ],
    doors: { 1: { to: 'exit', spawn: 's' }, 3: { to: 'mirror', spawn: 'j' } },
    ents: {
      P: { t: 'deco', key: 'prop-brazier', frames: 2, solid: true, lines: ['* A brazier. The flames lean toward the big board, like they are listening.'] },
      B: { t: 'boss' },
      S: { t: 'save', line: '* A huge board glows ahead. The thought of facing it fills you with DETERMINATION.' },
      N: { t: 'sign', lines: ['* THE SUMMIT.', '* Beyond the board: the way out.', '* (You can walk around it. Nobody HAS to read the leaderboard.)'] },
    },
  },

  exit: {
    id: 'exit', name: 'The Way Out', theme: 'exit', music: 'title', logic: 'exit', arrive: 's',
    map: [
      '**********************',
      '**********************',
      '***.......X........***',
      '***................***',
      '***.G..K..L..E..R..***',
      '***................***',
      '***.......S........***',
      '***................***',
      '***................***',
      '***.......ss.......***',
      '*********#33#*********',
      '*********####*********',
      '**********************',
    ],
    doors: { 3: { to: 'summit', spawn: 'j' } },
    ents: {
      G: { t: 'contact', kind: 'github' }, K: { t: 'contact', kind: 'kaggle' }, L: { t: 'contact', kind: 'linkedin' },
      E: { t: 'contact', kind: 'email' }, R: { t: 'contact', kind: 'resume' },
      S: { t: 'save', line: '* The thought of all the doors you opened fills you with DETERMINATION.' },
      X: { t: 'gate' },
    },
  },
};

// Deep links: /#/lab, /#/mirror?q=..., /#/projects ...
const ALIASES: Record<string, string> = {
  start: 'start', hall: 'hall', hub: 'crossroads', home: 'crossroads', crossroads: 'crossroads', projects: 'ruins1', corridor: 'ruins1',
  swarm: 'ruins2', bridge: 'ruins2', projects2: 'ruins3', bowl: 'ruins3', ruins: 'ruins1', lab: 'lab', traffic: 'lab',
  town: 'town', square: 'town', records: 'records', trophies: 'records', competitions: 'records', library: 'library',
  artofwar: 'library', memorial: 'memorial', technoblade: 'memorial', shop: 'shop', skills: 'shop', mirror: 'mirror',
  ask: 'mirror', summit: 'summit', boss: 'summit', exit: 'exit', contact: 'exit',
};
export function roomFromHash(hash: string): { room: string; spawn?: string; ask?: string } | null {
  const m = /^#\/?([a-z0-9]+)(?:\?q=(.*))?$/i.exec(hash || '');
  if (!m) return null;
  const key = m[1].toLowerCase();
  const room = ALIASES[key] ?? (ROOMS[key] && key !== 'hidden' ? key : undefined);
  if (!room) return null;
  let ask: string | undefined;
  try {
    ask = m[2] ? decodeURIComponent(m[2].replace(/\+/g, ' ')).slice(0, 80) : undefined;
  } catch {
    ask = undefined;
  }
  return { room, spawn: ROOMS[room].arrive, ask };
}
