// Palette from the profile toolkit (scripts/ut.py) plus per-wing tile themes.
export const C = {
  white: '#ffffff', yellow: '#ffff00', orange: '#ff8c1a', red: '#ff0000', grey: '#808080', black: '#000000',
  dim: '#4a4a4a', cyan: '#39c5ff', gold: '#ffd700', goldDark: '#b8860b', pink: '#ff4fa3', green: '#3ddc84',
  blue: '#2b6cff', purple: '#9d6bff',
} as const;

export const hex = (s: string) => parseInt(s.slice(1), 16);

// Room themes. The world is an underground grown inside old computing machinery: server catacombs, a clean lab,
// a lamplit market square, wood-and-brass archives, a hedge garden and a night-sky summit.
// Drawn the classic top-down RPG way: flat colours, 2-3 shades per surface, near-black outlines, a two-tile wall
// face with its own texture, and the thick top of the wall seen from above framing the floor with an outline and a
// lit lip.
export type FloorKind = 'flat' | 'speckle' | 'planks' | 'tiles' | 'grass' | 'slabs' | 'void' | 'flagstone' | 'parquet' | 'rock' | 'sand';
export type PathKind = 'flat' | 'slab' | 'cobble' | 'dirt';
export type WallKind = 'server' | 'stone' | 'siding' | 'panel' | 'wallpaper' | 'hedge' | 'boards' | 'pilaster' | 'rock';
export type TopKind = 'stone' | 'plain' | 'leaf' | 'shingle' | 'beam' | 'plate' | 'sky' | 'rock' | 'starry';

export interface Theme {
  floor: [string, string, string]; // base, light detail, dark detail
  floorKind: FloorKind;
  path: [string, string, string]; // the '%' paving / path tile: base, light, dark
  pathKind: PathKind;
  top: [string, string, string]; // the top of the wall seen from above: base, texture line, lit lip
  topKind: TopKind;
  wallFace: [string, string, string]; // face base, seams / mortar, highlight
  wallKind: WallKind;
  trim: [string, string]; // second wall colour (fins, wainscot, stripe, rail...): light, dark
  base: string; // skirting strip at the foot of the wall
  carpet: [string, string, string]; // base, pattern, thread
  line: string; // outlines (near black)
  accent: string;
  decor: 'window' | 'vine' | 'shelf' | 'panel' | 'none';
  trace?: [string, string]; // circuit-trace groove and its glowing pads
  fins?: boolean; // a band of heat-sink fins under the wall's lip
  cables?: [string, string, string]; // cables along the wall's foot: light, dark, second cable
  moss?: [string, string]; // moss on the stones: light, dark
  fleck?: string; // rare bright flecks in the floor (gold, copper...)
  sky?: string; // background of the starfield tile
}

