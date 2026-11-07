// Unified input: keyboard (arrows/WASD, Z/Enter, X/Shift, C/Ctrl) + on-screen touch D-pad and buttons.
// Presses are queued by DOM events and exposed per game frame; scenes `consume()` a press so it is handled once.

export type Btn = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu';
const DIRS: Btn[] = ['up', 'down', 'left', 'right'];

const KEYS: Record<string, Btn> = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  z: 'confirm', enter: 'confirm', ' ': 'confirm', x: 'cancel', shift: 'cancel', escape: 'cancel', c: 'menu', control: 'menu',
};

// Konami: up up down down left right left right B A (B = b/X/Shift, A = a/Z/Enter)
const KONAMI = ['U', 'U', 'D', 'D', 'L', 'R', 'L', 'R', 'B', 'A'];
function tokensForKey(k: string): string[] {
  const t: string[] = [];
  if (k === 'arrowup' || k === 'w') t.push('U');
  if (k === 'arrowdown' || k === 's') t.push('D');
  if (k === 'arrowleft' || k === 'a') t.push('L');
  if (k === 'arrowright' || k === 'd') t.push('R');
  if (k === 'b' || k === 'x' || k === 'shift') t.push('B');
  if (k === 'a' || k === 'z' || k === 'enter') t.push('A');
  return t;
}
const TOKEN_OF: Partial<Record<Btn, string>> = { up: 'U', down: 'D', left: 'L', right: 'R', cancel: 'B', confirm: 'A' };

export type TextHandler = (e: KeyboardEvent) => boolean;

class InputManager {
  readonly held = new Set<Btn>();
  private queue: Btn[] = [];
  private frame = new Set<Btn>();
  private konami = 0;
  private keyHeld = new Map<string, Btn>();
  private touchHeld = new Set<Btn>();
  private dpadHeld = new Set<Btn>();

  /** When set, raw keys are offered here first (naming screen). Return true to swallow the key. */
  textHandler: TextHandler | null = null;
  /** Called synchronously inside the DOM event for a press (lets the Mirror focus its input within the user gesture). */
  gestureHook: ((b: Btn) => void) | null = null;
  onKonami: (() => void) | null = null;
  onMuteKey: (() => void) | null = null;
  onFirstGesture: (() => void) | null = null;
  lastDevice: 'keyboard' | 'touch' = 'keyboard';

