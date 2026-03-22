import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

function audioRecorderPlugin() {
  return {
    name: 'audio-recorder',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-audio', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }

        const url = new URL(req.url, 'http://localhost');
        const id   = parseInt(url.searchParams.get('id'));
        const type = url.searchParams.get('type'); // 'word' or 'example'

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          try {
            const buffer   = Buffer.concat(chunks);
            const filename = `${type}_${id}.webm`;
            const audioDir = join(process.cwd(), 'public/audio/recorded');
            mkdirSync(audioDir, { recursive: true });
            writeFileSync(join(audioDir, filename), buffer);

            // Update vocabulary.js to point this word to the new recording
            const vocabPath = join(process.cwd(), 'src/data/vocabulary.js');
            let content = readFileSync(vocabPath, 'utf-8');
            const field = type === 'word' ? 'audioFile' : 'exampleAudioFile';
            const value = `recorded/${filename}`;

            content = content.split('\n').map(line => {
              if (!new RegExp(`\\bid:\\s*${id}\\b`).test(line)) return line;
              // Remove existing field if already there
              line = line.replace(new RegExp(`,?\\s*${field}:\\s*'[^']*'`), '');
              // Insert before closing }
              line = line.replace(/(\s*\}(\s*,?\s*)$)/, `, ${field}: '${value}'$1`);
              return line;
            }).join('\n');

            writeFileSync(vocabPath, content, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, filename }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    audioRecorderPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HSK 1 Flash Cards',
        short_name: 'HSK1',
        description: 'Study HSK-1 Chinese vocabulary with beautiful flashcards',
        theme_color: '#2C1810',
        background_color: '#F5EFE0',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
