import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Fixed port so HMR WebSocket URL matches the HTTP dev server (extension pages run on chrome-extension://).
  const devPort = Number(env['VITE_DEV_PORT'] || 5173)

  return {
    // Extension pages resolve asset URLs from the package root; absolute `/assets/…`
    // breaks the popup in Chrome. Relative URLs keep scripts/styles loadable from
    // `chrome-extension://…/src/popup/index.html`.
    base: './',

    plugins: [react(), crx({ manifest })],

    define: {
      __APP_MODE__: JSON.stringify(mode),
      __APP_VERSION__: JSON.stringify(process.env['npm_package_version'] ?? '1.0.0'),
      __API_BASE_URL__: JSON.stringify(env['VITE_API_BASE_URL'] ?? ''),
    },

    build: {
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        input: {
          // Compile the page-world injected script as a separate entry
          // so it lands at assets/page-world.js with a stable name.
          // Plain .js so Rollup parses this extra input in `vite dev` (no TS transform on side entries).
          'page-world': resolve(__dirname, 'src/injected/page-world.js'),
        },
        output: {
          // Stable filenames so CRX asset references survive watch rebuilds
          entryFileNames: (chunk) => `assets/${chunk.name.replace(/\.ts$/, '')}.js`,
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },

    server:
      command === 'serve'
        ? {
            port: devPort,
            // Required for CRX + extension origin: dynamic fallback ports break the injected HMR client
            // (it tries ws://localhost/ with no port). Change VITE_DEV_PORT in .env / .env.local if busy.
            strictPort: true,
            // So module URLs / HMR client infer the real dev server, not chrome-extension://…
            origin: `http://127.0.0.1:${devPort}`,
            hmr: {
              protocol: 'ws',
              host: '127.0.0.1',
              port: devPort,
              clientPort: devPort,
            },
          }
        : undefined,
  }
})
