// WAEL's brain (in the game): fuzzy matching over a local knowledge base. No network, no LLM.
// To plug a real model in later, implement `MirrorProvider` (e.g. a fetch to your own endpoint) and pass it to the mirror logic.
import Fuse from 'fuse.js';
import { KB, STARTERS, type KBEntry } from '../../content/kb';

export interface Reply { lines: string[]; followups: { id: string; label: string }[]; source: 'kb' | 'fallback' | 'llm'; id?: string; secret?: string; }
export interface MirrorProvider { ask(question: string): Promise<Reply>; starters(): { id: string; label: string }[]; }

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9.\s'-]/g, ' ').replace(/\s+/g, ' ').trim()} `;
const byId = (id: string) => KB.find((e) => e.id === id)!;
const sugg = (ids: string[] = []) => ids.map(byId).filter(Boolean).map((e) => ({ id: e.id, label: e.label }));

export class LocalKB implements MirrorProvider {
  private fuse = new Fuse(KB, { keys: ['q', 'label'], includeScore: true, ignoreLocation: true, threshold: 0.42, minMatchCharLength: 3 });

  starters() {
    return sugg(STARTERS);
  }

  /** Hybrid match: exact phrase/keyword hits first (longest wins), then fuzzy on the whole question, then per word. */
  match(question: string): KBEntry | null {
    return this.exact(question) ?? this.fuzzy(question);
  }

  /** An entry whose phrase appears word for word in the question (the longest phrase wins). */
  exact(question: string): KBEntry | null {
    const q = norm(question);
    if (q.trim().length < 2) return null;
    let best: KBEntry | null = null;
    let bestLen = 0;
    for (const e of KB)
      for (const v of e.q) {
        const nv = norm(v);
        if (nv.trim().length >= 2 && q.includes(nv) && nv.length > bestLen) {
          best = e;
          bestLen = nv.length;
        }
      }
    return best;
  }

  /** Typo-tolerant search over the whole question, then word by word. */
  fuzzy(question: string): KBEntry | null {
    const q = norm(question);
    if (q.trim().length < 2) return null;
    const r = this.fuse.search(q.trim())[0];
    if (r && (r.score ?? 1) <= 0.42) return r.item;
    let tok: { e: KBEntry; s: number } | null = null;
    for (const w of q.trim().split(' ').filter((t) => t.length >= 4)) {
      const h = this.fuse.search(w)[0];
      if (h && (h.score ?? 1) <= 0.3 && (!tok || (h.score ?? 1) < tok.s)) tok = { e: h.item, s: h.score ?? 1 };
    }
    return tok?.e ?? null;
  }

  async ask(question: string): Promise<Reply> {
    return this.reply(this.match(question));
  }

  reply(e: KBEntry | null): Reply {
    if (!e) {
      return {
        lines: ["Hm. I don't have a good answer for that one yet.", 'Ask me about my projects, the tools I use, Kaggle, or how to reach me.'],
        followups: this.starters(), source: 'fallback',
      };
    }
    return { lines: e.a, followups: sugg(e.f), source: 'kb', id: e.id, secret: e.secret };
  }
}
