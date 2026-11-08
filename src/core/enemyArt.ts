// Battle sprites for the encounters (original monsters), plus a few bullet textures.
//
// Style notes (from studying classic battle sprites at their native size): the sprite is basically 1-bit.
// Solid white masses sit on black, and every part is carved out of its neighbours by a 1px black line,
// so a head in front of a body reads as a separate shape. Eyes are big. Details are black lines inside
// white, or white lines on black. At most one accent colour. The idle is two frames where only a few parts
// shift by a pixel or two, and the hurt frame swaps the face (squeezed or X eyes) and knocks parts askew.
import Phaser from 'phaser';
import { canvasTex, gridTex } from './art';
import { C } from './palette';

type Ctx = CanvasRenderingContext2D;
type Mask = (x: number, y: number) => boolean;
type Pt = [number, number];

// ───────────────────────── a tiny 1-bit-ish pixel buffer ─────────────────────────
// Palette indices. 0 stays transparent.
const K = 1, W = 2, YL = 3, CY = 4, OR = 5, GY = 6, RD = 7;
const PAL = ['#000000', '#000000', '#ffffff', C.yellow, C.cyan, C.orange, '#7c7c8c', '#ff2a2a'];
const RGB = PAL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

class Pix {
  readonly d: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.d = new Uint8Array(w * h); }
  set(x: number, y: number, v: number) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v;
  }
  /** Fill a mask with `v`, first ringing it with a 1px `edge` line so it stays carved out of whatever is behind it. */
  fill(m: Mask, v = W, edge = K) {
    const { w, h } = this;
    const inside = new Uint8Array(w * h);
    let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m(x + 0.5, y + 0.5)) continue;
      inside[y * w + x] = 1;
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
    }
    if (bx1 < 0) return this;
    if (edge) {
      for (let y = Math.max(0, by0 - 1); y <= Math.min(h - 1, by1 + 1); y++) for (let x = Math.max(0, bx0 - 1); x <= Math.min(w - 1, bx1 + 1); x++) {
        if (inside[y * w + x]) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && inside[yy * w + xx]) { near = true; break; }
        }
        if (near) this.d[y * w + x] = edge;
      }
    }
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (inside[y * w + x]) this.d[y * w + x] = v;
    return this;
  }
  /** Fill without the separating ring. */
  paint(m: Mask, v: number) { return this.fill(m, v, 0); }
  line(x0: number, y0: number, x1: number, y1: number, v = K) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  path(pts: Pt[], v = K) { for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], v); return this; }
  /** Stamp a string grid; '.' and ' ' are skipped. */
  stamp(rows: string[], x: number, y: number, map: Record<string, number>) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const v = map[r[i]]; if (v !== undefined) this.set(x + i, y + j, v); } });
    return this;
  }
  /** A 1px opaque black ring around the whole silhouette, so the backdrop never touches the sprite. */
  ring() {
    const { w, h } = this;
    const src = this.d.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && src[yy * w + xx]) this.d[y * w + x] = K;
      }
    }
    return this;
  }
  /** Blit to a canvas at (ox, oy) in one go. */
  draw(c: Ctx, ox = 0, oy = 0) {
    const img = c.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const v = this.d[i];
      if (!v) continue;
      const [r, g, b] = RGB[v];
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, ox, oy);
  }
}

// masks
const ell = (cx: number, cy: number, rx: number, ry = rx): Mask => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const box = (x0: number, y0: number, w: number, h: number): Mask => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
const poly = (p: Pt[]): Mask => (x, y) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** A thick stroke along a polyline; the radius may vary along it (t = 0..1). */
const tube = (p: Pt[], r: number | ((t: number) => number)): Mask => {
  const lens = [0];
  for (let i = 1; i < p.length; i++) lens.push(lens[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const total = lens[lens.length - 1] || 1;
  const R = typeof r === 'number' ? () => r : r;
  let maxR = 0;
  for (let i = 0; i <= 20; i++) maxR = Math.max(maxR, R(i / 20));
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const x0 = Math.min(...xs) - maxR, x1 = Math.max(...xs) + maxR, y0 = Math.min(...ys) - maxR, y1 = Math.max(...ys) + maxR;
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i];
      if (x < Math.min(ax, bx) - maxR || x > Math.max(ax, bx) + maxR || y < Math.min(ay, by) - maxR || y > Math.max(ay, by) + maxR) continue;
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
      const d = Math.hypot(x - ax - u * vx, y - ay - u * vy);
      if (d <= R((lens[i - 1] + u * Math.sqrt(l2)) / total)) return true;
    }
    return false;
  };
};
const or = (...m: Mask[]): Mask => (x, y) => m.some((f) => f(x, y));
const minus = (a: Mask, b: Mask): Mask => (x, y) => a(x, y) && !b(x, y);

