import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const vendorChunks = {
  'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
  'vendor-query':  ['@tanstack/react-query', 'axios'],
  'vendor-charts': ['recharts'],
  'vendor-motion': ['framer-motion'],
  'vendor-icons':  ['react-icons'],
  'vendor-ui':     ['react-hot-toast'],
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [chunk, deps] of Object.entries(vendorChunks)) {
            if (deps.some(dep => id.includes(`/node_modules/${dep}/`))) {
              return chunk;
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'framer-motion'],
  },
});
