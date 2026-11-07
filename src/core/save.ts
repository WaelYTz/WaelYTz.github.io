// Save file + settings in localStorage. Every access is wrapped: private mode / blocked storage must never break the game.

export interface SaveData {
  v: 1;
  name: string;
  room: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lv: number;
  playMs: number;
  visited: string[];
  spared: string[];
  fought: string[];
  secrets: string[];
  inventory: string[];
  flags: Record<string, boolean | number | string>;
  endings: string[];
  cosmetics: string[];
  wear: string;
  savedAt: number;
}

const KEY = 'wael.save.v1';
const SKEY = 'wael.settings.v1';

export function freshSave(name: string): SaveData {
  return {
    v: 1, name, room: 'start', x: -1, y: -1, hp: 20, maxHp: 20, lv: 1, playMs: 0,
    visited: [], spared: [], fought: [], secrets: [], inventory: [], flags: {}, endings: [], cosmetics: [], wear: '', savedAt: 0,
  };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSave(): SaveData | null {
  const s = read<SaveData>(KEY);
  if (!s || s.v !== 1 || typeof s.name !== 'string') return null;
  const merged = { ...freshSave(s.name), ...s };
  // saves from the first version of the map pointed at rooms that no longer exist
  if (!['start', 'hall', 'crossroads', 'memorial', 'ruins1', 'ruins2', 'ruins3', 'lab', 'town', 'shop', 'library', 'hidden', 'records', 'mirror', 'summit', 'exit'].includes(merged.room)) {
    merged.room = 'crossroads';
    merged.x = -1;
    merged.y = -1;
  }
  return merged;
}
export function writeSave(s: SaveData): boolean {
  s.savedAt = Date.now();
  return write(KEY, s);
}
export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export type TextSpeed = 'normal' | 'fast' | 'instant';
export interface Settings { muted: boolean; textSpeed: TextSpeed; }
export function loadSettings(): Settings {
  return { muted: true, textSpeed: 'normal', ...(read<Partial<Settings>>(SKEY) ?? {}) };
}
export function saveSettings(s: Settings): void {
  write(SKEY, s);
}

/** Tiny cache helper for fetched public data. */
export function cacheGet<T>(key: string, maxAgeMs: number): T | null {
  const c = read<{ t: number; d: T }>('wael.cache.' + key);
  return c && Date.now() - c.t < maxAgeMs ? c.d : null;
}
export function cacheSet(key: string, d: unknown): void {
  write('wael.cache.' + key, { t: Date.now(), d });
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
