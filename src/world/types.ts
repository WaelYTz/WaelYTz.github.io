// Shared world types (kept separate so lazily loaded room logic can import them without pulling the World scene).
import type Phaser from 'phaser';
import type { Ent } from './rooms';

export interface Rect { x: number; y: number; w: number; h: number; }

export interface Entity {
  def: Ent;
  key: string; // map letter
  tx: number;
  ty: number;
  sprite?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  solid?: Rect; // world px
  hit?: Rect; // interaction area, world px
  /** Return true when the interaction was handled. */
  interact?: () => Promise<void> | void;
  data: Record<string, unknown>;
}

/** Optional per-room behaviour, loaded on demand (code-split). */
export interface RoomLogic {
  create?(w: WorldApi): void;
  update?(w: WorldApi, dt: number): void;
  interact?(w: WorldApi, e: Entity): Promise<boolean> | boolean;
  /** Called when the player steps on a tile; return false to cancel the step. */
  onTile?(w: WorldApi, tx: number, ty: number): void;
  destroy?(w: WorldApi): void;
}

export interface WorldApi {
  s: Phaser.Scene;
  roomId: string;
  player: { x: number; y: number };
  ents: Entity[];
  tile(tx: number, ty: number): string;
  setTile(tx: number, ty: number, ch: string): void;
  say(lines: string | string[], voice?: import('../core/audio').Voice): Promise<void>;
  ask(lines: string | string[] | null, options: string[], cancel?: number): Promise<number>;
  teleport(x: number, y: number): void;
  freeze(on: boolean): void;
  solidAt(r: Rect, ignore?: Entity): boolean;
  addSolid(e: Entity, r: Rect | undefined): void;
  moving: boolean;
}
