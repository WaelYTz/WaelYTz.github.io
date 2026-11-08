// Original chiptune loops (composed for this site). Patterns are 16th-note steps:
// a note ("A4"), "-" = hold the previous note, "." = rest. Noise channel: "x" = hat, "o" = snare.
// Each channel loops on its own, so every channel in a track has the same length (or one that divides it).
// Tracks are written one bar (16 steps) per string and assembled from sections with the helpers below.

type Wave = 'square' | 'triangle' | 'sawtooth' | 'pulse25' | 'pulse12' | 'noise';
export interface Channel { w: Wave; v: number; gate?: number; p: string[]; }
export interface Track { bpm: number; ch: Channel[]; }

const P = (...parts: string[]) => parts.join(' ').trim().split(/\s+/);
const c = (w: Wave, v: number, ...parts: string[]): Channel => ({ w, v, p: P(...parts) });
/** Like c(), with a gate below 1 for short, plucked notes. */
const cs = (w: Wave, v: number, gate: number, ...parts: string[]): Channel => ({ ...c(w, v, ...parts), gate });

/** Repeat a phrase n times. */
const rep = (n: number, ...parts: string[]) => Array.from({ length: n }, () => parts.join(' ')).join(' ');
/** n bars of silence. */
const rest = (bars: number) => rep(bars * 16, '.');
/** One note held for n steps (default: a whole bar). */
const hold = (note: string, n = 16) => [note, ...Array<string>(n - 1).fill('-')].join(' ');
/** Fill a rhythm template once per chord ('|'-separated); digit k in the template = k-th note of the chord. */
const arp = (tpl: string, chords: string) =>
  chords.split('|').map((ch) => {
    const n = P(ch);
    return P(tpl).map((t) => (/^\d$/.test(t) ? n[Number(t)] ?? '?' : t)).join(' ');
  }).join(' ');

const SEMI: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NAME = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const midi = (n: string) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return m ? 12 * Number(m[2]) + SEMI[m[1]] : -1;
};
const mapNotes = (f: (m: number) => number, parts: string[]) =>
  P(...parts).map((t) => {
    const m = midi(t);
    return m < 0 ? t : NAME[f(m) % 12] + Math.floor(f(m) / 12);
  }).join(' ');
/** Transpose a phrase by k semitones. */
const tp = (k: number, ...parts: string[]) => mapNotes((m) => m + k, parts);
/** Mirror a phrase's pitches around an axis note (melodic inversion). */
const inv = (axis: string, ...parts: string[]) => mapNotes((m) => 2 * midi(axis) - m, parts);
/** Play a phrase backwards, keeping each note's length. */
const retro = (...parts: string[]) => {
  const ev: string[][] = [];
  for (const t of P(...parts)) {
    if (t === '-' && ev.length) ev[ev.length - 1].push(t);
    else ev.push([t]);
  }
  return ev.reverse().flat().join(' ');
};
/** Delay a looping phrase by n steps (the tail wraps to the front): echoes and canons. */
const echo = (n: number, ...parts: string[]) => {
  const t = P(...parts);
  return [...t.slice(-n), ...t.slice(0, -n)].join(' ');
};

// Title: wistful A minor, 72 bpm. Intro, A (the original theme), A' (its answer), B (Dm-Bb-E, rising),
// A again with a counter-voice in the gaps, outro. 20 bars.
function title(): Track {
  const chA = 'E5 A5 C6|F5 A5 C6|G5 C6 E6|D6 B5 G5';
  const arpA = arp('0 . 1 . 2 . 1 .', chA);
  const arpA2 = arp('0 1 2 1 0 1 2 1', chA);
  const arpB = arp('0 . 1 . 2 . 1 .', 'D5 F5 A5|C5 E5 A5|D5 F5 Bb5|C5 F5 A5|D5 F5 A5|C5 E5 A5|E5 G#5 B5|B4 E5 G#5');
  const bassA = 'A2 - - - - - - - F2 - - - - - - - C3 - - - - - - - G2 - - - - - - -';
  const bassA2 = 'A2 - - - E3 - - - F2 - - - C3 - - - C3 - - - G2 - - - G2 - - - B2 - D3 -';
  const bassB = arp('0 - - - 1 - - -', 'D3 A2|A2 E2|Bb2 F2|F2 C3|D3 A2|A2 E2|E2 B2|E2 G#2');
  const leadA = [
    'E6 - - - - - - - . . . . . . . .', 'C6 - - - D6 - - - E6 - - - - - - -',
    '. . . . . . . . . . . . . . . .', 'A5 - - - G5 - - - A5 - - - - - - -',
  ];
  const leadA2 = [
    'E6 - - - - - - - F6 - E6 - C6 - A5 -', 'G5 - - - C6 - - - B5 - - - D6 - - -',
    'C6 - - - B5 - A5 - A5 - - - C6 - - -', 'E6 - - - D6 - C6 - D6 - - - - - - -',
  ];
  const leadB = [
    'F5 - - - A5 - - - E5 - - - A5 - - -', 'D6 - - - - - C6 - C6 - - - A5 - - -',
    'F5 - - - A5 - D6 - C6 - - - B5 - A5 -', 'G#5 - - - - - - - B5 - - - E6 - - -',
  ];
  const counterB = [
    'A3 - - - - - - - C4 - - - - - - -', 'D4 - - - - - - - C4 - - - - - - -',
    'A3 - - - - - - - E4 - - - - - - -', 'E4 - - - - - - - D4 - - - - - - -',
  ];
  const counterA = [
    '. . . . . . . . A4 - C5 - F5 - - -', 'E4 - - - - - - - D4 - - - - - - -',
    'E5 - - - D5 - C5 - A4 - - - - - - -', 'G4 - - - - - - - B4 - - - - - - -',
  ];
  return { bpm: 72, ch: [
    c('triangle', 0.22, bassA, rep(2, bassA), rep(2, bassA2), bassB, rep(2, bassA2), bassA),
    c('pulse25', 0.06, arpA, rep(2, arpA), rep(2, arpA2), arpB, rep(2, arpA), arpA),
    c('pulse12', 0.05, rest(2), ...leadA, ...leadA2, ...leadB, ...leadA, hold('A5'), rest(1)),
    c('triangle', 0.07, rest(10), ...counterB, ...counterA, rest(2)),
  ] };
}

// Crossroads: easy-going D minor walk, 100 bpm. Intro, A (the original tune), A' (climbs higher), B in F major
// (hats join), B' (a counter-voice enters), A again with the counter filling the gaps, a soft echo tag. 24 bars.
function hub(): Track {
  const bassA = 'D3 . . . A2 . . . D3 . . . A2 . . . Bb2 . . . F2 . . . C3 . . . G2 . . .';
  const bassA2 = 'D3 . . D3 A2 . . . D3 . . . A2 . C3 . Bb2 . . . F2 . . . C3 . . . C3 . E3 .';
  const tB = '0 . . . 1 . . . 0 . . . 1 . 2 .';
  const bassB = arp(tB, 'F2 C3 D3|C3 G2 A2|G2 D3 G#2|A2 E3 A2');
  const bassB2 = arp(tB, 'Bb2 F2 G2|F2 C3 E2|G2 D3 G#2|A2 E3 C#3');
  const tOff = '. . 0 . . . 0 . . . 1 . . . 1 .';
  const offA = arp(tOff, 'F4 A4|D4 E4');
  const offB = arp(tOff, 'A4 C5|G4 E4|Bb4 D5|C#5 E5');
  const offB2 = arp(tOff, 'D5 F5|A4 C5|Bb4 G4|A4 C#5');
  const leadA = [
    'A4 - D5 - E5 - F5 - - - E5 - D5 - - -', 'C5 - - - D5 - F5 - G5 - - - F5 - E5 -',
    'D5 - - - A4 - - - Bb4 - C5 - D5 - - -', 'E5 - - - - - - - . . . . . . . .',
  ];
  const leadA2 = [
    'A4 - D5 - E5 - F5 - - - G5 - A5 - - -', 'G5 - - - F5 - E5 - G5 - - - F5 - E5 -',
    'D5 - - - F5 - A5 - D6 - - - C6 - A5 -', 'D5 - - - - - - - . . . . . . . .',
  ];
  const leadB = [
    'C5 - - - F5 - - - A5 - - - G5 - F5 -', 'E5 - - - - - - - G5 - - - C5 - - -',
    'D5 - - - - - Bb4 - D5 - - - G5 - - -', 'E5 - - - - - - - C#5 - - - - - - -',
  ];
  const leadB2 = [
    'D5 - - - F5 - - - Bb5 - - - A5 - G5 -', 'A5 - - - - - - - F5 - - - C5 - - -',
    'Bb4 - - - D5 - - - G5 - - - F5 - E5 -', 'E5 - - - - - - - . . . . . . . .',
  ];
  const counterB2 = [hold('F4'), hold('A4'), 'G4 - - - - - - - Bb4 - - - - - - -', 'A4 - - - - - - - G4 - - - - - - -'];
  const counterA = [
    'F4 - - - - - - - A4 - - - - - - -', 'D4 - - - - - - - E4 - - - - - - -',
    'F4 - - - - - - - A4 - - - G4 - F4 -', 'D4 - - - - - - - E4 - G4 - Bb4 - C5 -',
  ];
  const beat = 'x . . . o . . . x . . x o . . .';
  const fill = 'x . . . o . . . o . o . o o o o';
  return { bpm: 100, ch: [
    c('triangle', 0.22, bassA, rep(2, bassA), rep(2, bassA2), bassB, bassB2, rep(2, bassA), bassA),
    c('pulse12', 0.04, offA, rep(4, offA), offB, offB2, rep(2, offA), offA),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA, rest(2)),
    c('triangle', 0.07, rest(14), ...counterB2, ...counterA, 'A4 - D5 - E5 - F5 - - - - - . . . .', rest(1)),
    c('noise', 0.025, rest(10), rep(3, beat), fill, rep(3, beat), fill,
      rep(3, 'x . . . x . . . x . . . x . . .'), 'x . . . x . . . x . x . o . o o', 'x . . . . . . . . . . . . . . .', rest(1)),
  ] };
}

