import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const emptyStub = "./lib/stubs/empty-module.js";
const pinoStub = "./lib/stubs/pino-client-stub.ts";

const nextConfig: NextConfig = {
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
    // Privy → WalletConnect → pino pulls thread-stream test files into Client SSR.
    // Relative aliases (not absolute paths) are required for Turbopack resolveAlias.
    resolveAlias: {
      pino: pinoStub,
      "pino-pretty": emptyStub,
      "thread-stream": emptyStub,
      tap: emptyStub,
      desm: emptyStub,
      fastbench: emptyStub,
      "pino-elasticsearch": emptyStub,
      "why-is-node-running": emptyStub,
      fs: { browser: emptyStub },
      net: { browser: emptyStub },
      perf_hooks: { browser: emptyStub },
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withWorkflow(nextConfig);
