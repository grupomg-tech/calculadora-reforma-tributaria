import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "examples/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx", "src/vite-env.d.ts"],
      reporter: ["text", "lcov"],
      // Fail the run (and CI) when coverage drops below these levels.
      thresholds: { statements: 80, lines: 80 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
