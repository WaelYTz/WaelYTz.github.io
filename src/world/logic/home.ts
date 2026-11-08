// WAEL's house: meet WAEL (the owner's own character) at his desk and type him any question.
// Two brains, both free and fully in the browser (nothing typed is sent anywhere):
//  1. smart match (everyone): a tiny embedding model finds the written answer that means the same thing;
//  2. the AI brain (optional, desktop WebGPU): a small language model writes the reply from those written facts.
// The hallway mirror is handled by the world itself.
import type { RoomLogic, WorldApi, Entity } from '../types';
import { SmartKB } from '../mirror/smart';
import { canThink, wake, awake, waking, progress, think, BRAIN } from '../mirror/llm';
import { KB } from '../../content/kb';
import { game as G } from '../../core/state';
import { input } from '../../core/input';
import { audio } from '../../core/audio';
import { clean } from '../../core/glyphs';
import { COSMETICS } from '../../core/cast';
import { label, PixelText } from '../../core/text';
import { loadSettings, saveSettings } from '../../core/save';
import { BOX, drawBox, type UIScene } from '../../scenes/UI';
import { setTypeboxRect } from '../../shell/shell';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

const provider = new SmartKB();
if (new URLSearchParams(location.search).has('dev')) Object.assign(window, { __wael: provider, __waelAI: { wake, awake, progress, compose: (q: string) => compose(q) } });
// answers that must stay word for word: secrets, contact details, and the questions the portfolio never answers
const VERBATIM = new Set(['contact', 'study', 'rank', 'github', 'resume', 'potato', 'techno']);
let asked = false;
const history: ChatCompletionMessageParam[] = [];

const SYSTEM = (name: string, facts: string) => `You are WAEL, the pixel-art kid version of Wael, standing in your room inside your own portfolio game (a cozy underground RPG). A visitor named ${name} is talking to you.
How to answer:
- 1 to 3 short sentences, first person, as a friendly, slightly mischievous game character who loves building things. Never sound like an assistant.
- Answer the visitor's exact question using ONLY the FACTS. Do not add any detail that is not in the FACTS. Team projects stay team projects.
- If the FACTS do not answer it, stay in character, for example: "Hm, that one's not in my notes yet! Ask me about my projects, my tools, Kaggle, or how to reach me."
- Never talk about universities, schools, degrees, rankings or leaderboard scores.
- English only. Plain text, no lists, no emojis, no links.
FACTS (most relevant first):
${facts}`;

/** WAEL's reply as dialog lines: the AI brain when it is awake (grounded in his written facts), else his notes. */
async function compose(q: string): Promise<string[]> {
  const hit = await provider.find(q);
  if (hit?.secret) G.secret(hit.secret);
  if (awake() && !(hit && VERBATIM.has(hit.id))) {
    const facts = [...new Set([...(await provider.related(q)), KB.find((k) => k.id === 'about')!])].map((k) => '- ' + k.a.join(' ')).join('\n');
    const t = await think(SYSTEM(clean(G.name).trim() || 'friend', facts), history, q);
    if (t) {
      history.push({ role: 'user', content: q.slice(0, 300) }, { role: 'assistant', content: t });
      history.splice(0, Math.max(0, history.length - 4));
      return splitPages(t);
    }
  }
  return provider.reply(hit).lines;
}

const logic: RoomLogic = {
  create() {
    void provider.warm(); // start loading the smart match as soon as you walk in
    if (loadSettings().waelAi === 'on') void canThink().then((ok) => ok && wake());
  },
  async interact(w, e) {
    if (e.def.t !== 'npc' || e.def.id !== 'wael') return false;
    await talk(w, e, e.data.arg as string | undefined);
    e.data.arg = undefined;
    return true;
  },
};