// little digits for score boards and calendar pages (3x5)
const DIG: Record<string, string[]> = {
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
};
function text(p: Pix, s: string, x: number, y: number, v: number) {
  for (const ch of s) { p.stamp(DIG[ch], x, y, { '#': v }); x += 4; }
}
/** X-shaped "ouch" eye, (2r+1) px wide. */
function ouch(p: Pix, cx: number, cy: number, r: number, v = K) {
  for (let i = -r; i <= r; i++) { p.set(cx + i, cy + i, v); p.set(cx + i, cy - i, v); }
}
/** Squeezed-shut eye: a sideways chevron pointing at the nose. */
function squeeze(p: Pix, cx: number, cy: number, dir: 1 | -1, v = K) {
  for (let i = 0; i < 4; i++) { p.set(cx - dir * 2 + dir * i, cy - 3 + i, v); p.set(cx - dir * 2 + dir * i, cy + 3 - i, v); }
}

/** 3 frames: two idle frames and a hurt frame (f = 2). */
function enemyTex(scene: Phaser.Scene, key: string, draw: (p: Pix, f: number) => void, w = 64, h = 64) {
  if (scene.textures.exists(key)) return;
  canvasTex(scene, key, w * 3, h, (c) => {
    for (let f = 0; f < 3; f++) {
      const p = new Pix(w, h);
      draw(p, f);
      p.ring();
      p.draw(c, f * w);
    }
  });
  // string frame names: the encounter compares frame.name with '0' / '2' (numeric lookups like setFrame(2) still work)
  const t = scene.textures.get(key);
  for (let f = 0; f < 3; f++) t.add(String(f), 0, f * w, 0, w, h);
}

