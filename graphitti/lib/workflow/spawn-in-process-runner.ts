import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function resolveTsxCli(projectRoot: string): string {
  const cli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(cli)) {
    throw new Error(`tsx CLI not found at ${cli}`);
  }
  return cli;
}

/**
 * Fire-and-forget workflow execution in a standalone tsx process so the
 * workflow executor is not compiled through Next's `withWorkflow()` plugin.
 * Resolves once the child has spawned; the child writes terminal status itself.
 */
export function spawnInProcessRunner(options: {
  workflowId: string;
  executionId: string;
  input: Record<string, unknown>;
  logPrefix?: string;
}): Promise<void> {
  const projectRoot = process.cwd();
  const runnerPath = join(projectRoot, "scripts", "in-process-runner.ts");
  const tsxCli = resolveTsxCli(projectRoot);
  const logPrefix = options.logPrefix ?? "[Workflow Execute]";

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, runnerPath], {
      cwd: projectRoot,
      env: {
        ...process.env,
        WORKFLOW_ID: options.workflowId,
        EXECUTION_ID: options.executionId,
        WORKFLOW_INPUT: JSON.stringify(options.input),
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", (error) => {
      console.error(`${logPrefix} Failed to spawn in-process runner:`, error);
      reject(error);
    });

    child.once("spawn", () => {
      resolve();
    });
  });
}
