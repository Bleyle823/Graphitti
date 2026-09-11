#!/usr/bin/env tsx
/**
 * Build, publish, and optionally deploy Kelp Substreams package + Studio subgraph.
 * Writes substreams/deployments.json for Graphitti resolution.
 *
 * Prerequisites: substreams CLI, graph CLI (optional), Rust toolchain or Docker.
 * Auth: substreams auth; graph auth --studio <DEPLOY_KEY>
 *
 * Usage:
 *   pnpm substreams:deploy-kelp
 *   pnpm substreams:deploy-kelp -- --skip-publish --skip-subgraph
 *   pnpm substreams:deploy-kelp -- --subgraph-id <id> --deployment-id <id> --ipfs-hash <hash>
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SUBSTREAMS_DIR = join(REPO_ROOT, "substreams");
const DEPLOYMENTS_PATH = join(SUBSTREAMS_DIR, "deployments.json");

type DeploymentsFile = {
  package?: string;
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

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--skip-publish") {
      flags.add("skip-publish");
    } else if (arg === "--skip-subgraph") {
      flags.add("skip-subgraph");
    } else if (arg === "--skip-build") {
      flags.add("skip-build");
    } else if (arg.startsWith("--") && argv[i + 1]) {
      values[arg.slice(2)] = argv[++i];
    }
  }
  return { flags, values };
}

function run(title: string, command: string, cwd: string) {
  console.log(`\n→ ${title}`);
  console.log(`  $ ${command}`);
  execSync(command, { cwd, stdio: "inherit", env: process.env });
}

function commandExists(name: string): boolean {
  try {
    execSync(
      process.platform === "win32" ? `where ${name}` : `command -v ${name}`,
      {
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
}

function loadDeployments(): DeploymentsFile {
  try {
    return JSON.parse(
      readFileSync(DEPLOYMENTS_PATH, "utf8")
    ) as DeploymentsFile;
  } catch {
    return {
      subgraph: {
        slug: "kelp-rseth-unbacked-mints",
        network: "mainnet",
        startBlock: 25_900_000,
        module: "graph_out_subgraph",
        studioUrl:
          "https://thegraph.com/studio/subgraph/kelp-rseth-unbacked-mints",
      },
    };
  }
}

function saveDeployments(data: DeploymentsFile) {
  writeFileSync(DEPLOYMENTS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${DEPLOYMENTS_PATH}`);
}

async function lookupSubgraphId(slug: string): Promise<{
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
}> {
  const apiKey = process.env.THEGRAPH_API_KEY?.trim();
  if (!apiKey) {
    return {};
  }
  const query = `
    query SubgraphBySlug($keyword: String!, $first: Int!) {
      subgraphMetadataSearch(text: $keyword, first: $first) {
        displayName
        subgraphs {
          id
          currentVersion {
            subgraphDeployment {
              id
              ipfsHash
            }
          }
        }
      }
    }
  `;
  const response = await fetch(
    "https://gateway.thegraph.com/api/subgraphs/id/DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables: { keyword: slug, first: 10 },
      }),
    }
  );
  const body = (await response.json()) as {
    data?: {
      subgraphMetadataSearch?: Array<{
        displayName?: string;
        subgraphs?: Array<{
          id?: string;
          currentVersion?: {
            subgraphDeployment?: { id?: string; ipfsHash?: string };
          };
        }>;
      }>;
    };
  };
  const slugLower = slug.toLowerCase();
  for (const item of body.data?.subgraphMetadataSearch ?? []) {
    const name = item.displayName?.toLowerCase() ?? "";
    if (!name.includes(slugLower)) {
      continue;
    }
    const subgraph = item.subgraphs?.[0];
    const deployment = subgraph?.currentVersion?.subgraphDeployment;
    if (subgraph?.id) {
      return {
        id: subgraph.id,
        deploymentId: deployment?.id,
        ipfsHash: deployment?.ipfsHash,
      };
    }
  }
  return {};
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));

  if (!commandExists("substreams")) {
    console.error(
      "substreams CLI not found. Install: https://substreams.streamingfast.io/"
    );
    process.exit(1);
  }

  if (!(flags.has("skip-subgraph") || commandExists("graph"))) {
    console.error(
      "graph CLI not found. Install: npm i -g @graphprotocol/graph-cli"
    );
    process.exit(1);
  }

  let deployments = loadDeployments();

  if (!flags.has("skip-build")) {
    run("Build Kelp Substreams package", "substreams build", SUBSTREAMS_DIR);
    run("Pack mainnet + Arbitrum manifests", "make pack", SUBSTREAMS_DIR);
  }

  if (!flags.has("skip-publish")) {
    const spkgFiles = readdirSync(SUBSTREAMS_DIR).filter((name) =>
      name.endsWith(".spkg")
    );
    for (const spkg of spkgFiles) {
      run(`Publish ${spkg}`, `substreams publish ${spkg}`, SUBSTREAMS_DIR);
    }
    if (spkgFiles[0]) {
      deployments.package = spkgFiles[0];
    }
  }

  if (!flags.has("skip-subgraph")) {
    run("Deploy Studio subgraph", "make deploy-subgraph", SUBSTREAMS_DIR);
  }

  const manualId = values["subgraph-id"];
  const manualDeploymentId = values["deployment-id"];
  const manualIpfsHash = values["ipfs-hash"];

  let subgraphId = manualId ?? deployments.subgraph.id ?? undefined;
  let deploymentId =
    manualDeploymentId ?? deployments.subgraph.deploymentId ?? undefined;
  let ipfsHash = manualIpfsHash ?? deployments.subgraph.ipfsHash ?? undefined;

  if (!subgraphId) {
    const discovered = await lookupSubgraphId(deployments.subgraph.slug);
    subgraphId = discovered.id ?? subgraphId;
    deploymentId = discovered.deploymentId ?? deploymentId;
    ipfsHash = discovered.ipfsHash ?? ipfsHash;
  }

  deployments = {
    ...deployments,
    deployedAt: new Date().toISOString(),
    subgraph: {
      ...deployments.subgraph,
      id: subgraphId ?? null,
      deploymentId: deploymentId ?? null,
      ipfsHash: ipfsHash ?? null,
    },
  };
  saveDeployments(deployments);

  if (!subgraphId) {
    console.log(
      "\nSubgraph id not resolved automatically. After Studio deploy, run:\n" +
        "  pnpm substreams:deploy-kelp -- --skip-build --skip-publish --skip-subgraph --subgraph-id <id>\n" +
        "\nFor Supabase SQL sinks, run the postgres sink commands in substreams/README.md instead."
    );
    process.exit(1);
  }

  console.log(`\nKelp subgraph id: ${subgraphId}`);
  console.log(
    "Graphitti resolves this from substreams/deployments.json in Kelp workflow nodes."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
