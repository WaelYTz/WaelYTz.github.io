// Single source of truth for who Wael is. Used by the game AND by the static /resume page (rendered at build time).

export const PROFILE = {
  name: 'Wael',
  headline: 'ML engineer & AI-agent builder, competing on Kaggle & Zindi.',
  summary:
    'I build forecasting models and multi-agent LLM systems, and compete on Kaggle and Zindi. ' +
    'Open to collaborations on machine learning, AI agents and data competitions.',
  site: 'https://waelytz.github.io/',
  links: {
    github: 'https://github.com/WaelYTz',
    kaggle: 'https://www.kaggle.com/waelyt',
    linkedin: 'https://www.linkedin.com/in/zitouni-ouailimadeddine/',
  },
  githubUser: 'WaelYTz',
} as const;

// The email is never written in plain text in the HTML or in this bundle.
// It is stored reversed in two halves and only assembled at runtime, on demand.
const E = ['zd.ise', 'inuotiz_on'];
export function emailAddress(): string {
  const [domain, user] = E.map((s) => s.split('').reverse().join(''));
  return `${user}${String.fromCharCode(64)}${domain}`;
}
/** Human-readable but scraper-unfriendly form, safe to render anywhere. */
export const EMAIL_OBFUSCATED = 'no_zitouni [at] esi [dot] dz';

export const CREED = [
  '"Technoblade never dies."',
  '"All warfare is based on deception." - Sun Tzu',
];