// Ruins: brisk E minor exploration, 112 bpm. Intro on an E pedal, A (the original line), A' (higher answer),
// B (Am-D-G-E, warmer), B' (bass climbs A-B-C-D back home), A with a low echo canon, coda. 24 bars.
function ruins(): Track {
  const tA = '0 . 1 . 0 . 1 . 0 . 1 . 0 . 1 .';
  const bassA = arp(tA, 'E2 E3|C2 C3|D2 D3|B1 B2');
  const bassA2 = arp('0 . 1 . 0 . 1 . 0 . 1 . 2 . 1 .', 'E2 E3 G2|C2 C3 E2|D2 D3 F#2|B1 B2 D#2');
  const tB = '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .';
  const bassB = arp(tB, 'A1 A2 E2|D2 D3 A2|G1 G2 D2|E2 E3 B1');
  const bassB2 = arp(tB, 'A1 A2 E2|B1 B2 F#2|C2 C3 G2|D2 D3 A2');
  const leadA = [
    'E5 . G5 . B5 - A5 - G5 . F#5 . E5 - - -', 'C5 . E5 . G5 - F#5 - E5 . D5 . C5 - - -',
    'D5 . F#5 . A5 - G5 - F#5 . E5 . D5 - - -', 'B4 . D#5 . F#5 - - - B5 - - - . . . .',
  ];
  const leadA2 = [
    'E5 . G5 . B5 - E6 - D6 . B5 . G5 - - -', 'C6 . B5 . G5 - E5 - G5 . A5 . E5 - - -',
    'D5 . F#5 . A5 - D6 - C6 . A5 . F#5 - D5 -', 'D#5 - - - F#5 - - - B5 - - - A5 - F#5 -',
  ];
  const leadB = [
    'A4 - - - C5 - E5 - A5 - - - G5 - E5 -', 'F#5 - - - - - - - D5 - E5 - F#5 - A5 -',
    'G5 - - - - - - - B5 - - - D6 - B5 -', 'G#5 - - - - - - - E5 - - - - - - -',
  ];
  const leadB2 = [
    'C6 - - - B5 - A5 - E5 - - - A5 - - -', 'B5 - - - - - - - D#5 - - - F#5 - - -',
    'G5 - - - - - E5 - C5 - - - E5 - G5 -', 'F#5 - - - A5 - - - - - - - . . . .',
  ];
  const counterB = [hold('E4'), hold('F#4'), hold('D4'), 'E4 - - - - - - - D4 - - - - - - -'];
  const counterB2 = ['C4 - - - - - - - E4 - - - - - - -', hold('D#4'), 'E4 - - - - - - - G4 - - - - - - -', 'F#4 - - - - - - - A4 - - - - - - -'];
  const beat = 'x . . . o . . . x . x . o . . .';
  const beatB = 'x . x . o . . x x . x . o . x .';
  const fill = 'x . . . o . . . o . o . o o o o';
  return { bpm: 112, ch: [
    c('triangle', 0.24, arp(tA, 'E2 E3|E2 E3'), bassA, bassA2, bassB, bassB2, bassA, arp(tA, 'E2 E3|B1 B2')),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA, rest(2)),
    c('triangle', 0.07, rest(10), ...counterB, ...counterB2, tp(-12, echo(3, ...leadA)), rest(2)),
    c('noise', 0.04, rep(2, 'x . . . . . . . x . . . . . . .'), rep(3, beat), fill, rep(3, beat), fill,
      rep(3, beatB), fill, rep(3, beatB), fill, rep(3, beat), fill, beat, 'x . . . o . . . o o o . o o o o'),
  ] };
}

// Lab: busy C minor machinery, 132 bpm. Intro, A (the original line), A' (variation), B (Fm-Eb-Db-G),
// B' (back via Ab-Bb), a call-and-response breakdown, then A and A' again with a harmony voice. 30 bars.
function lab(): Track {
  const bassA = 'C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . Ab1 . Ab2 . Ab1 . Ab2 . Bb1 . Bb2 . Bb1 . Bb2 .';
  const bassA2 = 'C2 . C3 . C2 . C3 . Eb2 . Eb3 . G2 . G3 . Ab1 . Ab2 . Ab1 . Ab2 . Bb1 . Bb2 . Bb1 . B1 .';
  const tB = '0 . 1 . 0 . 1 . 0 . 1 . 0 . 1 .';
  const bassB = arp(tB, 'F1 F2|Eb2 Eb3|Db2 Db3|G1 G2');
  const bassB2 = [arp(tB, 'F1 F2|Eb2 Eb3'), 'Ab1 . Ab2 . Ab1 . Ab2 . Bb1 . Bb2 . Bb1 . Bb2 .', 'G1 . G2 . G1 . G2 . G1 . G2 . B1 . D2 .'];
  const bassBreak = rep(2, hold('C2'), 'Ab1 - - - - - Bb1 - - - - - - - - -');
  const arpA = 'C5 Eb5 G5 C6 G5 Eb5 C5 Eb5 G5 C6 G5 Eb5 C5 Eb5 G5 Eb5 Ab4 C5 Eb5 Ab5 Eb5 C5 Bb4 D5 F5 Bb5 F5 D5 Bb4 D5 F5 D5';
  const tArp = '0 1 2 3 2 1 0 1 2 3 2 1 0 1 2 1';
  const arpB = arp(tArp, 'Ab4 C5 F5 Ab5|G4 Bb4 Eb5 G5|Ab4 Db5 F5 Ab5|G4 B4 D5 F5');
  const arpB2 = [arp(tArp, 'Ab4 C5 F5 Ab5|G4 Bb4 Eb5 G5'), 'Ab4 C5 Eb5 Ab5 Eb5 C5 Bb4 D5 F5 Bb5 F5 D5 Bb4 D5 F5 D5', arp(tArp, 'G4 B4 D5 F5')];
  const leadA = [
    'G5 - - - - - Eb5 - F5 - - - G5 - - -', 'Ab5 - - - G5 - F5 - Eb5 - - - D5 - - -',
    'C5 - - - - - - - . . . . . . . .', '. . . . . . . . Bb4 - C5 - D5 - Eb5 -',
  ];
  const leadA2 = [
    'G5 - - - - - Eb5 - F5 - - - G5 - C6 -', 'Ab5 - - - G5 - F5 - Eb5 - D5 - Bb4 - - -',
    'C5 - - - - - G4 - C5 - Eb5 - G5 - - -', 'Ab5 - G5 - F5 - Eb5 - D5 - - - - - - -',
  ];
  const leadB = [
    'C6 - - - - - Ab5 - F5 - - - Ab5 - C6 -', 'Bb5 - - - - - G5 - Eb5 - - - G5 - Bb5 -',
    'Ab5 - - - - - F5 - Db5 - - - F5 - Ab5 -', 'G5 - - - - - - - B5 - - - D6 - - -',
  ];
  const leadB2 = [
    'F5 - - - G5 - Ab5 - C6 - - - Bb5 - Ab5 -', 'G5 - - - - - - - Eb5 - - - . . . .',
    'C5 - - - Eb5 - Ab5 - D5 - - - F5 - Bb5 -', 'B4 - - - D5 - - - F5 - - - G5 - - -',
  ];
  const leadBreak = ['C6 . G5 . Eb5 . G5 . . . . . . . . .', rest(1), 'C6 . G5 . Eb5 . G5 . Ab5 . . . . . . .', rest(1)];
  const counterBreak = [rest(1), 'Eb5 . C5 . Ab4 . Bb4 . D5 - - - . . . .', rest(1), 'F5 . Eb5 . C5 . D5 . F5 - - - . . . .'];
  const counterA = [
    'Eb5 - - - - - C5 - D5 - - - Eb5 - - -', 'C5 - - - Eb5 - D5 - Bb4 - - - Bb4 - - -',
    'G4 - - - - - - - C5 - Eb5 - G5 - Eb5 -', 'Ab4 - - - - - F4 - D4 - - - F4 - G4 -',
  ];
  const counterA2 = [
    'Eb5 - - - - - C5 - D5 - - - Eb5 - G5 -', 'C5 - - - Eb5 - D5 - Bb4 - F4 - D4 - - -',
    'G4 - - - - - Eb4 - G4 - C5 - Eb5 - - -', 'C5 - Eb5 - C5 - Bb4 - F4 - - - - - - -',
  ];
  const beat = 'x . o . x x o . x . o . x x o .';
  const beatB = 'x . o x x x o . x . o x x x o .';
  const fill = 'x . o . x x o . o . o . o o o o';
  return { bpm: 132, ch: [
    c('triangle', 0.25, bassA, rep(2, bassA), rep(2, bassA2), bassB, ...bassB2, bassBreak, rep(2, bassA), rep(2, bassA2)),
    c('pulse12', 0.045, arpA, rep(4, arpA), arpB, ...arpB2, rep(6, arpA)),
    c('pulse25', 0.065, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadBreak, ...leadA, ...leadA2),
    c('square', 0.03, rest(18), ...counterBreak, ...counterA, ...counterA2),
    c('noise', 0.05, rep(2, 'x . . . x . . . x . . . x . x .'), rep(3, beat), fill, rep(3, beat), fill,
      rep(3, beatB), fill, rep(3, beatB), fill, rep(3, 'x . x . x . x . x . x . x . x .'), 'x . x . x . x . o . o . o o o o',
      rep(3, beat), fill, rep(3, beat), fill),
  ] };
}

