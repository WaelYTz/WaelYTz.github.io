// Runtime game state (the save file in memory) + progress helpers shared by all scenes.
import { freshSave, loadSave, writeSave, type SaveData } from './save';

export const MAIN_ROOMS = ['start', 'hall', 'crossroads', 'memorial', 'ruins1', 'ruins2', 'ruins3', 'lab', 'town', 'shop', 'house', 'hallway', 'library', 'records', 'garden', 'summit', 'exit'];
export const ENCOUNTERS = ['overfit', 'leakage', 'gradient'];
export const SECRETS: Record<string, string> = {
  konami: 'The old code',
  hidden: 'The Unshipped Room',
  crown: 'A tiny golden crown',
  potato: 'The potato question',
  patience: 'Stayed a while',
};
export const SECRET_COUNT = Object.keys(SECRETS).length;

type Listener = (kind: 'secret' | 'toast', text: string) => void;

class GameState {
  s: SaveData = freshSave('');
  private running = false;
  private last = 0;
  private listeners: Listener[] = [];
  /** Snapshot of the last written save (for the title screen). */
  saved: SaveData | null = loadSave();

  on(l: Listener) {
    this.listeners.push(l);
  }
  emit(kind: 'secret' | 'toast', text: string) {
    this.listeners.forEach((l) => l(kind, text));
  }

  startNew(name: string) {
    this.s = freshSave(name);
  }
  continueSave(): boolean {
    const s = loadSave();
    if (!s) return false;
    this.s = s;
    return true;
  }
  /** Accumulate play time only while the world is active. */
  setRunning(on: boolean) {
    const now = performance.now();
    if (this.running) this.s.playMs += now - this.last;
    this.running = on;
    this.last = now;
  }
  playMs() {
    return this.s.playMs + (this.running ? performance.now() - this.last : 0);
  }
  save(room: string, x: number, y: number) {
    this.setRunning(this.running);
    this.s.room = room;
    this.s.x = Math.round(x);
    this.s.y = Math.round(y);
    writeSave(this.s);
    this.saved = JSON.parse(JSON.stringify(this.s));
  }

  get name() {
    return this.s.name || 'VISITOR';
  }
  visit(room: string): boolean {
    if (this.s.visited.includes(room)) return false;
    this.s.visited.push(room);
    return true;
  }
  visitedMain() {
    return MAIN_ROOMS.filter((r) => this.s.visited.includes(r)).length;
  }
  hasSecret(id: string) {
    return this.s.secrets.includes(id);
  }
  secret(id: string): boolean {
    if (this.hasSecret(id) || !SECRETS[id]) return false;
    this.s.secrets.push(id);
    this.emit('secret', `* Secret found: ${SECRETS[id]}  (${this.s.secrets.length}/${SECRET_COUNT})`);
    return true;
  }
  flag(k: string) {
    return this.s.flags[k];
  }
  setFlag(k: string, v: boolean | number | string = true) {
    this.s.flags[k] = v;
  }
  has(item: string) {
    return this.s.inventory.includes(item);
  }
  give(item: string) {
    if (!this.has(item)) this.s.inventory.push(item);
  }
  hasCos(id: string) {
    return this.s.cosmetics.includes(id);
  }
  /** Give a cosmetic (and wear it straight away). Returns true if it is new. */
  giveCos(id: string): boolean {
    if (this.hasCos(id)) return false;
    this.s.cosmetics.push(id);
    this.s.wear = id;
    this.emit('toast', `* New cosmetic! Wear it from MENU > WEAR.`);
    return true;
  }
  /** Route summary used by endings and the STAT menu. */
  route(): 'pacifist' | 'fight' | 'neutral' {
    if (this.s.fought.length > 0) return 'fight';
    if (ENCOUNTERS.every((e) => this.s.spared.includes(e))) return 'pacifist';
    return 'neutral';
  }
}

export const game = new GameState();
