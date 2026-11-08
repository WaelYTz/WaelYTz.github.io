# WaelYTz.github.io

Wael's portfolio: a small explorable pixel-art underground. Every room is a project.

- **Play:** https://waelytz.github.io
- **No time? Résumé:** https://waelytz.github.io/resume/ (static, printable, works without JS)
- **For tools:** `/llms.txt`, `/profile.json`

## Controls
| Action | Keyboard | Touch / mouse |
|---|---|---|
| Move | Arrow keys or WASD | On-screen D-pad, or click / tap where to walk |
| Talk, confirm | Z, Enter or Space | On-screen Z button, or tap |
| Back, cancel | X, Shift or Esc | On-screen X button |
| Menu (items, wear, map, options) | C or Ctrl | On-screen C button |
| Mute | M | Music button, top right |

In a fight, press Z when the moving bar is over the gold strip for a critical hit, and dodge with the movement keys.

## Stack
Vite + TypeScript + Phaser 3. All sprites, tiles and fonts are drawn from code at runtime; all music and sound is synthesized with WebAudio. No image or audio files, no API keys, no paid services. Original art and writing, inspired by classic top-down RPGs.

## Develop
```powershell
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run shots      # headless Edge screenshots + smoke test (needs preview running)
```

Content (projects, competitions, skills, Wael's in-game answers) lives in `src/content/` and also generates `/resume`, `llms.txt` and `profile.json` at build time.

Wael (in his house) answers typed questions entirely in the visitor's browser:
- **Smart match** (everyone): a small sentence-embedding model ([all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) via transformers.js, about 25 MB) picks the written answer in `src/content/kb.ts` that means the same thing as the question.
- **AI brain** (optional, desktop browsers with WebGPU, OPTIONS > Wael AI): Llama 3.2 1B Instruct via [WebLLM](https://github.com/mlc-ai/web-llm), downloaded once (about 700 MB) and cached by the browser. It only answers from those written facts, and a filter falls back to the written answer if a reply goes off script. Built with Llama.

Deep links: `/#/lab`, `/#/projects`, `/#/records`, `/#/library`, `/#/memorial`, `/#/shop`, `/#/wael?q=your+question`, `/#/garden`, `/#/hallway`, `/#/exit`.
