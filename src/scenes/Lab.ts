// The Lab (lazy-loaded): a playable 3-lane freeway toy. Cause a crash, watch the jam's shockwave travel backwards,
// and watch a simple causal forecast (Holt's linear smoothing) try to keep up. An ILLUSTRATIVE TOY, not the competition model.
import Phaser from 'phaser';
import { input } from '../core/input';
import { audio } from '../core/audio';
import { label } from '../core/text';
import { canvasTex } from '../core/art';

const L = 150; // cells on the ring road
const LANES = 3;
const VMAX = 5;
const P_SLOW = 0.12;
const X0 = 20, ROAD_Y = 52, LANE_H = 12, CELL = 4;
const TS_Y = 106, TS_ROWS = 110;
const CH_Y = 262, CH_H = 128;

interface Car { x: number; l: number; v: number; }

export async function runLab(world: Phaser.Scene): Promise<void> {
  const mgr = world.game.scene;
  if (!mgr.keys.lab) mgr.add('lab', LabScene, false);
  return new Promise((resolve) => {
    world.scene.pause();
    world.scene.launch('lab', { done: () => { world.scene.stop('lab'); world.scene.resume(); resolve(); } });
  });
}

export class LabScene extends Phaser.Scene {
  private cars: Car[] = [];
  private occ: Int16Array[] = [];
  private incident: { x: number; until: number } | null = null;
  private cursor = 100;
  private stepN = 0;
  private acc = 0;
  private series: number[] = [];
  private level = 0;
  private trend = 0;
  private g!: Phaser.GameObjects.Graphics;
  private ts!: Phaser.Textures.CanvasTexture;
  private nowText!: Phaser.GameObjects.BitmapText;
  private done!: () => void;

  constructor() {
    super('lab');
  }
  init(d: { done: () => void }) {
    this.done = d.done;
    this.cars = [];
    this.incident = null;
    this.series = [];
    this.stepN = 0;
    this.level = 0;
    this.trend = 0;
  }

