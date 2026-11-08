// The cast (all original characters). Lines are chosen by progress; placeholders: {name}, {rooms}, {secrets}.
// Overworld life: `chatter` pops up in a small bubble when you walk by, `notice` shows a "!" the first time you get
// close, `wakes` = asleep until you come near, `squeak` = reacts when you bump into it.
import { game as G } from '../core/state';

export interface Npc {
  id: string;
  name: string;
  tex: string;
  voice: 'narrator' | 'wael' | 'shop' | 'mirror' | 'bot' | 'enemy' | 'pip' | 'hoot' | 'knight' | 'keeper' | 'tiny';
  /** Returns the dialogue for this conversation (called each time you talk). */
  talk(n: number): string[];
  chatter?: string[];
  notice?: boolean;
  wakes?: boolean;
  squeak?: boolean;
  /** which way the sprite faces when not flipped */
  faces?: 'l' | 'r';
  /** frame sets for characters with real walk cycles */
  anim?: { idle: number[]; blink?: number; down: number[]; up: number[]; side: number[]; work?: number[] };
}

const pick = (n: number, sets: string[][]) => sets[Math.min(n, sets.length - 1)];

export const NPCS: Record<string, Npc> = {
  pip: {
    id: 'pip', name: 'PIP', tex: 'npc-pip', voice: 'pip',
    chatter: ['loading...', 'hi {name}!', '47% proud!', 'still loading'],
    talk: (n) => {
      if (G.flag('boss')) return ['* PIP: You beat the LEADERBOARD?! Or... befriended it?', '* PIP: Either way, my loading bar just hit 100%. First time ever!'];
      return pick(n, [
        ["* PIP: You made it! I'm so proud. Like, 47% proud. Still loading.", '* PIP: EAST is the Ruins of Projects. That is where the good stuff is.', '* PIP: NORTH is the town square. WEST is... a quiet place. Be gentle there.'],
        ['* PIP: Tip! Yellow stars save your game.', '* PIP: I lost three saves before I learned that. I was very sad. For 0.3 seconds.'],
        ["* PIP: Have you met WAEL yet? His house is in Lamplight Square, south-west corner.", "* PIP: He's usually at his desk. Training something. Always training something."],
        ['* PIP: Loading... loading...', '* PIP: Oh! It is you. Hi again, {name}!'],
      ]);
    },
  },
  null: {
    id: 'null', name: 'NULL', tex: 'npc-null', voice: 'tiny', notice: true,
    chatter: ['dont step wrong!!', 'read the clocks...', 'past = safe', 'future = ouch'],
    talk: (n) => {
      if (G.flag('corridor')) return ['* NULL: you crossed it! no leakage at all!', "* NULL: the corridor remembers now. the safe tiles glow.", "* NULL: i'm gonna tell everyone. well. i'm gonna tell PIP."];
      return pick(n, [
        ["* NULL: h-hey! careful! don't step on the wrong tiles!", '* NULL: i stepped on a FUTURE tile once. i saw tomorrow\'s answers.', '* NULL: my score was AMAZING. then everyone found out.', '* NULL: ...read the clocks. only step on what already happened.'],
        ['* NULL: the clock above each column says T.', '* NULL: tiles stamped at T or before are safe. anything after T is the future. ouch.'],
      ]);
    },
  },
  bitsy: {
    id: 'bitsy', name: 'BITSY', tex: 'npc-bitsy', voice: 'bot',
    chatter: ['BEEP.', 'DRAW A 7?', 'PATROLLING.', 'BOOP.'],
    talk: (n) => {
      if (G.flag('digit')) return ['* BITSY: BEEP. THAT 7 WAS BEAUTIFUL.', '* BITSY: I HAVE SAVED IT. I LOOK AT IT DURING MY BREAKS.'];
      return pick(n, [
        ['* BITSY: BEEP. VISITOR DETECTED.', '* BITSY: I AM BITSY. LAB ASSISTANT. MONITOR. EMOTIONAL SUPPORT CRT.', '* BITSY: THE TERMINAL RUNS A TINY FREEWAY. CAUSE A CRASH. WATCH THE JAM TRAVEL BACKWARDS.', '* BITSY: AND THE GLASS FLOOR IS A CLASSIFIER. DRAW A 7 ON IT. I DARE YOU.'],
        ['* BITSY: THE CLASSIFIER HAS SEEN EXACTLY ONE EXAMPLE OF EACH DIGIT.', '* BITSY: SO PLEASE DRAW NEATLY. IT IS DOING ITS BEST.'],
        ['* BITSY: BEEP. (It is pretending to be busy. Its screen shows a screensaver.)'],
      ]);
    },
  },
  hoot: {
    id: 'hoot', name: 'PROF. HOOT', tex: 'npc-hoot', voice: 'hoot', wakes: true,
    chatter: ['zzz...', 'hoo?', 'zzz... validation...'],
    talk: (n) => {
      if (G.hasSecret('hidden')) return ['* HOOT: Hoo! You found the room behind the shelf.', '* HOOT: Every builder has one. Unfinished ideas need somewhere quiet to sleep.', '* HOOT: ...Like me. Zzz...'];
      return pick(n, [
        ['* HOOT: Hoo... hm? Oh! A reader. How rare.', '* HOOT: I am PROFESSOR HOOT. I look after the books.', "* HOOT: These shelves hold one very old book on strategy. Sun Tzu's Art of War, in Lionel Giles' 1910 translation.", '* HOOT: WAEL wrote notes in the margins. About... machine learning? Hoo. Young people.', "* HOOT: Read any shelf you like. I'll be right here. Resting my eyes. Zzz..."],
        ['* HOOT: Zzz... know the metric... zzz... know your validation set...'],
        ['* HOOT: Zzz... (One book on the far right sticks out. Hoot does not notice.)'],
      ]);
    },
  },
  knight: {
    id: 'knight', name: 'SIR TROPHY', tex: 'npc-knight', voice: 'knight', notice: true,
    chatter: ['HALT!', '*polish polish*', 'Shiny!', 'For the quest!'],
    talk: (n) => pick(n, [
      ['* SIR TROPHY: HALT! Who approaches the HALL OF RECORDS?', "* SIR TROPHY: Ah, a visitor! I am SIR TROPHY, guardian of WAEL's achievements!", '* SIR TROPHY: Behold! Three trophies! Each one a competition, each one hard-won!', '* SIR TROPHY: You will notice no ranks or scores are written here.', '* SIR TROPHY: ...That is on purpose. A knight values the quest, not the leaderboard!'],
      ['* SIR TROPHY: I polish them every day. With my sleeve. I have very shiny sleeves.'],
      ['* SIR TROPHY: North of here is a garden where flowers pick their favourite stone.', '* SIR TROPHY: Beyond it, a LEADERBOARD. It is very proud. Too proud. Be careful, {name}.'],
    ]),
  },
  keeper: {
    id: 'keeper', name: 'THE KEEPER', tex: 'npc-keeper', voice: 'keeper',
    talk: (n) => pick(n, [
      ['* ...', '* THE KEEPER: This room is for remembering.', '* THE KEEPER: The crown belonged to a legend. He never stopped fighting. Not even at the end.', "* THE KEEPER: Stay as long as you like. The candles don't mind."],
      ['* ...', '* (The Keeper nods at you, quietly.)'],
    ]),
  },
  byte: {
    id: 'byte', name: 'BYTE', tex: 'npc-byte', voice: 'tiny',
    chatter: ["can't catch me!", 'tag!', 'wheee', 'faster nibble!'],
    talk: (n) => pick(n, [
      ["* BYTE: We're BYTE and NIBBLE. Together we are... one and a half bytes.", "* BYTE: We're playing tag. I've been 'it' since version 0.1."],
      ['* BYTE: Lumen\'s shop is up north. Everything there is open source.', '* BYTE: I bought "Python" once. It ate my homework.'],
    ]),
  },
  nibble: {
    id: 'nibble', name: 'NIBBLE', tex: 'npc-nibble', voice: 'tiny',
    chatter: ['wait up!!', 'tag! no wait', 'hehe', 'im half a byte!'],
    talk: (n) => pick(n, [
      ["* NIBBLE: hi!! i'm half of a byte!", '* NIBBLE: when i grow up i want to be a whole BYTE.', '* NIBBLE: or a float! floats get to have decimals!'],
      ['* NIBBLE: did you know the fountain is made of recycled print statements?', '* NIBBLE: ...i made that up. but wouldn\'t it be cool?'],
    ]),
  },
  cache: {
    id: 'cache', name: 'CACHE', tex: 'npc-cache', voice: 'hoot', faces: 'l',
    chatter: ['...slowly...', 'i remember you', 'hit!', 'miss...'],
    talk: (n) => pick(n, [
      ['* CACHE: Hello again, {name}.', "* CACHE: ...Oh. We haven't met? I could have sworn I had you stored.", "* CACHE: I'm CACHE. I remember everything. Eventually. When it's worth it."],
      ['* CACHE: You have seen {rooms} rooms so far, and found {secrets} secrets.', '* CACHE: I remember. I always remember. (Until someone clears me.)'],
    ]),
  },
  duck: {
    id: 'duck', name: 'DUCK', tex: 'npc-duck', voice: 'tiny', squeak: true,
    talk: (n) => pick(n, [
      ['* A rubber duck sits on the floor, looking expectant.', '* You explain your last bug to it, step by step.', '* Halfway through, you realize what was wrong.', '* The duck says nothing. It never has to.'],
      ['* The duck looks very wise. Squeak.'],
    ]),
  },
  moss: {
    id: 'moss', name: 'MOSS', tex: 'npc-moss', voice: 'tiny', notice: true,
    chatter: ["don't push me!", "i'm not a centroid", 'eep', 'just a rock...'],
    talk: (n) => {
      if (G.flag('kmeans')) return ['* MOSS: you did it! every patch has its own stone now.', "* MOSS: and nobody pushed me. best day ever."];
      return pick(n, [
        ["* MOSS: eep! p-please don't push me. i'm not a centroid. i'm just a rock.", '* MOSS: the BIG stones are the centroids. each flower glows the colour of its nearest one.', '* MOSS: the lever runs k-means: the stones roll to the middle of their flowers. over and over.'],
        ['* MOSS: psst. right now two stones started in the SAME patch.', '* MOSS: k-means will never fix that by itself. it gets stuck. a {y}local minimum{w}.', '* MOSS: push one of them somewhere better first. THEN pull the lever.'],
        ['* MOSS: (Moss is pretending to be a regular rock.)'],
      ]);
    },
  },
  // WAEL himself: his room logic runs the conversation (questions and answers), this is only a fallback
  wael: {
    id: 'wael', name: 'WAEL', tex: 'npc-wael', voice: 'wael', notice: true,
    chatter: ['hm...', 'one more epoch', 'oh hey!', '*typing*', 'it works?!'],
    anim: { idle: [0], blink: 1, down: [2, 3], up: [4, 5], side: [6, 7], work: [4, 5] },
    talk: () => ["* WAEL: Oh, hey {name}! Ask me anything."],
  },
};