// ───────────────────────── OVERFIT ─────────────────────────
// A nervous noodle whose whole body is the curve it fitted. The training points (yellow beads) sit on a
// plain straight line, but it swings wildly from side to side to pass through every one of them.
// The points never move; the swings flip every frame. Classic overfitting.
function overfit(p: Pix, f: number) {
  const hurt = f === 2;
  // the trend the points follow (a straight line would have done fine) and the points on it
  const trend = (y: number) => 31 + (y - 27) * 0.3;
  const dots: Pt[] = [27, 35, 43, 51, 59].map((y) => [Math.round(trend(y)), y]);
  const amp = [7, -7, 10][f];
  const spine: Pt[] = [];
  for (let y = 27; y <= 63; y += 0.5) {
    const seg = Math.floor((y - 27) / 8), t = ((y - 27) % 8) / 8;
    const a = y < 59 ? amp * (seg % 2 ? -1 : 1) : 2;
    spine.push([trend(y) + a * Math.sin(t * Math.PI), y]);
  }
  p.fill(tube(spine, (t) => 3.1 - t * 1.5));
  for (const [x, y] of dots.slice(1)) p.fill(ell(x + 0.5, y + 0.5, 2), YL);
  // skinny arms thrown up in a panic (they tremble)
  const sh = f === 1 ? 1 : 0, hdy = hurt ? 3 : 0;
  for (const s of [-1, 1]) {
    const hx = 32 + s * (23 + sh), hy0 = 21 - sh + hdy;
    p.fill(tube([[32 + s * 3, 30], [32 + s * 13, 31], [hx, hy0 + 3]], 1.1));
    p.fill(ell(hx, hy0, 2.6, 3.2));
    p.line(hx - 0.5 + s * 0.5, hy0 - 3, hx - 0.5 + s * 0.5, hy0 - 1);
  }
  // head, with two big bulging eyes on top
  const hy = hurt ? 17 : 16;
  p.fill(ell(32, hy + 2, 15, 10));
  const eyes: Pt[] = [[24.5, hy - 4], [40.5, hy - 4]];
  for (const [ex, ey] of eyes) p.fill(ell(ex, ey, 7, 8));
  if (hurt) {
    squeeze(p, 25, hy - 4, 1); squeeze(p, 40, hy - 4, -1);
  } else {
    // tiny darting pupils
    const [dx, dy] = f === 0 ? [-3, 1] : [2, -1];
    for (const [ex, ey] of eyes) p.fill(box(Math.floor(ex) + dx, ey - 1 + dy, 2, 2), K, 0);
  }
  // gritted, chattering teeth
  const my = hy + 5;
  if (hurt) {
    p.fill(ell(32, my + 2.5, 4, 3), K, 0);
    p.path([[29, my + 2], [31, my + 1], [33, my + 2], [35, my + 1]], W);
  } else {
    p.fill(or(box(26, my, 12, 5), box(25, my + 1, 14, 3)), K, 0);
    p.fill(box(26, my + 1, 12, 1), W, 0); p.fill(box(26, my + 3, 12, 1), W, 0);
    for (let x = 28 + f; x < 38; x += 3) { p.set(x, my + 1, K); p.set(x, my + 3, K); }
  }
  // sweat
  const sy = f === 1 ? 2 : 0;
  const drop = (x: number, y: number, s: number) => p.fill(or(ell(x, y, 2 * s, 2.4 * s), poly([[x - 1.9 * s, y], [x + 1.9 * s, y], [x, y - 5 * s]])));
  drop(52, 13 + sy, 1);
  if (!hurt) drop(11, 9 + sy, 0.8);
}

// ───────────────────────── LEAKAGE ─────────────────────────
// A smug drip that peeks at tomorrow's calendar page (T+1). Its belly clock always runs ahead,
// and it leaks a little of the future (cyan) wherever it goes.
function leakage(p: Pix, f: number) {
  const hurt = f === 2;
  const lean = f === 1 ? 1 : 0;
  const cx = 37, cy = 38, r = 19, tipY = 3, tipX = 46 + lean;
  const drop: Mask = (x, y) => {
    if (y < tipY) return false;
    if (y < cy) {
      const t = (y - tipY) / (cy - tipY);
      const hw = r * Math.sin((t * Math.PI) / 2) ** 1.25;
      const mx = cx + (tipX - cx) * (1 - t) ** 2;
      return Math.abs(x - mx) <= hw;
    }
    return ((x - cx) / r) ** 2 + ((y - cy) / (r - 2)) ** 2 <= 1;
  };
  const body = or(drop, tube([[24, 50], [23, 58]], 2.3), tube([[45, 52], [46, 61]], 2.6), tube([[51, 48], [52, 55]], 1.8), ell(37, 59, 18, 3.2));
  p.fill(body);
  // the clock on its belly, running ahead of time
  const kx = 38, ky = 46;
  p.fill(ell(kx, ky, 7.5), K, 0); p.fill(ell(kx, ky, 6.5), W, 0);
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) p.set(kx - 0.5 + dx, ky - 0.5 + dy, K);
  const hands: [number, number][] = hurt ? [[90, 3], [270, 4]] : f === 0 ? [[-90, 4], [-120, 3]] : [[-60, 4], [-90, 3]];
  for (const [deg, len] of hands) { const a = (deg * Math.PI) / 180; p.line(kx - 0.5, ky - 0.5, kx - 0.5 + Math.cos(a) * len, ky - 0.5 + Math.sin(a) * len); }
  // smug half-lidded eyes, glancing at the page
  const ey = 26;
  for (const ex of [29, 45]) {
    if (hurt) { ouch(p, ex, ey, 3); continue; }
    p.fill(ell(ex, ey + 1, 5.5, 4.5), K, 0);
    p.fill(minus(ell(ex, ey + 1, 4.5, 3.5), box(ex - 6, ey - 6, 12, 7)), W, 0);
    p.fill(box(ex - 6, ey - 1, 12, 2), K, 0);
    p.fill(box(ex - 4 + (f === 1 ? 1 : 0), ey + 1, 2, 2), K, 0);
  }
  if (!hurt) p.paint(tube([[40, 19.5], [48.5, 17.5]], 0.9), K); // one eyebrow up: smug
  // smirk
  if (hurt) p.path([[31, 36], [33, 35], [35, 36], [37, 35], [39, 36], [41, 35]]);
  else { p.path([[30, 34], [31, 35], [40, 35], [43, 34], [45, 32]]); p.path([[37, 36], [41, 36], [44, 34]]); }
  // arm holding tomorrow's calendar page
  const py = hurt ? 15 : 13 - lean;
  p.fill(tube([[20, 37], [13, py + 19]], 1.7));
  p.fill(box(1, py, 16, 19));
  p.fill(box(2, py + 1, 14, 4), K, 0);
  for (const bx of [5, 12]) { p.set(bx, py - 1, W); p.set(bx, py - 2, W); p.set(bx, py + 1, W); }
  text(p, 'T+1', 3, py + 6, K);
  for (let i = 0; i < 4; i++) { p.set(3 + i * 3, py + 13, K); p.set(3 + i * 3, py + 15, K); }
  p.fill(ell(14, py + 18, 3, 2.6));
  // drips of the future
  const dy = f === 1 ? 3 : 0;
  const drip = (x: number, y: number) => p.fill(or(ell(x, y, 1.7, 2), poly([[x - 1.6, y], [x + 1.6, y], [x, y - 4]])), CY);
  drip(9, py + 24 + dy);
  drip(57, 40 + dy);
  if (!hurt) drip(28, 60);
}