  create() {
    this.add.rectangle(0, 0, 640, 480, 0x000000).setOrigin(0);
    label(this, X0, 12, 'THE LAB · FREEWAY TOY', 'y', 2);
    label(this, 620, 12, 'traffic flows →', 'g', 2, 'r');
    label(this, X0, 32, 'Z or click the road: cause a crash', 'w', 2);
    // ring road with ~25% occupancy
    this.occ = Array.from({ length: LANES }, () => new Int16Array(L).fill(-1));
    for (let l = 0; l < LANES; l++)
      for (let x = 0; x < L; x++)
        if (Math.random() < 0.25) {
          this.occ[l][x] = this.cars.length;
          this.cars.push({ x, l, v: 2 + Math.floor(Math.random() * 3) });
        }
    // time-space diagram (cells x time), scaled 4x horizontally
    const key = 'lab-ts';
    if (this.textures.exists(key)) this.textures.remove(key);
    canvasTex(this, key, L, TS_ROWS, (c) => { c.fillStyle = '#05070c'; c.fillRect(0, 0, L, TS_ROWS); });
    this.ts = this.textures.get(key) as Phaser.Textures.CanvasTexture;
    this.add.image(X0, TS_Y, key).setOrigin(0).setScale(CELL, 1);
    label(this, X0, TS_Y + TS_ROWS + 6, 'time-space: red bands are jams, moving backwards', 'g', 2);
    label(this, X0, CH_Y - 22, 'stopped cars:', 'w', 2);
    label(this, 196, CH_Y - 22, 'observed', 'w', 2);
    label(this, 306, CH_Y - 22, 'causal forecast', 'y', 2);
    this.nowText = label(this, 612, CH_Y + 8, '', 'g', 2);
    label(this, X0, 400, '←→ move · Z crash / clear · X leave', 'g', 2);
    label(this, 320, 428, 'ILLUSTRATIVE TOY · NOT THE COMPETITION MODEL', 'o', 2, 'c');
    label(this, 320, 450, 'Real work: WaelYTz/trafficflowbench-2026', 'd', 2, 'c');
    this.g = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > ROAD_Y - 14 && p.y < TS_Y + TS_ROWS && p.x > X0 && p.x < X0 + L * CELL) {
        this.cursor = Math.floor((p.x - X0) / CELL);
        this.toggleCrash();
      }
    });
    audio.sfx('select');
  }

  private toggleCrash() {
    if (this.incident) {
      this.incident = null;
      audio.sfx('back');
    } else {
      this.incident = { x: this.cursor, until: this.stepN + 150 };
      audio.sfx('hit');
    }
  }

  private blocked(l: number, x: number) {
    return !!this.incident && l > 0 && x === this.incident.x;
  }
  private gapAhead(l: number, x: number) {
    for (let d = 1; d <= VMAX + 1; d++) {
      const nx = (x + d) % L;
      if (this.occ[l][nx] >= 0 || this.blocked(l, nx)) return d - 1;
    }
    return VMAX + 1;
  }
  private gapBehind(l: number, x: number) {
    for (let d = 1; d <= VMAX + 1; d++) if (this.occ[l][(x - d + L) % L] >= 0) return d - 1;
    return VMAX + 1;
  }

  /** One Nagel-Schreckenberg step with simple lane changes. */
  private step() {
    this.stepN++;
    if (this.incident && this.stepN > this.incident.until) this.incident = null;
    // lane changes
    for (const c of this.cars) {
      const gap = this.gapAhead(c.l, c.x);
      if (gap >= c.v + 1 || Math.random() < 0.2) continue;
      for (const nl of [c.l - 1, c.l + 1]) {
        if (nl < 0 || nl >= LANES || this.occ[nl][c.x] >= 0 || this.blocked(nl, c.x)) continue;
        if (this.gapAhead(nl, c.x) > gap && this.gapBehind(nl, c.x) >= 2) {
          this.occ[c.l][c.x] = -1;
          c.l = nl;
          this.occ[nl][c.x] = this.cars.indexOf(c);
          break;
        }
      }
    }
    // speeds
    for (const c of this.cars) {
      c.v = Math.min(c.v + 1, VMAX, this.gapAhead(c.l, c.x));
      if (c.v > 0 && Math.random() < P_SLOW) c.v--;
    }
    // move
    for (const o of this.occ) o.fill(-1);
    this.cars.forEach((c, i) => {
      c.x = (c.x + c.v) % L;
      this.occ[c.l][c.x] = i;
    });
    // time-space row: mean speed per cell
    const ctx = this.ts.getContext();
    ctx.drawImage(this.ts.getSourceImage() as HTMLCanvasElement, 0, -1);
    for (let x = 0; x < L; x++) {
      let n = 0, s = 0;
      for (let l = 0; l < LANES; l++) { const i = this.occ[l][x]; if (i >= 0) { n++; s += this.cars[i].v; } }
      ctx.fillStyle = n === 0 ? '#05070c' : this.speedColor(s / n);
      ctx.fillRect(x, TS_ROWS - 1, 1, 1);
    }
    this.ts.refresh();
    // 1 Hz sample + causal forecast (uses only the past)
    if (this.stepN % 10 === 0) {
      const q = this.cars.filter((c) => c.v === 0).length;
      if (!this.series.length) { this.level = q; this.trend = 0; }
      else {
        const prev = this.level;
        this.level = 0.6 * q + 0.4 * (this.level + this.trend);
        this.trend = 0.3 * (this.level - prev) + 0.7 * this.trend;
      }
      this.series.push(q);
      if (this.series.length > 60) this.series.shift();
    }
  }

  private speedColor(v: number) {
    return v < 0.8 ? '#ff2020' : v < 2 ? '#ff8c1a' : v < 3.5 ? '#ffd700' : '#3ddc84';
  }

  update(_t: number, dt: number) {
    if (input.consume('cancel') || input.consume('menu')) return this.done();
    if (input.consume('confirm')) this.toggleCrash();
    if (input.held.has('left')) this.cursor = (this.cursor - 1 + L) % L;
    if (input.held.has('right')) this.cursor = (this.cursor + 1) % L;
    this.acc += dt;
    while (this.acc > 100) {
      this.acc -= 100;
      this.step();
    }
    this.draw();
  }

  private draw() {
    const g = this.g.clear();
    // road
    g.fillStyle(0x1a1a24).fillRect(X0, ROAD_Y, L * CELL, LANES * LANE_H);
    g.fillStyle(0x606070);
    for (let l = 1; l < LANES; l++) for (let x = 0; x < L * CELL; x += 16) g.fillRect(X0 + x, ROAD_Y + l * LANE_H, 8, 1);
    for (const c of this.cars) {
      g.fillStyle(Number('0x' + this.speedColor(c.v).slice(1)));
      g.fillRect(X0 + c.x * CELL, ROAD_Y + c.l * LANE_H + 3, CELL - 1, LANE_H - 6);
    }
    if (this.incident) {
      const x = X0 + this.incident.x * CELL;
      g.fillStyle(0xffffff).fillRect(x - 1, ROAD_Y + LANE_H, CELL + 2, LANE_H * 2);
      g.fillStyle(0xff0000).fillRect(x, ROAD_Y + LANE_H + 2, CELL, LANE_H * 2 - 4);
    }
    // cursor
    const cx = X0 + this.cursor * CELL + 2;
    g.fillStyle(0xff0000).fillTriangle(cx - 5, ROAD_Y - 10, cx + 5, ROAD_Y - 10, cx, ROAD_Y - 3);
    // chart
    g.lineStyle(2, 0xffffff).strokeRect(X0, CH_Y, 600, CH_H);
    const n = this.series.length;
    const H = 15; // forecast horizon (seconds)
    const fc: number[] = [];
    for (let h = 1; h <= H; h++) fc.push(Math.max(0, this.level + h * this.trend));
    const ymax = Math.max(20, ...this.series, ...fc) * 1.15;
    const px = 400 / 60;
    const nowX = X0 + 10 + 60 * px; // forecast ends at nowX + 15 * px, inside the chart
    const yOf = (v: number) => CH_Y + CH_H - 6 - (v / ymax) * (CH_H - 12);
    g.lineStyle(1, 0x404050);
    for (let k = 1; k < 4; k++) g.lineBetween(X0 + 2, CH_Y + (k * CH_H) / 4, X0 + 598, CH_Y + (k * CH_H) / 4);
    g.lineStyle(1, 0x808080).lineBetween(nowX, CH_Y + 2, nowX, CH_Y + CH_H - 2);
    g.lineStyle(2, 0xffffff);
    for (let i = 1; i < n; i++) g.lineBetween(nowX - (n - i) * px, yOf(this.series[i - 1]), nowX - (n - 1 - i) * px, yOf(this.series[i]));
    if (n) {
      g.fillStyle(0xffff00);
      for (let h = 0; h < H; h++) g.fillRect(nowX + (h + 1) * px - 2, yOf(fc[h]) - 2, 4, 4);
      const t = `now ${this.series[n - 1]} · 15s ~${Math.round(fc[H - 1])}`;
      this.nowText.setText(t).setX(612 - t.length * 12);
    }
  }
}
