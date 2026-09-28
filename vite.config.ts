import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    react(),
    cloudflare({
      inspectorPort: false,
      configPath: process.env.DCH_CONFIG_PATH || 'wrangler.jsonc',
      // Vite serves its own HTML/modules locally. Built deployments protect all assets.
      config:
        command === 'serve' && !isPreview
          ? (config) => ({
              assets: {
                ...config.assets,
                run_worker_first: ['/api', '/api/*'],
              },
            })
          : undefined,
    }),
  ],
  server: { host: '127.0.0.1', port: 5178, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
}));