// ───────────────────────── EXPLODING GRADIENT ─────────────────────────
// A lit bomb of a gradient rolling down a loss curve, waving its own update arrows, which keep growing.
function gradient(p: Pix, f: number) {
  const hurt = f === 2;
  const g = f === 1 ? 1 : 0;
  const slope = (x: number) => 47 + 16 * (x / 63) ** 1.6;
  const r = 15 + g;
  const bx = 31, by = slope(bx) - r - 1;
  // the loss curve it is rolling down
  for (let x = 0; x < 64; x++) { const y = Math.round(slope(x)); p.set(x, y, W); p.set(x, y + 1, W); }
  // speed lines
  for (const [x, y, l] of [[2, by - 6, 7], [0, by + 1, 9], [3, by + 8, 6]] as [number, number, number][]) p.fill(box(x, Math.round(y), l, 1), W, 0);
  // gradient arrows bursting out (longer every step)
  const L = hurt ? r + 5 : r + 11 + g * 3;
  for (const deg of [-160, -112, -20, 20]) {
    const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const ex = bx + cs * L, ey = by + sn * L;
    const head = poly([[ex + cs * 3, ey + sn * 3], [ex - cs * 4 - sn * 5, ey - sn * 4 + cs * 5], [ex - cs * 4 + sn * 5, ey - sn * 4 - cs * 5]]);
    p.fill(or(tube([[bx, by], [ex - cs * 3, ey - sn * 3]], 1.5), head));
  }
  // fuse and spark
  const fx = bx + 9, fy = by - r + 2;
  const fuse: Pt[] = [[fx, fy - 3], [fx + 2, fy - 7], [fx + 1, fy - 10], [fx + 4, fy - 13]];
  p.fill(tube(fuse, 1));
  p.fill(box(fx - 4, fy - 4, 9, 6));
  p.stamp(['#####', '.#.#.', '..#..'], fx - 2, fy - 3, { '#': K }); // the nabla it is named after
  const [sx, sy] = fuse[fuse.length - 1];
  if (hurt) {
    p.fill(or(ell(sx + 1, sy - 3, 3, 2.5), ell(sx + 4, sy - 5, 2.5, 2)), GY);
  } else {
    const sp = f === 0 ? [[0, -5], [0, 4], [-4, 0], [5, 0], [3, -3], [-2, 2]] : [[-4, -4], [4, 3], [-3, 3], [4, -4], [0, -3], [3, 0]];
    for (const [dx, dy] of sp) p.line(sx, sy - 1, sx + dx, sy - 1 + dy, OR);
    p.set(sx, sy - 1, W);
  }
  // the ball itself
  p.fill(ell(bx, by, r));
  // excited face: two mismatched eyes, a huge grin
  const e1: Pt = [bx - 6, by - 5], e2: Pt = [bx + 5, by - 6];
  if (hurt) { ouch(p, e1[0], e1[1], 3); ouch(p, e2[0], e2[1], 2); }
  else {
    p.fill(ell(e1[0], e1[1], 4.5, 5.5)); p.fill(ell(e2[0], e2[1], 3.5, 4.5));
    p.fill(box(e1[0] - 1 + g, e1[1] - 1, 2, 2), K, 0); p.fill(box(e2[0] - 1 - g, e2[1], 2, 2), K, 0);
  }
  const my = by + 3;
  if (hurt) p.path([[bx - 7, my + 3], [bx - 4, my + 1], [bx - 1, my + 3], [bx + 2, my + 1], [bx + 5, my + 3], [bx + 8, my + 1]]);
  else {
    p.fill(minus(ell(bx, my, 10, 8 + g), box(bx - 12, my - 10, 24, 10)), K, 0);
    p.fill(box(bx - 9, my, 18, 2), W, 0);
    for (let x = bx - 6; x <= bx + 6; x += 3) p.set(x, my + 1, K);
  }
}