// Hall of Records: stately, nostalgic F major, 88 bpm. Intro, A (the original line), A' (reaching higher),
// B (Dm-Am-Bb-F, a low counter-voice enters), B' (Gm-Am-Bb-C), A again with the counter answering. 22 bars.
function records(): Track {
  const bassA = 'F2 . . . C3 . . . F2 . . . C3 . . . Bb2 . . . F2 . . . C3 . . . C2 . . .';
  const bassA2 = 'F2 . . . C3 . . F2 A2 . . . C3 . . . Bb2 . . . F2 . . . C3 . . . E2 . . .';
  const tB = '0 . . . 1 . . . 0 . . . 1 . . .';
  const bassB = arp(tB, 'D2 A2|A2 E2|Bb2 F2|F2 C3');
  const bassB2 = arp(tB, 'G2 D3|A2 E2|Bb2 F2') + ' C3 . . . G2 . . . E2 . . . C2 . . .';
  const arpA = 'A4 . C5 . G4 . E5 . A4 . C5 . G4 . E5 . D5 . F5 . A4 . C5 . G4 . E5 . G4 . C5 .';
  const tArp = '0 . 2 . 1 . 2 . 0 . 2 . 1 . 2 .';
  const arpB = arp(tArp, 'A4 D5 F5|A4 C5 E5|Bb4 D5 F5|A4 C5 F5');
  const arpB2 = arp(tArp, 'Bb4 D5 G5|A4 C5 E5|Bb4 D5 F5|G4 Bb4 E5');
  const leadA = [
    'F5 - - - A5 - - - C6 - - - - - Bb5 -', 'A5 - G5 - F5 - - - G5 - - - - - - -',
    'D6 - - - C6 - Bb5 - A5 - - - G5 - A5 -', 'F5 - - - - - - - . . . . . . . .',
  ];
  const leadA2 = [
    'F5 - - - A5 - - - C6 - - - D6 - C6 -', 'Bb5 - A5 - G5 - - - E5 - - - G5 - - -',
    'C6 - - - D6 - C6 - A5 - - - F5 - A5 -', 'A5 - - - G5 - F5 - G5 - - - - - - -',
  ];
  const leadB = [
    'D5 - - - F5 - - - A5 - - - - - G5 -', 'E5 - - - - - - - C5 - - - E5 - - -',
    'D5 - - - F5 - - - Bb5 - - - A5 - G5 -', 'A5 - - - - - - - . . . . . . . .',
  ];
  const leadB2 = [
    'G5 - - - Bb5 - - - D6 - - - C6 - Bb5 -', 'C6 - - - - - - - A5 - - - E5 - - -',
    'D6 - - - - - C6 - Bb5 - - - F5 - - -', 'G5 - - - - - - - E5 - - - - - - -',
  ];
  const counterB = [
    'F4 - - - - - - - A4 - - - - - - -', 'C4 - - - - - - - E4 - - - - - - -',
    'D4 - - - - - - - F4 - - - - - - -', 'C4 - - - - - - - F4 - - - - - - -',
  ];
  const counterB2 = [
    'D4 - - - - - - - G4 - - - - - - -', 'E4 - - - - - - - C4 - - - - - - -',
    'F4 - - - - - - - D4 - - - - - - -', 'E4 - - - - - - - Bb4 - - - - - - -',
  ];
  const counterA = [
    hold('A4'), 'D5 - - - - - - - E5 - - - C5 - - -',
    'F5 - - - - - - - C5 - - - - - - -', 'D5 - - - - - - - C5 - E5 - G5 - Bb5 -',
  ];
  return { bpm: 88, ch: [
    c('triangle', 0.24, bassA, rep(2, bassA), rep(2, bassA2), bassB, bassB2, rep(2, bassA)),
    c('pulse12', 0.04, arpA, rep(4, arpA), arpB, arpB2, rep(2, arpA)),
    c('square', 0.06, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA),
    c('triangle', 0.07, rest(10), ...counterB, ...counterB2, ...counterA),
  ] };
}

// Library: hushed, page-turning G major, 76 bpm. Intro, A (the original line), A' (wider), B (Am-D-Bm-Em,
// thoughtful), B' (C-Bm-Am-D), A again while a soft second voice answers in the gaps. 22 bars.
function library(): Track {
  const bassA = 'G2 - - - - - - - E2 - - - - - - - C3 - - - - - - - D3 - - - - - - -';
  const bassA2 = 'G2 - - - D3 - - - E2 - - - B2 - - - C3 - - - G2 - - - D3 - - - A2 - - -';
  const tB = '0 - - - - - - - 1 - - - - - - -';
  const bassB = arp(tB, 'A2 E2|D3 A2|B2 F#2|E2 B2');
  const bassB2 = arp(tB, 'C3 G2|B2 F#2|A2 E2|D3 A2');
  const arpA = 'G4 B4 D5 B4 G4 B4 D5 B4 E4 G4 B4 G4 E4 G4 B4 G4 C5 E5 G5 E5 C5 E5 G5 E5 D5 F#5 A5 F#5 D5 F#5 A5 F#5';
  const tArp = '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1';
  const arpB = arp(tArp, 'A4 C5 E5|F#4 A4 D5|F#4 B4 D5|G4 B4 E5');
  const arpB2 = arp(tArp, 'G4 C5 E5|F#4 B4 D5|A4 C5 E5|F#4 A4 D5');
  const leadA = [
    'D6 - - - - - - - B5 - - - - - - -', 'C6 - - - B5 - A5 - G5 - - - - - - -',
    rest(1), 'A5 - - - B5 - - - A5 - - - F#5 - - -',
  ];
  const leadA2 = [
    'D6 - - - - - - - B5 - - - G5 - - -', 'E6 - - - D6 - C6 - B5 - - - A5 - - -',
    'B5 - - - D6 - - - E6 - - - B5 - - -', 'E6 - - - D6 - C6 - D6 - - - - - - -',
  ];
  const leadB = [
    'A5 - - - C6 - - - E6 - - - D6 - C6 -', 'D6 - - - - - - - F#5 - - - A5 - - -',
    'B5 - - - - - - - F#5 - - - D6 - - -', 'E6 - - - - - - - B5 - - - G5 - - -',
  ];
  const leadB2 = [
    'G5 - - - C6 - - - E6 - - - - - - -', 'D6 - - - - - - - B5 - - - F#5 - - -',
    'C6 - - - - - - - A5 - - - E5 - - -', 'F#5 - - - - - - - A5 - - - . . . .',
  ];
  const counterB = [
    'E5 - - - - - - - A4 - - - - - - -', 'F#4 - - - - - - - A4 - - - D5 - - -',
    'D5 - - - - - - - B4 - - - - - - -', 'G4 - - - - - - - E5 - - - D5 - - -',
  ];
  const counterB2 = [
    'E5 - - - - - - - G4 - - - - - - -', 'F#4 - - - - - - - D5 - - - - - - -',
    'E5 - - - - - - - C5 - - - - - - -', 'D5 - - - - - - - C5 - - - - - - -',
  ];
  const counterA = [
    'B4 - - - - - - - G4 - - - - - - -', 'E4 - - - G4 - - - A4 - - - - - - -',
    'D5 - B4 - G4 - B4 - E5 - - - G5 - - -', 'E5 - - - - - - - D5 - - - - - - -',
  ];
  return { bpm: 76, ch: [
    c('triangle', 0.2, bassA, rep(2, bassA), rep(2, bassA2), bassB, bassB2, rep(2, bassA)),
    c('triangle', 0.07, arpA, rep(4, arpA), arpB, arpB2, rep(2, arpA)),
    c('pulse12', 0.045, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA),
    c('pulse25', 0.035, rest(10), ...counterB, ...counterB2, ...counterA),
  ] };
}

