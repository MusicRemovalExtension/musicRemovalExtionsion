import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), 'src/popup/index.html'),
        options: resolve(process.cwd(), 'src/options/index.html'),
        offscreen: resolve(process.cwd(), 'src/offscreen/index.html'),
        background: resolve(process.cwd(), 'src/background/index.ts')
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    },
    outDir: 'dist'
  }
});
