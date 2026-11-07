# WaelYTz.github.io

Wael's portfolio: a small explorable pixel-art underground. Every room is a project.

- **Play:** https://waelytz.github.io
- **No time? Résumé:** https://waelytz.github.io/resume/ (static, printable, works without JS)
- **For tools:** `/llms.txt`, `/profile.json`

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

Content (projects, competitions, skills, the Mirror's answers) lives in `src/content/` and also generates `/resume`, `llms.txt` and `profile.json` at build time.

Deep links: `/#/lab`, `/#/projects`, `/#/records`, `/#/library`, `/#/memorial`, `/#/shop`, `/#/mirror?q=your+question`, `/#/exit`.
