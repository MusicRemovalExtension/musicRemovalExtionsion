import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, renameSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-worklet",
      writeBundle() {
        // Copy the worklet file to the correct location
        const srcPath = resolve(
          process.cwd(),
          "src/audio-input/audio-worklets/capture-processor.js"
        );
        const destPath = resolve(
          process.cwd(),
          "dist/worklets/capture-processor.js"
        );

        try {
          mkdirSync(resolve(process.cwd(), "dist/worklets"), {
            recursive: true,
          });
          copyFileSync(srcPath, destPath);
          console.log("✅ Worklet file copied successfully");
        } catch (error) {
          console.error("❌ Failed to copy worklet file:", error);
        }
      },
    },
    {
      name: "flatten-html",
      writeBundle() {
        // Move HTML files to root level
        const htmlFiles = [
          { from: "dist/src/popup/index.html", to: "dist/popup.html" },
          { from: "dist/src/options/index.html", to: "dist/options.html" },
          { from: "dist/src/offscreen/index.html", to: "dist/offscreen.html" },
        ];

        htmlFiles.forEach(({ from, to }) => {
          try {
            renameSync(
              resolve(process.cwd(), from),
              resolve(process.cwd(), to)
            );
            console.log(`✅ Moved ${from} to ${to}`);
          } catch (error) {
            console.error(`❌ Failed to move ${from}:`, error);
          }
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), "src/popup/index.html"),
        options: resolve(process.cwd(), "src/options/index.html"),
        offscreen: resolve(process.cwd(), "src/offscreen/index.html"),
        background: resolve(process.cwd(), "src/background/index.ts"),
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    copyPublicDir: true,
  },
  publicDir: "public",
});