  init() {
    window.addEventListener('keydown', (e) => this.keydown(e), { passive: false });
    window.addEventListener('keyup', (e) => this.keyup(e));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => document.hidden && this.releaseAll());
    const first = () => {
      this.onFirstGesture?.();
      window.removeEventListener('pointerdown', first, true);
      window.removeEventListener('keydown', first, true);
    };
    window.addEventListener('pointerdown', first, true);
    window.addEventListener('keydown', first, true);
    this.initTouch();
  }

  /** Called once per game step. */
  tick() {
    this.frame = new Set(this.queue);
    this.queue = [];
  }
  pressed(b: Btn) {
    return this.frame.has(b);
  }
  consume(b: Btn) {
    const had = this.frame.has(b);
    this.frame.delete(b);
    return had;
  }
  consumeAny(...bs: Btn[]): Btn | null {
    for (const b of bs) if (this.consume(b)) return b;
    return null;
  }
  clearFrame() {
    this.frame.clear();
    this.queue = [];
  }
  /** Movement vector from held directions (-1..1). */
  axis() {
    const x = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    const y = (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0);
    return { x, y };
  }

  private press(b: Btn) {
    this.queue.push(b);
    this.gestureHook?.(b);
  }
  private feedKonami(tokens: string[]) {
    if (!tokens.length) return;
    if (tokens.includes(KONAMI[this.konami])) {
      this.konami++;
      if (this.konami === KONAMI.length) {
        this.konami = 0;
        this.onKonami?.();
      }
    } else {
      this.konami = tokens.includes(KONAMI[0]) ? 1 : 0;
    }
  }
  private recompute() {
    this.held.clear();
    for (const b of this.keyHeld.values()) this.held.add(b);
    for (const b of this.touchHeld) this.held.add(b);
    for (const b of this.dpadHeld) this.held.add(b);
  }
  private releaseAll() {
    this.keyHeld.clear();
    this.touchHeld.clear();
    this.dpadHeld.clear();
    this.recompute();
  }

  private keydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; // the Mirror's text box handles its own keys
    if (e.ctrlKey && e.key.toLowerCase() !== 'control') return; // leave browser shortcuts alone
    if (e.altKey || e.metaKey) return;
    this.lastDevice = 'keyboard';
    const k = e.key.toLowerCase();
    if (!e.repeat) this.feedKonami(tokensForKey(k));
    if (this.textHandler && this.textHandler(e)) {
      e.preventDefault();
      return;
    }
    if (k === 'm' && !e.repeat) {
      this.onMuteKey?.();
      return;
    }
    const b = KEYS[k];
    if (!b) return;
    // Let Space/Enter activate focused DOM buttons/links (skip link, mute) normally.
    if ((k === ' ' || k === 'enter') && t && (t.tagName === 'A' || t.tagName === 'BUTTON')) return;
    e.preventDefault();
    if (e.repeat) {
      if (DIRS.includes(b)) this.queue.push(b); // auto-repeat for menus
      return;
    }
    this.keyHeld.set(k, b);
    this.recompute();
    this.press(b);
  }
  private keyup(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (this.keyHeld.delete(k)) this.recompute();
    if (k === 'shift' || k === 'control') {
      // modifiers can swallow keyups of other keys
      for (const [kk, b] of [...this.keyHeld]) if (b === 'cancel' || b === 'menu') this.keyHeld.delete(kk);
      this.recompute();
    }
  }

  private initTouch() {
    const root = document.getElementById('touch');
    if (!root) return;
    const mark = () => {
      document.documentElement.classList.add('touch');
      this.lastDevice = 'touch';
      window.dispatchEvent(new Event('resize'));
    };
    if (matchMedia('(pointer: coarse)').matches) document.documentElement.classList.add('touch');
    window.addEventListener('touchstart', () => !document.documentElement.classList.contains('touch') && mark(), { passive: true, once: true });

    // buttons
    root.querySelectorAll<HTMLElement>('[data-btn]').forEach((el) => {
      const b = el.dataset.btn as Btn;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        this.lastDevice = 'touch';
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('on');
        this.touchHeld.add(b);
        this.recompute();
        this.feedKonami(TOKEN_OF[b] ? [TOKEN_OF[b]!] : []);
        this.press(b);
      };
      const up = () => {
        el.classList.remove('on');
        this.touchHeld.delete(b);
        this.recompute();
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    });

    // D-pad: 8-way by angle, slide between directions without lifting the finger
    const pad = document.getElementById('dpad')!;
    const cells = new Map<Btn, HTMLElement>();
    pad.querySelectorAll<HTMLElement>('[data-dir]').forEach((el) => cells.set(el.dataset.dir as Btn, el));
    let active: number | null = null;
    const update = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const next = new Set<Btn>();
      if (Math.hypot(dx, dy) > r.width * 0.12) {
        const a = Math.atan2(dy, dx); // -pi..pi, 0 = right
        const oct = Math.round(a / (Math.PI / 4)); // -4..4
        const map: Record<number, Btn[]> = {
          0: ['right'], 1: ['right', 'down'], 2: ['down'], 3: ['down', 'left'], 4: ['left'], [-4]: ['left'],
          [-3]: ['left', 'up'], [-2]: ['up'], [-1]: ['up', 'right'],
        };
        map[oct].forEach((d) => next.add(d));
      }
      for (const d of next) if (!this.dpadHeld.has(d)) {
        this.feedKonami([TOKEN_OF[d]!]);
        this.press(d);
      }
      this.dpadHeld.clear();
      next.forEach((d) => this.dpadHeld.add(d));
      cells.forEach((el, d) => el.classList.toggle('on', next.has(d)));
      this.recompute();
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.lastDevice = 'touch';
      active = e.pointerId;
      pad.setPointerCapture?.(e.pointerId);
      update(e);
    });
    pad.addEventListener('pointermove', (e) => e.pointerId === active && update(e));
    const end = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      this.dpadHeld.clear();
      cells.forEach((el) => el.classList.remove('on'));
      this.recompute();
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('lostpointercapture', end);
  }
}

export const input = new InputManager();
