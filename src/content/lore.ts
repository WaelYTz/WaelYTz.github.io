// Competitions (achievements only: no ranks, no scores), the Art of War, Technoblade, skills-as-items.

export interface Competition {
  id: string;
  title: string;
  host: string;
  year: string;
  achievement: string;
  repo: string;
  dialog: string[];
}

export const COMPETITIONS: Competition[] = [
  {
    id: 'ieee',
    title: 'IEEE Big Data Cup 2026: TrafficFlowBench',
    host: 'Kaggle',
    year: '2026',
    achievement:
      'Delivered a full four-task solution on ten freeway corridors with a strictly causal, deletion-tested forecasting pipeline and a technical report.',
    repo: 'https://github.com/WaelYTz/trafficflowbench-2026',
    dialog: [
      '* {y}IEEE BIG DATA CUP 2026{w}\n* TrafficFlowBench, on Kaggle.',
      '* Reconstruct, forecast and explain traffic on ten freeway corridors.',
      '* The trophy reads: "Strictly causal. Verified after T."',
    ],
  },
  {
    id: 'zindi',
    title: 'Zindi Bias Bounty: Mapping Equity Challenge',
    host: 'Zindi',
    year: '2026',
    achievement:
      'Discovered and documented a hidden escape-route bias (2.88M residents behind a single road link); entered for the Best Bias Discovery and Best Documentation prizes.',
    repo: 'https://github.com/WaelYTz/resist-one-road-out',
    dialog: [
      '* {y}ZINDI BIAS BOUNTY{w}\n* Mapping Equity Challenge.',
      '* Found 2.88M residents behind a single road link.',
      '* Entered for Best Bias Discovery and Best Documentation.',
    ],
  },
  {
    id: 'vec',
    title: 'NeurIPS 2026 Virtual Embryo Challenge',
    host: 'NeurIPS',
    year: '2026',
    achievement:
      'Built and open-sourced a leaderboard-insights tool and live dashboard that tells participants which metric to improve next.',
    repo: 'https://github.com/WaelYTz/vec-leaderboard-insights',
    dialog: [
      '* {y}NEURIPS 2026{w}\n* Virtual Embryo Challenge.',
      '* Built a tool for everyone in it: which metric to improve next, and what it is worth.',
    ],
  },
];

// Sun Tzu, The Art of War, tr. Lionel Giles (1910), public domain. Notes are Wael's (from build_assets.py).
export const WAR: [string, string][] = [
  ['If you know the enemy and know yourself, you need not fear the result of a hundred battles.',
    'Know the metric, know your validation set.'],
  ['All warfare is based on deception.', 'A leaderboard can lie. Trust the validation you built honestly.'],
  ['Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.',
    'Ship quietly, strike once.'],
  ['The victorious strategist only seeks battle after the victory has been won.', 'Win on validation first. Submit second.'],
  ['He will win who knows when to fight and when not to fight.', 'Some metrics are identities. Know which levers not to pull.'],
];

export const TECHNO = [
  '* If you wish to defeat me, train for another 100 years.',
  '* Technoblade never dies.',
];
export const TECHNO_MEMORIAL = 'In memory of Technoblade, 1999-2022';

// Skills sold in the shop (and kept in the ITEM menu).
export interface Skill {
  id: string;
  name: string; // <= 10 chars, shown in menus
  full: string;
  price: string;
  group: 'ML' | 'Deep learning & LLMs' | 'Agents' | 'Data' | 'Web & tooling';
  flavor: string; // shop text
  use: string; // what happens when you USE it in the ITEM menu
  heal: number;
}

export const SKILLS: Skill[] = [
  { id: 'python', name: 'Python', full: 'Python', price: '3G', group: 'Data', heal: 10,
    flavor: 'A trusty snake. Mostly harmless. Eats notebooks.', use: 'You import antigravity. You float a little.' },
  { id: 'pytorch', name: 'PyTorch', full: 'PyTorch', price: '1e-3G', group: 'Deep learning & LLMs', heal: 15,
    flavor: 'A torch that keeps GPUs warm. Priced at the learning rate.', use: 'You call .backward(). Your HP flows the right way.' },
  { id: 'xgboost', name: 'XGBoost', full: 'XGBoost', price: '100G', group: 'ML', heal: 12,
    flavor: 'Boosts morale. And residuals. Comes in 100 small trees.', use: 'A hundred tiny trees heal you a little each.' },
  { id: 'lightgbm', name: 'LightGBM', full: 'LightGBM', price: '64G', group: 'ML', heal: 12,
    flavor: 'Grows leaf-wise. Finishes before you finish reading this.', use: 'It trained already. You feel faster.' },
  { id: 'catboost', name: 'CatBoost', full: 'CatBoost', price: '9G', group: 'ML', heal: 12,
    flavor: 'Handles categories. Purrs when it converges.', use: 'It purrs. Your HP goes up. Nobody knows why.' },
  { id: 'sklearn', name: 'sklearn', full: 'scikit-learn', price: '7G', group: 'ML', heal: 8,
    flavor: 'A toolbox where every tool is fit(), then predict().', use: 'You fit(). You predict(). You feel balanced.' },
  { id: 'pandas', name: 'pandas', full: 'pandas', price: '2G', group: 'Data', heal: 8,
    flavor: 'Two bears that eat CSVs. Do not feed after midnight (time zones).', use: 'You groupby() your thoughts. Much tidier.' },
  { id: 'numpy', name: 'NumPy', full: 'NumPy', price: '1G', group: 'Data', heal: 8,
    flavor: 'Vectorised. Never loops. Never looks back.', use: 'Broadcast! Every HP point heals at once.' },
  { id: 'langgraph', name: 'LangGraph', full: 'LangGraph', price: '42G', group: 'Agents', heal: 14,
    flavor: 'A map for agents. The arrows point back when tests fail.', use: 'Your state graph routes HP back to you.' },
  { id: 'agents', name: 'LLM agents', full: 'Multi-agent LLM systems', price: '3x10G', group: 'Agents', heal: 18,
    flavor: 'Three tiny workers. They argue, then they fix your code.', use: 'The Auditor, Fixer and Judge patch you up. Tests pass.' },
  { id: 'qlora', name: 'QLoRA', full: 'QLoRA fine-tuning (Transformers, PEFT)', price: '4bit', group: 'Deep learning & LLMs', heal: 16,
    flavor: 'Fine-tunes a 3B model on one GPU. Low rank, high spirits.', use: 'A small adapter. A big difference.' },
  { id: 'ts', name: 'TypeScript', full: 'TypeScript', price: '5G', group: 'Web & tooling', heal: 6,
    flavor: 'JavaScript wearing a seatbelt. This whole place runs on it.', use: 'Type-checked. No surprises at runtime. Probably.' },
  { id: 'git', name: 'Git', full: 'Git & GitHub Actions', price: 'FREE', group: 'Web & tooling', heal: 20,
    flavor: 'Saves your progress, like a save star with merge conflicts.', use: 'You commit your HP. It is safe now.' },
  { id: 'validation', name: 'Validation', full: 'Honest validation', price: '???', group: 'ML', heal: 20,
    flavor: 'The rarest item here. Trust it over any leaderboard.', use: 'You check your CV folds. Calm returns.' },
];
