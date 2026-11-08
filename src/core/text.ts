// Monospace pixel text with inline colour tags and a typewriter reveal.
// Tags: {w} white {y} yellow {r} red {o} orange {g} grey {c} cyan {k} gold {p} pink {e} green {v} purple {d} dim.
import Phaser from 'phaser';
import { ADV, clean } from './glyphs';
import { FONT_COLORS } from './art';

export interface Glyph { ch: string; col: string; }
export interface Run { text: string; col: string; row: number; col0: number; start: number; }

export const LINE_H = 10; // px per line at scale 1 (8 glyph + 2 gap)

/** Parse tags into coloured characters. */
export function parseRich(src: string, base = 'w'): Glyph[] {
  const out: Glyph[] = [];
  let col = base;
  const push = (s: string) => {
    for (const ch of clean(s)) out.push({ ch, col });
  };
  const re = /\{([a-z])\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    push(src.slice(last, m.index));
    col = FONT_COLORS[m[1]] ? m[1] : base;
    last = re.lastIndex;
  }
  push(src.slice(last));
  return out;
}

/** Word-wrap glyphs to `cols` columns. Paragraphs starting with "* " get a hanging indent. */
export function wrap(glyphs: Glyph[], cols: number): Glyph[][] {
  const lines: Glyph[][] = [];
  const paras: Glyph[][] = [[]];
  for (const g of glyphs) (g.ch === '\n' ? paras.push([]) : paras[paras.length - 1].push(g));
  for (const p of paras) {
    const hang = p.length > 1 && p[0].ch === '*' && p[1].ch === ' ' ? 2 : 0;
    const indent = () => Array.from({ length: hang }, () => ({ ch: ' ', col: 'w' }));
    let line: Glyph[] = [];
    const breakLine = () => {
      while (line.length && line[line.length - 1].ch === ' ') line.pop();
      lines.push(line);
      line = indent();
    };
    let i = 0;
    while (i < p.length) {
      let j = i;
      while (j < p.length && p[j].ch !== ' ') j++;
      const word = p.slice(i, j);
      if (line.length + word.length > cols && line.length > hang) breakLine();
      if (word.length > cols - hang) {
        for (const g of word) {
          if (line.length >= cols) breakLine();
          line.push(g);
        }
      } else line.push(...word);
      if (j < p.length && line.length < cols) line.push(p[j]); // the space
      i = j + 1;
    }
    while (line.length && line[line.length - 1].ch === ' ') line.pop();
    lines.push(line);
  }
  return lines;
}

/** A block of pixel text made of BitmapText runs (one per colour span per line). */
export class PixelText extends Phaser.GameObjects.Container {
  private runs: { bt: Phaser.GameObjects.BitmapText; run: Run }[] = [];
  total = 0;
  rows = 0;
  colsUsed = 0;
  glyphs: Glyph[] = [];
  readonly px: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: { scale?: number; cols?: number; color?: string; lineH?: number } = {}) {
    super(scene, x, y);
    this.px = opts.scale ?? 1;
    this.lineH = opts.lineH ?? LINE_H;
    this.cols = opts.cols ?? 999;
    this.base = opts.color ?? 'w';
    this.setText(text);
    scene.add.existing(this);
  }
  private lineH: number;
  private cols: number;
  private base: string;

  setText(text: string) {
    return this.setLines(wrap(parseRich(text, this.base), this.cols));
  }
  /** Lay out pre-wrapped lines (used for dialog paging). */
  setLines(lines: Glyph[][]) {
    this.runs.forEach((r) => r.bt.destroy());
    this.runs = [];
    let idx = 0;
    this.glyphs = [];
    this.colsUsed = 0;
    lines.forEach((ln, row) => {
      let k = 0;
      this.colsUsed = Math.max(this.colsUsed, ln.length);
      while (k < ln.length) {
        const col = ln[k].col;
        let e = k;
        while (e < ln.length && ln[e].col === col) e++;
        const run: Run = { text: ln.slice(k, e).map((g) => g.ch).join(''), col, row, col0: k, start: idx + k };
        const bt = this.scene.add.bitmapText(run.col0 * ADV * this.px, row * this.lineH * this.px, 'px-' + col, run.text);
        bt.setScale(this.px);
        this.add(bt);
        this.runs.push({ bt, run });
        k = e;
      }
      idx += ln.length;
      this.glyphs.push(...ln);
    });
    this.total = idx;
    this.rows = lines.length;
    return this;
  }
  /** Show only the first n characters (typewriter). */
  reveal(n: number) {
    for (const { bt, run } of this.runs) {
      const vis = Math.max(0, Math.min(run.text.length, n - run.start));
      bt.setText(run.text.slice(0, vis));
    }
  }
  charAt(i: number) {
    return this.glyphs[i]?.ch ?? '';
  }
  get widthPx() {
    return Math.max(0, this.colsUsed * ADV - 1) * this.px;
  }
  get heightPx() {
    return this.rows * this.lineH * this.px;
  }
}

/** Width in px of a plain string at a given scale. */
export const textW = (s: string, scale = 1) => Math.max(0, clean(s).length * ADV - 1) * scale;

/** The largest scale (down to `min`) at which `s` fits in `maxW` px. */
export function fitScale(s: string, maxW: number, scale: number, min = 2) {
  let sc = scale;
  while (sc > min && textW(s, sc) > maxW) sc--;
  return sc;
}
/** Shorten `s` with ".." until it fits in `maxW` px at `scale` (last resort; prefer a smaller scale). */
export function fitText(s: string, maxW: number, scale: number) {
  if (textW(s, scale) <= maxW) return s;
  let t = clean(s);
  while (t.length > 2 && textW(t + '..', scale) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '..';
}
/** A label that never spills out of `maxW`: shrinks the scale first, then shortens the text. */
export function fitLabel(scene: Phaser.Scene, x: number, y: number, s: string, maxW: number, color = 'w', scale = 3, align: 'l' | 'c' | 'r' = 'l', min = 2) {
  const sc = fitScale(s, maxW, scale, min);
  const bt = label(scene, x, y + Math.round(((scale - sc) * 10) / 2), fitText(s, maxW, sc), color, sc, align);
  return bt;
}

/** Quick single-line label (no tags). */
export function label(scene: Phaser.Scene, x: number, y: number, s: string, color = 'w', scale = 1, align: 'l' | 'c' | 'r' = 'l') {
  const bt = scene.add.bitmapText(x, y, 'px-' + color, clean(s)).setScale(scale);
  if (align === 'c') bt.setX(Math.round(x - textW(s, scale) / 2));
  if (align === 'r') bt.setX(Math.round(x - textW(s, scale)));
  return bt;
}
