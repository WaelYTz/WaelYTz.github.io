// The underground: a linear path with branches. Every room is hand-built (original layouts).
// Layout rule: things come in mirrored pairs around the room's centre line (or a zone's centre), or sit on that line.
// `ox` nudges an entity by pixels (8 = half a tile) so single objects can sit exactly on an even-width centre line.
// Tiles: '#' wall  ' ' void  '*' starry void  '.' floor  ',' cracked floor  ':' carpet  '"' grass  ';' rubble
//        '~' chasm  '=' plank  'x' broken plank  '%' paving / corridor stone  '+' digit-floor pixel (the Lab)
//        digits = doors  lowercase = spawn points  UPPERCASE = entities (see `ents`).
import { TECHNO_MEMORIAL } from '../content/lore';

export type NpcMove = 'wander' | 'patrol' | 'follow' | 'shy' | 'still';

type EntBody =
  | { t: 'sign'; lines: string[]; sprite?: 'sign' | 'pedestal' | 'none'; base?: string }
  | { t: 'dyn'; id: string; sprite?: 'sign' | 'none' }
  | { t: 'save'; line: string; base?: string }
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
  | { t: 'reflect' }
  | { t: 'terminal'; id: string }
  | { t: 'screen'; base?: string }
  | { t: 'maptable' }
  | { t: 'lever'; id?: string }
  | { t: 'ball' }
  | { t: 'stone'; i: number }
  | { t: 'spikes'; flag: string }
  | { t: 'button' }
  | { t: 'contact'; kind: 'github' | 'kaggle' | 'linkedin' | 'email' | 'resume' }
  | { t: 'gate' }
  | { t: 'npc'; id: string; move?: NpcMove; r?: number; path?: [number, number][]; speed?: number; lead?: string }
  | { t: 'boss' }
  | { t: 'cos'; id: string; key: string; lines: string[] }
  | { t: 'deco'; key: string; frames?: number; frame?: number; lines?: string[]; solid?: boolean; w?: number; sh?: number; base?: string; dy?: number; wall?: boolean };
export type Ent = EntBody & { ox?: number };

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
const LAMP: Ent = { t: 'deco', key: 'prop-lamp', solid: true, lines: ['* A lamppost. Its light is warm and a little sleepy.'] };
const BENCH: Ent = { t: 'deco', key: 'prop-bench', w: 2, solid: true, lines: ['* You sit on the bench for a moment.', '* It is very restful. In some other underground, this would definitely be a save point.'] };
const HEDGE: Ent = { t: 'deco', key: 'prop-hedge', solid: true, lines: ['* A neatly trimmed hedge. Someone here really likes tidy boundaries.'] };
const BED_OF_FLOWERS: Ent = { t: 'deco', key: 'prop-flowerbed', dy: 0, lines: ['* A little flower bed. These ones are just flowers. No data at all. How relaxing.'] };

const CRATE: Ent = { t: 'deco', key: 'prop-crate', solid: true, lines: ['* A wooden crate stamped TRAINING DATA.', '* It is very heavy. Mostly duplicates.'] };
const COIL: Ent = { t: 'deco', key: 'prop-cable-coil', solid: true, lines: ['* A coil of old cable. Every cable down here is the wrong kind.'] };
const MONITOR: Ent = { t: 'deco', key: 'prop-old-monitor', solid: true, lines: ['* An old monitor. Its progress bar has been stuck at 99% for years.'] };
const FAN: Ent = { t: 'deco', key: 'prop-fan', frames: 2, solid: true, lines: ['* A desk fan, still spinning. It is cooling nothing in particular.'] };
const SHROOMS: Ent = { t: 'deco', key: 'prop-mushrooms', frames: 2, dy: 0, lines: ['* Little glowing mushrooms. They grow wherever the old servers run warm.'] };
const MOSSROCK: Ent = { t: 'deco', key: 'prop-moss-rock', solid: true, lines: ['* A mossy rock. It has been here since version 0.1.'] };
const CAPACITOR: Ent = { t: 'deco', key: 'prop-capacitor', solid: true, lines: ['* A capacitor the size of a stool. (Do not lick it.)'] };
const FLOPPIES: Ent = { t: 'deco', key: 'prop-floppy-pile', solid: true, lines: ['* A pile of floppy disks. One is labelled final_v2_REAL_final.'] };
const CHIP: Ent = { t: 'deco', key: 'prop-chip', solid: true, lines: ['* A chip as big as a footstool. Its pins are a bit bent from being sat on.'] };
const REELS: Ent = { t: 'deco', key: 'prop-tape-reels', solid: true, lines: ['* Tape reels. Someone backed up the whole underground. Twice.'] };
const LANTERN: Ent = { t: 'deco', key: 'prop-lantern-post', frames: 2, solid: true, lines: ['* A lantern post. Its flame flickers like it is thinking hard.'] };
const VINES: Ent = { t: 'deco', key: 'prop-vines', wall: true, base: '#', dy: -8 };
const HEATSINK: Ent = { t: 'deco', key: 'prop-heatsink', wall: true, base: '#', lines: ['* Heat-sink fins built into the wall. Still warm, after all this time.'] };
const LEDS: Ent = { t: 'deco', key: 'prop-led-strip', wall: true, base: '#', frames: 2, lines: ['* A strip of status lights. Green, green, green... one amber. Nobody knows why.'] };

