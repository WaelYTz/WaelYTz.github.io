// Real project facts, taken from each repository's README / metadata (fetched with gh). No ranks, no scores.

export interface Project {
  id: string;
  title: string;
  short: string; // one line
  repo: string;
  extraLinks?: { label: string; url: string }[];
  context?: string; // competition / team context
  summary: string; // paragraph for the résumé
  highlights: string[]; // résumé bullets
  stack: string[];
  /** In-game dialog pages (short, typed out). */
  dialog: string[];
}

export const PROJECTS: Project[] = [
  {
    id: 'tfb',
    title: 'TrafficFlowBench 2026',
    short: 'Causal traffic-state reconstruction & queue forecasting under a hidden regime shift.',
    repo: 'https://github.com/WaelYTz/trafficflowbench-2026',
    context: '2026 IEEE Big Data Cup (Kaggle)',
    summary:
      'Solution for the 2026 IEEE Big Data Cup TrafficFlowBench on ten synthetic freeway corridors: reconstruct blanked ' +
      'traffic states, forecast queues 30 minutes ahead, respect traffic physics and recover origin-destination demand.',
    highlights: [
      'Strictly causal queue forecasting: every input is stamped at or before the forecast origin T. A deletion test blanks every cell after T, rebuilds inputs and predictions, and they come out bit-identical; a negative control shows the test catches leaks.',
      'State reconstruction with an XGBoost residual model plus a 14-network 2-D convolutional imputer ensemble and a shock post-correction.',
      'Queue forecasting with a space-time CNN for ongoing queues and a LightGBM + CatBoost onset blend with a "month-pure" memory of earlier days.',
      'Origin-destination demand recovered with non-negative ridge regression; physics treated as an identity of the state answer, not a separate target.',
      'Spotted a regime shift between evaluation windows that the public leaderboard could not show, and documented it in a technical report.',
    ],
    stack: ['Python', 'PyTorch', 'XGBoost', 'LightGBM', 'CatBoost', 'scikit-learn', 'pandas', 'NumPy'],
    dialog: [
      '* {y}TRAFFICFLOWBENCH 2026{w}\n* 2026 IEEE Big Data Cup, on Kaggle.',
      '* Ten freeway corridors. Four tasks: rebuild blanked traffic states, forecast queues 30 minutes ahead, respect physics, recover demand.',
      '* The queue forecasts are {y}strictly causal{w}. Every input is stamped at or before the forecast time T.',
      '* A deletion test wipes everything after T and rebuilds the predictions. They come out bit-identical.',
      '* {g}XGBoost residuals, a CNN imputer ensemble, a space-time CNN, LightGBM + CatBoost.{w}',
    ],
  },
  {
    id: 'swarm',
    title: 'The Refactoring Swarm',
    short: 'Multi-agent LLM system that detects, fixes and validates Python code issues in a self-healing loop.',
    repo: 'https://github.com/WaelYTz/Refactoring-Swarm-El-equipe',
    context: 'Team project',
    summary:
      'A relay of three LLM agents that turns buggy Python into clean, tested code. An Auditor finds issues with Pylint ' +
      'and an LLM, a Fixer rewrites the code with Gemini, and a Judge generates and runs tests. Failing tests send the ' +
      'error back to the Fixer in a self-healing loop.',
    highlights: [
      'Orchestrated as a LangGraph state graph with conditional edges (plus a legacy relay orchestrator).',
      'Listener (Auditor): Pylint static analysis plus LLM issue detection. Corrector (Fixer): Gemini-generated fixes. Validator (Judge): LLM-generated pytest suites.',
      'Sandboxed file tools with path validation, and JSON telemetry of every prompt and response with an HTML dashboard.',
    ],
    stack: ['Python', 'LangGraph', 'LangChain', 'Gemini', 'Pylint', 'Pytest'],
    dialog: [
      '* {y}THE REFACTORING SWARM{w}\n* Three LLM agents that fix Python code together.',
      '* The {y}Auditor{w} finds issues (Pylint + LLM). The {y}Fixer{w} rewrites the code (Gemini). The {y}Judge{w} writes and runs the tests.',
      '* When a test fails, the error goes back to the Fixer. A self-healing loop.',
      '* {g}LangGraph state graph, LangChain, Pylint, Pytest. A team project.{w}',
    ],
  },
  {
    id: 'road',
    title: 'One Road Out',
    short: 'Zindi Bias Bounty: an escape-route road filter hides second exits for 2.88M residents in wildfire country.',
    repo: 'https://github.com/WaelYTz/resist-one-road-out',
    context: 'Zindi Bias Bounty: Mapping Equity Challenge (team resist)',
    summary:
      "The challenge's scored road layer drops service and pedestrian roads (\"escape-route framing\"). In the network it " +
      'defines, 2.88 million residents (7.1%) live in 13,775 pockets whose only connection is a single road link, and ' +
      'the coverage score never counts ways out.',
    highlights: [
      'For 17.5% of pocket residents in the highest wildfire-hazard quartile, a second way out exists in Overture Maps, but only in the road classes the filter drops.',
      'Concentrated where the hazard is highest, and checked against OpenStreetMap and the FHWA public-road inventory.',
      'Shows who carries it (care homes, residents 65+, mobile-home parks) and what an egress component would change in the scorecard.',
      'Delivered an action list of 5,095 high-hazard single-exit pockets; a verification script recomputes all 107 reported numbers.',
    ],
    stack: ['Python', 'pandas', 'DuckDB', 'Shapely', 'pyproj', 'Overture Maps', 'OpenStreetMap'],
    dialog: [
      '* {y}ONE ROAD OUT{w}\n* Zindi Bias Bounty: Mapping Equity.',
      "* The challenge's road layer dropped service roads. In what was left, {r}2.88M residents{w} live behind a single road link.",
      '* In the highest wildfire-hazard areas, some of those pockets DO have a second exit... in the roads the filter removed.',
      '* {g}Checked against OpenStreetMap and the FHWA road inventory. 107 numbers, one script to verify them all.{w}',
    ],
  },
  {
    id: 'mlscratch',
    title: 'ML Algorithms From Scratch',
    short: 'Core machine-learning algorithms from first principles.',
    repo: 'https://github.com/WaelYTz/ML_AlgorithmsFromScratch',
    summary:
      'Foundational algorithms implemented from the ground up in Python notebooks, to understand the mechanics behind ' +
      'the libraries: linear and logistic regression, decision trees and random forests.',
    highlights: [
      'Linear regression trained with gradient descent on the cost function.',
      'Logistic regression with a sigmoid and cross-entropy loss.',
      'Decision trees with feature-based splits, and random forests over random data subsets.',
    ],
    stack: ['Python', 'NumPy', 'Jupyter'],
    dialog: [
      '* {y}ML ALGORITHMS FROM SCRATCH{w}\n* No libraries. Just math.',
      '* Linear regression by gradient descent. Logistic regression with a sigmoid and cross-entropy.',
      '* Decision trees, then random forests built out of them.',
      '* {g}Python, NumPy, Jupyter.{w} Push the ball into the bowl to see the idea.',
    ],
  },
  {
    id: 'vec',
    title: 'VEC Leaderboard Insights',
    short: 'Which metric should I improve next? A tool for the NeurIPS 2026 Virtual Embryo Challenge.',
    repo: 'https://github.com/WaelYTz/vec-leaderboard-insights',
    extraLinks: [{ label: 'Live dashboard', url: 'https://waelytz.github.io/vec-leaderboard-insights/' }],
    context: 'NeurIPS 2026 Virtual Embryo Challenge',
    summary:
      'A small, dependency-free tool and live dashboard for participants. It reads the public leaderboard and shows where ' +
      'headline points are still unclaimed per metric, estimates where a submission stands, and tracks how the field moves.',
    highlights: [
      'Reproduces the published headline formula from the task weights and prints the check on every report.',
      'A "where do I stand" calculator runs fully in the browser and sends nothing anywhere.',
      'A daily GitHub Action stores an anonymised snapshot (team names and affiliations are dropped, enforced by a test).',
    ],
    stack: ['Python (stdlib)', 'GitHub Actions', 'GitHub Pages', 'HTML'],
    dialog: [
      '* {y}VEC LEADERBOARD INSIGHTS{w}\n* For the NeurIPS 2026 Virtual Embryo Challenge.',
      '* Which metric should you improve next? It reads the public board and shows where the points are still unclaimed.',
      '* Dependency-free Python, a live dashboard, and daily anonymised snapshots.',
    ],
  },
  {
    id: 'qlora',
    title: 'LLM-FineTune (Qwen 2.5 3B QLoRA)',
    short: 'Fine-tuning Qwen 2.5 3B with QLoRA on a cleaned UltraChat corpus.',
    repo: 'https://github.com/llm-lab-dz/LLM-FineTune',
    context: 'Co-built at llm-lab-dz',
    summary:
      'A lightweight fine-tuning workflow for Qwen2.5-3B-Instruct: clean the UltraChat conversations, train a 4-bit QLoRA ' +
      'adapter on a single GPU, publish checkpoints to the Hugging Face Hub and compare base vs fine-tuned generations.',
    highlights: [
      'Data cleaning: turn and length filters, strict user/assistant alternation, de-duplication and normalisation.',
      '4-bit NF4 quantisation (BitsAndBytes), LoRA rank 16 / alpha 32, paged 8-bit AdamW.',
      'Checkpoints pushed to the Hugging Face Hub; inference script compares the base model and the adapter.',
    ],
    stack: ['PyTorch', 'Transformers', 'PEFT', 'BitsAndBytes', 'Hugging Face Hub'],
    dialog: [
      '* {y}LLM-FINETUNE{w}\n* Qwen 2.5 3B, fine-tuned with QLoRA.',
      '* Clean the chat data, quantise the model to 4 bits, train a small LoRA adapter on one GPU.',
      '* {g}PyTorch, Transformers, PEFT, BitsAndBytes. Co-built at llm-lab-dz.{w}',
    ],
  },
  {
    id: 'apcs',
    title: 'APCS Frontend (MicroHack)',
    short: 'Hackathon frontend for booking container-terminal appointments, with admin, operator and carrier portals.',
    repo: 'https://github.com/apcs-MicroHack/apcs-frontend',
    context: 'MicroHack, team project',
    summary:
      'A Next.js + TypeScript web app where carriers book terminal appointments for their containers, and operators and ' +
      'admins manage bookings, terminals, carriers, notifications, reports and an audit log.',
    highlights: [
      'Role-based portals (admin, operator, carrier) plus chat and notifications.',
      'A centralised API layer with CSRF-token handling and HTTP-only cookie sessions.',
    ],
    stack: ['TypeScript', 'Next.js', 'React', 'Tailwind CSS', 'Radix UI', 'socket.io'],
    dialog: [
      '* {y}APCS FRONTEND{w}\n* A hackathon build for MicroHack.',
      '* Carriers book container-terminal appointments. Operators and admins manage the rest.',
      '* {g}Next.js, React, TypeScript, Tailwind. A team project.{w}',
    ],
  },
];

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)!;
