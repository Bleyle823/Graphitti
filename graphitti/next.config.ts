import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth"],
};

export default withWorkflow(nextConfig);
