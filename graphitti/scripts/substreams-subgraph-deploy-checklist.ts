#!/usr/bin/env tsx
/**
 * Prints the Substreams → graph_out → Graph Studio deploy checklist.
 * Run: pnpm substreams:deploy-checklist
 */

const STEPS = [
  {
    title: "1. Auth and build Substreams package",
    commands: [
      "substreams auth",
      "cd substreams/<your-package>",
      "substreams build",
    ],
  },
  {
    title: "2. Quality gate (mandatory before deploy)",
    commands: [
      "substreams run ./substreams.yaml <map_module> -s <start_block> -t +100 -o jsonl",
    ],
  },
  {
    title: "3. Add graph_out module",
    notes: [
      "Map module emits your proto entities.",
      "graph_out converts to proto:sf.substreams.sink.entity.v1.EntityChanges.",
      "See substreams/kelp-rseth-backing-alerts (+ kelp-rseth-arbitrum-supply store) for reference.",
    ],
  },
  {
    title: "4. Define schema.graphql (must match entity fields)",
    notes: [
      "Entity names and fields must match graph_out Field names.",
      "Example: type BackingSnapshot @entity { id, blockNumber, shouldAlert, ... }",
    ],
  },
  {
    title: "5. Deploy subgraph to Graph Studio (24/7 indexer)",
    commands: [
      "graph auth --studio <DEPLOY_KEY>",
      "graph codegen && graph build",
      "graph deploy --studio <your-subgraph-slug>",
    ],
  },
  {
    title: "6. Bind subgraph to Graphitti workflow",
    notes: [
      "Record subgraph id from Studio / Explorer.",
      "Paste id into the-graph/query-substreams-entity node (id field).",
      "Configure entityName, whereJson, orderBy, minField as needed.",
      "Optional: the-graph/get-substreams-stream-status to confirm _meta sync.",
    ],
  },
  {
    title: "7. Push path (optional — lowest latency)",
    commands: [
      'substreams sink webhook "https://<host>/api/workflows/<workflowId>/webhook" ./your-package.spkg <output_module> -e <endpoint>',
    ],
    notes: [
      "Use the-graph/substreams-webhook-setup in a workflow for URL + CLI template.",
      "Graphitti never starts gRPC from Run — sink runs externally 24/7.",
    ],
  },
];

console.log("Substreams → subgraph → Graphitti deploy checklist\n");
console.log("=".repeat(60));

for (const step of STEPS) {
  console.log(`\n${step.title}\n`);
  if (step.notes) {
    for (const note of step.notes) {
      console.log(`  • ${note}`);
    }
  }
  if (step.commands) {
    for (const cmd of step.commands) {
      console.log(`  $ ${cmd}`);
    }
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(
  "\nReference packages:\n  substreams/kelp-rseth-arbitrum-supply/ (Arbitrum store)\n  substreams/kelp-rseth-backing-alerts/ (mainnet + graph_out)\n"
);
