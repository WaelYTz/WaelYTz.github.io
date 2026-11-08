import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { renderResume, renderNoscript, renderIntro, jsonLd, llmsTxt, profileJson } from './src/resume/render';

// Injects build-time HTML (résumé body, noscript fallback, JSON-LD) generated from src/content/*.
function contentPages(): Plugin {
  return {
    name: 'content-pages',
    transformIndexHtml(html) {
      return html
        .replace('<!--RESUME-->', renderResume())
        .replace('<!--NOSCRIPT-->', renderNoscript())
        .replace('<!--INTRO-->', renderIntro())
        .replace('<!--JSONLD-->', jsonLd());
    },
    // Machine-readable versions of the same content (for LLM tools, ATS and search engines).
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt() });
      this.emitFile({ type: 'asset', fileName: 'profile.json', source: profileJson() });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/llms.txt') return res.end(llmsTxt());
        if (req.url === '/profile.json') return res.end(profileJson());
        next();
      });
    },
  };
}

// transformers.js (WAEL's smart match) fetches the ONNX runtime from jsDelivr, compressed; the 27 MB local copy that
// gets pulled into the bundle is never used, so it is left out of the site.
function dropUnusedOrtWasm(): Plugin {
  return {
    name: 'drop-unused-ort-wasm',
    generateBundle(_o, bundle) {
      for (const k of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(k)) delete bundle[k];
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [contentPages(), dropUnusedOrtWasm()],
  resolve: {
    // Phaser without Matter physics (we do our own tile collision): ~110 KB smaller.
    alias: { phaser: 'phaser/dist/phaser-arcade-physics.min.js' },
  },
  // WAEL's optional AI brain runs in a module worker (see src/world/mirror/llm.ts)
  worker: { format: 'es' },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        resume: resolve(__dirname, 'resume/index.html'),
        notfound: resolve(__dirname, '404.html'),
      },
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
