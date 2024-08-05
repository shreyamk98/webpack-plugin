import { defineConfig } from "vite";
import kombaiPlugin from "../rollup"; // Ensure the path is correct
import tsConfigPaths from "rollup-plugin-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tsConfigPaths(), kombaiPlugin()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
