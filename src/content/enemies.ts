// Original monsters, themed on machine-learning mistakes. Each has its own attacks (which ACTs visibly change),
// a mercy condition, and flavour text for every turn. THE LEADERBOARD is the optional boss at the summit.
export type Pattern =
  | 'bones' | 'memorize' | 'dots' | 'drops' | 'future' | 'split' | 'rings' | 'beams' | 'descent'
  | 'rankrain' | 'shakeup' | 'dropout' | 'attention';

export interface ActDef { name: string; text: string[]; effect: string; }
export interface EnemyDef {
  id: string;
  name: string;
  tex: string;
  hp: number; // hits to defeat
  dmg: number;
  box: { w: number; h: number };
  intro: string[];
  check: string[];
  acts: ActDef[];
  spareNeeds: string[]; // effects required before MERCY works
  turns: Pattern[][]; // patterns per enemy turn (the last entry repeats)
  idle: string[];
  bubbles: string[];
  spare: string[];
  win: string[];
  boss?: boolean;
  music?: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  overfit: {
    id: 'overfit', name: 'OVERFIT', tex: 'enemy-overfit', hp: 3, dmg: 3, box: { w: 230, h: 150 },
    intro: ['* OVERFIT wiggles in!', '* It has memorized every dot in the room. Including you.'],
    check: ['* OVERFIT - AT 9 DF 0', '* Perfect on training data. Terrified of anything new.'],
    acts: [
      { name: 'Regularize', effect: 'reg', text: ['* You add a gentle L2 penalty.', "* OVERFIT's curve relaxes. Its gaps get wider."] },
      { name: 'Show test set', effect: 'test', text: ['* You show OVERFIT data it has never seen.', '* It panics... and its memory gets fuzzy.'] },
      { name: 'Add dropout', effect: 'drop', text: ['* You randomly switch off some of its neurons.', '* Some of its bones just... stop showing up.'] },
    ],
    spareNeeds: ['reg', 'test'],
    turns: [['memorize'], ['bones'], ['dots'], ['memorize', 'bones']],
    idle: ['* OVERFIT traces a line through every speck of dust.', '* OVERFIT is memorizing your face. All of it.', '* Smells like high variance.', '* OVERFIT got 100% on the practice test. It is very proud.'],
    bubbles: ['I fit EVERY point!', 'Variance? Never heard of it.', '...is that NEW data?', 'Memorized. Memorized!'],
    spare: ['* OVERFIT smooths into a gentle curve.', '* It feels much better about the future.'],
    win: ["* OVERFIT's curve snaps in two.", '* You earned 0 EXP and 1 lesson: simpler models generalize.'],
  },
  leakage: {
    id: 'leakage', name: 'LEAKAGE', tex: 'enemy-leakage', hp: 3, dmg: 4, box: { w: 170, h: 170 },
    intro: ['* LEAKAGE drips in.', '* It already knows how this fight ends. (It peeked.)'],
    check: ['* LEAKAGE - AT 8 DF 8', "* Uses tomorrow's data today. Suspiciously confident."],
    acts: [
      { name: 'Split by time', effect: 'time', text: ['* You split the data by time.', '* The cyan drops from the future dry up.'] },
      { name: 'Audit features', effect: 'audit', text: ['* You find a feature stamped after T.', '* LEAKAGE looks away, embarrassed. Its drops slow down.'] },
      { name: 'Ask about tomorrow', effect: 'brag', text: ['* You ask LEAKAGE what happens tomorrow.', "* It can't help itself. It brags. Loudly. Its next attack gets harder."] },
    ],
    spareNeeds: ['time', 'audit'],
    turns: [['drops'], ['future'], ['split'], ['future', 'drops']],
    idle: ['* LEAKAGE checks a clock from the future.', '* A drop lands. It was from next Tuesday.', '* Your validation score looks too good to be true.', '* LEAKAGE whistles innocently. In the future tense.'],
    bubbles: ['I saw the answers!', 'Validation: 1.000', 'Time is just a feature.', 'Trust me. I was there.'],
    spare: ['* LEAKAGE seals its pipe.', '* From now on, it only looks backwards in time.'],
    win: ['* LEAKAGE evaporates.', '* You earned 0 EXP and 1 lesson: check your timestamps.'],
  },
  gradient: {
    id: 'gradient', name: 'GRADIENT', tex: 'enemy-gradient', hp: 3, dmg: 4, box: { w: 220, h: 154 },
    intro: ['* An EXPLODING GRADIENT blows up in your face!', '* It is getting bigger. Every. Single. Step.'],
    check: ['* GRADIENT - AT 99 DF 1', '* Gets bigger every step. Has never heard of clipping.'],
    acts: [
      { name: 'Clip norm', effect: 'clip', text: ['* You clip its norm to 1.0.', '* GRADIENT shrinks to a reasonable size. Its pellets stop accelerating.'] },
      { name: 'Lower LR', effect: 'lr', text: ['* You lower the learning rate.', '* GRADIENT takes smaller, calmer steps.'] },
      { name: 'Add momentum', effect: 'mom', text: ['* You add a little momentum.', '* GRADIENT starts to spin. It looks... happier?'] },
    ],
    spareNeeds: ['clip', 'lr'],
    turns: [['rings'], ['descent'], ['beams'], ['rings', 'beams']],
    idle: ['* GRADIENT doubles in size. Then doubles again.', '* The loss reads NaN.', '* Somewhere, a GPU fan spins up.', '* GRADIENT is rolling downhill. Very fast. Too fast.'],
    bubbles: ['BIGGER! BIGGER!', 'NaN NaN NaN!', 'Step size? YES.', 'DOWNHILL!!'],
    spare: ['* GRADIENT settles into a calm, well-behaved slope.', '* It rolls gently to the minimum and takes a nap.'],
    win: ['* GRADIENT overflows and vanishes.', '* You earned 0 EXP and 1 lesson: clip early.'],
  },
  leaderboard: {
    id: 'leaderboard', name: 'THE LEADERBOARD', tex: 'enemy-board', hp: 7, dmg: 4, box: { w: 250, h: 160 }, boss: true, music: 'boss',
    intro: ['* THE LEADERBOARD looms over you.', '* Names scroll across its face. Numbers climb. Numbers fall.', '* "LITTLE SOUL. DO YOU WANT TO KNOW YOUR RANK?"'],
    check: ['* THE LEADERBOARD - AT 20 DF 20', '* Ranks everyone. Remembers no one. Changes its mind at the last minute.'],
    acts: [
      { name: 'Trust your CV', effect: 'cv', text: ['* You remember your cross-validation.', '* Five honest folds. You believe them.', '* The falling numbers get quieter.'] },
      { name: 'Ignore noise', effect: 'noise', text: ['* You stop refreshing the board.', '* The public scores flicker... and you just don\'t care.', '* Its shake-ups lose their bite.'] },
      { name: 'Cheer others', effect: 'cheer', text: ['* You cheer for everyone on the board.', '* Somebody, somewhere, gets their first medal. You are happy for them.', '* THE LEADERBOARD seems confused. Then touched.'] },
    ],
    spareNeeds: ['cv', 'noise', 'cheer'],
    turns: [['rankrain'], ['shakeup'], ['dropout'], ['attention', 'rankrain'], ['shakeup', 'dropout'], ['rankrain', 'attention', 'shakeup']],
    idle: ['* The board refreshes. Everyone moves one place. Nobody changed anything.', '* A name you know drops forty places in one second.', '* "PUBLIC SCORE IS NOT FINAL," it whispers.', '* The board hums the sound of a thousand people pressing F5.'],
    bubbles: ['RANK! RANK! RANK!', 'SHAKE-UP INCOMING.', 'PUBLIC IS NOT PRIVATE.', 'REFRESH. REFRESH.', 'WHAT IS YOUR SCORE?'],
    spare: ['* THE LEADERBOARD stops shouting numbers.', '* Its screen goes quiet and shows a single line:', '* "THANKS FOR PLAYING. THE LEARNING WAS THE SCORE."'],
    win: ['* THE LEADERBOARD flickers... and freezes on a blank page.', '* You earned 0 EXP and 1 lesson: you were never the number.'],
  },
};
