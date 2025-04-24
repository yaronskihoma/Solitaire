import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, '../index.html'),
      },
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      'httpie': 'httpie/browser',
    },
  },
});