async function talk(w: WorldApi, e: Entity, preset?: string) {
  const ui = w.s.scene.get('ui') as UIScene;
  const say = (lines: string | string[]) => ui.say(lines, { voice: 'wael' });
  if (!G.flag('waelMet')) {
    G.setFlag('waelMet');
    w.emote(e, '!', 700, 'y');
    await say([
      '* WAEL: Oh! A visitor. Sorry, I was in the middle of an epoch.',
      "* WAEL: I'm WAEL. Yeah, the one who built this whole underground. Hi, {name}!",
      "* WAEL: Ask me anything about my work. I'll answer as honestly as a pixel can.",
    ]);
  } else {
    const wear = G.s.wear && G.hasCos(G.s.wear) ? G.s.wear : '';
    if (wear && !G.flag('waelSaw' + wear)) {
      G.setFlag('waelSaw' + wear);
      await say(`* WAEL: Hey, {name}. Nice ${COSMETICS[wear]?.name.toLowerCase() ?? 'look'}, by the way.`);
    } else await say('* WAEL: Back again, {name}? Ask away.');
  }
  // offer the AI brain once (only where it can run); the choice is remembered in OPTIONS
  const st = loadSettings();
  if (!asked && !st.waelAi && !awake() && (await canThink())) {
    asked = true;
    const r = await ui.ask(["* WAEL: Psst. Want a version of me that really thinks?", `* WAEL: I can wake up a small AI brain that runs on YOUR computer. It's a one-time download of ${BRAIN.size}.`, "* WAEL: Nothing you type ever leaves your browser. (You can change this later in OPTIONS.)"], ['Wake it up', 'Not now'], { voice: 'wael', cancel: 1 });
    saveSettings({ ...st, waelAi: r === 0 ? 'on' : 'off' });
    if (r === 0) {
      void wake().then((ok) => ui.toast(ok ? "WAEL's AI brain is awake!" : "WAEL's AI brain couldn't start. Using his notes."));
      await say(["* WAEL: Waking up... it takes a minute the first time.", '* WAEL: Ask away meanwhile. I still have my notes.']);
    }
  } else if (st.waelAi === 'on' && !awake() && !waking() && (await canThink())) void wake();

  // works out the reply while the world stays paused, with a "..." over WAEL's head
  const answer = async (q: string) => {
    const release = ui.hold();
    const dots = setInterval(() => w.emote(e, '...', 900, 'w'), 1000);
    w.emote(e, '...', 900, 'w');
    let lines: string[];
    try {
      lines = await compose(q);
    } finally {
      clearInterval(dots);
      release();
    }
    await say(lines.map((l) => '* WAEL: ' + l));
  };
  if (preset) await answer(preset);
  // no ready-made questions: you type, he answers, the box opens again. ESC (or X) says goodbye.
  for (;;) {
    const q = await typeQuestion(ui);
    if (!q) {
      await say(["* WAEL: Cool. I'll be at my desk.", '* WAEL: Training something. Always training something.']);
      return;
    }
    await answer(q);
  }
}

/** Break a free reply into dialog pages at sentence ends (about two sentences a page). */
function splitPages(t: string): string[] {
  const sentences = t.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [t];
  const pages: string[] = [];
  for (const s of sentences) {
    const last = pages[pages.length - 1];
    if (last && (last + ' ' + s).length <= 90) pages[pages.length - 1] = last + ' ' + s;
    else pages.push(s);
  }
  return pages;
}

function box() {
  return document.getElementById('typebox') as HTMLInputElement;
}
function focusBox() {
  setTypeboxRect({ x: BOX.x, y: BOX.bottom, w: BOX.w, h: BOX.h });
  const b = box();
  b.value = '';
  b.focus({ preventScroll: true });
}

function typeQuestion(ui: UIScene): Promise<string | null> {
  const release = ui.hold();
  const g = ui.add.graphics().setDepth(22);
  drawBox(g, BOX.x, BOX.bottom, BOX.w, BOX.h);
  const hint = label(ui, BOX.x + 28, BOX.bottom + 18, 'ASK WAEL  ·  ENTER: ask  ·  ESC: bye', 'g', 2).setDepth(22);
  let txt: PixelText | null = null;
  const caret = ui.add.rectangle(0, 0, 14, 4, 0xffffff).setOrigin(0).setDepth(22);
  const b = box();
  if (document.activeElement !== b) focusBox();
  const paint = () => {
    txt?.destroy();
    const v = clean(b.value).slice(0, 80);
    txt = new PixelText(ui, BOX.x + 28, BOX.bottom + 50, '> ' + v, { scale: 3, cols: 28 }).setDepth(22);
    const lastRow = Math.max(0, txt.rows - 1);
    const cols = (('> ' + v).length % 28) || (v.length ? 28 : 2);
    caret.setPosition(BOX.x + 28 + cols * 18, BOX.bottom + 50 + lastRow * 30 + 22);
    audio.blip('wael');
  };
  paint();
  return new Promise((resolve) => {
    let blink = 0;
    const finish = (v: string | null) => {
      b.removeEventListener('input', paint);
      b.removeEventListener('keydown', onKey);
      ui.events.off('update', tick);
      b.blur();
      setTypeboxRect(null);
      g.destroy();
      hint.destroy();
      txt?.destroy();
      caret.destroy();
      release();
      resolve(v && v.trim() ? v.trim() : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); audio.sfx('select'); finish(b.value); }
      else if (e.key === 'Escape') { e.preventDefault(); audio.sfx('back'); finish(null); }
    };
    let status = '';
    const tick = (_t: number, dt: number) => {
      blink += dt;
      caret.setVisible(Math.floor(blink / 400) % 2 === 0);
      // show the AI brain's state next to the hint
      const s = awake() ? 'AI WAEL  ·  ENTER: ask  ·  ESC: bye' : waking() ? `AI WAKING UP ${progress()}%  ·  ESC: bye` : 'ASK WAEL  ·  ENTER: ask  ·  ESC: bye';
      if (s !== status) { status = s; hint.setText(s); }
      // on-screen Z / X buttons (phones) also submit / cancel
      if (input.consume('confirm')) finish(b.value);
      else if (input.consume('cancel')) finish(null);
    };
    b.addEventListener('input', paint);
    b.addEventListener('keydown', onKey);
    ui.events.on('update', tick);
  });
}

export default logic;
