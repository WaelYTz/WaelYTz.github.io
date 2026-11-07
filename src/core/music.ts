// Original chiptune loops (composed for this site). Patterns are 16th-note steps:
// a note ("A4"), "-" = hold the previous note, "." = rest. Noise channel: "x" = hat, "o" = snare.

type Wave = 'square' | 'triangle' | 'sawtooth' | 'pulse25' | 'pulse12' | 'noise';
export interface Channel { w: Wave; v: number; gate?: number; p: string[]; }
export interface Track { bpm: number; ch: Channel[]; }

const P = (...parts: string[]) => parts.join(' ').trim().split(/\s+/);
const c = (w: Wave, v: number, ...parts: string[]): Channel => ({ w, v, p: P(...parts) });

export const TRACKS: Record<string, Track> = {
  title: { bpm: 72, ch: [
    c('triangle', 0.22, 'A2 - - - - - - - F2 - - - - - - - C3 - - - - - - - G2 - - - - - - -'),
    c('pulse25', 0.06, 'E5 . A5 . C6 . A5 .', 'F5 . A5 . C6 . A5 .', 'G5 . C6 . E6 . C6 .', 'D6 . B5 . G5 . B5 .'),
    c('pulse12', 0.05, 'E6 - - - - - - - . . . . . . . .', 'C6 - - - D6 - - - E6 - - - - - - -',
      '. . . . . . . . . . . . . . . .', 'A5 - - - G5 - - - A5 - - - - - - -'),
  ] },
  hub: { bpm: 100, ch: [
    c('triangle', 0.22, 'D3 . . . A2 . . . D3 . . . A2 . . . Bb2 . . . F2 . . . C3 . . . G2 . . .'),
    c('pulse12', 0.04, '. . F4 . . . F4 . . . A4 . . . A4 . . . D4 . . . D4 . . . E4 . . . E4 .'),
    c('pulse25', 0.075, 'A4 - D5 - E5 - F5 - - - E5 - D5 - - -', 'C5 - - - D5 - F5 - G5 - - - F5 - E5 -',
      'D5 - - - A4 - - - Bb4 - C5 - D5 - - -', 'E5 - - - - - - - . . . . . . . .'),
  ] },
  ruins: { bpm: 112, ch: [
    c('triangle', 0.24, 'E2 . E3 . E2 . E3 . C2 . C3 . C2 . C3 . D2 . D3 . D2 . D3 . B1 . B2 . B1 . B2 .'),
    c('pulse25', 0.075, 'E5 . G5 . B5 - A5 - G5 . F#5 . E5 - - -', 'C5 . E5 . G5 - F#5 - E5 . D5 . C5 - - -',
      'D5 . F#5 . A5 - G5 - F#5 . E5 . D5 - - -', 'B4 . D#5 . F#5 - - - B5 - - - . . . .'),
    c('noise', 0.04, 'x . . . o . . . x . x . o . . .'),
  ] },
  lab: { bpm: 132, ch: [
    c('triangle', 0.25, 'C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . Ab1 . Ab2 . Ab1 . Ab2 . Bb1 . Bb2 . Bb1 . Bb2 .'),
    c('pulse12', 0.045, 'C5 Eb5 G5 C6 G5 Eb5 C5 Eb5 G5 C6 G5 Eb5 C5 Eb5 G5 Eb5',
      'Ab4 C5 Eb5 Ab5 Eb5 C5 Bb4 D5 F5 Bb5 F5 D5 Bb4 D5 F5 D5'),
    c('pulse25', 0.065, 'G5 - - - - - Eb5 - F5 - - - G5 - - -', 'Ab5 - - - G5 - F5 - Eb5 - - - D5 - - -',
      'C5 - - - - - - - . . . . . . . .', '. . . . . . . . Bb4 - C5 - D5 - Eb5 -'),
    c('noise', 0.05, 'x . o . x x o .'),
  ] },
  records: { bpm: 88, ch: [
    c('triangle', 0.24, 'F2 . . . C3 . . . F2 . . . C3 . . . Bb2 . . . F2 . . . C3 . . . C2 . . .'),
    c('pulse12', 0.04, 'A4 . C5 . G4 . E5 . A4 . C5 . G4 . E5 . D5 . F5 . A4 . C5 . G4 . E5 . G4 . C5 .'),
    c('square', 0.06, 'F5 - - - A5 - - - C6 - - - - - Bb5 -', 'A5 - G5 - F5 - - - G5 - - - - - - -',
      'D6 - - - C6 - Bb5 - A5 - - - G5 - A5 -', 'F5 - - - - - - - . . . . . . . .'),
  ] },
  library: { bpm: 76, ch: [
    c('triangle', 0.2, 'G2 - - - - - - - E2 - - - - - - - C3 - - - - - - - D3 - - - - - - -'),
    c('triangle', 0.07, 'G4 B4 D5 B4 G4 B4 D5 B4 E4 G4 B4 G4 E4 G4 B4 G4',
      'C5 E5 G5 E5 C5 E5 G5 E5 D5 F#5 A5 F#5 D5 F#5 A5 F#5'),
    c('pulse12', 0.045, 'D6 - - - - - - - B5 - - - - - - -', 'C6 - - - B5 - A5 - G5 - - - - - - -',
      '. . . . . . . . . . . . . . . .', 'A5 - - - B5 - - - A5 - - - F#5 - - -'),
  ] },
  memorial: { bpm: 60, ch: [
    c('triangle', 0.12, 'A3 - - - - - - - - - - - - - - -', 'F3 - - - - - - - - - - - - - - -',
      'C4 - - - - - - - - - - - - - - -', 'G3 - - - - - - - - - - - - - - -'),
    c('triangle', 0.07, 'E4 - - - - - - - - - - - - - - -', 'A4 - - - - - - - - - - - - - - -',
      'E4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -'),
    c('pulse12', 0.025, '. . . . . . . . C6 - - - . . . .', '. . . . . . . . A5 - - - . . . .',
      '. . . . . . . . G5 - - - . . . .', '. . . . . . . . B5 - - - . . . .'),
  ] },
  shop: { bpm: 124, ch: [
    c('triangle', 0.24, 'Bb2 . F2 . Bb2 . F2 .', 'Eb3 . Bb2 . Eb3 . Bb2 .', 'F2 . C3 . F2 . C3 .', 'Bb2 . F2 . Bb2 . . .'),
    c('pulse25', 0.075, 'D5 . F5 . Bb5 . F5 .', 'G5 . Eb5 . G5 - - .', 'C5 . Eb5 . A5 . F5 .', 'D5 - - - - . . .'),
    c('noise', 0.04, 'x . o . x . o x'),
  ] },
  mirror: { bpm: 70, ch: [
    c('triangle', 0.14, 'C3 - - - - - - - - - - - - - - -', 'D3 - - - - - - - - - - - - - - -'),
    c('triangle', 0.065, 'E5 . F#5 . G#5 . A#5 .', 'G#5 . F#5 . E5 - - -', 'D5 . E5 . F#5 . G#5 -', '- - - - . . . .'),
  ] },
  battle: { bpm: 150, ch: [
    c('triangle', 0.26, 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3'),
    c('pulse25', 0.075, 'A4 . C5 . E5 . A5 -', 'G5 . E5 . D5 . E5 -', 'F5 . E5 . D5 . C5 .', 'B4 . C5 . D5 - - -'),
    c('noise', 0.06, 'x . o . x x o .'),
  ] },
  credits: { bpm: 96, ch: [
    c('triangle', 0.22, 'C3 . G2 . C3 . G2 . A2 . E2 . A2 . E2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 .'),
    c('pulse12', 0.04, 'C5 E5 G5 E5 C5 E5 G5 E5 A4 C5 E5 C5 A4 C5 E5 C5',
      'F4 A4 C5 A4 F4 A4 C5 A4 G4 B4 D5 B4 G4 B4 D5 B4'),
    c('pulse25', 0.075, 'E5 - - - G5 - - - C6 - - - B5 - G5 -', 'A5 - - - - - E5 - C5 - - - - - - -',
      'F5 - - - A5 - - - C6 - - - D6 - C6 -', 'B5 - - - - - - - G5 - - - - - - -'),
  ] },
  // where you wake up: the main motif, slow and alone (E minor, triangle only)
  start: { bpm: 66, ch: [
    c('triangle', 0.18, 'E3 - - - - - - - C3 - - - - - - - G2 - - - - - - - B2 - - - - - - -'),
    c('pulse12', 0.05, 'B4 - - - E5 - - - G5 - - - F#5 - E5 -', 'D5 - - - - - - - . . . . . . . .',
      'B4 - - - E5 - - - G5 - - - A5 - B5 -', 'F#5 - - - - - - - . . . . . . . .'),
  ] },
  // Lamplight Square: the same motif, cosy and swung, in G major
  town: { bpm: 104, ch: [
    c('triangle', 0.22, 'G2 . D3 . G2 . D3 . C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . G2 . D3 . B2 . D3 .'),
    c('pulse12', 0.04, '. B4 . D5 . B4 . D5 . C5 . E5 . C5 . E5 . A4 . D5 . F#4 . D5 . B4 . D5 . G4 . B4'),
    c('pulse25', 0.07, 'D5 - - . G5 - - . B5 - - . A5 - G5 -', 'E5 - - . G5 - - . C6 - - . B5 - A5 -',
      'F#5 - - . A5 - - . D6 - - . C6 - B5 -', 'A5 - - - G5 - - - - - - - . . . .'),
    c('noise', 0.03, 'x . . o . . x . x . . o . . . .'),
  ] },
  // the summit: wind, a held drone and the motif in fragments, waiting
  summit: { bpm: 72, ch: [
    c('triangle', 0.16, 'E2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - -'),
    c('pulse12', 0.04, '. . . . B4 - - - . . . . E5 - - -', '. . . . G5 - - - . . . . F#5 - - -'),
    c('noise', 0.015, 'o - - - - - - - . . . . . . . .'),
  ] },
  // THE LEADERBOARD: fast, driving, the motif turned into a fanfare (E minor, 160 bpm)
  boss: { bpm: 160, ch: [
    c('triangle', 0.28, 'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3', 'E2 E3 E2 E3 E2 E3 E2 E3 A1 A2 A1 A2 B1 B2 B1 B2'),
    c('pulse25', 0.08, 'B4 . E5 . G5 . B5 - A5 . G5 . F#5 . E5 -', 'C5 . E5 . G5 . C6 - B5 . A5 . G5 . F#5 -',
      'B4 . E5 . G5 . B5 - D6 . C6 . B5 . A5 -', 'G5 . F#5 . E5 . D5 . E5 - - - - - - -'),
    c('pulse12', 0.035, 'E5 G5 B5 G5 E5 G5 B5 G5 C5 E5 G5 E5 D5 F#5 A5 F#5'),
    c('noise', 0.06, 'x . o . x x o . x . o . x x o o'),
  ] },
  determination: { bpm: 140, ch: [
    c('triangle', 0.26, 'C2 C3 C2 C3 Ab1 Ab2 Ab1 Ab2 Bb1 Bb2 Bb1 Bb2 G1 G2 G1 G2'),
    c('pulse25', 0.075, 'C5 - Eb5 - G5 - C6 -', 'Bb5 - G5 - Ab5 - G5 -', 'F5 - Eb5 - D5 - Eb5 -', 'B4 - - - - - - -'),
    c('noise', 0.06, 'x . o . x . o o'),
  ] },
};
