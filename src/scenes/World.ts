// The overworld: tile rooms, the SOUL, collisions, click/tap-to-walk, doors, entities, encounters, room logic.
import Phaser from 'phaser';
import { buildTileset, T, TILE } from '../core/art';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { game as G, MAIN_ROOMS } from '../core/state';
import { REDUCED, COARSE } from '../core/env';
import { THEMES } from '../core/palette';
import { NPCS } from '../content/npcs';
import { COSMETICS } from '../core/cast';
import { label } from '../core/text';
import { ROOMS, type RoomDef, type Ent } from '../world/rooms';
import type { Entity, Rect, RoomLogic, WorldApi } from '../world/types';
import { projectById } from '../content/projects';
import { COMPETITIONS, WAR } from '../content/lore';
import { PROFILE, EMAIL_OBFUSCATED, emailAddress } from '../content/profile';
import { githubStats, profileEncounter } from '../core/remote';
import type { UIScene } from './UI';

const LOGIC: Record<string, () => Promise<{ default: RoomLogic }>> = {
  start: () => import('../world/logic/start'),
  ruins1: () => import('../world/logic/ruins1'),
  ruins2: () => import('../world/logic/ruins2'),
  ruins3: () => import('../world/logic/ruins3'),
  summit: () => import('../world/logic/summit'),
  lab: () => import('../world/logic/lab'),
  library: () => import('../world/logic/library'),
  hidden: () => import('../world/logic/hidden'),
  memorial: () => import('../world/logic/memorial'),
  shop: () => import('../world/logic/shop'),
  mirror: () => import('../world/logic/mirror'),
  exit: () => import('../world/logic/exit'),
};

const WALK = 92;
const RUN = 150;
const HB = { w: 9, h: 8 }; // player hitbox, centred on (x, y)

const isWalkChar = (c: string) => '.,:=%";'.includes(c) || /[0-9a-zA-Z]/.test(c);

interface InitData { room: string; spawn?: string; x?: number; y?: number; intro?: boolean; ask?: string; }

export class WorldScene extends Phaser.Scene implements WorldApi {
  roomId = 'entrance';
  room!: RoomDef;
  grid: string[][] = [];
  ents: Entity[] = [];
  player = { x: 0, y: 0 };
  moving = false;
  private soul!: Phaser.GameObjects.Image;
  private crown: Phaser.GameObjects.Image | null = null;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids: { e: Entity; r: Rect }[] = [];
  private frozen = false;
  private transitioning = false;
  private ghostT = 0;
  private bobT = 0;
  private path: { x: number; y: number }[] = [];
  private pathTarget: Entity | null = null;
  private facing = { x: 0, y: 1 };
  private zhint!: Phaser.GameObjects.Image;
  private logic: RoomLogic | null = null;
  private data0!: InitData;
  private stepTile = '';
  private hinted = false;
  private encCooldown = 0;
  private startedAt = 0;

  constructor() {
    super('world');
  }

  get ui() {
    return this.scene.get('ui') as UIScene;
  }
  /** The scene itself, for room logic (WorldApi). */
  get s(): Phaser.Scene {
    return this;
  }

  init(data: InitData) {
    this.data0 = data;
    this.roomId = ROOMS[data.room] ? data.room : 'entrance';
    this.room = ROOMS[this.roomId];
    this.ents = [];
    this.solids = [];
    this.path = [];
    this.pathTarget = null;
    this.frozen = false;
    this.transitioning = false;
    this.logic = null;
    this.crown = null;
  }

  // ───────────────────────── map ─────────────────────────
  tile(tx: number, ty: number): string {
    return this.grid[ty]?.[tx] ?? ' ';
  }
  private baseChar(tx: number, ty: number): string {
    const c = this.tile(tx, ty);
    if (/[A-Z]/.test(c)) {
      const e = this.room.ents[c] as { base?: string } | undefined;
      return e?.base ?? '.';
    }
    return c;
  }
  private walkable(tx: number, ty: number) {
    return isWalkChar(this.baseChar(tx, ty));
  }
  private tileIndex(tx: number, ty: number): number {
    const c = this.baseChar(tx, ty);
    const wk = (x: number, y: number) => this.walkable(x, y) || this.baseChar(x, y) === '~' || this.baseChar(x, y) === 'x';
    switch (c) {
      case ' ': return T.VOID;
      case ',': return T.FLOOR2;
      case '"':
      case ';': return T.FLOOR;
      case ':': return T.CARPET;
      case '=': return T.PLANK;
      case 'x': return T.BROKEN;
      case '%': return T.STONE;
      case '~': return this.walkable(tx, ty - 1) ? T.LEDGE : T.CHASM;
      case '#':
      case '*': {
        if (c === '#') {
          const below = this.baseChar(tx, ty + 1);
          const doorBelow = /[0-9]/.test(below);
          // the wall above a doorway, and the upper half of a two-tile wall, get the cornice
          if (doorBelow && this.walkable(tx, ty + 2)) return T.FACE_UP;
          if (!doorBelow && wk(tx, ty + 1) && below !== '~') return T.WALLFACE;
          if (below === '#' && this.walkable(tx, ty + 2) && !/[0-9~]/.test(this.baseChar(tx, ty + 2))) return T.FACE_UP;
        }
        const m = (wk(tx, ty - 1) ? 1 : 0) | (wk(tx + 1, ty) ? 2 : 0) | (wk(tx, ty + 1) ? 4 : 0) | (wk(tx - 1, ty) ? 8 : 0);
        return T.WALLTOP + m;
      }
    }
    if (/[0-9]/.test(c)) return T.DOOR;
    if (/[a-z]/.test(c)) {
      const up = this.baseChar(tx, ty - 1), dn = this.baseChar(tx, ty + 1);
      return up === ':' || dn === ':' ? T.CARPET : T.FLOOR;
    }
    return T.FLOOR;
  }
  setTile(tx: number, ty: number, ch: string) {
    if (!this.grid[ty]) return;
    this.grid[ty][tx] = ch;
    for (let y = ty - 1; y <= ty + 1; y++)
      for (let x = tx - 1; x <= tx + 1; x++) if (this.grid[y]?.[x] !== undefined) this.layer.putTileAt(this.tileIndex(x, y), x, y);
  }

