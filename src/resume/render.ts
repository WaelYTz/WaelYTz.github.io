// Renders the static, semantic résumé HTML at build time (called from vite.config.ts). No JS needed to read it.
import { PROFILE, EMAIL_OBFUSCATED } from '../content/profile';
import { PROJECTS } from '../content/projects';
import { COMPETITIONS, SKILLS, WAR } from '../content/lore';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

// 5x7 glyphs for the pixel heading (same font as the game); only what we need here.
import { GLYPHS } from '../core/glyphs';

export function pixelSvg(text: string, scale = 4, fill = '#fff'): string {
  const ADV = 6;
  let d = '';
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    g.forEach((row, r) => {
      for (let c = 0; c < 5; c++) if (row[c] === '#') d += `M${(i * ADV + c) * scale} ${r * scale}h${scale}v${scale}h-${scale}z`;
    });
  });
  const w = (text.length * ADV - 1) * scale;
  return `<svg class="px" viewBox="0 0 ${w} ${7 * scale}" width="${w}" height="${7 * scale}" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path d="${d}" fill="${fill}"/></svg>`;
}

const SOUL = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
export function soulSvg(px = 3): string {
  let d = '';
  SOUL.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') d += `M${c * px} ${r * px}h${px}v${px}h-${px}z`; }));
  return `<svg class="soul" viewBox="0 0 ${7 * px} ${6 * px}" width="${7 * px}" height="${6 * px}" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path d="${d}" fill="#ff0000"/></svg>`;
}

function link(url: string, label?: string) {
  return `<a href="${esc(url)}" rel="noopener">${esc(label ?? host(url))}</a>`;
}

export function renderResume(): string {
  const groups = new Map<string, string[]>();
  for (const s of SKILLS) {
    if (s.id === 'validation') continue;
    groups.set(s.group, [...(groups.get(s.group) ?? []), s.full]);
  }
  const projects = PROJECTS.map(
    (p) => `
      <article class="project" id="${p.id}">
        <header>
          <h3>${esc(p.title)}</h3>
          ${p.context ? `<p class="context">${esc(p.context)}</p>` : ''}
        </header>
        <p>${esc(p.summary)}</p>
        <ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <p class="stack"><span class="label">Stack:</span> ${p.stack.map(esc).join(' · ')}</p>
        <p class="links">${link(p.repo, 'Repository')}${(p.extraLinks ?? []).map((l) => ' · ' + link(l.url, l.label)).join('')}</p>
      </article>`,
  ).join('');

  const comps = COMPETITIONS.map(
    (c) => `
      <li><strong>${esc(c.title)}</strong> <span class="context">(${esc(c.host)}, ${esc(c.year)})</span><br/>
      ${esc(c.achievement)} ${link(c.repo, 'Code')}</li>`,
  ).join('');

  const skills = [...groups.entries()]
    .map(([g, items]) => `<div><dt>${esc(g)}</dt><dd>${items.map(esc).join(', ')}</dd></div>`)
    .join('');

  const war = WAR.slice(0, 3)
    .map(([q, n]) => `<li><q>${esc(q)}</q> <span class="note">${esc(n)}</span></li>`)
    .join('');

  return `
  <header class="top">
    <p class="kicker">${soulSvg(3)} <a href="/">Play the game version</a></p>
    <h1><span class="sr">${esc(PROFILE.name)}</span>${pixelSvg('WAEL', 8)}</h1>
    <p class="headline">${esc(PROFILE.headline)}</p>
    <p>${esc(PROFILE.summary)}</p>
    <ul class="contact-inline">
      <li>${link(PROFILE.links.github, 'GitHub')}</li>
      <li>${link(PROFILE.links.kaggle, 'Kaggle')}</li>
      <li>${link(PROFILE.links.linkedin, 'LinkedIn')}</li>
      <li><span class="email" data-email>${esc(EMAIL_OBFUSCATED)}</span></li>
    </ul>
  </header>

  <main>
    <section aria-labelledby="h-projects">
      <h2 id="h-projects">* Projects</h2>
      ${projects}
    </section>

    <section aria-labelledby="h-comp">
      <h2 id="h-comp">* Competitions</h2>
      <ul class="comps">${comps}</ul>
    </section>

    <section aria-labelledby="h-skills">
      <h2 id="h-skills">* Skills</h2>
      <dl class="skills">${skills}</dl>
    </section>

    <section aria-labelledby="h-creed">
      <h2 id="h-creed">* Creed</h2>
      <p class="context">Sun Tzu, The Art of War (tr. Lionel Giles, 1910), with what each line means for machine learning:</p>
      <ul class="war">${war}</ul>
      <p class="context">"Technoblade never dies." In memory of Technoblade, 1999-2022.</p>
    </section>

    <section aria-labelledby="h-contact">
      <h2 id="h-contact">* Contact</h2>
      <p>Open to collaborations on machine learning, AI agents and data competitions.</p>
      <ul>
        <li>Email: <span class="email" data-email>${esc(EMAIL_OBFUSCATED)}</span> <button type="button" class="copy" data-copy hidden>Copy email</button></li>
        <li>GitHub: ${link(PROFILE.links.github)}</li>
        <li>Kaggle: ${link(PROFILE.links.kaggle)}</li>
        <li>LinkedIn: ${link(PROFILE.links.linkedin)}</li>
      </ul>
    </section>
  </main>

  <footer><p>${soulSvg(2)} Stay determined. · <a href="/">Play the portfolio</a></p></footer>`;
}