export const THEMES: Record<string, Theme> = {
  // the crossroads, the hall and where you wake up: a warm sandy square, wooden fronts under timber roofs
  hub: {
    floor: ['#b08458', '#c09466', '#94704a'], floorKind: 'sand',
    path: ['#a08a6e', '#b49e80', '#7a6650'], pathKind: 'cobble',
    top: ['#7a3a2c', '#5a2820', '#a05440'], topKind: 'shingle',
    wallFace: ['#c4783a', '#6a3818', '#e0964e'], wallKind: 'siding',
    trim: ['#8a4a22', '#6a3818'], base: '#6a3818',
    carpet: ['#7a2a2a', '#521a1a', '#ffd23a'], line: '#140a04', accent: C.yellow, decor: 'window',
  },
  // the deeper catacombs (ruins 1-3): greener, mossier, green traces, mushrooms and vines
  ruins: {
    floor: ['#4a5c52', '#566a5c', '#3a4a42'], floorKind: 'flagstone',
    path: ['#64786a', '#72887a', '#4c5e52'], pathKind: 'slab',
    top: ['#1e2a24', '#18221d', '#3c5444'], topKind: 'stone',
    wallFace: ['#34463e', '#141c18', '#4a6052'], wallKind: 'server',
    trim: ['#7c8c80', '#46544a'], base: '#26302a',
    carpet: ['#2e5a3a', '#244a2e', '#9ad870'], line: '#080c0a', accent: C.green, decor: 'vine',
    trace: ['#2a8a4a', '#8af0a0'], fins: true, cables: ['#56625a', '#242c28', '#7a5a2a'], moss: ['#6aa84a', '#3e7a32'], fleck: '#a0703c',
  },
  // the Memorial: the quietest catacomb, dark stone with faint gold traces
  memorial: {
    floor: ['#363844', '#40424f', '#2c2d37'], floorKind: 'slabs',
    path: ['#40424f', '#4a4c5a', '#363844'], pathKind: 'slab',
    top: ['#1a1b22', '#16171d', '#383a48'], topKind: 'stone',
    wallFace: ['#3a3c4a', '#16161e', '#4c4e60'], wallKind: 'server',
    trim: ['#5a5c6c', '#3a3c4a'], base: '#4a4c5a',
    carpet: ['#3c2e52', '#30243f', '#d8b858'], line: '#08080c', accent: C.gold, decor: 'window',
    trace: ['#7a5a2a', '#e8c060'],
  },
  // a clean lab: pale floor tiles, white panels with a teal stripe, steel wall tops
  lab: {
    floor: ['#9db0c0', '#b3c4d2', '#7f93a6'], floorKind: 'tiles',
    path: ['#b3c4d2', '#c8d6e2', '#8a9eb0'], pathKind: 'slab',
    top: ['#4c5c70', '#3e4c5e', '#6a7c92'], topKind: 'plate',
    wallFace: ['#d4dee6', '#8ea0b0', '#f0f6fa'], wallKind: 'panel',
    trim: ['#2fb2c8', '#1a7a90'], base: '#5c6e82',
    carpet: ['#33557a', '#22405e', '#5ad8ff'], line: '#0c1018', accent: C.cyan, decor: 'panel',
  },
  // the Hall of Records: mahogany and brass, a basket-weave parquet
  records: {
    floor: ['#6e3826', '#7a422e', '#5a2c1e'], floorKind: 'parquet',
    path: ['#7e422e', '#8e5038', '#5e2c1e'], pathKind: 'slab',
    top: ['#2c1610', '#24120c', '#5a3020'], topKind: 'beam',
    wallFace: ['#5a2c1e', '#2a120a', '#74402c'], wallKind: 'pilaster',
    trim: ['#d8a848', '#9a6e28'], base: '#2a120a',
    carpet: ['#9a2430', '#7a1a24', '#e8c060'], line: '#0e0604', accent: C.gold, decor: 'window',
  },
  // dark wood: plank floor, panelled walls, heavy beams
  library: {
    floor: ['#6a4428', '#7c5232', '#52321c'], floorKind: 'planks',
    path: ['#7c5232', '#8e6040', '#5e3a20'], pathKind: 'slab',
    top: ['#3a2414', '#2e1c0e', '#56381e'], topKind: 'beam',
    wallFace: ['#5a3a22', '#2a180c', '#74502e'], wallKind: 'boards',
    trim: ['#46301a', '#2a180c'], base: '#3a2414',
    carpet: ['#2e5a3a', '#24492e', '#c8a858'], line: '#0e0804', accent: C.orange, decor: 'none',
  },
  // a warm little shop: honey boards, lit wood siding
  shop: {
    floor: ['#a4612e', '#b87238', '#844c22'], floorKind: 'planks',
    path: ['#b87238', '#c88446', '#94562a'], pathKind: 'slab',
    top: ['#5a2c14', '#4a2410', '#7a4020'], topKind: 'beam',
    wallFace: ['#d08440', '#7a3e18', '#eca458'], wallKind: 'siding',
    trim: ['#a85a28', '#7a3e18'], base: '#7a3e18',
    carpet: ['#8a2a3e', '#5e1a2a', '#ffc84a'], line: '#140804', accent: C.pink, decor: 'shelf',
  },
  // unused (kept for old saves)
  mirror: {
    floor: ['#3c4a6a', '#485878', '#303c58'], floorKind: 'slabs',
    path: ['#485878', '#56668a', '#3c4a6a'], pathKind: 'slab',
    top: ['#1c2234', '#181d2c', '#3a4660'], topKind: 'stone',
    wallFace: ['#3a4660', '#141824', '#4e5c7a'], wallKind: 'stone',
    trim: ['#4e5c7a', '#3a4660'], base: '#485878',
    carpet: ['#2a2e50', '#222640', '#c8c8ff'], line: '#06061a', accent: C.purple, decor: 'window',
  },
  // the way out: a dark floor floating in stars, bright lips
  exit: {
    floor: ['#1a1a2c', '#26263c', '#121220'], floorKind: 'void',
    path: ['#26263c', '#30304a', '#1a1a2c'], pathKind: 'flat',
    top: ['#0e0e1a', '#16162a', '#d8d8f0'], topKind: 'starry',
    wallFace: ['#2a2a40', '#0a0a14', '#3c3c58'], wallKind: 'stone',
    trim: ['#2a2a40', '#1a1a2c'], base: '#3c3c58',
    carpet: ['#2a2a40', '#1a1a2c', '#ffffff'], line: '#000000', accent: C.red, decor: 'none',
  },
  // Lamplight Square: packed sand, a cobbled plaza, wooden fronts under timber roofs
  town: {
    floor: ['#b08458', '#c09466', '#94704a'], floorKind: 'sand',
    path: ['#a08a6e', '#b49e80', '#7a6650'], pathKind: 'cobble',
    top: ['#7a3a2c', '#5a2820', '#a05440'], topKind: 'shingle',
    wallFace: ['#c4783a', '#6a3818', '#e0964e'], wallKind: 'siding',
    trim: ['#8a4a22', '#6a3818'], base: '#6a3818',
    carpet: ['#7a2a2a', '#521a1a', '#ffd23a'], line: '#140a04', accent: C.yellow, decor: 'window',
  },
  // a dusky stone peak
  summit: {
    floor: ['#5e4e6e', '#6e5c80', '#4a3c5a'], floorKind: 'speckle',
    path: ['#6e5c80', '#80709a', '#54446a'], pathKind: 'slab',
    top: ['#36283e', '#2a1e32', '#9a6c84'], topKind: 'rock',
    wallFace: ['#4e3e64', '#160e1e', '#6a5686'], wallKind: 'stone',
    trim: ['#4e3e64', '#3a2c4c'], base: '#7a6890',
    carpet: ['#7a2a3e', '#521a2a', '#ffd23a'], line: '#0a060e', accent: C.gold, decor: 'window',
  },
  // WAEL's house: walnut floorboards, a deep-blue starry wallpaper over a wainscot, dark wood beams
  house: {
    floor: ['#8e5a34', '#a06a3e', '#6c4226'], floorKind: 'planks',
    path: ['#a06a3e', '#b07a4a', '#7c4c2c'], pathKind: 'slab',
    top: ['#2e1e18', '#261812', '#5a3a28'], topKind: 'beam',
    wallFace: ['#2c3c64', '#22304e', '#8aa0d8'], wallKind: 'wallpaper',
    trim: ['#6a4024', '#4a2a16'], base: '#3a2214',
    carpet: ['#5a3a7e', '#4a2e68', '#d8b04a'], line: '#0e0a10', accent: C.purple, decor: 'none',
  },
  // the Cluster Garden: grass and hedge walls sprinkled with tiny fibre-optic blooms
  garden: {
    floor: ['#4e8e3e', '#60a24a', '#3e7632'], floorKind: 'grass',
    path: ['#a8946a', '#bca87c', '#84704e'], pathKind: 'dirt',
    top: ['#2e7430', '#225a24', '#4e9a40'], topKind: 'leaf',
    wallFace: ['#2a642a', '#163a16', '#428a38'], wallKind: 'hedge',
    trim: ['#8af0ff', '#ff9ad8'], base: '#2a3a1e',
    carpet: ['#8a7048', '#745c38', '#d8c070'], line: '#081408', accent: C.green, decor: 'vine',
  },
  // the Unshipped Room: a dusty attic of old boards and faded striped wallpaper
  hidden: {
    floor: ['#5a524e', '#68605a', '#46403c'], floorKind: 'planks',
    path: ['#68605a', '#766e66', '#5a524e'], pathKind: 'slab',
    top: ['#26201e', '#201a18', '#4a423e'], topKind: 'beam',
    wallFace: ['#6a5a66', '#544652', '#7e6e7a'], wallKind: 'wallpaper',
    trim: ['#5a4434', '#40302a'], base: '#40302a',
    carpet: ['#4a3a44', '#3e3039', '#c8b8a8'], line: '#0c0808', accent: C.purple, decor: 'vine',
  },
};