// ───────────────────────── THE LEADERBOARD (boss) ─────────────────────────
// A marquee scoreboard on the winners' podium: crown, glare, a huge toothy grin, two foam "#1" fingers pumping.
function leaderboard(p: Pix, f: number) {
  const hurt = f === 2;
  // the podium: 2 . 1 . 3
  p.fill(box(6, 55, 20, 9)); p.fill(box(54, 58, 20, 6)); p.fill(box(25, 51, 30, 13));
  text(p, '2', 14, 57, K); text(p, '3', 62, 58, K);
  p.stamp(['.##', '###', '.##', '.##', '.##', '.##', '###'], 38, 54, { '#': K });
  // foam fingers on stubby arms
  const hand = (y: number, flip: boolean) => {
    const sx = (v: number) => (flip ? 79 - v : v);
    p.fill(tube([[sx(16), 36], [sx(9), y + 13]], 1.7));
    p.fill(tube([[sx(7), y + 10], [sx(7), y - 4]], 2.6));
    p.fill(or(box(Math.min(sx(1), sx(13)), y + 7, 13, 12), ell(sx(7), y + 18.5, 6.5, 2.5)));
    p.fill(ell(sx(12.5), y + 10, 2.4, 3));
    p.stamp(DIG['1'], Math.min(sx(5), sx(7)), y + 10, { '#': K });
  };
  const up = hurt ? [6, 6] : f === 0 ? [0, 3] : [3, 0];
  hand(8 + up[0], false);
  hand(8 + up[1], true);
  // the board, with chasing marquee lights in its frame
  p.fill(box(15, 8, 50, 43));
  p.fill(box(19, 12, 42, 35), K, 0);
  const bulb = (x: number, y: number, k: number) => { if (hurt || (k + f) % 2) p.fill(box(x, y, 2, 2), K, 0); };
  for (let k = 0; k <= 15; k++) { bulb(17 + k * 3, 9, k); bulb(17 + k * 3, 48, k + 1); }
  for (let k = 0; k <= 11; k++) { bulb(16, 12 + k * 3, k); bulb(62, 12 + k * 3, k + 1); }
  // face on the screen: glaring eyes and a huge toothy grin
  if (hurt) {
    ouch(p, 30, 19, 4, W); ouch(p, 50, 19, 4, W);
    p.path([[27, 28], [30, 26], [33, 28], [36, 26], [39, 28], [42, 26], [45, 28], [48, 26], [51, 28], [54, 26]], W);
  } else {
    for (const ex of [30, 50]) {
      p.fill(ell(ex, 19, 6, 4.5), W, 0);
      p.fill(box(ex - 2 + (f === 1 ? 1 : -1), 19, 4, 4), K, 0);
    }
    p.fill(tube([[22, 12.5], [35, 15.5]], 1), W, 0); p.fill(tube([[58, 12.5], [45, 15.5]], 1), W, 0);
    const gw = 14 + f;
    p.paint(minus(ell(40, 25, gw, 6.5), box(0, 0, 80, 25)), W);
    p.line(40 - gw + 2, 27, 40 + gw - 2, 27, K);
    for (let x = 40 - gw + 3; x < 40 + gw - 1; x += 3) p.line(x, 25, x, 31, K);
  }
  // the ranks (they reshuffle every refresh)
  const rows = hurt ? [0, 0] : f === 0 ? [30, 21] : [24, 30];
  rows.forEach((len, i) => {
    const y = 34 + i * 6;
    text(p, String(i + 1), 22, y, i === 0 ? YL : W);
    if (hurt) for (let x = 27; x < 58; x++) { if ((x * 7 + i * 13) % 5 < 2) p.set(x, y + 1 + ((x + i) % 3), W); }
    else p.fill(box(27, y + 1, len, 3), i === 0 ? YL : W, 0);
  });
  // sparkles: it is putting on a show
  if (!hurt) {
    const star = (x: number, y: number, s: number) => { p.line(x - s, y, x + s, y, W); p.line(x, y - s, x, y + s, W); };
    star(f === 0 ? 22 : 58, 3, 2); star(f === 0 ? 59 : 21, 4, 1);
  }
  // crown
  const cxo = hurt ? 4 : 0, cyo = hurt ? -1 : 0;
  p.fill(poly([[29 + cxo, 9 + cyo], [29 + cxo, 1 + cyo], [34 + cxo, 5 + cyo], [40 + cxo, -1 + cyo], [46 + cxo, 5 + cyo], [51 + cxo, 1 + cyo], [51 + cxo, 9 + cyo]]), YL);
  for (const jx of [34, 40, 46]) p.set(jx + cxo, 7 + cyo, K);
}