  // ───────────────────────── create ─────────────────────────
  create() {
    const r = this.room;
    this.grid = r.map.map((row) => [...row]);
    const Wt = this.grid[0].length, Ht = this.grid.length;
    const tiles = buildTileset(this, r.theme);
    const data: number[][] = [];
    for (let y = 0; y < Ht; y++) {
      data.push([]);
      for (let x = 0; x < Wt; x++) data[y].push(this.tileIndex(x, y));
    }
    this.map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = this.map.addTilesetImage(tiles, tiles, TILE, TILE, 0, 0)!;
    this.layer = this.map.createLayer(0, ts, 0, 0)!.setDepth(-10);

    // labels painted on walls / floors
    for (const l of r.labels ?? []) label(this, l.x * TILE, l.y * TILE, l.text, l.color ?? 'w', 1, l.align ?? 'l').setDepth(-5);
    this.decorateWalls(data);

    // entities
    for (let y = 0; y < Ht; y++)
      for (let x = 0; x < Wt; x++) {
        const k = this.grid[y][x];
        if (/[A-Z]/.test(k) && r.ents[k]) this.spawnEntity(r.ents[k], k, x, y);
      }

    // player
    const p = this.spawnPoint();
    this.player = { x: p.x, y: p.y };
    this.soul = this.add.image(p.x, p.y, 'soul').setScale(2).setDepth(p.y + 6);
    this.wearCosmetic();
    this.zhint = this.add.image(0, 0, 'zhint').setVisible(false).setDepth(9000);

    // camera
    const cam = this.cameras.main;
    cam.setZoom(2);
    cam.setBackgroundColor('#000000');
    this.updateCamera();
    if (!REDUCED) cam.fadeIn(180, 0, 0, 0);

    // input: click / tap to walk
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onPointer(ptr));
    const onKonami = () => this.konami();
    this.game.events.on('konami', onKonami);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('konami', onKonami);
      this.logic?.destroy?.(this);
      G.setRunning(false);
    });

    audio.music(r.music);
    this.ui.travel = (room) => this.goto(room, ROOMS[room]?.arrive);
    this.registry.set('world', this);
    G.setRunning(true);
    this.startedAt = this.time.now;
    const fresh = G.visit(this.roomId);
    this.ui.banner(r.name);
    if (fresh && MAIN_ROOMS.every((m) => G.s.visited.includes(m))) G.emit('toast', '* You have seen every room. The exit awaits.');

    if (!this.hinted && this.roomId === 'entrance' && G.playMs() < 60000) {
      this.ui.hint(COARSE ? 'TAP TO WALK · Z: TALK · C: MENU' : 'ARROWS/WASD: MOVE · Z: TALK · C: MENU · CLICK TO WALK');
    }

    // room logic (code-split, loaded on demand)
    const loader = r.logic ? LOGIC[r.logic] : null;
    if (loader) {
      this.frozen = true;
      loader().then((m) => {
        if (!this.scene.isActive()) return;
        this.logic = m.default;
        this.logic.create?.(this);
        this.frozen = false;
        this.afterEnter();
      }).catch(() => { this.frozen = false; this.afterEnter(); });
    } else this.afterEnter();
  }

  private async afterEnter() {
    if (this.data0.intro) {
      this.data0.intro = false;
      await this.say([
        '* ...',
        '* You wake up on a cold, quiet floor made of pixels.',
        '* Somewhere down here is everything WAEL has ever built.',
        '* (And at least one very proud potted plant.)',
        '* Every door leads to a wing. Every wing has a story.',
        '* Go on, {y}{name}{w}. Take your time.',
      ]);
    }
    if (this.data0.ask && this.roomId === 'mirror') {
      const ask = this.data0.ask;
      this.data0.ask = undefined;
      const mirror = this.ents.find((e) => e.def.t === 'mirror');
      if (mirror) await this.interactWith(mirror, ask);
    }
  }

  /**
   * Room dressing, placed on purpose: wall decorations at an even rhythm mirrored around the room's centre
   * (never next to doors or props), plus grass and rubble wherever the map asks for them.
   */
  private decorateWalls(data: number[][]) {
    const kind = THEMES[this.room.theme]?.decor ?? 'none';
    const W = data[0].length;
    for (let y = 0; y < data.length; y++)
      for (let x = 0; x < W; x++) {
        const c = this.tile(x, y);
        if (c === '"') this.add.image(x * TILE, y * TILE, 'prop-grass').setOrigin(0).setDepth(-7);
        if (c === ';') this.add.image(x * TILE, y * TILE, 'prop-rubble').setOrigin(0).setDepth(-7);
      }
    if (kind === 'none') return;
    const mid = (W - 1) / 2;
    for (let y = 0; y < data.length - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        if (data[y][x] !== T.FACE_UP || data[y + 1][x] !== T.WALLFACE) continue;
        const d = Math.abs(x - mid);
        if (Math.round(d) % 4 !== 2) continue; // an even rhythm, symmetric around the middle
        const busy = (xx: number) => [-1, 0, 1].some((k) => /[0-9A-Z]/.test(this.tile(xx + k, y + 1)) || /[0-9A-Z]/.test(this.tile(xx + k, y + 2)));
        if (busy(x) || busy(Math.round(2 * mid - x))) continue; // keep the pair symmetric
        this.add.image(x * TILE + 8, y * TILE + 4, 'decor-' + kind).setOrigin(0.5, 0).setDepth(-8);
      }
  }

  private spawnPoint() {
    const d = this.data0;
    if (d.x !== undefined && d.y !== undefined && d.x >= 0 && !d.spawn) return { x: d.x, y: d.y };
    const key = d.spawn ?? 'a';
    const exp = this.room.spawns?.[key];
    if (exp) return { x: exp[0] * TILE + 8, y: exp[1] * TILE + 8 };
    let sx = 0, sy = 0, n = 0;
    this.grid.forEach((row, y) => row.forEach((c, x) => { if (c === key) { sx += x; sy += y; n++; } }));
    if (!n) return { x: (this.grid[0].length * TILE) / 2, y: (this.grid.length * TILE) / 2 };
    return { x: (sx / n) * TILE + 8, y: (sy / n) * TILE + 8 };
  }

  // ───────────────────────── entities ─────────────────────────
  addSolid(e: Entity, r: Rect | undefined) {
    this.solids = this.solids.filter((s) => s.e !== e);
    e.solid = r;
    if (r) this.solids.push({ e, r });
  }

  private img(key: string, x: number, y: number, ox = 0.5, oy = 1) {
    const s = this.add.image(x, y, key).setOrigin(ox, oy);
    s.setDepth(y);
    return s;
  }

  private spawnEntity(def: Ent, key: string, tx: number, ty: number) {
    const e: Entity = { def, key, tx, ty, data: {} };
    const X = tx * TILE, Y = ty * TILE, cx = X + 8, by = Y + 16;
    const tileRect = { x: X, y: Y, w: 16, h: 16 };
    const small = { x: X + 2, y: Y + 6, w: 12, h: 10 };
    e.hit = { x: X - 1, y: Y - 1, w: 18, h: 18 };
    switch (def.t) {
      case 'sign':
      case 'dyn': {
        const spr = 'sprite' in def ? def.sprite : 'sign';
        if (spr !== 'none') e.sprite = this.img(spr === 'pedestal' ? 'pedestal' : 'sign', cx, by);
        this.addSolid(e, small);
        break;
      }
      case 'save': {
        const halo = this.add.image(cx, Y + 8, 'halo').setDepth(by - 1).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1);
        e.sprite = this.img('star', cx, Y + 14);
        if (!REDUCED) {
          this.tweens.add({ targets: e.sprite, scaleX: 0.8, scaleY: 0.8, alpha: 0.7, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: halo, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        this.addSolid(e, { x: X + 3, y: Y + 6, w: 10, h: 8 });
        break;
      }
      case 'pedestal': {
        e.sprite = this.img('pedestal', cx, by);
        const icon = this.add.image(cx, Y - 4, 'icon-' + def.project).setDepth(by + 1);
        if (!REDUCED) this.tweens.add({ targets: icon, y: Y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        e.data.icon = icon;
        this.addSolid(e, { x: X + 1, y: Y + 4, w: 14, h: 12 });
        break;
      }
      case 'trophy': {
        e.sprite = this.img('pedestal', cx, by);
        this.add.image(cx, Y + 4, 'trophy').setOrigin(0.5, 1).setDepth(by + 1);
        this.addSolid(e, { x: X + 1, y: Y + 4, w: 14, h: 12 });
        break;
      }
      case 'shelf':
      case 'odd':
        e.sprite = this.img(def.t === 'odd' ? 'shelf-odd' : 'shelf', cx, by);
        this.addSolid(e, tileRect);
        break;
      case 'lectern':
        e.sprite = this.img('pedestal', cx, by);
        this.add.image(cx, Y + 3, 'icon-mlscratch').setDepth(by + 1).setScale(0.8);
        this.addSolid(e, { x: X + 1, y: Y + 4, w: 14, h: 12 });
        break;
      case 'pillar':
        e.sprite = this.img('pillar', cx, by);
        this.addSolid(e, tileRect);
        break;
      case 'plant':
        e.sprite = this.img('plant', cx, by + 2);
        this.addSolid(e, small);
        break;
      case 'candle': {
        const s = this.add.sprite(cx, by, 'candle', 0).setOrigin(0.5, 1).setDepth(by);
        if (!REDUCED) this.time.addEvent({ delay: 300 + Math.random() * 200, loop: true, callback: () => s.setFrame(s.frame.name === '0' ? 1 : 0) });
        e.sprite = s;
        this.addSolid(e, { x: X + 4, y: Y + 8, w: 8, h: 8 });
        break;
      }
      case 'encounter': {
        const resolved = G.s.spared.includes(def.enemy) || G.s.fought.includes(def.enemy);
        this.layer.putTileAt(resolved ? T.FLOOR : T.GLOW, tx, ty);
        if (!resolved && !REDUCED) {
          const glow = this.add.rectangle(cx, Y + 8, 16, 16, 0xff2020, 0.25).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: glow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });
          e.data.glow = glow;
        }
        e.hit = undefined;
        break;
      }
      case 'lumen':
        e.sprite = this.img('lumen', cx, by);
        if (!REDUCED) this.tweens.add({ targets: e.sprite, y: by - 1, duration: 800, yoyo: true, repeat: -1, ease: 'Stepped' });
        this.addSolid(e, { x: X - 2, y: Y + 4, w: 20, h: 12 });
        break;
      case 'counter':
        e.sprite = this.img('counter', X, by, 0, 1);
        this.addSolid(e, { x: X, y: Y + 2, w: 48, h: 14 });
        e.hit = { x: X - 1, y: Y - 1, w: 50, h: 20 };
        break;
      case 'crown':
        e.sprite = this.img('pedestal', cx, by);
        e.data.crown = this.add.image(cx, Y + 2, 'crown').setOrigin(0.5, 1).setDepth(by + 1);
        if (!REDUCED) this.tweens.add({ targets: e.data.crown, y: Y, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.addSolid(e, { x: X + 1, y: Y + 4, w: 14, h: 12 });
        break;
      case 'crownPickup':
        if (!G.hasSecret('crown')) {
          e.sprite = this.img('crown-pickup', cx, Y + 12);
          e.sprite.setAlpha(0.85);
          if (!REDUCED) this.tweens.add({ targets: e.sprite, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
        } else e.hit = undefined;
        break;
      case 'mirror':
        e.sprite = this.img('mirror', X + 16, by);
        this.addSolid(e, { x: X, y: Y + 6, w: 32, h: 10 });
        e.hit = { x: X - 2, y: Y - 2, w: 36, h: 20 };
        break;
      case 'terminal':
        e.sprite = this.img('terminal', cx, by);
        this.addSolid(e, { x: X + 1, y: Y + 6, w: 14, h: 10 });
        break;
      case 'screen':
        e.sprite = this.add.image(X + 16, Y + 8, 'screen').setDepth(-3);
        e.hit = { x: X, y: Y, w: 32, h: 18 };
        break;
      case 'maptable':
        e.sprite = this.img('maptable', X, Y + 32, 0, 1);
        this.addSolid(e, { x: X, y: Y + 6, w: 48, h: 26 });
        e.hit = { x: X - 2, y: Y - 2, w: 52, h: 36 };
        break;
      case 'lever': {
        const s = this.add.sprite(cx, by, 'lever', 0).setOrigin(0.5, 1).setDepth(by);
        e.sprite = s;
        this.addSolid(e, { x: X + 3, y: Y + 8, w: 10, h: 8 });
        break;
      }
      case 'ball':
        e.data.x = cx;
        e.data.y = Y + 8;
        e.sprite = this.add.image(cx, Y + 8, 'ball').setDepth(Y + 13);
        e.hit = { x: X - 2, y: Y - 2, w: 20, h: 20 };
        break;
      case 'contact':
        // plain signs: what they say is only revealed when you read them
        e.sprite = this.img('sign', cx, by);
        this.addSolid(e, small);
        break;
      case 'gate':
        e.sprite = this.img('gate', X + 16, by);
        if (!REDUCED) this.tweens.add({ targets: e.sprite, alpha: 0.75, duration: 1200, yoyo: true, repeat: -1 });
        this.addSolid(e, { x: X, y: Y - 16, w: 32, h: 26 });
        e.hit = { x: X - 2, y: Y - 18, w: 36, h: 36 };
        break;
      case 'npc': {
        const npc = NPCS[def.id];
        if (!npc) break;
        const s = this.add.sprite(cx, by, npc.tex, 0).setOrigin(0.5, 1).setDepth(by);
        const frames = this.textures.get(npc.tex).frameTotal - 1;
        if (!REDUCED && frames > 1) {
          let f = 0;
          this.time.addEvent({ delay: def.id === 'pip' ? 160 : 420 + (tx % 3) * 60, loop: true, callback: () => { f = (f + 1) % frames; s.setFrame(f); } });
        }
        if (!REDUCED && (def.id === 'pip' || def.id === 'nibble')) this.tweens.add({ targets: s, y: by - 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        e.sprite = s;
        this.addSolid(e, { x: X + 1, y: Y + 6, w: 14, h: 10 });
        e.hit = { x: X - 2, y: Y - 4, w: 20, h: 22 };
        break;
      }
      case 'deco': {
        const tex = this.textures.get(def.key);
        const frames = tex.frameTotal - 1;
        const w = (def.w ?? 1) * TILE;
        const s = def.frames && frames > 1 ? this.add.sprite(X + w / 2, by + (def.dy ?? 0), def.key, 0) : this.add.image(X + w / 2, by + (def.dy ?? 0), def.key);
        s.setOrigin(0.5, def.wall ? 0.5 : 1).setDepth(def.wall ? -3 : def.dy !== undefined ? -2 : by);
        if (def.wall) s.setPosition(X + w / 2, Y + 8);
        if (def.frames && frames > 1 && !REDUCED && s instanceof Phaser.GameObjects.Sprite) {
          let f = 0;
          this.time.addEvent({ delay: 260 + (tx % 4) * 40, loop: true, callback: () => { f = (f + 1) % def.frames!; s.setFrame(f); } });
        }
        e.sprite = s;
        if (def.solid) this.addSolid(e, { x: X + 1, y: Y + 4, w: w - 2, h: 12 });
        e.hit = def.lines ? { x: X - 1, y: Y - 1, w: w + 2, h: 18 } : undefined;
        break;
      }
      case 'cos':
        if (G.hasCos(def.id)) { e.hit = undefined; break; }
        e.sprite = this.add.image(cx, Y + 8, def.key).setScale(2).setDepth(by);
        if (!REDUCED) this.tweens.add({ targets: e.sprite, y: Y + 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        break;
      case 'boss': {
        const s = this.add.sprite(X + 8, by + 8, 'npc-board', 0).setOrigin(0.5, 1).setDepth(by + 8);
        if (!REDUCED) {
          this.time.addEvent({ delay: 500, loop: true, callback: () => s.setFrame(s.frame.name === '0' ? 1 : 0) });
          this.tweens.add({ targets: s, y: by + 5, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        const glow = this.add.image(X + 8, Y, 'halo').setScale(2.4).setDepth(by - 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd23a);
        if (!REDUCED) this.tweens.add({ targets: glow, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
        e.sprite = s;
        this.addSolid(e, { x: X - 16, y: Y - 10, w: 48, h: 26 });
        e.hit = { x: X - 20, y: Y - 14, w: 56, h: 34 };
        break;
      }
    }
    this.ents.push(e);
    return e;
  }

  private cosDy = 0;
  /** Show whichever cosmetic the SOUL is wearing (crown, hard hat, headphones...). */
  wearCosmetic() {
    this.crown?.destroy();
    this.crown = null;
    const id = G.s.wear;
    if (!id || !G.hasCos(id) || !this.textures.exists('cos-' + id)) return;
    this.cosDy = COSMETICS[id]?.dy ?? -8;
    this.crown = this.add.image(this.player.x, this.player.y + this.cosDy, 'cos-' + id).setScale(2).setDepth(this.player.y + 7);
  }

  // ───────────────────────── collisions ─────────────────────────
  solidAt(r: Rect, ignore?: Entity): boolean {
    const x0 = Math.floor(r.x / TILE), x1 = Math.floor((r.x + r.w - 0.01) / TILE);
    const y0 = Math.floor(r.y / TILE), y1 = Math.floor((r.y + r.h - 0.01) / TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.walkable(x, y)) return true;
    for (const s of this.solids) {
      if (s.e === ignore) continue;
      const q = s.r;
      if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) return true;
    }
    return false;
  }
  private box(x: number, y: number): Rect {
    return { x: x - HB.w / 2, y: y - HB.h / 2 + 1, w: HB.w, h: HB.h };
  }
  private tryMove(dx: number, dy: number): boolean {
    let moved = false;
    if (dx) {
      const nx = this.player.x + dx;
      if (!this.solidAt(this.box(nx, this.player.y))) { this.player.x = nx; moved = true; }
      else if (!dy) moved = this.slide(dx, 0) || moved;
    }
    if (dy) {
      const ny = this.player.y + dy;
      if (!this.solidAt(this.box(this.player.x, ny))) { this.player.y = ny; moved = true; }
      else if (!dx) moved = this.slide(0, dy) || moved;
    }
    return moved;
  }
  /** Corner assist: nudge around a corner when almost lined up with an opening. */
  private slide(dx: number, dy: number): boolean {
    for (const off of [1, -1, 2, -2, 3, -3, 4, -4]) {
      const px = this.player.x + (dy ? off : 0), py = this.player.y + (dx ? off : 0);
      if (!this.solidAt(this.box(px + dx, py + dy)) && !this.solidAt(this.box(px, py))) {
        this.player.x += dy ? Math.sign(off) * 0.5 : 0;
        this.player.y += dx ? Math.sign(off) * 0.5 : 0;
        return true;
      }
    }
    return false;
  }

  teleport(x: number, y: number) {
    this.player.x = x;
    this.player.y = y;
    this.path = [];
    this.updateCamera();
  }
  freeze(on: boolean) {
    this.frozen = on;
    if (on) this.path = [];
  }

  // ───────────────────────── click / tap to walk ─────────────────────────
  private onPointer(ptr: Phaser.Input.Pointer) {
    if (this.ui.busy || this.frozen || this.transitioning) return;
    const wx = ptr.worldX, wy = ptr.worldY;
    let target: Entity | null = null;
    for (const e of this.ents) {
      const h = e.hit;
      if (h && e.def.t !== 'ball' && wx >= h.x && wx < h.x + h.w && wy >= h.y - 8 && wy < h.y + h.h) { target = e; break; }
    }
    const goal = { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
    const path = this.findPath(goal, target);
    if (path) {
      this.path = path;
      this.pathTarget = target;
      this.hideHint();
    }
  }
  private tileFree(tx: number, ty: number) {
    if (!this.walkable(tx, ty)) return false;
    const r = { x: tx * TILE + 4, y: tx === tx ? ty * TILE + 4 : 0, w: 8, h: 8 };
    for (const s of this.solids) {
      const q = s.r;
      if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) return false;
    }
    return true;
  }
  private findPath(goal: { tx: number; ty: number }, target: Entity | null): { x: number; y: number }[] | null {
    const W = this.grid[0].length, H = this.grid.length;
    const start = { tx: Math.floor(this.player.x / TILE), ty: Math.floor(this.player.y / TILE) };
    const enc = new Set(this.ents.filter((e) => e.def.t === 'encounter' && !this.resolved(e)).map((e) => e.ty * W + e.tx));
    const goals = new Set<number>();
    if (target?.hit) {
      // any free tile touching the target's interaction area
      const h = target.hit;
      for (let y = Math.floor(h.y / TILE) - 1; y <= Math.floor((h.y + h.h) / TILE) + 1; y++)
        for (let x = Math.floor(h.x / TILE) - 1; x <= Math.floor((h.x + h.w) / TILE) + 1; x++)
          if (this.tileFree(x, y)) goals.add(y * W + x);
    } else if (this.tileFree(goal.tx, goal.ty)) goals.add(goal.ty * W + goal.tx);
    if (!goals.size) return null;
    const prev = new Map<number, number>();
    const s0 = start.ty * W + start.tx;
    const q = [s0];
    prev.set(s0, -1);
    let found = -1;
    while (q.length) {
      const cur = q.shift()!;
      if (goals.has(cur)) { found = cur; break; }
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const id = ny * W + nx;
        if (prev.has(id)) continue;
        if (!this.tileFree(nx, ny)) continue;
        if (enc.has(id) && !goals.has(id)) continue; // don't wander into fights by accident
        prev.set(id, cur);
        q.push(id);
      }
    }
    if (found < 0) return null;
    const out: { x: number; y: number }[] = [];
    for (let c = found; c !== -1 && c !== s0; c = prev.get(c)!) out.unshift({ x: (c % W) * TILE + 8, y: ((c / W) | 0) * TILE + 8 });
    return out;
  }

  // ───────────────────────── interaction ─────────────────────────
  private probe(): Entity | null {
    const reach = 7;
    const b = this.box(this.player.x, this.player.y);
    const r = { x: b.x - 2 + this.facing.x * reach, y: b.y - 2 + this.facing.y * reach, w: b.w + 4, h: b.h + 4 };
    let best: Entity | null = null;
    let bd = 1e9;
    for (const e of this.ents) {
      const h = e.hit;
      if (!h) continue;
      if (r.x < h.x + h.w && r.x + r.w > h.x && r.y < h.y + h.h && r.y + r.h > h.y) {
        const d = Math.hypot(h.x + h.w / 2 - this.player.x, h.y + h.h / 2 - this.player.y);
        if (d < bd) { bd = d; best = e; }
      }
    }
    return best;
  }
  private nearby(): Entity | null {
    let best: Entity | null = null, bd = 22;
    for (const e of this.ents) {
      const h = e.hit;
      if (!h || e.def.t === 'ball') continue;
      const dx = Math.max(h.x - this.player.x, 0, this.player.x - (h.x + h.w));
      const dy = Math.max(h.y - this.player.y, 0, this.player.y - (h.y + h.h));
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  say(lines: string | string[], voice: import('../core/audio').Voice = 'narrator') {
    const fill = (s: string) =>
      s.replace(/\{rooms\}/g, String(G.visitedMain())).replace(/\{secrets\}/g, String(G.s.secrets.length));
    return this.ui.say(Array.isArray(lines) ? lines.map(fill) : fill(lines), { voice, pos: this.dialogPos() });
  }
  ask(lines: string | string[] | null, options: string[], cancel?: number) {
    return this.ui.ask(lines, options, { cancel, pos: this.dialogPos() });
  }
  private dialogPos(): 'top' | 'bottom' {
    const cam = this.cameras.main;
    const sy = (this.player.y - cam.worldView.y) / cam.worldView.height;
    return sy > 0.55 ? 'top' : 'bottom';
  }

  async interactWith(e: Entity, arg?: string) {
    this.path = [];
    this.moving = false;
    if (this.logic?.interact) {
      e.data.arg = arg;
      const handled = await this.logic.interact(this, e);
      if (handled) return;
    }
    const d = e.def;
    switch (d.t) {
      case 'npc': {
        const npc = NPCS[d.id];
        if (!npc) return;
        const n = (e.data.talks as number | undefined) ?? 0;
        e.data.talks = n + 1;
        return this.say(npc.talk(n), npc.voice as import('../core/audio').Voice);
      }
      case 'deco':
        if (d.lines) return this.say(d.lines);
        return;
      case 'cos':
        if (G.hasCos(d.id)) return;
        await this.say(d.lines);
        e.sprite?.destroy();
        e.hit = undefined;
        audio.sfx('secret');
        G.giveCos(d.id);
        this.wearCosmetic();
        return;
      case 'sign':
        return this.say(d.lines);
      case 'screen':
        return this.say(['* Screens full of tiny cars. Every car is a data point.', '* Every data point is stamped with a time.']);
      case 'dyn':
        return this.dynSign(d.id);
      case 'save':
        return this.saveAt(d.line);
      case 'pedestal':
        return this.pedestal(d.project);
      case 'trophy': {
        const c = COMPETITIONS.find((k) => k.id === d.comp)!;
        await this.say(c.dialog);
        return this.linkChoice('* Look at the code?', [['Open code', c.repo]]);
      }
      case 'shelf': {
        const [q, n] = WAR[d.war];
        await this.say(['* (You open a book.)', `* "${q}"`, `* {y}${n}`]);
        G.setFlag('read' + d.war);
        if (WAR.every((_, i) => G.flag('read' + i)) && !G.hasCos('glasses')) {
          await this.say(['* You have read every shelf.', '* From somewhere behind you: "Hoo! A true scholar. Take these, you will need them."', '* (New cosmetic: READING GLASSES.)'], 'hoot' as import('../core/audio').Voice);
          G.giveCos('glasses');
          this.wearCosmetic();
        }
        return;
      }
      case 'lectern': {
        const day = Math.floor(Date.now() / 86400000);
        const [q, n] = WAR[day % WAR.length];
        return this.say(['* QUOTE OF THE DAY. (Everyone who visits today reads the same one.)', `* "${q}"`, `* {y}${n}`]);
      }
      case 'contact':
        return this.contact(d.kind);
      case 'crownPickup':
        return this.pickCrown(e);
      case 'pillar':
        return this.say(this.flavor(e, [
          ['* A sturdy pillar.', '* It has been holding up this ceiling for years. Zero complaints.'],
          ['* You knock on the pillar.', '* ...It does not knock back. Probably for the best.'],
        ]));
      case 'plant':
        return this.say(this.flavor(e, [
          ['* A potted plant.', '* It is thriving. Somebody waters it every time a model converges.'],
          ['* The plant is leaning toward you.', '* It seems to like you. Or the light behind you.'],
        ]));
      case 'candle':
        return this.say(this.flavor(e, [
          ['* A small candle. It flickers, but it never goes out.'],
          ['* The flame bends a little, as if it is listening.'],
        ]));
    }
  }

  /** Alternate between a few flavour lines each time something is inspected. */
  private flavor(e: Entity, sets: string[][]) {
    const n = ((e.data.n as number | undefined) ?? -1) + 1;
    e.data.n = n;
    return sets[n % sets.length];
  }

  private async dynSign(id: string) {
    if (id !== 'github') return;
    const [gh, enc] = await Promise.all([githubStats(), profileEncounter()]);
    const lines = ['* A notice board, updated from GitHub.'];
    if (gh) lines.push(`* WAEL has {y}${gh.repos}{w} public repositories, {y}${gh.followers}{w} followers and {y}${gh.stars}{w} stars.`);
    else lines.push('* The board is blank today. (GitHub did not answer. It happens.)');
    if (enc) lines.push(`* On WAEL's GitHub profile, {y}${enc.mercy}{w} visitor${enc.mercy === 1 ? '' : 's'} chose MERCY in the encounter. ${enc.fight} chose to FIGHT.`);
    await this.say(lines);
    await this.linkChoice('* Visit the GitHub profile?', [['Open GitHub', PROFILE.links.github]]);
  }

  async linkChoice(q: string, links: [string, string][]) {
    const opts = [...links.map((l) => l[0]), 'Not now'];
    const r = await this.ui.ask(q, opts, { cancel: opts.length - 1, pos: this.dialogPos(), links: [...links.map((l) => l[1]), undefined] });
    void r;
  }

  private async pedestal(id: string) {
    const p = projectById(id);
    await this.say(p.dialog);
    const links: [string, string][] = [['Repository', p.repo]];
    for (const l of p.extraLinks ?? []) links.push([l.label, l.url]);
    await this.linkChoice('* Open it in a new tab?', links);
  }

  private async contact(kind: 'github' | 'kaggle' | 'linkedin' | 'email' | 'resume') {
    if (kind === 'email') {
      await this.say(['* A sign with a little envelope on it.', `* It reads: {y}${EMAIL_OBFUSCATED}{w}`]);
      const r = await this.ask('* What do you do?', ['Copy it', 'Write', 'Leave'], 2);
      if (r === 0) {
        try {
          await navigator.clipboard.writeText(emailAddress());
          await this.say('* Copied. You feel a little closer to a collaboration.');
        } catch {
          await this.say(`* The clipboard refused. It's ${EMAIL_OBFUSCATED} (with @ and . instead).`);
        }
      } else if (r === 1) location.href = 'mai' + 'lto:' + emailAddress();
      return;
    }
    const map = {
      github: ['* GITHUB. Code, notebooks, and a profile that is also a game.', PROFILE.links.github],
      kaggle: ['* KAGGLE. Competitions, notebooks, and a lot of cross-validation.', PROFILE.links.kaggle],
      linkedin: ['* LINKEDIN. The professional way to say hello.', PROFILE.links.linkedin],
      resume: ['* THE RÉSUMÉ. Everything in this underground, on one printable page.', '/resume/'],
    } as const;
    const [line, url] = map[kind];
    await this.say(line);
    await this.linkChoice('* Open it?', [['Open', url]]);
  }

  private async pickCrown(e: Entity) {
    if (G.hasSecret('crown')) return;
    await this.say(['* Behind the pillar, something glints.', '* A tiny golden crown. It fits your SOUL perfectly.']);
    e.sprite?.destroy();
    e.hit = undefined;
    G.secret('crown');
    G.giveCos('crown');
    this.wearCosmetic();
    await this.say('* You put it on. You feel like you could train for another 100 years.');
  }

  async saveAt(line: string) {
    audio.sfx('heal');
    G.s.hp = G.s.maxHp;
    await this.say([line, '* (HP fully restored.)']);
    await this.ui.saveBox(this.room.name, () => G.save(this.roomId, this.player.x, this.player.y));
  }

  private konami() {
    if (this.transitioning) return;
    const fresh = G.secret('konami');
    G.s.hp = 99;
    audio.sfx('heal');
    if (fresh) void this.say(['* An old, old code echoes through the underground.', '* Your HP is now {y}99{w}. (The next save star will put it back.)']);
  }

  // ───────────────────────── doors & encounters ─────────────────────────
  goto(room: string, spawn: string | undefined, x?: number, y?: number) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.path = [];
    audio.sfx('door');
    const data: InitData = { room, spawn, x, y };
    if (REDUCED) return this.scene.restart(data);
    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(data));
  }

  resolved(e: Entity) {
    const id = (e.def as { enemy?: string }).enemy ?? '';
    return G.s.spared.includes(id) || G.s.fought.includes(id);
  }

  private async encounter(e: Entity) {
    const enemy = (e.def as { enemy: string }).enemy;
    this.frozen = true;
    this.path = [];
    audio.sfx('alert');
    const bang = label(this, this.player.x, this.player.y - 20, '!', 'r', 1, 'c').setDepth(9999);
    await new Promise((r) => this.time.delayedCall(450, r));
    bang.destroy();
    const { runEncounter } = await import('./Encounter');
    const res = await runEncounter(this, enemy);
    if (res === 'spared' || res === 'fought') {
      this.layer.putTileAt(T.FLOOR, e.tx, e.ty);
      (e.data.glow as Phaser.GameObjects.Rectangle | undefined)?.destroy();
    }
    this.encCooldown = 1500;
    audio.music(this.room.music);
    if (res === 'spared' && ['overfit', 'leakage', 'gradient'].every((id) => G.s.spared.includes(id)) && !G.hasCos('halo')) {
      await this.say(['* You have spared every monster in the underground.', '* Something light and golden settles above your SOUL.', '* (New cosmetic: HALO.)']);
      G.giveCos('halo');
      this.wearCosmetic();
    }
    this.frozen = false;
  }

  // ───────────────────────── loop ─────────────────────────
  private hideHint() {
    if (!this.hinted) {
      this.hinted = true;
      this.ui.hint(null);
    }
  }

  private updateCamera() {
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom, vh = cam.height / cam.zoom;
    const rw = this.grid[0].length * TILE, rh = this.grid.length * TILE;
    const cx = rw <= vw ? rw / 2 : Phaser.Math.Clamp(this.player.x, vw / 2, rw - vw / 2);
    const cy = rh <= vh ? rh / 2 : Phaser.Math.Clamp(this.player.y, vh / 2, rh - vh / 2);
    cam.centerOn(Math.round(cx), Math.round(cy));
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    this.encCooldown = Math.max(0, this.encCooldown - dtMs);
    const busy = this.ui.busy || this.frozen || this.transitioning;
    this.moving = false;
    if (!busy) {
      if (input.consume('menu')) {
        void import('./menus').then((m) => m.openMenu(this.ui, this));
      } else if (input.consume('confirm')) {
        const e = this.probe() ?? this.nearby();
        if (e) void this.interactWith(e);
      } else {
        // movement: keyboard / D-pad first, then the click path
        const ax = input.axis();
        let vx = ax.x, vy = ax.y;
        if (vx || vy) this.path = [];
        else if (this.path.length) {
          const wp = this.path[0];
          const dx = wp.x - this.player.x, dy = wp.y - this.player.y;
          const d = Math.hypot(dx, dy);
          if (d < 1.5) {
            this.path.shift();
            if (!this.path.length && this.pathTarget) {
              const t = this.pathTarget;
              this.pathTarget = null;
              const h = t.hit!;
              const fx = h.x + h.w / 2 - this.player.x, fy = h.y + h.h / 2 - this.player.y;
              this.facing = Math.abs(fx) > Math.abs(fy) ? { x: Math.sign(fx), y: 0 } : { x: 0, y: Math.sign(fy) };
              void this.interactWith(t);
            }
          } else {
            vx = dx / d;
            vy = dy / d;
          }
        }
        if (vx || vy) {
          this.hideHint();
          const run = input.held.has('cancel');
          const sp = (run ? RUN : WALK) * dt;
          const n = Math.hypot(vx, vy);
          if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) this.facing = Math.abs(vx) > Math.abs(vy) ? { x: Math.sign(vx), y: 0 } : { x: 0, y: Math.sign(vy) };
          const moved = this.tryMove((vx / n) * sp, (vy / n) * sp);
          this.moving = moved;
          if (!moved && this.path.length) this.path = [];
        }
        this.checkTile();
      }
    }
    this.logic?.update?.(this, dtMs);
    this.renderPlayer(dtMs);
    this.updateCamera();
    // Z hint above the nearest interactable
    const near = !busy ? this.nearby() : null;
    if (near?.hit) {
      this.zhint.setVisible(true).setPosition(Math.round(near.hit.x + near.hit.w / 2), Math.round(near.hit.y - 10 + (REDUCED ? 0 : Math.sin(this.time.now / 250))));
    } else this.zhint.setVisible(false);
  }

  private checkTile() {
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
    const key = tx + ',' + ty;
    const c = this.tile(tx, ty);
    if (key !== this.stepTile) {
      this.stepTile = key;
      this.logic?.onTile?.(this, tx, ty);
      if (/[0-9]/.test(c) && this.room.doors[c] && this.time.now - this.startedAt > 250) {
        const d = this.room.doors[c];
        return this.goto(d.to, d.spawn);
      }
      const enc = this.ents.find((e) => e.def.t === 'encounter' && e.tx === tx && e.ty === ty);
      if (enc && !this.resolved(enc) && this.encCooldown <= 0) void this.encounter(enc);
    }
  }

  private renderPlayer(dtMs: number) {
    this.bobT += dtMs;
    const bob = REDUCED || this.moving ? 0 : Math.round(Math.sin(this.bobT / 380));
    const x = Math.round(this.player.x), y = Math.round(this.player.y) + bob;
    this.soul.setPosition(x, y).setDepth(this.player.y + 6);
    this.crown?.setPosition(x, y + this.cosDy).setDepth(this.player.y + 7);
    if (this.moving && !REDUCED) {
      this.ghostT += dtMs;
      if (this.ghostT > 75) {
        this.ghostT = 0;
        const g = this.add.image(x, y, 'soul-ghost').setScale(2).setAlpha(0.35).setDepth(this.player.y + 5);
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
      }
    }
  }
}
