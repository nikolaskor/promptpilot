import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import {
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { execSync } from "child_process";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-files",
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

          // Copy manifest.json
          copyFileSync(
            resolve(__dirname, "public/manifest.json"),
            resolve(__dirname, "dist/manifest.json")
          );
          console.log("Successfully copied manifest.json to dist");

          // Copy icons folder if it exists
          const iconsSource = resolve(__dirname, "public/icons");
          const iconsDest = resolve(__dirname, "dist/icons");
          if (existsSync(iconsSource)) {
            execSync(`cp -r "${iconsSource}" "${iconsDest}"`);
            console.log("Successfully copied icons folder to dist");
          }
        } catch (error) {
          console.error("Error copying extension files:", error);
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
