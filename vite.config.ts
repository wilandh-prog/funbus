import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@types': resolve(__dirname, './src/types'),
      '@core': resolve(__dirname, './src/core'),
      '@rendering': resolve(__dirname, './src/rendering'),
    },
  },

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Code splitting will be added when remaining modules are implemented
        manualChunks: undefined,
      },
    },

    minify: true,
  },

  server: {
    hmr: true,
    open: true,
  },

  worker: {
    format: 'es',
  },
});