// Memorial: slow, still A minor, 60 bpm. Pad intro with a lone bell, A (a simple music-box line),
// B (Dm-Em-F-G, lifting), A' (turns to E major), a short close; a faint echo trails the melody. 16 bars.
function memorial(): Track {
  const t8 = '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .';
  const mel = [
    '. . . . . . . . C6 - - - . . . .', '. . . . . . . . A5 - - - . . . .',
    'C6 - - - - - - - B5 - - - A5 - - -', 'F5 - - - - - - - . . . . A5 - C6 -',
    'E6 - - - - - D6 - C6 - - - - - - -', 'B5 - - - - - - - . . . . . . . .',
    'A5 - - - - - - - D6 - - - C6 - - -', 'B5 - - - - - - - G5 - - - E5 - - -',
    'F5 - - - - - - - A5 - - - C6 - - -', 'D6 - - - - - - - - - - - B5 - - -',
    'C6 - - - - - - - B5 - - - A5 - - -', 'F5 - - - - - - - . . . . A5 - C6 -',
    'E6 - - - - - D6 - C6 - - - B5 - - -', 'G#5 - - - - - - - . . . . B5 - - -',
    hold('A5'), rest(1),
  ];
  return { bpm: 60, ch: [
    c('triangle', 0.12, hold('A3', 32), ...['A3', 'F3', 'C4', 'G3', 'D3', 'E3', 'F3', 'G3', 'A3', 'F3', 'C4', 'E3', 'F3', 'E3'].map((n) => hold(n))),
    c('triangle', 0.07, hold('E4'), hold('A4'), arp(t8, 'E4 A4 C5|F4 A4 C5|E4 G4 C5|D4 G4 B4'),
      arp(t8, 'D4 F4 A4|E4 G4 B4|F4 A4 C5|D4 G4 B4'), arp(t8, 'E4 A4 C5|F4 A4 C5|E4 G4 C5|E4 G#4 B4'), hold('A4'), hold('G#4')),
    c('pulse12', 0.03, ...mel),
    c('pulse12', 0.015, echo(3, ...mel)),
  ] };
}

// Lumen's Shop: jaunty Bb major, 124 bpm. Door-bell intro, A (the original hook, extended), A' (syncopated, offbeat
// stabs), B (Eb-Bb-Cm-F), B' (a cheeky Ebm), C (call and response), A in thirds, a tag. 28 bars.
function shop(): Track {
  const bassA = 'Bb2 . F2 . Bb2 . F2 . Eb3 . Bb2 . Eb3 . Bb2 . F2 . C3 . F2 . C3 . Bb2 . F2 . Bb2 . . .';
  const bassA2 = 'Bb2 . D3 . F3 . D3 . Eb3 . G3 . Bb2 . G2 . F2 . A2 . C3 . A2 . Bb2 . F2 . Bb2 . . .';
  const bassB = [
    'Eb3 . Bb2 . Eb3 . Bb2 . Eb3 . Bb2 . G2 . Bb2 .', 'Bb2 . F2 . Bb2 . F2 . Bb2 . F2 . D3 . F2 .',
    'C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 .', 'Bb2 . F2 . Bb2 . F2 . Bb2 . . . . . . .',
  ];
  const bassB2 = [
    'Eb3 . Bb2 . Eb3 . Bb2 . Eb3 . Bb2 . Eb3 . Bb2 .', 'Eb3 . Bb2 . Eb3 . Bb2 . Eb3 . Bb2 . Gb2 . Bb2 .',
    'Bb2 . F2 . Bb2 . F2 . G2 . D3 . G2 . D3 .', 'C3 . G2 . C3 . G2 . F2 . C3 . F2 . A2 .',
  ];
  const bassC = [
    'G2 . . . D3 . . . G2 . . . Bb2 . . .', 'C3 . . . G2 . . . C3 . . . Eb3 . . .',
    'F2 . . . C3 . . . F2 . . . A2 . . .', 'F2 . . . A2 . . . C3 . . . Eb3 . . .',
  ];
  const bassTag = ['Bb2 . F2 . Bb2 . F2 . Eb3 . . . . . . .', 'F2 . . . C3 . . . F2 . . . . . . .'];
  const leadA = [
    'D5 . F5 . Bb5 . F5 . G5 . Eb5 . G5 - - .', 'C5 . Eb5 . A5 . F5 . D5 - - - - . . .',
    'D5 . F5 . Bb5 . D6 . C6 . Bb5 . G5 - - .', 'A5 . C6 . Eb6 . C6 . Bb5 - - - - . . .',
  ];
  const leadA2 = [
    'F5 . . F5 Bb5 . . D6 C6 . Bb5 . G5 . Eb5 .', 'F5 . A5 . C6 . A5 . Bb5 . . . . . . .',
    'D6 . . D6 C6 . Bb5 . G5 . Bb5 . Eb6 . . .', 'C6 . A5 . F5 . A5 . Bb5 - - - . . . .',
  ];
  const leadB = [
    'G5 - - . Bb5 - - . Eb6 - - . D6 . C6 .', 'D6 - - . F5 - - . Bb5 - - . . . . .',
    'Eb5 . G5 . C6 . G5 . F5 . A5 . C6 . A5 .', 'Bb5 - - - D6 - - - Bb5 . . . . . . .',
  ];
  const leadB2 = [
    'G5 - - . Bb5 - - . Eb6 - - . Bb5 . G5 .', 'Gb5 - - . Bb5 - - . Eb6 - - . . . . .',
    'F5 . D5 . F5 . Bb5 . G5 . D5 . G5 . Bb5 .', 'E5 - - . G5 - - . A5 - - . C6 - - .',
  ];
  const leadC = [
    'D5 . G5 . Bb5 . . . . . . . . . . .', 'Eb5 . G5 . C6 . . . . . . . . . . .',
    'C5 . F5 . A5 . . . . . . . . . . .', 'C6 . A5 . F5 . Eb5 . . . . . . . . .',
  ];
  const counterC = [
    '. . . . . . . . Bb5 . A5 . G5 . . .', '. . . . . . . . C6 . Bb5 . G5 . . .',
    '. . . . . . . . A5 . G5 . F5 . . .', '. . . . . . . . G5 . A5 . Bb5 . C6 .',
  ];
  const counterA = [
    'Bb4 . D5 . F5 . D5 . Eb5 . Bb4 . Eb5 - - .', 'A4 . C5 . F5 . C5 . Bb4 - - - - . . .',
    'Bb4 . D5 . F5 . Bb5 . G5 . Eb5 . Eb5 - - .', 'F5 . A5 . C6 . A5 . F5 - - - - . . .',
  ];
  const stab = '. . 0 . . . 1 .';
  const beat = 'x . o . x . o x x . o . x . o x';
  const beatB = 'x . o x x . o x x . o x x . o x';
  const beatC = 'x . . . o . . . x . . . o . . .';
  const fill = 'x . o . x . o x o . o . o o o o';
  return { bpm: 124, ch: [
    c('triangle', 0.24, bassA, rep(2, bassA), rep(2, bassA2), ...bassB, ...bassB2, ...bassC, rep(2, bassA), ...bassTag),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadC, ...leadA,
      'D5 . F5 . Bb5 . . . . . . . . . . .', 'F5 . . . C5 . . . F5 . . . . . . .'),
    c('pulse12', 0.035, 'F6 . D6 . Bb5 . . . . . . . . . . .', rest(5), rep(2, arp(stab, 'D5 F5|Eb5 G5|C5 A4|D5 F5')), rest(4),
      arp(stab, 'Eb5 G5|Eb5 G5|Eb5 Gb5|Eb5 Gb5|D5 F5|D5 G5|E5 G5|C5 F5'), ...counterC, ...counterA, rest(2)),
    c('noise', 0.04, rep(2, beat), rep(3, beat), fill, rep(3, beat), fill, rep(3, beatB), fill, rep(3, beatB), fill,
      rep(3, beatC), fill, rep(3, beat), fill, 'x . o . x . o x o . . . . . . .', 'x . . . x . . . o . . . . . . .'),
  ] };
}

// The Mirror: dreamy whole-tone reflections, 70 bpm. Shimmer intro, A (the original phrase, extended), A' (A played
// backwards), B (A upside down, in the other whole-tone scale), A again with its own mirror image below it. 18 bars.
function mirror(): Track {
  const leadA = [
    'E5 . F#5 . G#5 . A#5 . G#5 . F#5 . E5 - - -', 'D5 . E5 . F#5 . G#5 - - - - - . . . .',
    'C6 . A#5 . G#5 . F#5 . G#5 - - - E5 - - -', 'F#5 - - - D5 - - - E5 - - - - - - -',
  ];
  const t8 = '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .';
  const shA = arp(t8, 'C5 E5 G#5|D5 F#5 A#5|C5 E5 G#5|D5 F#5 A#5');
  return { bpm: 70, ch: [
    c('triangle', 0.14, ...['C3', 'D3', 'C3', 'D3', 'C3', 'D3', 'D3', 'C3', 'D3', 'C3', 'B2', 'C#3', 'B2', 'C#3', 'C3', 'D3', 'C3', 'D3'].map((n) => hold(n))),
    c('triangle', 0.065, rest(2), ...leadA, retro(...leadA), tp(-1, inv('E5', ...leadA)), ...leadA),
    c('pulse12', 0.02, arp(t8, 'C5 E5 G#5|D5 F#5 A#5'), shA, arp('2 . 1 . 0 . 1 . 2 . 1 . 0 . 1 .', 'D5 F#5 A#5|C5 E5 G#5|D5 F#5 A#5|C5 E5 G#5'),
      arp(t8, 'B4 D#5 G5|C#5 F5 A5|B4 D#5 G5|C#5 F5 A5'), shA),
    c('triangle', 0.06, rest(10), hold('G4'), hold('A4'), hold('B4'), hold('A4'), tp(-12, inv('E5', ...leadA))),
  ] };
}