export const ROOMS: Record<string, RoomDef> = {
  // ───────────────────────── the beginning ─────────────────────────
  start: {
    id: 'start', name: 'Where It Begins', theme: 'hub', music: 'start', logic: 'start', arrive: 'a',
    map: [
      '################',
      '#######11#######',
      '####...kk...####',
      '###....Y.....###',
      '##............##',
      '#....."""".....#',
      '#....""K.""....#',
      '#....."""".....#',
      '#..............#',
      '##.R........;.##',
      '###..........###',
      '################',
      '################',
    ],
    spawns: { a: [7.5, 6.5] },
    doors: { 1: { to: 'hall', spawn: 's' } },
    ents: {
      Y: { t: 'npc', id: 'pip', ox: 8 },
      K: { t: 'deco', key: 'prop-keys', w: 2, dy: 2, lines: ['* A soft pile of old keyboard keys.', '* You landed on them. The SPACE bar broke your fall.'] },
      R: { t: 'sign', sprite: 'none', lines: ['* (Something is scratched into the floor here.)', '* "STARTING FROM ZERO."', '* ...Every journey does.'] },
      ';': { t: 'deco', key: 'prop-rubble', dy: 0, lines: ['* A little pile of rubble. It fell from up there, like you did.'] },
    },
  },

  hall: {
    id: 'hall', name: 'Hall of First Steps', theme: 'hub', music: 'start', arrive: 's',
    map: [
      '############',
      '#####11#####',
      '#....jj....#',
      '#B...::...B#',
      '#....::....#',
      '#."..::..".#',
      '#B...::...B#',
      '#....S:....#',
      '#....::....#',
      '#.N..::..D.#',
      '#B...::...B#',
      '#....::....#',
      '#."..::..".#',
      '#B...::...B#',
      '#....ss....#',
      '#####22#####',
      '############',
    ],
    doors: { 1: { to: 'crossroads', spawn: 's' }, 2: { to: 'start', spawn: 'k' } },
    ents: {
      B: BRAZIER,
      S: { t: 'save', line: '* The warm light of the braziers fills you with DETERMINATION.', base: ':', ox: 8 },
      N: { t: 'sign', lines: [
        '* (A sign, in very neat handwriting.)',
        '* "ARROWS or WASD to walk. Z to talk to things. X to cancel, or hold it to run."',
        '* "C opens your MENU: items, stats, cosmetics, and a MAP that can take you anywhere you have been."',
        '* "No keyboard? Click or tap where you want to go. The heart will figure it out."',
      ] },
      D: { t: 'npc', id: 'duck' },
      '"': GRASS,
    },
  },

  crossroads: {
    id: 'crossroads', name: 'The Crossroads', theme: 'hub', music: 'hub', arrive: 's',
    map: [
      '##########################',
      '############11############',
      '#L..........jj..........L#',
      '#.......A........A.......#',
      '#...P."............."P...#',
      '#......"...........".....#',
      '#.V......U......Y......V.#',
      '#.........::::::.........#',
      '#.........::::::.........#',
      '4w........::::::........e5',
      '#.........::::::.........#',
      '#..H......::::::.....H...#',
      '#......G..........S......#',
      '#...P..............".P...#',
      '#.CC...".........."....C.#',
      '#L..........ss..........L#',
      '############22############',
      '##########################',
    ],
    doors: { 1: { to: 'town', spawn: 's' }, 2: { to: 'hall', spawn: 'j' }, 4: { to: 'memorial', spawn: 'e' }, 5: { to: 'ruins1', spawn: 'w' } },
    ents: {
      A: LANTERN,
      H: BENCH,
      C: CRATE,
      V: PLANT,
      '"': GRASS,
      L: PLANT, P: PILLAR,
      U: { t: 'sign', lines: [
        '* (A signpost. Its arrows point in every direction, very confidently.)',
        '* EAST: the Ruins of Projects.\n* NORTH: Lamplight Square.',
        '* WEST: a quiet place.\n* SOUTH: where you came from.',
        '* (Scribbled underneath: "red tiles bite. yellow stars save. 5 secrets.")',
      ] },
      Y: { t: 'npc', id: 'pip', move: 'wander', r: 2, speed: 26 },
      G: { t: 'dyn', id: 'github' },
      S: { t: 'save', line: '* Four roads, one SOUL. The thought fills you with DETERMINATION.' },
    },
  },

  memorial: {
    id: 'memorial', name: 'The Memorial', theme: 'memorial', music: 'memorial', logic: 'memorial', arrive: 'e',
    map: [
      '##################',
      '##################',
      '###............###',
      '##..L........L..##',
      '#.......K........#',
      '#.......::.......#',
      '#....Y..::.H.....#',
      '#.......::::::::e5',
      '#...L........L...#',
      '##......N.......##',
      '###............###',
      '##################',
    ],
    doors: { 5: { to: 'crossroads', spawn: 'w' } },
    ents: {
      L: CANDLE,
      K: { t: 'crown', ox: 8 },
      Y: { t: 'npc', id: 'keeper', ox: 8 },
      H: { ...BENCH, lines: ['* A quiet bench facing the crown.', '* You sit for a while. Nobody rushes you here.'] },
      N: { t: 'sign', lines: [`* ${TECHNO_MEMORIAL}.`], ox: 8 },
    },
  },

  // ───────────────────────── the ruins of projects ─────────────────────────
  ruins1: {
    id: 'ruins1', name: 'Ruins I: The Causal Corridor', theme: 'ruins', music: 'ruins', logic: 'ruins1', arrive: 'w',
    map: [
      '##############################',
      '###V##H################H##V###',
      '#.......M############O..C....#',
      '#.L....L.############.L....L.#',
      '#...R....############....K...#',
      '#......Y.############........#',
      '#........%%%%%%%%%%%%........#',
      '4wM......%%%%%%%%%%%%.......e5',
      '#........%%%%%%%%%%%%........#',
      '#........############........#',
      '#...S....############....;...#',
      '#.L....L.############.L....L.#',
      '#....C..O############M.......#',
      '##############################',
    ],
    doors: { 4: { to: 'crossroads', spawn: 'e' }, 5: { to: 'ruins2', spawn: 'w' } },
    ents: {
      M: SHROOMS,
      O: MOSSROCK,
      C: COIL,
      V: VINES,
      H: HEATSINK,
      L: PLANT,
      R: { t: 'sign', lines: [
        '* THE CAUSAL CORRIDOR.',
        '* The clock above each column reads {y}T{w}, the time you are forecasting from.',
        '* Each tile is stamped with a time. Step only on tiles stamped {y}at or before T{w}.',
        '* Step on the future and you start over.',
      ] },
      Y: { t: 'npc', id: 'null', move: 'patrol', path: [[7, 5], [7, 9]], speed: 30 },
      K: { t: 'pedestal', project: 'tfb' },
      S: { t: 'save', line: '* The thought of a strictly causal forecast fills you with DETERMINATION.' },
      ';': { t: 'deco', key: 'prop-rubble', dy: 0, lines: ['* Rubble from a model that peeked at the future. It did not end well.'] },
    },
  },

  ruins2: {
    id: 'ruins2', name: 'Ruins II: The Swarm Bridge', theme: 'ruins', music: 'ruins', logic: 'ruins2', arrive: 'w',
    map: [
      '##############################',
      '####V###H###########H##11##V##',
      '#......M...~~~~~~~~....jj....#',
      '#.L........~~~~~~~~........L.#',
      '#...N......~~~~~~~~......;...#',
      '#.........C~~~~~~~~W.......R.#',
      '#..........~~~~~~~~..........#',
      '4w.........=xx==xx=..........#',
      '#..........~~~~~~~~.......X..#',
      '#.....K..M.~~~~~~~~..........#',
      '#...S......~~~~~~~~......O...#',
      '#.L........~~~~~~~~..M.....L.#',
      '#.......R..~~~~~~~~..........#',
      '##############################',
    ],
    doors: { 4: { to: 'ruins1', spawn: 'e' }, 1: { to: 'ruins3', spawn: 's' } },
    ents: {
      M: SHROOMS,
      R: MOSSROCK,
      K: COIL,
      X: CHIP,
      V: VINES,
      H: HEATSINK,
      L: PLANT,
      N: { t: 'sign', lines: ['* THE SWARM BRIDGE.', '* The planks are broken. The console says three agents are inside, waiting for a job.', '* (Agents work best when they work in the right order.)'] },
      C: { t: 'terminal', id: 'swarm' },
      W: { t: 'pedestal', project: 'swarm' },
      O: { t: 'encounter', enemy: 'overfit' },
      S: { t: 'save', line: '* Three tiny agents, one broken bridge. The thought fills you with DETERMINATION.' },
      ';': { t: 'deco', key: 'prop-rubble', dy: 0, lines: ['* Pieces of the old bridge. Someone labelled them "legacy code".'] },
    },
  },

  ruins3: {
    id: 'ruins3', name: 'Ruins III: The Proving Grounds', theme: 'ruins', music: 'ruins', logic: 'ruins3', arrive: 's',
    map: [
      '################################',
      '######Z###W####U#####W###Z######',
      '#............................Q.#',
      '#.P.........E..F...H.........P.#',
      '4w..O..........................#',
      '#.....R..........G......K......#',
      '#...........M......D...........#',
      '#..............................#',
      '#.......................T......#',
      '#...........Y...............G..#',
      '#....................X.........#',
      '#..............................#',
      '#................C........A..V.#',
      '#..............................#',
      '#.....B........................#',
      '#"".................G........""#',
      '#".V.....G...................."#',
      '#............N....L............#',
      '#..............ss..............#',
      '###############11###############',
      '################################',
    ],
    doors: { 1: { to: 'ruins2', spawn: 'j' }, 4: { to: 'lab', spawn: 'e' } },
    ents: {
      C: COIL,
      A: CHIP,
      G: SHROOMS,
      V: MOSSROCK,
      X: CAPACITOR,
      Z: VINES,
      W: HEATSINK,
      U: LEDS,
      Q: { t: 'crownPickup' }, P: PILLAR,
      E: { t: 'pedestal', project: 'vec' }, F: { t: 'pedestal', project: 'qlora', ox: 8 }, H: { t: 'pedestal', project: 'apcs' },
      R: { t: 'sign', ox: 8, lines: ['* A LOSS LANDSCAPE.', '* Push the ball into the bowl. It will roll downhill, one gradient step at a time.', '* The lever sets the {y}learning rate{w}. Try them all.'] },
      K: { t: 'sign', ox: 8, lines: ['* ONE ROAD OUT.', '* A map of a town with only one way out. Look closer at the table.'] },
      T: { t: 'maptable', ox: 8 }, M: { t: 'pedestal', project: 'mlscratch' }, D: { t: 'pedestal', project: 'road' },
      Y: { t: 'lever' }, B: { t: 'ball', ox: 8 }, O: { t: 'encounter', enemy: 'gradient' },
      N: { t: 'sign', lines: ['* THE PROVING GROUNDS.', '* A bowl, a ball, a map, and three quiet pedestals in a row.'] },
      L: PLANT,
      '"': GRASS,
    },
  },

  lab: {
    id: 'lab', name: 'The Lab', theme: 'lab', music: 'lab', logic: 'lab', arrive: 'w',
    map: [
      '############################',
      '###E##Z##E###RR###G#####E###',
      '#R..........R..R.......M.R.#',
      '#R..........R..R.........R.#',
      '#.......................C..#',
      '#...I.K.A..................#',
      '#.................+++++....#',
      '#.................+++++....#',
      '4w................+++++...e5',
      '#................N+++++D...#',
      '#..X..............+++++....#',
      '#.................+++++....#',
      '#.....O.........Q.+++++...P#',
      '#.S........U..F............#',
      '############################',
    ],
    doors: { 4: { to: 'town', spawn: 'l' }, 5: { to: 'ruins3', spawn: 'w' } },
    ents: {
      F: FAN,
      M: MONITOR,
      Q: COIL,
      P: CAPACITOR,
      C: CHIP,
      E: LEDS,
      Z: { t: 'screen', base: '#' },
      G: { t: 'deco', key: 'prop-bigscreen', wall: true, base: '#', w: 4, dy: -8, ox: 8, lines: ['* A big screen. It shows what the classifier thinks you drew.'] },
      R: { t: 'deco', key: 'prop-rack', frames: 2, solid: true, lines: ['* A server rack. It hums the same note over and over.', '* It is training something. It will not say what.'] },
      X: { t: 'npc', id: 'bitsy', move: 'patrol', path: [[3, 10], [10, 10], [10, 7], [3, 7]], speed: 30 },
      K: { t: 'terminal', id: 'lab', ox: 8 },
      I: { t: 'sign', lines: [
        '* A note is taped to the wall:',
        "* 'The terminal runs a freeway. It is an {y}ILLUSTRATIVE TOY{w}, not the competition model.'",
        "* 'It shows the idea: a jam forms, a shockwave travels backwards, and a causal forecast tries to keep up.'",
      ] },
      A: { t: 'deco', key: 'prop-beakers', w: 2, solid: true, ox: 8, lines: ['* Beakers of glowing liquid. One is labelled "coffee". You do not trust it.'] },
      N: { t: 'button' },
      D: { t: 'sign', lines: [
        '* THE DIGIT FLOOR.',
        '* Stand on a floor pixel and press Z to switch it on or off. (Or just tap it.)',
        '* Draw a {y}7{w}. The screen shows what a tiny classifier thinks it is.',
        '* The round button wipes the floor clean.',
      ] },
      O: { t: 'encounter', enemy: 'leakage' },
      U: { t: 'sign', lines: [
        '* UNDER THE HOOD.',
        '* Vite, TypeScript and Phaser 3. No image files, no audio files: every sprite is drawn from code and every note is synthesized.',
        '* When you ask WAEL a question, a fuzzy search runs over a small local knowledge base. No network, no LLM.',
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
      '######33Q############Q44######',
      '#.....aa..............bb.....#',
      '#""L......................L""#',
      '#".........................."#',
      '#.FFF....................PPP.#',
      '#.FFF....................PPP.#',
      '#........V%%%%%%%%%%V........#',
      '#....X....%%%%%%%%%%....Y....#',
      '#.........%%%%E.%%%%.........#',
      '#.........%%%%..%%%%.........#',
      '#........V%%%%%%%%%%V........#',
      '#.........%%%%%%%%%%.........#',
      '#............................#',
      '#...C...H...........H....S...#',
      '5h..........................l6',
      '#..L.......U......W.......L..#',
      '#""........................""#',
      '#"............ss............"#',
      '##############22##############',
      '##############################',
    ],
    doors: { 3: { to: 'shop', spawn: 'a' }, 4: { to: 'library', spawn: 's' }, 2: { to: 'crossroads', spawn: 'j' }, 5: { to: 'house', spawn: 'e' }, 6: { to: 'lab', spawn: 'w' } },
    ents: {
      L: LAMP, H: BENCH, V: PLANT, '"': GRASS,
      Q: { t: 'deco', key: 'prop-shopsign', wall: true, base: '#', lines: ['* A little lantern sign over the door.', "* LEFT: LUMEN'S SKILLS & SUNDRIES.\n* RIGHT: THE LIBRARY. (Please be quiet. Hoot is napping.)"] },
      P: { t: 'deco', key: 'prop-potato', lines: ['* A tidy little potato farm.', '* Somebody very determined planted these. Every row is perfect.', '* (You feel like they would want you to keep going.)'] },
      F: BED_OF_FLOWERS,
      E: { t: 'deco', key: 'prop-fountain', frames: 2, w: 2, solid: true, lines: ['* A fountain. The water hums a little tune.', '* Coins at the bottom. Someone wished for "a good validation split".'] },
      X: { t: 'npc', id: 'byte', move: 'patrol', path: [[5, 8], [5, 13], [24, 13], [24, 8], [24, 4], [5, 4]], speed: 34 },
      Y: { t: 'npc', id: 'nibble', move: 'follow', lead: 'byte', speed: 40 },
      C: { t: 'npc', id: 'cache', move: 'wander', r: 1, speed: 6 },
      U: { t: 'sign', lines: ['* LAMPLIGHT SQUARE.', "* NORTH-WEST: Lumen's shop. NORTH-EAST: the Library.", "* WEST: WAEL's house. SOUTH: the Crossroads. EAST: the Lab."] },
      W: { t: 'sign', lines: ["* (A hand-painted sign with an arrow pointing west.)", "* \"WAEL'S HOUSE. Knock first. Or don't, the door is always open.\""] },
      S: { t: 'save', line: '* The lamplight and the sound of the fountain fill you with DETERMINATION.' },
    },
  },

  shop: {
    id: 'shop', name: "Lumen's Shop", theme: 'shop', music: 'shop', logic: 'shop', arrive: 'a',
    map: [
      '##################',
      '##################',
      '#................#',
      '#.J.....M......J.#',
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
      M: { t: 'lumen', ox: 8 }, K: { t: 'counter' }, L: PLANT,
      J: { t: 'deco', key: 'prop-jars', w: 1, solid: true, lines: ['* Jars of glowing skills. One is labelled "patience". It is empty.'] },
    },
  },

  // WAEL's house: his room (where you can meet him) and the hallway with the mirror
  house: {
    id: 'house', name: "WAEL's House", theme: 'house', music: 'home', logic: 'home', arrive: 'e',
    map: [
      '####################',
      '#####O#P####F#C#####',
      '#..................#',
      '#.B............D...#',
      '#...............W..#',
      '#..................#',
      '#K......::::.....G.#',
      '4w......::::......e5',
      '#.......::::.......#',
      '#..................#',
      '#..................#',
      '#L................L#',
      '####################',
    ],
    doors: { 5: { to: 'town', spawn: 'h' }, 4: { to: 'hallway', spawn: 'e' } },
    ents: {
      O: { t: 'deco', key: 'prop-window', frames: 2, wall: true, base: '#', lines: ['* A window. Outside, the underground has its own little stars.', '* They are probably just very far away LEDs. Still pretty.'] },
      P: { t: 'deco', key: 'prop-poster', wall: true, base: '#', lines: ['* A poster of a loss curve going down.', '* Someone drew a tiny star where it finally flattened out.'] },
      F: { t: 'deco', key: 'prop-frame', frame: 2, wall: true, base: '#', lines: ['* A framed drawing of a little robot.', '* It is labelled "my first agent". It has three legs. On purpose, apparently.'] },
      C: { t: 'deco', key: 'prop-cork', wall: true, base: '#', lines: ['* A cork board covered in sticky notes.', '* "1. train model  2. check for leakage  3. sleep (optional)"', '* "dont forget: validation set = sacred"'] },
      B: { t: 'deco', key: 'prop-bed', w: 2, solid: true, sh: 26, lines: ['* A bed with a purple blanket.', '* It looks very comfortable. And very rarely used before 3 AM.'] },
      D: { t: 'deco', key: 'prop-desk', frames: 2, w: 3, solid: true, sh: 18, ox: 8, lines: ['* A desk with two monitors.', '* One shows a loss curve going down. The other shows code, mid-sentence.', '* A sticky note on the screen: "commit before you break it".'] },
      K: { t: 'deco', key: 'prop-bookshelf', w: 2, solid: true, sh: 20, lines: ['* A bookshelf. Statistics, deep learning, a book on strategy, and one very old comic.', "* There's a gap where a book on 'patience' should be. Someone is still borrowing it."] },
      G: { t: 'deco', key: 'prop-gpu', frames: 2, solid: true, ox: 8, lines: ['* A computer tower with glowing fans.', '* It is warm. In winter it doubles as a heater. In summer it is a problem.'] },
      L: { t: 'deco', key: 'prop-rugplant', solid: true, lines: ['* A tall, leafy plant. It has survived several deadlines.'] },
      W: { t: 'npc', id: 'wael', move: 'patrol', path: [[16.5, 4], [11, 10], [3.5, 8.5], [11, 10]], speed: 30, ox: 8 },
    },
  },

  hallway: {
    id: 'hallway', name: 'The Hallway', theme: 'house', music: 'mirror', logic: 'home', arrive: 'e',
    map: [
      '######################',
      '######F###G###H###I###',
      '#.M.................T#',
      '#..:::::::::::::::::e5',
      '#...................L#',
      '######################',
      '######################',
    ],
    doors: { 5: { to: 'house', spawn: 'w' } },
    ents: {
      M: { t: 'reflect' },
      F: { t: 'deco', key: 'prop-frame', frame: 0, wall: true, base: '#', lines: ['* A framed drawing of a red heart, in crayon.', '* It is signed in the corner, very proudly.'] },
      G: { t: 'deco', key: 'prop-frame', frame: 1, wall: true, base: '#', lines: ['* A picture of mountains and a sun.', '* Somewhere up there is the surface. It seems far. It is closer than it looks.'] },
      H: { t: 'deco', key: 'prop-frame', frame: 2, wall: true, base: '#', lines: ['* A drawing of a tiny robot holding a wrench.', '* Underneath: "AUDITOR, FIXER, JUDGE. in that order."'] },
      I: { t: 'deco', key: 'prop-frame', frame: 3, wall: true, base: '#', lines: ['* A photo of a rubber duck.', '* It has listened to more bug reports than anyone in history.'] },
      T: { t: 'deco', key: 'prop-sidetable', solid: true, lines: ['* A small table with a single flower in a vase.', '* Somebody changes the water every day.'] },
      L: { t: 'deco', key: 'prop-rugplant', solid: true, lines: ['* A tall plant, standing guard at the end of the hall.'] },
    },
  },

  library: {
    id: 'library', name: 'The Library', theme: 'library', music: 'library', logic: 'library', arrive: 's',
    map: [
      '##########################',
      '############11#########2##',
      '#.A..B..C...jj...D..E..H.#',
      '#........................#',
      '#........................#',
      '#...........Y............#',
      '#.........::::::.........#',
      '#.........::::::.........#',
      '#...Z.....::Q:::.....Z...#',
      '#.........::::::.........#',
      '#........................#',
      '#....T.............T.....#',
      '#........................#',
      '#..S..................N..#',
      '#...........ss...........#',
      '############33############',
      '##########################',
    ],
    doors: { 1: { to: 'records', spawn: 's' }, 2: { to: 'hidden', spawn: 'a' }, 3: { to: 'town', spawn: 'b' } },
    spawns: { h: [23, 2] },
    ents: {
      A: { t: 'shelf', war: 0 }, B: { t: 'shelf', war: 1 }, C: { t: 'shelf', war: 2 }, D: { t: 'shelf', war: 3 }, E: { t: 'shelf', war: 4 },
      H: { t: 'odd' },
      Y: { t: 'npc', id: 'hoot', ox: 8 },
      Q: { t: 'lectern', base: ':', ox: 8 },
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
      '#..A..B...C..#',
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
      B: { t: 'sign', sprite: 'pedestal', ox: 8, lines: ['* A model with a perfect validation score.', "* It had seen the test set. It lives here now, where it can't hurt anyone."] },
      C: { t: 'sign', sprite: 'pedestal', lines: ["* A sketchbook. The first page shows a group of friends having a picnic under a tree.", '* The rest of the pages are blank. Waiting.'] },
      T: { t: 'deco', key: 'prop-trapdoor', lines: ['* A trapdoor marked BASEMENT.', '* It smells faintly of tears. You decide not to go down there today.'] },
      L: { t: 'cos', id: 'bulb', key: 'cos-bulb', lines: ['* A light bulb, glowing warm and steady.', '* You pick it up. It feels like carrying a tiny sun.', '* (New cosmetic: LIGHT BULB. Wear it from the MENU.)'] },
      N: { t: 'sign', ox: 8, lines: ['* THE UNSHIPPED ROOM.', "* Every builder has one. Ideas rest here until they're ready.", '* ...Or forever.'] },
      W: WEB,
    },
  },

  // ───────────────────────── up to the summit ─────────────────────────
  records: {
    id: 'records', name: 'Hall of Records', theme: 'records', music: 'records', arrive: 's',
    map: [
      '######################',
      '##Q##Q####11####Q##Q##',
      '##.....R..jj..R.....##',
      '#F.P..............P..#',
      '#....A....B.....C....#',
      '#....................#',
      '#....Y....::.........#',
      '#..P......::......P..#',
      '#V........::........V#',
      '#.........::.........#',
      '#..G......::......S..#',
      '##........ss........##',
      '##########33##########',
      '######################',
    ],
    doors: { 1: { to: 'garden', spawn: 's' }, 3: { to: 'library', spawn: 'j' } },
    ents: {
      V: PLANT,
      R: REELS,
      F: FLOPPIES,
      Q: { t: 'deco', key: 'prop-banner', wall: true, base: '#', lines: ['* A red banner with a golden star. It is very well ironed.'] },
      P: PILLAR,
      A: { t: 'trophy', comp: 'ieee' }, B: { t: 'trophy', comp: 'zindi', ox: 8 }, C: { t: 'trophy', comp: 'vec' },
      Y: { t: 'npc', id: 'knight', move: 'patrol', path: [[5, 6], [16, 6]], speed: 28 },
      G: { t: 'dyn', id: 'github' },
      S: { t: 'save', line: '* The quest matters more than the trophy. The thought fills you with DETERMINATION.' },
    },
  },

  garden: {
    id: 'garden', name: 'The Cluster Garden', theme: 'garden', music: 'garden', logic: 'garden', arrive: 's',
    map: [
      '########################',
      '###########11###########',
      '#H.........XX.........H#',
      '#......................#',
      '#......................#',
      '#.F..................F.#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#.F..................F.#',
      '#......................#',
      '#......................#',
      '#....N.....M......Y....#',
      '#H.........ss.........H#',
      '###########33###########',
      '########################',
    ],
    spawns: { j: [11.5, 3] },
    doors: { 1: { to: 'summit', spawn: 's' }, 3: { to: 'records', spawn: 'j' } },
    ents: {
      H: HEDGE,
      F: BED_OF_FLOWERS,
      X: { t: 'spikes', flag: 'kmeans' },
      N: { t: 'sign', lines: [
        '* THE CLUSTER GARDEN.',
        '* The glowing flowers grow in three patches. Each one takes the colour of its {y}nearest stone{w}.',
        '* Pull the lever to run {y}one step of k-means{w}: every stone rolls to the middle of the flowers that chose it.',
        '* When every patch has its own stone, the gate will open.',
      ] },
      M: { t: 'npc', id: 'moss', move: 'shy', ox: 8 },
      Y: { t: 'lever', id: 'kmeans' },
      // the three stones start in a bad spot on purpose (the room logic places them)
    },
  },

  summit: {
    id: 'summit', name: 'The Summit', theme: 'summit', music: 'summit', logic: 'summit', arrive: 's',
    map: [
      '########################',
      '#####E#####11#####E#####',
      '##.........jj.......O.##',
      '#..P................P..#',
      '#.................M....#',
      '#.R........B...........#',
      '#......A........A......#',
      '#..P................P..#',
      '#....M...............R.#',
      '#.O..........M.........#',
      '#...S..............N...#',
      '##.........ss.........##',
      '###########33###########',
      '########################',
    ],
    doors: { 1: { to: 'exit', spawn: 's' }, 3: { to: 'garden', spawn: 'j' } },
    ents: {
      A: LANTERN,
      R: MOSSROCK,
      M: SHROOMS,
      O: MONITOR,
      E: LEDS,
      P: { t: 'deco', key: 'prop-brazier', frames: 2, solid: true, lines: ['* A brazier. The flames lean toward the big board, like they are listening.'] },
      B: { t: 'boss', ox: 8 },
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
      G: { t: 'contact', kind: 'github', ox: 8 }, K: { t: 'contact', kind: 'kaggle', ox: 8 }, L: { t: 'contact', kind: 'linkedin', ox: 8 },
      E: { t: 'contact', kind: 'email', ox: 8 }, R: { t: 'contact', kind: 'resume', ox: 8 },
      S: { t: 'save', line: '* The thought of all the doors you opened fills you with DETERMINATION.', ox: 8 },
      X: { t: 'gate' },
    },
  },
};

// Deep links: /#/lab, /#/wael?q=..., /#/projects ...
const ALIASES: Record<string, string> = {
  start: 'start', hall: 'hall', hub: 'crossroads', home: 'crossroads', crossroads: 'crossroads', projects: 'ruins1', corridor: 'ruins1',
  swarm: 'ruins2', bridge: 'ruins2', projects2: 'ruins3', bowl: 'ruins3', ruins: 'ruins1', lab: 'lab', traffic: 'lab', digit: 'lab',
  town: 'town', square: 'town', records: 'records', trophies: 'records', competitions: 'records', library: 'library',
  artofwar: 'library', memorial: 'memorial', technoblade: 'memorial', shop: 'shop', skills: 'shop',
  wael: 'house', house: 'house', ask: 'house', mirror: 'hallway', hallway: 'hallway', garden: 'garden', kmeans: 'garden',
  summit: 'summit', boss: 'summit', exit: 'exit', contact: 'exit',
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
