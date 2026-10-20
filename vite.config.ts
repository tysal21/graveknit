import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" makes the built game work from any folder, including GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [["tests/ui/**", "jsdom"]],
  },
});