/** The info-first card shown over the game before it loads (works without JS). */
export function renderIntro(): string {
  return `
    <section id="intro" aria-labelledby="intro-h">
      <div class="card">
        <h1 id="intro-h"><span class="sr">${esc(PROFILE.name)}</span>${pixelSvg('WAEL', 10)}</h1>
        <p class="soulrow">${soulSvg(4)}</p>
        <p class="headline">${esc(PROFILE.headline)}</p>
        <p class="pitch">${esc(PROFILE.summary)}</p>
        <div class="actions">
          <button id="play" type="button" class="ui-btn big" disabled>* Loading...</button>
          <a class="ui-btn" href="/resume/">Résumé</a>
          <a class="ui-btn" href="/resume/#h-contact">Contact</a>
        </div>
        <p class="hint">A small explorable underground: every room is a project. Arrows/WASD + Z. Sound is off.</p>
      </div>
    </section>`;
}

export function renderNoscript(): string {
  return `
    <div class="noscript">
      <h1>${esc(PROFILE.name)}</h1>
      <p>${esc(PROFILE.headline)}</p>
      <p>${esc(PROFILE.summary)}</p>
      <p>This portfolio is a small game and needs JavaScript. Everything is also on the <a href="/resume/">résumé page</a>.</p>
      <ul>${PROJECTS.map((p) => `<li><a href="${esc(p.repo)}">${esc(p.title)}</a>: ${esc(p.short)}</li>`).join('')}</ul>
    </div>`;
}

/** Plain-text profile for LLM tools (https://llmstxt.org style). */
export function llmsTxt(): string {
  const L: string[] = [
    `# ${PROFILE.name}`,
    '',
    `> ${PROFILE.headline}`,
    '',
    PROFILE.summary,
    '',
    `- Résumé (static HTML): ${PROFILE.site}resume/`,
    `- Playable portfolio: ${PROFILE.site}`,
    `- GitHub: ${PROFILE.links.github}`,
    `- Kaggle: ${PROFILE.links.kaggle}`,
    `- LinkedIn: ${PROFILE.links.linkedin}`,
    `- Email: ${EMAIL_OBFUSCATED}`,
    '',
    '## Projects',
    '',
  ];
  for (const p of PROJECTS) {
    L.push(`### ${p.title}`, '', `${p.summary}`, '');
    p.highlights.forEach((h) => L.push(`- ${h}`));
    L.push(`- Stack: ${p.stack.join(', ')}`, `- Code: ${p.repo}`, '');
  }
  L.push('## Competitions', '');
  COMPETITIONS.forEach((c) => L.push(`- ${c.title} (${c.host}, ${c.year}): ${c.achievement}`));
  L.push('', '## Skills', '', SKILLS.filter((s) => s.id !== 'validation').map((s) => s.full).join(', '), '');
  return L.join('\n');
}

export function profileJson(): string {
  return JSON.stringify(
    {
      name: PROFILE.name,
      headline: PROFILE.headline,
      summary: PROFILE.summary,
      links: PROFILE.links,
      email: EMAIL_OBFUSCATED,
      projects: PROJECTS.map(({ id, title, short, repo, context, highlights, stack }) => ({ id, title, short, repo, context, highlights, stack })),
      competitions: COMPETITIONS.map(({ title, host, year, achievement, repo }) => ({ title, host, year, achievement, repo })),
      skills: SKILLS.filter((s) => s.id !== 'validation').map((s) => s.full),
    },
    null,
    2,
  );
}

export function jsonLd(): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: PROFILE.name,
    url: PROFILE.site,
    jobTitle: 'ML engineer & AI-agent builder',
    description: PROFILE.summary,
    sameAs: [PROFILE.links.github, PROFILE.links.kaggle, PROFILE.links.linkedin],
    knowsAbout: SKILLS.filter((s) => s.id !== 'validation').map((s) => s.full),
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
