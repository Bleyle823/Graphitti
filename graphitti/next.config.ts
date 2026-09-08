import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth"],
  // Nested lockfile in lib/next-boilerplate otherwise makes Turbopack treat app/ as the root.
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "@walletconnect/logger",
  ],
  turbopack: {
    root: projectRoot,
    // WalletConnect pulls pino/thread-stream into client SSR; stub test-only paths.
    resolveAlias: {
      pino: path.join(projectRoot, "lib/stubs/pino-client-stub.ts"),
      "thread-stream": path.join(projectRoot, "lib/stubs/empty-module.js"),
      "why-is-node-running": path.join(projectRoot, "lib/stubs/empty-module.js"),
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withWorkflow(nextConfig);
