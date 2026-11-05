import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ holds Playwright specs (playwright.config.ts owns those) — Vitest's default
    // include glob matches *.spec.ts too, so without this it tries to run them as unit
    // tests and fails immediately on Playwright's own `test`/`expect` globals.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
