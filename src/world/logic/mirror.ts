// The Mirror: ask questions, get answers typed out in Wael's voice, with suggested follow-ups.
import type { RoomLogic, WorldApi } from '../types';
import { LocalKB, type MirrorProvider } from '../mirror/engine';
import { game as G } from '../../core/state';
import { input } from '../../core/input';
import { audio } from '../../core/audio';
import { clean } from '../../core/glyphs';
import { label, PixelText } from '../../core/text';
import { BOX, drawBox, type UIScene } from '../../scenes/UI';
import { setTypeboxRect } from '../../shell/shell';

// Swap this for an LLM-backed provider later; the rest of the room does not change.
const provider: MirrorProvider = new LocalKB();

const logic: RoomLogic = {
  async interact(w, e) {
    if (e.def.t !== 'mirror') return false;
    await talk(w, e.data.arg as string | undefined);
    e.data.arg = undefined;
    return true;
  },
};

async function talk(w: WorldApi, preset?: string) {
  const ui = w.s.scene.get('ui') as UIScene;
  if (!G.flag('mirrorMet')) {
    G.setFlag('mirrorMet');
    await w.say(['* You look into the mirror.', "* Your reflection waves at you... then speaks with someone else's voice."]);
  }
  await ui.say(`* "Hi, {name}. I'm WAEL. Ask me anything about my work."`, { voice: 'wael' });
  let sugg = provider.starters();
  const answer = async (q: string) => {
    const r = await provider.ask(q);
    if (r.secret) G.secret(r.secret);
    await ui.say(r.lines.map((l) => '* ' + l), { voice: r.source === 'fallback' ? 'mirror' : 'wael' });
    sugg = r.followups.length ? r.followups : provider.starters();
  };
  if (preset) await answer(preset);
  for (;;) {
    const opts = [...sugg.slice(0, 3).map((s) => s.label), 'Type a question...', 'Leave'];
    const typeIdx = opts.length - 2;
    const r = await ui.ask('* What do you ask?', opts, {
      vertical: true, cancel: opts.length - 1, voice: 'mirror',
      onPick: (i) => { if (i === typeIdx) focusBox(); },
    });
    if (r === opts.length - 1) {
      await ui.say('* The reflection goes back to being just you.');
      return;
    }
    if (r === typeIdx) {
      const q = await typeQuestion(ui);
      if (q) await answer(q);
    } else await answer(sugg[r].label);
  }
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
  const hint = label(ui, BOX.x + 28, BOX.bottom + 18, 'ASK THE MIRROR  ·  ENTER: ask  ·  ESC: back', 'g', 2).setDepth(22);
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
    audio.blip('mirror');
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
    const tick = (_t: number, dt: number) => {
      blink += dt;
      caret.setVisible(Math.floor(blink / 400) % 2 === 0);
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
