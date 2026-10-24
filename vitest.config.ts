import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so the React Router plugin doesn't run under tests.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ["app/**/*.test.ts"] },
});
