import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINANCIAL_FLOW_WORKFLOW_TEMPLATES } from "./financial-flow-templates";
import { FPL_WORKFLOW_TEMPLATES } from "./fpl-templates";
import { MONITOR_WORKFLOW_TEMPLATES } from "./monitor-templates";
import {
  type ExportedWorkflowFile,
  normalizeExportedWorkflow,
  type WorkflowTemplate,
} from "./normalize-export";
import { PLUGIN_WORKFLOW_TEMPLATES } from "./plugin-templates";
import { TREASURY_WORKFLOW_TEMPLATES } from "./treasury-templates";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");

const IMPORT_SOURCES: Array<{
  file: string;
  key: string;
  addIntegrationNote?: boolean;
}> = [
  {
    file: "workflows/safe-multisig-pending-tx-decoder-copy.workflow.json",
    key: "safe-multisig",
  },
  {
    file: "workflows/sky-usds-savings-auto-deposit-copy.workflow.json",
    key: "sky-usds-auto-deposit",
  },
  {
    file: "workflows/sky-usds-savings-auto-deposit-copy-2.workflow.json",
    key: "sky-usds-auto-deposit-2",
  },
  {
    file: "workflows/sky-savings-dashboard-copy.workflow - Copy.json",
    key: "sky-savings-dashboard",
  },
  {
    file: "workflows/multi-token-treasury-monitor-copy.workflow.json",
    key: "treasury-monitor",
  },
  {
    file: "workflows/monthly-salary-distribution-copy.workflow.json",
    key: "monthly-salary",
  },
  {
    file: "workflows/chainlink-cross-chain-interoperability-protocol-bridge-copy.workflow.json",
    key: "chainlink-ccip",
    addIntegrationNote: false,
  },
  {
    file: "workflows/aave-health-factor-monitor-base-sepolia-copy.workflow.json",
    key: "aave-health-factor",
  },
];

function loadExport(relativePath: string): ExportedWorkflowFile {
  const path = join(REPO_ROOT, relativePath);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as ExportedWorkflowFile;
}

export function loadInMemoryWorkflowTemplates(): WorkflowTemplate[] {
  return [
    ...PLUGIN_WORKFLOW_TEMPLATES,
    ...TREASURY_WORKFLOW_TEMPLATES,
    ...FINANCIAL_FLOW_WORKFLOW_TEMPLATES,
    ...FPL_WORKFLOW_TEMPLATES,
    ...MONITOR_WORKFLOW_TEMPLATES,
  ];
}

export function loadAllWorkflowTemplates(): WorkflowTemplate[] {
  const imported: WorkflowTemplate[] = [];
  for (const source of IMPORT_SOURCES) {
    try {
      imported.push(
        normalizeExportedWorkflow(loadExport(source.file), source.key, {
          addIntegrationNote: source.addIntegrationNote,
        })
      );
    } catch (error) {
      console.error(`[templates] skipped ${source.file}`, error);
    }
  }

  return [...imported, ...loadInMemoryWorkflowTemplates()];
}
