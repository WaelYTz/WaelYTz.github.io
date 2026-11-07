// Palette from the profile toolkit (scripts/ut.py) plus per-wing tile themes.
export const C = {
  white: '#ffffff', yellow: '#ffff00', orange: '#ff8c1a', red: '#ff0000', grey: '#808080', black: '#000000',
  dim: '#4a4a4a', cyan: '#39c5ff', gold: '#ffd700', goldDark: '#b8860b', pink: '#ff4fa3', green: '#3ddc84',
  blue: '#2b6cff', purple: '#9d6bff',
} as const;

export const hex = (s: string) => parseInt(s.slice(1), 16);

// Flat, limited palettes: a lighter floor, a taller darker wall with a cornice and a baseboard, black void around.
export interface Theme {
  floor: [string, string, string]; // base, speckle, seam
  wallTop: string;
  wallFace: [string, string, string]; // face, shadow band, cornice highlight
  carpet: [string, string, string]; // base, border, thread
  edge: string; // outline where the void meets the floor
  accent: string;
  decor: 'window' | 'vine' | 'shelf' | 'panel' | 'none';
}

export const THEMES: Record<string, Theme> = {
  hub: { floor: ['#3a3352', '#433b5e', '#2e2842'], wallTop: '#050408', wallFace: ['#5b4b85', '#3f3360', '#8a78c0'], carpet: ['#7a2432', '#4e1520', '#d8a040'], edge: '#c8bdf0', accent: C.yellow, decor: 'window' },
  ruins: { floor: ['#2c3d37', '#34473f', '#22302b'], wallTop: '#040706', wallFace: ['#456a58', '#2e4a3c', '#7aa890'], carpet: ['#3a5a2a', '#24381a', '#a8c070'], edge: '#cfe8df', accent: C.green, decor: 'vine' },
  lab: { floor: ['#1e2a40', '#24324c', '#172034'], wallTop: '#03050a', wallFace: ['#2c4a74', '#1e3352', '#5a88c0'], carpet: ['#14304a', '#0c1e30', '#39c5ff'], edge: '#9fd8ff', accent: C.cyan, decor: 'panel' },
  records: { floor: ['#40291a', '#4a3020', '#321f13'], wallTop: '#080402', wallFace: ['#74462a', '#52301c', '#b07a48'], carpet: ['#8a1e28', '#5a121a', '#ffd700'], edge: '#ffe2a8', accent: C.gold, decor: 'window' },
  library: { floor: ['#3a2b1d', '#433222', '#2e2116'], wallTop: '#070503', wallFace: ['#62442a', '#46301c', '#987048'], carpet: ['#2e4a30', '#1c301e', '#d8c070'], edge: '#f5dcb0', accent: C.orange, decor: 'none' },
  memorial: { floor: ['#1c1c24', '#22222c', '#16161c'], wallTop: '#030304', wallFace: ['#30303e', '#22222c', '#5a5a70'], carpet: ['#2a2230', '#1a1520', '#ffd700'], edge: '#d8d8e8', accent: C.gold, decor: 'window' },
  shop: { floor: ['#3a2432', '#432a3a', '#2e1c28'], wallTop: '#060305', wallFace: ['#6a3656', '#4a243c', '#a8608a'], carpet: ['#6a2a1e', '#441a12', '#ffd23a'], edge: '#ffd0e8', accent: C.pink, decor: 'shelf' },
  mirror: { floor: ['#22274a', '#282e54', '#1b1f3c'], wallTop: '#030409', wallFace: ['#3c4688', '#2a3164', '#7080d0'], carpet: ['#2a1e50', '#1a1236', '#c8b8ff'], edge: '#d6dcff', accent: C.purple, decor: 'window' },
  exit: { floor: ['#1a1a1a', '#202020', '#141414'], wallTop: '#000000', wallFace: ['#333333', '#222222', '#606060'], carpet: ['#2a2a2a', '#1a1a1a', '#ffffff'], edge: '#ffffff', accent: C.red, decor: 'none' },
  town: { floor: ['#3e3a30', '#474236', '#322e26'], wallTop: '#060504', wallFace: ['#6a5a3e', '#4a3e2a', '#a8946a'], carpet: ['#5a4a2a', '#3a2e1a', '#ffd23a'], edge: '#f0e0b0', accent: C.yellow, decor: 'window' },
  summit: { floor: ['#2a2238', '#322842', '#211b2e'], wallTop: '#040306', wallFace: ['#4a3a6a', '#32284a', '#8a70c0'], carpet: ['#5a2030', '#3a1420', '#ffd700'], edge: '#e0d0ff', accent: C.gold, decor: 'window' },
  hidden: { floor: ['#2e1d3c', '#362344', '#251832'], wallTop: '#050308', wallFace: ['#523470', '#3a2452', '#8a60b0'], carpet: ['#3a1e40', '#26122a', '#e8d0ff'], edge: '#e8d0ff', accent: C.purple, decor: 'vine' },
};