// Battle: urgent A minor, 150 bpm. Drum-and-bass intro, A (the original riff, extended), A' (an octave up),
// B (Dm-Bb-C, syncopated), B' (turns to E major), A again over a running arpeggio. 22 bars.
function battle(): Track {
  const bassA = 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3';
  const t16 = '0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1';
  const leadA = [
    'A4 . C5 . E5 . A5 - G5 . E5 . D5 . E5 -', 'F5 . E5 . D5 . C5 . B4 . C5 . D5 - - -',
    'A4 . C5 . E5 . A5 - G5 . E5 . D5 . E5 -', 'F5 . E5 . D5 . E5 . A5 - - - G5 - - -',
  ];
  const leadA2 = [
    'E5 . A5 . C6 . E6 - D6 . C6 . B5 . C6 -', 'D6 . C6 . B5 . A5 . A5 . C6 . B5 - - -',
    'E5 . A5 . C6 . E6 - F6 . E6 . D6 . B5 -', 'C6 . B5 . A5 . G#5 . A5 - - - - - . .',
  ];
  const leadB = [
    'D5 - - D5 - - F5 - A5 - - - G5 - F5 -', 'E5 - - E5 - - F5 - D5 - - - . . . .',
    'D5 - - D5 - - F5 - Bb5 - - - A5 - G5 -', 'G5 - - - E5 - - - C5 - - - E5 - G5 -',
  ];
  const leadB2 = [
    'D5 - - D5 - - F5 - A5 - - - D6 - C6 -', 'A5 - - - - - F5 - D5 - - - . . . .',
    'E5 - - E5 - - G#5 - B5 - - - D6 - B5 -', 'G#5 - - - - - - - E5 - - - - - - -',
  ];
  const beat = 'x . o . x x o . x . o . x x o .';
  const beatB = 'x . o x x . o . x . o x x . o .';
  const fill = 'x . o . x x o . o . o o o o o o';
  return { bpm: 150, ch: [
    c('triangle', 0.26, 'A2 . . A2 . . A2 . A2 . . A2 . . A2 .', 'A2 . . A2 . . A2 . F2 F3 F2 F3 G2 G3 G2 G3', rep(8, bassA),
      arp(t16, 'D2 D3|D2 D3|Bb1 Bb2|C2 C3'), arp(t16, 'D2 D3|D2 D3|E2 E3|E2 E3'), rep(4, bassA)),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA),
    c('pulse12', 0.035, rest(14), arp('0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1', 'D5 F5 A5|D5 F5 A5|E5 G#5 B5|E5 G#5 B5'),
      rep(4, 'A4 C5 E5 C5 A4 C5 E5 C5 F4 A4 C5 A4 G4 B4 D5 B4')),
    c('noise', 0.06, 'x . . x . . x . x . . x . . x .', 'x . . x . . x . o . o . o o o o', rep(3, beat), fill, rep(3, beat), fill,
      rep(3, beatB), fill, rep(3, beatB), fill, rep(3, beat), fill),
  ] };
}

// Credits: warm and grateful C major, 96 bpm. Intro, A (the original line), A' (higher), B (F-G-Em-Am-Dm-G),
// B' (builds to A major), A and A' lifted a whole tone into D major, and a gentle turn back home. 28 bars.
function credits(): Track {
  const tA = '0 . 1 . 0 . 1 . 0 . 1 . 0 . 1 .';
  const bassA = arp(tA, 'C3 G2|A2 E2|F2 C3|G2 D3');
  const bassA2 = arp('0 . 1 . 0 . 1 . 0 . 1 . 2 . 1 .', 'C3 G2 E2|A2 E2 C3|F2 C3 A2|G2 D3 B2');
  const bassB = arp('0 . 1 . 0 . 1 .', 'F2 C3|G2 D3|E2 B2|A2 E2|D2 A2|G2 D3|C3 G2|C3 Bb2');
  const bassB2 = arp('0 . 1 . 0 . 1 .', 'F2 C3|G2 D3|E2 B2|A2 E2|D2 A2|E2 B2|G2 D3|A2 E2');
  const t16 = '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1';
  const arpA = arp(t16, 'C5 E5 G5|A4 C5 E5|F4 A4 C5|G4 B4 D5');
  const t8 = '0 1 2 1 0 1 2 1';
  const arpB = arp(t8, 'F4 A4 C5|G4 B4 D5|E4 G4 B4|A4 C5 E5|D4 F4 A4|G4 B4 D5|C5 E5 G5|C5 E5 Bb4');
  const arpB2 = arp(t8, 'F4 A4 C5|G4 B4 D5|E4 G4 B4|A4 C#5 E5|D4 F4 A4|E4 G#4 B4|G4 B4 D5|A4 C#5 E5');
  const leadA = [
    'E5 - - - G5 - - - C6 - - - B5 - G5 -', 'A5 - - - - - E5 - C5 - - - - - - -',
    'F5 - - - A5 - - - C6 - - - D6 - C6 -', 'B5 - - - - - - - G5 - - - - - - -',
  ];
  const leadA2 = [
    'E5 - - - G5 - - - C6 - - - E6 - D6 -', 'C6 - - - - - A5 - E5 - - - A5 - B5 -',
    'C6 - - - A5 - - - F5 - - - A5 - C6 -', 'D6 - - - - - B5 - G5 - - - - - - -',
  ];
  const leadB = [
    'A5 - - - - - G5 - B5 - - - - - D6 -', 'E6 - - - D6 - B5 - C6 - - - - - - -',
    'F5 - - - A5 - D6 - D6 - - - C6 - B5 -', 'C6 - - - - - - - . . . . Bb5 - - -',
  ];
  const leadB2 = [
    'A5 - - - C6 - - - B5 - - - D6 - - -', 'G5 - - - - - E5 - C#6 - - - - - E6 -',
    'F5 - - - A5 - D6 - B5 - - - G#5 - E5 -', 'B5 - - - - - D6 - C#6 - - - E6 - - -',
  ];
  const counterA2 = [
    'E4 - - - G4 - - - C5 - - - - - - -', hold('C5'),
    'A4 - - - - - - - C5 - - - - - - -', 'B4 - - - - - - - D5 - - - - - - -',
  ];
  const counterB = [
    'C4 - - - - - - - D4 - - - - - - -', 'E4 - - - - - - - E4 - - - - - - -',
    'F4 - - - - - - - D4 - - - - - - -', 'E4 - - - - - - - Bb4 - - - - - - -',
  ];
  const counterB2 = [
    'C4 - - - - - - - D4 - - - - - - -', 'E4 - - - - - - - C#4 - - - - - - -',
    'D4 - - - - - - - D4 - - - - - - -', 'D4 - - - - - - - E4 - - - - - - -',
  ];
  const beat = 'x . . . o . . . x . . x o . . .';
  const fill = 'x . . . o . . . x . o . o o o o';
  return { bpm: 96, ch: [
    c('triangle', 0.22, arp(tA, 'C3 G2|G2 D3'), bassA, bassA2, bassB, bassB2, tp(2, bassA), tp(2, bassA2),
      arp(tA, 'Bb2 F2|G2 D3')),
    c('pulse12', 0.04, arp(t16, 'C5 E5 G5|G4 B4 D5'), rep(2, arpA), arpB, arpB2, tp(2, rep(2, arpA)), arp(t16, 'Bb4 D5 F5|G4 B4 D5')),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, tp(2, ...leadA), tp(2, ...leadA2),
      hold('D6'), 'B5 - - - - - - - D6 - - - - - - -'),
    c('triangle', 0.07, rest(6), ...counterA2, ...counterB, ...counterB2, tp(2, rep(2, ...counterA2)), hold('F4'), hold('G4')),
    c('noise', 0.025, rest(10), rep(3, beat), fill, rep(3, beat), fill, rep(3, beat), fill, rep(3, beat), fill,
      'x . . . . . . . x . . . . . . .', 'o . . . . . . . . . . . . . . .'),
  ] };
}