export function buildEnemies(scene: Phaser.Scene) {
  enemyTex(scene, 'enemy-overfit', overfit);
  enemyTex(scene, 'enemy-leakage', leakage);
  enemyTex(scene, 'enemy-gradient', gradient);
  enemyTex(scene, 'enemy-board', leaderboard, 80, 64);
  // the boss's attention eye: it stares at whatever stays still
  canvasTex(scene, 'att-eye', 21, 13, (c) => {
    const p = new Pix(21, 13);
    p.fill(poly([[0.5, 7.5], [5, 2.5], [16, 2.5], [20.5, 7.5], [16, 12.5], [5, 12.5]]));
    p.fill(ell(10.5, 7.5, 2.6, 3), RD);
    p.paint(box(10, 6, 1, 3), K); // a slit pupil
    p.set(11, 5, W);
    for (const [x0, x1] of [[5, 3], [10, 10], [15, 17]]) p.line(x0, 2, x1, 0, W);
    p.ring();
    p.draw(c);
  });
  // bullets
  canvasTex(scene, 'bone', 6, 6, (c) => { c.fillStyle = '#ffffff'; c.fillRect(1, 0, 4, 6); c.fillRect(0, 0, 6, 2); c.fillRect(0, 4, 6, 2); });
  canvasTex(scene, 'bone-shaft', 2, 2, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 2, 2); });
  gridTex(scene, 'drop', ['..#..', '.###.', '#####', '#####', '.###.'], { '#': C.cyan });
  gridTex(scene, 'pellet', ['.##.', '####', '####', '.##.'], { '#': '#ffffff' });
  gridTex(scene, 'pellet-hot', ['.##.', '####', '####', '.##.'], { '#': C.orange });
}
