// Smart match: a tiny sentence-embedding model (all-MiniLM-L6-v2, about 23 MB, runs in the browser on WebAssembly)
// understands what a typed question MEANS and picks the closest of WAEL's own written answers, so any phrasing works.
// Order: an exact keyword hit, then meaning, then typo-tolerant search. If the model cannot load (offline, an old
// browser), the keyword and fuzzy steps still answer. Nothing typed leaves the browser.
import { KB, type KBEntry } from '../../content/kb';
import { LocalKB, type Reply } from './engine';

type Embed = (texts: string[]) => Promise<number[][]>;
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const MIN_SCORE = 0.45;

let embedP: Promise<Embed | null> | null = null;
function loadEmbedder(): Promise<Embed | null> {
  embedP ??= (async () => {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      const ext = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
      return async (texts: string[]) => (await ext(texts, { pooling: 'mean', normalize: true })).tolist() as number[][];
    } catch (err) {
      console.warn('[wael] smart match unavailable, using keywords only', err);
      return null;
    }
  })();
  return embedP;
}

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class SmartKB extends LocalKB {
  private vecs: { e: KBEntry; v: number[] }[] | null = null;
  private warming: Promise<boolean> | null = null;

  /** Load the model and embed every written question once (in small batches, so the game keeps running). */
  warm(): Promise<boolean> {
    this.warming ??= (async () => {
      const embed = await loadEmbedder();
      if (!embed) return false;
      const items: { e: KBEntry; t: string }[] = [];
      for (const e of KB) for (const t of new Set([e.label, ...e.q.filter((q) => q.length >= 4), e.a[0]])) items.push({ e, t });
      const out: { e: KBEntry; v: number[] }[] = [];
      for (let i = 0; i < items.length; i += 12) {
        const chunk = items.slice(i, i + 12);
        const vs = await embed(chunk.map((c) => c.t));
        chunk.forEach((c, k) => out.push({ e: c.e, v: vs[k] }));
        await sleep(0);
      }
      this.vecs = out;
      return true;
    })();
    return this.warming;
  }

  /** Entries ranked by meaning (best score per entry), or null while the model is not ready. */
  async rank(question: string, waitMs = 2500): Promise<{ e: KBEntry; s: number }[] | null> {
    const ready = await Promise.race([this.warm(), sleep(waitMs).then(() => false)]);
    const embed = ready && this.vecs ? await loadEmbedder() : null;
    if (!embed || !this.vecs) return null;
    const [q] = await embed([question]);
    const best = new Map<KBEntry, number>();
    for (const { e, v } of this.vecs) best.set(e, Math.max(best.get(e) ?? -1, dot(q, v)));
    return [...best].map(([e, s]) => ({ e, s })).sort((a, b) => b.s - a.s);
  }

  /** The single best entry: keyword hit, else meaning, else fuzzy. */
  async find(question: string): Promise<KBEntry | null> {
    const hit = this.exact(question);
    if (hit) return hit;
    const ranked = await this.rank(question);
    if (ranked && ranked[0].s >= MIN_SCORE) return ranked[0].e;
    return this.fuzzy(question);
  }

  /** The few entries most related to a question (for grounding the AI brain). */
  async related(question: string, k = 4): Promise<KBEntry[]> {
    const out: KBEntry[] = [];
    const hit = this.exact(question);
    if (hit) out.push(hit);
    for (const r of (await this.rank(question, 800)) ?? []) if (out.length < k && r.s >= 0.25 && !out.includes(r.e)) out.push(r.e);
    const fz = this.fuzzy(question);
    if (fz && !out.includes(fz) && out.length < k) out.push(fz);
    return out;
  }

  async ask(question: string): Promise<Reply> {
    return this.reply(await this.find(question));
  }
}
