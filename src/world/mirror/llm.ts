// WAEL's optional AI brain: a small open language model (Llama 3.2 1B Instruct, 4-bit) that runs on the visitor's
// own GPU through WebLLM. Free, no keys, nothing typed leaves the browser. The weights (about 700 MB) download once
// from Hugging Face and the browser caches them. It only answers from the facts it is handed (WAEL's own knowledge
// base), and every reply goes through a filter; anything off goes back to the written answer. Built with Llama.
import type { MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

export const BRAIN = { name: 'Llama 3.2 1B', size: 'about 700 MB' };
const MODELS = { f16: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', f32: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' };

interface GpuLike { requestAdapter(): Promise<{ features: { has(f: string): boolean } } | null> }
const gpu = () => (navigator as unknown as { gpu?: GpuLike }).gpu;

let engine: MLCEngineInterface | null = null;
let loading: Promise<boolean> | null = null;
let pct = 0;

/** True when this browser has WebGPU (desktop Chrome / Edge, recent Safari). Phones mostly do not. */
export async function canThink(): Promise<boolean> {
  try {
    return !!(await gpu()?.requestAdapter());
  } catch {
    return false;
  }
}

export const awake = () => !!engine;
export const waking = () => !!loading && !engine;
export const progress = () => pct;

export function wake(): Promise<boolean> {
  loading ??= (async () => {
    try {
      const adapter = await gpu()?.requestAdapter();
      if (!adapter) throw new Error('no WebGPU adapter');
      const id = adapter.features.has('shader-f16') ? MODELS.f16 : MODELS.f32;
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
      engine = await CreateWebWorkerMLCEngine(worker, id, { initProgressCallback: (r) => (pct = Math.round(r.progress * 100)) });
      pct = 100;
      return true;
    } catch (err) {
      console.warn('[wael] AI brain could not start', err);
      loading = null;
      pct = 0;
      return false;
    }
  })();
  return loading;
}

/** Things WAEL must never say (the portfolio's rules), plus signs the model went off the rails. */
const BANNED = /universit|school|college|degree|diploma|\branked\b|\brank(ing)?\b|#\s?\d|top\s?\d+\s?%|\bmedal|leaderboard (position|score|rank)|https?:|www\.|@|as an ai|language model|i cannot|i can't assist|here to help|assist you|physical body|personal preferences|i'm just an? |i am just an? |assistant/i;

/** Ask the brain. Returns null when it is not awake, too slow, or says something it should not. */
export async function think(system: string, history: ChatCompletionMessageParam[], question: string): Promise<string | null> {
  if (!engine) return null;
  const e = engine;
  try {
    const res = await Promise.race([
      e.chat.completions.create({
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: question.slice(0, 300) }],
        max_tokens: 150, temperature: 0.3, top_p: 0.9,
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 30000)),
    ]);
    if (!res) {
      e.interruptGenerate();
      return null;
    }
    let t = (res.choices[0]?.message?.content ?? '').trim();
    t = t.replace(/^(\*\s*)?wael\s*:\s*/i, '').replace(/[*_`#>{}[\]]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 520 || BANNED.test(t)) return null;
    return t;
  } catch (err) {
    console.warn('[wael] AI brain error', err);
    return null;
  }
}
