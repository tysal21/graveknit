import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" makes the built game work from any folder, including GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // a fresh stamp on every build, added to picture links so browsers fetch redrawn art instead of an old copy
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [["tests/ui/**", "jsdom"]],
  },
});
