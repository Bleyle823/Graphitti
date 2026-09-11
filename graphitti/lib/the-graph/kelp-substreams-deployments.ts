import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type KelpSubgraphIdentifiers = {
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const DEPLOYMENTS_PATH = join(REPO_ROOT, "substreams", "deployments.json");

export const KELP_SUBSTREAMS_PACKAGE_SLUG = "kelp-rseth-backing-alerts";

export type KelpSubstreamsPackageRef = {
  slug: string;
  version: string;
  network: string;
  spkg: string;
  module: string;
  startBlock: number;
  registryUrl: string | null;
};

export type KelpSubstreamsDeployments = {
  package?: string;
  version?: string;
  packages?: Record<string, KelpSubstreamsPackageRef>;
  subgraph: {
    slug: string;
    network?: string;
    startBlock?: number;
    module?: string;
    id?: string | null;
    deploymentId?: string | null;
    ipfsHash?: string | null;
    ipfs?: {
      manifest?: string;
      schema?: string;
      spkg?: string;
    };
    studioUrl?: string;
  };
  deployedAt?: string | null;
  notes?: string;
};

let cached: KelpSubstreamsDeployments | null | undefined;

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadKelpSubstreamsDeployments(): KelpSubstreamsDeployments | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    const raw = readFileSync(DEPLOYMENTS_PATH, "utf8");
    cached = JSON.parse(raw) as KelpSubstreamsDeployments;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function kelpSubgraphManifestFallback(): KelpSubgraphIdentifiers {
  const manifest = loadKelpSubstreamsDeployments();
  if (!manifest?.subgraph) {
    return {};
  }
  return {
    id: nonEmpty(manifest.subgraph.id),
    deploymentId: nonEmpty(manifest.subgraph.deploymentId),
    ipfsHash:
      nonEmpty(manifest.subgraph.ipfsHash) ??
      nonEmpty(manifest.subgraph.ipfs?.manifest),
  };
}

export function kelpPackageFromManifest(
  slug = KELP_SUBSTREAMS_PACKAGE_SLUG
): KelpSubstreamsPackageRef | undefined {
  const manifest = loadKelpSubstreamsDeployments();
  if (!manifest) {
    return;
  }
  if (manifest.packages?.[slug]) {
    return manifest.packages[slug];
  }
  if (manifest.package) {
    return {
      slug,
      version: "v0.1.0",
      network: manifest.subgraph.network ?? "mainnet",
      spkg: manifest.package,
      module: manifest.subgraph.module ?? "graph_out_subgraph",
      startBlock: manifest.subgraph.startBlock ?? 25_900_000,
      registryUrl: null,
    };
  }
}

export function kelpSubgraphDeployedIdentifiers(): KelpSubgraphIdentifiers {
  const manifest = kelpSubgraphManifestFallback();
  if (manifest.id || manifest.deploymentId || manifest.ipfsHash) {
    return manifest;
  }
  return {
    id: process.env.KELP_SUBGRAPH_ID?.trim() || undefined,
    deploymentId: process.env.KELP_DEPLOYMENT_ID?.trim() || undefined,
    ipfsHash: process.env.KELP_IPFS_HASH?.trim() || undefined,
  };
}

export function deploymentsManifestPath(): string {
  return DEPLOYMENTS_PATH;
}
