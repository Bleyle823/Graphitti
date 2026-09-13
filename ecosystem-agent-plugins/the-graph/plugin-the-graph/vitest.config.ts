import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@elizaos/core": path.join(dir, "src/eliza-core-shim.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
