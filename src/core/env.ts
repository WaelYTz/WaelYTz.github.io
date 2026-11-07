// Environment flags.
const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;
export const REDUCED = mq('(prefers-reduced-motion: reduce)');
export const COARSE = mq('(pointer: coarse)');
export const DEV = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev');