// Where it begins: the main motif, slow and alone in E minor, 66 bpm. Intro, A (the motif), A' (it answers itself),
// B (Am-Em-C-G, a little warmth, a low second voice), A again with that voice beside it. 18 bars.
function start(): Track {
  const bassA = 'E3 - - - - - - - C3 - - - - - - - G2 - - - - - - - B2 - - - - - - -';
  const bassA2 = 'E3 - - - B2 - - - C3 - - - G2 - - - G2 - - - D3 - - - B2 - - - F#2 - - -';
  const bassB = [
    'A2 - - - - - - - E2 - - - - - - - C3 - - - - - - - G2 - - - - - - -',
    'A2 - - - - - - - C3 - - - - - - - B2 - - - - - - - - - - - F#2 - - -',
  ];
  const leadA = [
    'B4 - - - E5 - - - G5 - - - F#5 - E5 -', 'D5 - - - - - - - . . . . . . . .',
    'B4 - - - E5 - - - G5 - - - A5 - B5 -', 'F#5 - - - - - - - . . . . . . . .',
  ];
  const leadA2 = [
    'B4 - - - E5 - - - G5 - - - F#5 - E5 -', 'D5 - - - - - - - F#5 - - - D#5 - - -',
    'E5 - - - G5 - - - B5 - - - A5 - G5 -', 'F#5 - - - - - - - D#5 - - - B4 - - -',
  ];
  const leadB = [
    'E5 - - - - - A5 - G5 - - - - - E5 -', 'E5 - - - - - G5 - D5 - - - - - B4 -',
    'C5 - - - - - E5 - A5 - - - G5 - E5 -', 'F#5 - - - - - - - D#5 - - - - - - -',
  ];
  const counterB = [
    'A3 - - - - - - - B3 - - - - - - -', 'C4 - - - - - - - B3 - - - - - - -',
    'A3 - - - - - - - G3 - - - - - - -', 'F#3 - - - - - - - A3 - - - - - - -',
  ];
  const counterA = [
    'G4 - - - B4 - - - E5 - - - - - C5 -', 'B4 - - - - - - - D#5 - - - F#5 - - -',
    'G4 - - - B4 - - - E5 - - - - - G5 -', 'D5 - - - - - - - B4 - - - A4 - - -',
  ];
  return { bpm: 66, ch: [
    c('triangle', 0.18, bassA, rep(2, bassA), rep(2, bassA2), ...bassB, rep(2, bassA)),
    c('pulse12', 0.05, rest(2), ...leadA, ...leadA2, ...leadB, ...leadA),
    c('triangle', 0.07, hold('B3'), 'D4 - - - - - - - D#4 - - - - - - -', rest(8), ...counterB, ...counterA),
  ] };
}

// Lamplight Square: the motif made cosy and swung, G major, 104 bpm. Intro, A (the original tune), A' (variation),
// B (C-G-Am-D), B' (C-D-Bm-Em), C (the motif's E minor roots, softly, in two voices), A with a warm second voice. 26 bars.
function town(): Track {
  const tA = '0 . 1 . 0 . 1 . 0 . 1 . 2 . 1 .';
  const t2 = '0 . 1 . 0 . 1 . 0 . 1 . 0 . 1 .';
  const bassA = arp(tA, 'G2 D3 B2|C3 G2 E3|D3 A2 F#2|G2 D3 B2');
  const bassA2 = arp('0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .', 'G2 B2 D3 B2|C3 E3 G3 C#3|D3 F#3 A3 F#2|G2 B2 D3 B2');
  const bassB2 = [
    'C3 . G2 . C3 . G2 . C3 . G2 . C3 . G2 .', 'D3 . A2 . D3 . A2 . D3 . A2 . D3 . A2 .',
    'B2 . F#2 . B2 . F#2 . E2 . B2 . E2 . B2 .', 'A2 . E3 . A2 . E3 . D3 . A2 . D3 . A2 .',
  ];
  const tOff = '. 0 . 1 . 0 . 1 . 0 . 1 . 0 . 1';
  const offA = arp(tOff, 'B4 D5|C5 E5|A4 D5|B4 D5');
  const leadA = [
    'D5 - - . G5 - - . B5 - - . A5 - G5 -', 'E5 - - . G5 - - . C6 - - . B5 - A5 -',
    'F#5 - - . A5 - - . D6 - - . C6 - B5 -', 'A5 - - - G5 - - - - - - - . . . .',
  ];
  const leadA2 = [
    'D5 - - . G5 - - . B5 - - . D6 - B5 -', 'C6 - - . E6 - - . D6 - - . C6 - B5 -',
    'A5 - - . F#5 - - . D5 - - . E5 - F#5 -', 'G5 - - - - - - - . . . . D5 - - -',
  ];
  const leadB = [
    'E5 - - . G5 - - . C6 - - - - - - .', 'B5 - - . D6 - - . G5 - - - - - - .',
    'A5 - - . C6 - - . E6 - - . D6 - C6 -', 'A5 - - - - - - . F#5 - - . A5 - - .',
  ];
  const leadB2 = [
    'E5 - - . G5 - - . C6 - - . E6 - D6 -', 'D6 - - . C6 - - . A5 - - . F#5 - - .',
    'D5 - - . F#5 - - . B5 - - . G5 - - .', 'C6 - - . A5 - - . E5 - - . F#5 - - .',
  ];
  const leadC = [
    'B4 - - . E5 - - . G5 - - . F#5 - E5 -', 'D5 - - - - - - - . . . . . . . .',
    'B4 - - . E5 - - . G5 - - . A5 - B5 -', 'F#5 - - - - - - - A5 - - . D5 - - .',
  ];
  const counterC = [
    'G4 - - . B4 - - . E5 - - . D5 - B4 -', 'B4 - - - - - - - . . . . . . . .',
    'G4 - - . C5 - - . E5 - - . F#5 - G5 -', 'D5 - - - - - - - F#5 - - . A4 - - .',
  ];
  const counterA = [
    'B4 - - - - - - - D5 - - - - - - -', 'C5 - - - - - - - E5 - - - - - - -',
    'A4 - - - - - - - C5 - - - - - - -', 'B4 - - - - - - - D5 - - - - - - -',
  ];
  const beat = 'x . . o . . x . x . . o . . . .';
  const fill = 'x . . o . . x . x . o . o o o o';
  return { bpm: 104, ch: [
    c('triangle', 0.22, arp(tA, 'G2 D3 B2|D3 A2 F#2'), bassA, bassA2, arp(t2, 'C3 G2|B2 G2|A2 E3|D3 A2'), ...bassB2,
      arp(t2, 'E2 B2|G2 D3|C3 G2|D3 A2'), bassA),
    c('pulse12', 0.04, arp(tOff, 'B4 D5|A4 C5'), rep(2, offA), arp(tOff, 'C5 E5|B4 D5|A4 C5|F#4 A4'),
      arp(tOff, 'C5 E5|D5 F#5|B4 D5|A4 C5'), arp(tOff, 'G4 B4|B4 D5|C5 E5|F#4 A4'), offA),
    c('pulse25', 0.07, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadC, ...leadA),
    c('triangle', 0.07, rest(18), ...counterC, ...counterA),
    c('noise', 0.03, rep(2, beat), rep(4, rep(3, beat), fill), rep(4, 'x . . . . . x . x . . . . . . .'), rep(3, beat), fill),
  ] };
}

// The Summit: wind, a held drone and the motif in fragments, waiting, 72 bpm. Intro on the wind, A (fragments),
// A' (they grow, a low voice joins), B (the motif finally whole, over C-D-Em-B), A (fragments with an echo), outro. 20 bars.
function summit(): Track {
  const fragA = [
    '. . . . B4 - - - . . . . E5 - - -', '. . . . G5 - - - . . . . F#5 - - -',
    '. . . . B4 - - - . . . . E5 - - -', '. . . . A5 - - - . . . . F#5 - - -',
  ];
  const frag = [
    rest(2), ...fragA,
    '. . . . E5 - - - G5 - - - B5 - - -', '. . . . A5 - - - F#5 - - - D5 - - -',
    '. . . . B4 - - - E5 - - - G5 - F#5 -', 'D#5 - - - - - - - . . . . . . . .',
    'B4 - - - E5 - - - G5 - - - F#5 - E5 -', 'D5 - - - - - - - F#5 - - - A5 - - -',
    'B4 - - - E5 - - - G5 - - - A5 - B5 -', 'B5 - - - - - - - - - - - . . . .',
    ...fragA, rest(2),
  ];
  return { bpm: 72, ch: [
    c('triangle', 0.16, hold('E2', 32), ...['E2', 'D2', 'E2', 'D2', 'C2', 'D2', 'E2', 'B1'].map((n) => hold(n)),
      'C2 - - - - - - - G2 - - - - - - -', ...['D2', 'E2', 'B1', 'E2', 'D2', 'E2', 'D2'].map((n) => hold(n)), hold('E2', 32)),
    c('pulse12', 0.04, ...frag),
    c('pulse12', 0.015, echo(3, ...frag)),
    c('triangle', 0.07, rest(6), ...['G4', 'F#4', 'E4', 'D#4', 'E4', 'F#4', 'G4', 'F#4'].map((n) => hold(n)), rest(6)),
    c('noise', 0.015, 'o - - - - - - - . . . . . . . .', '. . . . . . . . o - - - - - - -',
      'o - - - - - - - . . . . x . . .', '. . . . o - - - . . . . . . . .'),
  ] };
}

