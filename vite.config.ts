import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { writeFileSync, readFileSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "move-index-html",
      closeBundle: async () => {
        try {
          // Copy the built HTML file from src/index.html to the root of dist
          const html = readFileSync(
            resolve(__dirname, "dist/src/index.html"),
            "utf8"
          );
          const fixedHtml = html.replace('src="/index.js"', 'src="./index.js"');
          writeFileSync(resolve(__dirname, "dist/index.html"), fixedHtml);
          console.log("Successfully copied index.html to dist root");
        } catch (error) {
          console.error("Error moving index.html:", error);
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/index.html"),
        content: resolve(__dirname, "src/content.ts"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "index.html") {
            return "[name].[ext]";
          }
          return "assets/[name].[hash].[ext]";
        },
      },
    },
  },
});
