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
      "See substreams/ (monolithic crate: substreams.yaml + substreams.arbitrum.yaml).",
      "For SQL sink → Supabase (no Studio subgraph), use Kelp rsETH Backing Monitor (Substreams → Supabase) workflow.",
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
      "pnpm substreams:deploy-kelp",
      "# or manually: cd substreams && make deploy-subgraph",
    ],
    notes: [
      "Writes substreams/deployments.json with subgraph id.",
      "Graphitti Kelp workflow resolves id from deployments.json — no manual paste.",
    ],
  },
  {
    title: "6. Bind subgraph to Graphitti workflow",
    notes: [
      "Kelp rsETH Backing Monitor template wires Query + Status nodes to Resolve Substreams Package.subgraph_id.",
      "Ensure deployments.json has id after deploy (or set KELP_SUBGRAPH_ID as fallback).",
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
  "\nReference package:\n  substreams/ (Kelp SQL sink → Supabase; Kelp Supabase workflow)\n"
);
