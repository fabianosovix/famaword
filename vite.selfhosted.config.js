import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite config for the self-hosted build (no Base44 platform plugin).
// The installer uses this instead of the default vite.config.js.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/api/base44Client': path.resolve(__dirname, 'src/api/selfHostedClient.js'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom')) return 'react-vendor';
          if (id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('node_modules/react/')) return 'react-vendor';
        },
      },
    },
  },
});