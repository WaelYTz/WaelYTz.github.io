// Optional public data. Unauthenticated, cached, and every failure is silent: the game never depends on it.
import { cacheGet, cacheSet } from './save';
import { PROFILE } from '../content/profile';

export interface GhStats { repos: number; followers: number; stars: number; since: string; }
export interface Encounter { fight: number; act: number; item: number; mercy: number; }

const H = 60 * 60 * 1000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

let ghPromise: Promise<GhStats | null> | null = null;
export function githubStats(): Promise<GhStats | null> {
  if (ghPromise) return ghPromise;
  ghPromise = (async () => {
    const cached = cacheGet<GhStats>('gh', 12 * H);
    if (cached) return cached;
    const u = await getJson<{ public_repos: number; followers: number; created_at: string }>(
      `https://api.github.com/users/${PROFILE.githubUser}`,
    );
    if (!u) return null;
    const repos = await getJson<{ stargazers_count: number; fork: boolean }[]>(
      `https://api.github.com/users/${PROFILE.githubUser}/repos?per_page=100`,
    );
    const stats: GhStats = {
      repos: u.public_repos,
      followers: u.followers,
      stars: repos ? repos.filter((r) => !r.fork).reduce((a, r) => a + r.stargazers_count, 0) : 0,
      since: (u.created_at || '').slice(0, 4),
    };
    cacheSet('gh', stats);
    return stats;
  })();
  return ghPromise;
}

let encPromise: Promise<Encounter | null> | null = null;
/** The playable encounter on Wael's GitHub profile (FIGHT/ACT/ITEM/MERCY via issues). */
export function profileEncounter(): Promise<Encounter | null> {
  if (encPromise) return encPromise;
  encPromise = (async () => {
    const cached = cacheGet<Encounter>('enc', 3 * H);
    if (cached) return cached;
    const e = await getJson<Encounter>(
      `https://raw.githubusercontent.com/${PROFILE.githubUser}/${PROFILE.githubUser}/main/data/encounter.json`,
    );
    if (!e || typeof e.mercy !== 'number') return null;
    const slim = { fight: e.fight | 0, act: e.act | 0, item: e.item | 0, mercy: e.mercy | 0 };
    cacheSet('enc', slim);
    return slim;
  })();
  return encPromise;
}