// THE LEADERBOARD: fast and driving, the motif turned into a fanfare (E minor, 160 bpm). Intro, A (the original
// fanfare), A' (an octave up), B (C-D-Bm-Em, heroic), B' (Am-B-C-D, climbing), a drum break, A doubled below. 24 bars.
function boss(): Track {
  const bassA = [
    'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3', 'C2 C3 C2 C3 C2 C3 C2 C3 A1 A2 A1 A2 B1 B2 B1 B2',
    'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3', 'C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3',
  ];
  const t16 = '0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1';
  const tArp = '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1';
  const em = 'E5 G5 B5', cM = 'C5 E5 G5', dM = 'D5 F#5 A5';
  const arpA = arp('0 1 2 1', [em, em, cM, dM, cM, cM, 'A4 C5 E5', 'B4 D#5 F#5', em, em, cM, dM, cM, dM, em, em].join('|'));
  const leadA = [
    'B4 . E5 . G5 . B5 - A5 . G5 . F#5 . E5 -', 'C5 . E5 . G5 . C6 - B5 . A5 . G5 . F#5 -',
    'B4 . E5 . G5 . B5 - D6 . C6 . B5 . A5 -', 'G5 . F#5 . E5 . D5 . E5 - - - - - - -',
  ];
  const leadA2 = [
    'E5 . G5 . B5 . E6 - E6 . C6 . D6 . A5 -', 'G5 . C6 . E6 . G6 - E6 . C6 . D#6 . B5 -',
    'E5 . G5 . B5 . E6 - G6 . E6 . F#6 . D6 -', 'E6 . D6 . C6 . A5 . B5 - - - - - . .',
  ];
  const leadB = [
    'E5 - - - G5 - - - C6 - - - - - B5 -', 'A5 - - - - - - - F#5 - - - D5 - - -',
    'D5 - - - F#5 - - - B5 - - - - - A5 -', 'G5 - - - - - - - E5 - - - B4 - - -',
  ];
  const leadB2 = [
    'C5 - - - E5 - - - A5 - - - - - C6 -', 'B5 - - - - - - - D#5 - - - F#5 - - -',
    'E5 - - - G5 - - - C6 - - - E6 - - -', 'D6 - - - - - - - A5 - - - F#5 - - -',
  ];
  const counterB = [
    'G4 - - - - - - - E4 - - - - - - -', 'F#4 - - - - - - - A4 - - - - - - -',
    'F#4 - - - - - - - D4 - - - - - - -', 'B4 - - - - - - - G4 - - - - - - -',
  ];
  const counterB2 = [
    'E4 - - - - - - - A4 - - - - - - -', 'F#4 - - - - - - - B4 - - - - - - -',
    'G4 - - - - - - - C5 - - - - - - -', 'A4 - - - - - - - F#4 - - - - - - -',
  ];
  const beat = 'x . o . x x o . x . o . x x o o';
  const beatB = 'x . o . x . o . x . o . x . o x';
  const fill = 'x . o . x x o . o o o o o o o o';
  return { bpm: 160, ch: [
    c('triangle', 0.28, arp(t16, 'E2 E3|E2 E3'), ...bassA, ...bassA, arp(t16, 'C2 C3|D2 D3|B1 B2|E2 E3'),
      arp(t16, 'A1 A2|B1 B2|C2 C3|D2 D3'), 'E2 . . E2 . . E2 . E2 . . E2 . . E2 .', 'E2 . . E2 . . E2 . D2 . . D2 . . B1 .', ...bassA),
    c('pulse25', 0.08, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, rest(2), ...leadA),
    c('pulse12', 0.035, arp(tArp, `${em}|${em}`), arpA, arpA, arp(tArp, `${cM}|${dM}|B4 D5 F#5|${em}`),
      arp(tArp, `A4 C5 E5|B4 D#5 F#5|${cM}|${dM}`), rest(2), arpA),
    c('square', 0.035, rest(10), ...counterB, ...counterB2, rest(2), tp(-12, ...leadA)),
    c('noise', 0.06, 'x . x . x . x . x . x . x . x .', 'x . x . x . x . o . o . o o o o', rep(2, rep(3, beat), fill),
      rep(2, rep(3, beatB), fill), 'o . . o . . o . o . . o . . o .', 'o . . o . . o . o o o o o o o o', rep(3, beat), fill),
  ] };
}

// Determination: resolute C minor that refuses to stop, 140 bpm. Intro, A (the original line, extended), A' (higher),
// B (Ab-Eb-Bb-Cm, hopeful), B' (lifts through F major to G), a half-time call and response, A and A' doubled. 30 bars.
function determination(): Track {
  const bassA = 'C2 C3 C2 C3 Ab1 Ab2 Ab1 Ab2 Bb1 Bb2 Bb1 Bb2 G1 G2 G1 G2';
  const t16 = '0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1';
  const tArp = '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1';
  const bassC = [
    'F1 - - - - - - - F2 - - - - - - -', 'Db2 - - - - - - - Db3 - - - - - - -',
    'Eb2 - - - - - - - Eb3 - - - - - - -', 'G1 - - - - - - - G2 - - - B1 - D2 -',
  ];
  const leadA = [
    'C5 - Eb5 - G5 - C6 - Bb5 - G5 - Ab5 - G5 -', 'F5 - Eb5 - D5 - Eb5 - D5 - - - B4 - - -',
    'C5 - Eb5 - G5 - C6 - Bb5 - G5 - Ab5 - Bb5 -', 'C6 - - - Bb5 - Ab5 - Bb5 - - - G5 - - -',
  ];
  const leadA2 = [
    'G5 - C6 - Eb6 - G6 - F6 - Eb6 - D6 - B5 -', 'C6 - - - Ab5 - - - Bb5 - - - G5 - - -',
    'Eb6 - D6 - C6 - Eb6 - D6 - Bb5 - D6 - B5 -', 'C6 - - - - - - - . . . . G5 - B5 -',
  ];
  const leadB = [
    'C6 - - - - - - - Eb6 - - - - - C6 -', 'Bb5 - - - - - - - G5 - - - Eb5 - - -',
    'F5 - - - - - D5 - F5 - - - Bb5 - - -', 'G5 - - - - - - - - - - - . . . .',
  ];
  const leadB2 = [
    'C6 - - - - - - - Eb6 - - - - - F6 -', 'G6 - - - - - - - Eb6 - - - Bb5 - - -',
    'A5 - - - - - - - C6 - - - F6 - - -', 'D6 - - - - - - - B5 - - - G5 - - -',
  ];
  const leadC = [
    'F5 - - - Ab5 - - - C6 - - - . . . .', 'Db6 - - - C6 - - - Ab5 - - - . . . .',
    'Eb5 - - - G5 - - - Bb5 - - - . . . .', 'B5 - - - - - - - D6 - - - - - - -',
  ];
  const counterC = [
    '. . . . . . . . . . . . Ab5 - F5 -', '. . . . . . . . . . . . F5 - Db5 -',
    '. . . . . . . . . . . . G5 - Eb5 -', 'G4 - - - - - - - B4 - - - - - - -',
  ];
  const beat = 'x . o . x . o o x . o . x . o o';
  const beatB = 'x . o . x x o . x . o . x x o .';
  const fill = 'x . o . x . o o o . o o o o o o';
  return { bpm: 140, ch: [
    c('triangle', 0.26, rep(10, bassA), arp(t16, 'Ab1 Ab2|Eb2 Eb3|Bb1 Bb2|C2 C3'), arp(t16, 'Ab1 Ab2|Eb2 Eb3|F1 F2|G1 G2'),
      ...bassC, rep(8, bassA)),
    c('pulse25', 0.075, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadC, ...leadA, ...leadA2),
    c('pulse12', 0.03, rest(10), arp(tArp, 'Ab4 C5 Eb5|G4 Bb4 Eb5|Bb4 D5 F5|C5 Eb5 G5'),
      arp(tArp, 'Ab4 C5 Eb5|G4 Bb4 Eb5|A4 C5 F5|G4 B4 D5'), rest(4), rep(8, arp('0 1 2 1', 'C5 Eb5 G5|Ab4 C5 Eb5|Bb4 D5 F5|G4 B4 D5'))),
    c('square', 0.03, rest(18), ...counterC, tp(-12, ...leadA, ...leadA2)),
    c('noise', 0.06, 'x . . . x . . . x . . . x . . .', 'x . . . x . . . o . o . o o o o', rep(2, rep(3, beat), fill),
      rep(2, rep(3, beatB), fill), rep(3, 'x . . . . . . . o . . . . . . .'), 'o . . . o . . . o . o . o o o o', rep(2, rep(3, beat), fill)),
  ] };
}

