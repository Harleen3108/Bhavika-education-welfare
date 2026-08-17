import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    // Run test files sequentially; each boots its own in-memory replica set.
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Neutralize the `server-only` guard in the Node test runtime.
      "server-only": path.resolve(__dirname, "src/tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
