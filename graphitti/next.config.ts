import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth"],
  // Nested lockfile in lib/next-boilerplate otherwise makes Turbopack treat app/ as the root.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withWorkflow(nextConfig);
