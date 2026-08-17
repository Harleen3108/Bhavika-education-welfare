import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

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
      "server-only": path.resolve(ROOT, "src/tests/stubs/server-only.ts"),
      "@": path.resolve(ROOT, "src"),
    },
  },
});
