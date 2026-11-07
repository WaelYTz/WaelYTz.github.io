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

export default defineConfig({
  base: '/',
  plugins: [contentPages()],
  resolve: {
    // Phaser without Matter physics (we do our own tile collision): ~110 KB smaller.
    alias: { phaser: 'phaser/dist/phaser-arcade-physics.min.js' },
  },
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
