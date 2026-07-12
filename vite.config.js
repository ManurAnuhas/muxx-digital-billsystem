import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification and tree‑shaking for production builds
    minify: 'esbuild',
    rollupOptions: {
      // Separate vendor chunk to improve caching
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
