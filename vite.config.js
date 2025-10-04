import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Base path for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/brain/' : '/',
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0', // Allow access from Tailscale network
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Split vendor dependencies for better caching
          vendor: ['dexie'],
          workbox: ['workbox-window']
        }
      }
    },
    // Performance budget enforcement
    chunkSizeWarningLimit: 500, // 500kb limit per chunk
  },

  // Asset handling
  assetsInclude: ['**/*.md'],

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // PWA and service worker handling
  publicDir: 'public',

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['dexie', 'workbox-window'],
  },

  // Preview server (for production builds)
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },

  // Test configuration integration
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
})