// Home: a cozy bedroom full of humming computers at night, F major, 96 bpm. Intro, A, A' (wanders through A major),
// B (Bb-C-Am-Dm, the computers bleep back), B', A again with bleeps in the gaps, a sleepy tag; a clock ticks. 24 bars.
function home(): Track {
  const tB = '0 - - - 1 - - - 0 - - - 1 - - -';
  const tAl = '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2';
  const bassA = arp(tB, 'F2 C3|A2 E3|Bb2 F2|C3 G2');
  const bassA2 = [arp(tB, 'F2 C3|A2 E3|D3 A2'), 'G2 - - - D3 - - - C3 - - - G2 - - -'];
  const bassB2 = [
    'G2 - - - D3 - - - G2 - - - D3 - - -', 'C3 - - - G2 - - - C3 - - - E3 - - -',
    'A2 - - - C3 - - - A2 - - - F2 - - -', 'Bb2 - - - - - - - C3 - - - - - - -',
  ];
  const alA = arp(tAl, 'F4 A4 C5|E4 A4 C5|F4 Bb4 D5|E4 G4 C5');
  const leadA = [
    'C5 . F5 . A5 - G5 . F5 . . . C5 . D5 .', 'E5 - - . C5 . E5 . A5 - - - G5 - E5 .',
    'D5 . F5 . Bb5 - A5 . F5 . . . D5 . F5 .', 'G5 - - - E5 - - - C5 - - - . . . .',
  ];
  const leadA2 = [
    'C5 . F5 . A5 - G5 . F5 . A5 . C6 - - .', 'C#6 - - . A5 . E5 . G5 - - - A5 - - -',
    'F5 - - . D5 . F5 . A5 - - - D6 - - -', 'Bb5 - - - A5 - G5 - E5 - - - C5 - - -',
  ];
  const leadB = [
    'D5 - - - F5 - - - . . . . . . . .', 'E5 - - - G5 - - - . . . . . . . .',
    'C5 - - - E5 - - - A5 - - - G5 - - -', 'F5 - - - - - - - . . . . . . . .',
  ];
  const leadB2 = [
    'Bb4 - - - D5 - - - G5 - - - - - F5 -', 'E5 - - - - - - - C5 - - - G5 - - -',
    'A5 - - - - - G5 - F5 - - - E5 - C5 -', 'D5 - - - - - - - E5 - - - - - - -',
  ];
  const bleepB = [
    '. . . . . . . . F5 Bb5 D6 Bb5 F5 . . .', '. . . . . . . . G5 C6 E6 C6 G5 . . .',
    rest(1), '. . . . . . . . A5 D6 F6 D6 A5 . . .',
  ];
  const bleepB2 = [rest(1), '. . . . . . . . . . . . E6 D6 C6 .', rest(1), '. . . . . . . . . . . . G5 . C6 .'];
  return { bpm: 96, ch: [
    c('triangle', 0.2, arp(tB, 'F2 C3|C3 G2'), bassA, ...bassA2, arp('0 - - - 1 - - - 0 - 1 - 0 - - -', 'Bb2 F2|C3 G2|A2 E2|D3 A2'),
      ...bassB2, bassA, arp(tB, 'Bb2 F2|F2 C3')),
    c('triangle', 0.07, arp(tAl, 'F4 A4 C5|E4 G4 C5'), alA, arp(tAl, 'F4 A4 C5|E4 A4 C#5|F4 A4 D5'),
      arp('0 2 1 2 0 2 1 2', 'D4 G4 Bb4|E4 G4 C5'), arp(tAl, 'F4 Bb4 D5|E4 G4 C5|E4 A4 C5|F4 A4 D5'),
      arp(tAl, 'D4 G4 Bb4|E4 G4 C5|F4 A4 C5'), arp('0 2 1 2 0 2 1 2', 'F4 Bb4 D5|E4 G4 C5'), alA, arp(tAl, 'F4 Bb4 D5|F4 A4 C5')),
    c('pulse25', 0.05, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadA,
      'D5 - - - - - - - C5 - - - - - - -', hold('A4')),
    cs('pulse12', 0.03, 0.5, '. . . . . . . . . . . . C6 . F6 .', rest(9), ...bleepB, ...bleepB2,
      rest(3), '. . . . . . . . . . . . E6 C6 G5 .', rest(1), '. . . . . . . . . . . . A5 . F5 .'),
    c('noise', 0.012, rep(2, 'x . . . . . . . x . . . . . . .'), rep(20, 'x . . . x . . . x . . . x . . .'),
      rep(2, 'x . . . . . . . x . . . . . . .')),
  ] };
}

// Garden: a curious, plucky puzzle garden in C with a Lydian F#, 108 bpm. Intro, A (3+3+2 pizzicato hops), A',
// B (Am-F-D-E, a little mystery, a soft pad), B', C (the scattered notes gather into clusters), A. 26 bars.
function garden(): Track {
  const tBa = '0 . . . 1 . . . 0 . . . 2 . . .';
  const tBb = '0 . 0 . 1 . . . 0 . 0 . 2 . . .';
  const tP = '. . 1 . . 2 . . . . . . 0 . . .';
  const bassA = arp(tBa, 'C3 G2 E2|D3 A2 F#2|F2 C3 A2|G2 D3 B2');
  const plA = arp(tP, 'E5 G5 C6|F#5 A5 D6|F5 A5 C6|D5 G5 B5');
  const leadA = [
    'G5 . . E5 . . C5 . D5 . E5 . G5 . . .', 'F#5 . . D5 . . A4 . C5 . D5 . F#5 . A5 .',
    'A5 . . F5 . . C5 . E5 . F5 . A5 . C6 .', 'B5 . A5 . G5 . D5 . G5 . . . . . . .',
  ];
  const leadA2 = [
    'G5 . . E5 . . C5 . D5 . E5 . G5 . C6 .', 'A5 . . F#5 . . D5 . E5 . F#5 . A5 . . .',
    'C6 . . A5 . . E5 . A5 . B5 . C6 . E6 .', 'D6 . . B5 . . G5 . . . . . G4 . . .',
  ];
  const leadB = [
    'A4 . C5 . E5 . . . D#5 . E5 . . . . .', 'F5 . A5 . C6 . . . B5 . C6 . . . . .',
    'F#5 . A5 . D6 . . . C#6 . D6 . . . . .', 'E5 . G#5 . B5 . . . D6 . . . B5 . . .',
  ];
  const leadB2 = [
    'A5 . . . G#5 . A5 . E5 . . . C5 . . .', 'F5 . . . E5 . F5 . A5 . . . C6 . . .',
    'D6 . . . C#6 . D6 . A5 . . . F5 . . .', 'G5 . . . F#5 . G5 . B5 . . . D6 . . .',
  ];
  const leadC = [
    'C6 C6 . . A5 A5 . . F5 F5 . . A5 . . .', 'B5 B5 . . G5 G5 . . D5 D5 . . G5 . . .',
    'B5 B5 B5 . G5 G5 G5 . E5 E5 E5 . . . . .', 'C6 C6 C6 C6 . . . . A5 A5 A5 A5 . . . .',
  ];
  const g1 = 'x . . x . . x . . . x . . . . .';
  const g2 = 'x . . x . . x . . . x . o . . .';
  const gB = 'x . x . o . . . x . x . o . . .';
  const gFill = 'x . x . o . x . o . o . o o o .';
  return { bpm: 108, ch: [
    cs('triangle', 0.22, 0.45, arp(tBa, 'C3 G2 E2|G2 D3 B2'), bassA, arp(tBa, 'C3 G2 E2|D3 A2 F#2|A2 E2 C3|G2 D3 B2'),
      arp(tBb, 'A2 E3 C3|F2 C3 A2|D3 A2 F#2|E2 B2 G#2'), arp(tBb, 'A2 E3 C3|F2 C3 A2|D3 A2 F2|G2 D3 B2'),
      arp('0 . . . . . 1 . . . 0 . . . . .', 'F2 C3|G2 D3|E2 B2|A2 E3'), bassA),
    cs('pulse25', 0.055, 0.35, rest(2), ...leadA, ...leadA2, ...leadB, ...leadB2, ...leadC, ...leadA),
    cs('pulse12', 0.03, 0.3, arp(tP, 'E5 G5 C6|D5 G5 B5'), plA, arp(tP, 'E5 G5 C6|F#5 A5 D6|E5 A5 C6|D5 G5 B5'), rest(4),
      arp('. . . . . . . . . . 1 . . . 2 .', 'C5 E5 A5|C5 F5 A5|D5 F5 A5|D5 G5 B5'), tp(-12, echo(2, ...leadC)), plA),
    c('triangle', 0.06, rest(10), ...['E4', 'C4', 'D4', 'D4', 'E4', 'A4', 'F4', 'F4'].map((n) => hold(n)), rest(8)),
    c('noise', 0.018, rep(2, 'x . . . . . . . x . . . . . . .'), rep(2, rep(3, g1), g2), rep(2, rep(3, gB), gFill),
      rest(4), rep(3, g1), g2),
  ] };
}

export const TRACKS: Record<string, Track> = {
  title: title(),
  hub: hub(),
  ruins: ruins(),
  lab: lab(),
  records: records(),
  library: library(),
  memorial: memorial(),
  shop: shop(),
  mirror: mirror(),
  battle: battle(),
  credits: credits(),
  start: start(),
  town: town(),
  summit: summit(),
  boss: boss(),
  determination: determination(),
  home: home(),
  garden: garden(),
};
