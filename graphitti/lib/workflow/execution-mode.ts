export type GraphittiExecutionMode = "in-process" | "durable";

/**
 * How workflow runs are dispatched after the execution row is created.
 *
 * - `in-process` (default): direct `executeWorkflow` in a tsx child process so
 *   `"use step"` is not compiled into DevKit HTTP hops by Next.
 * - `durable`: Workflow DevKit `start()` for checkpoint/resume on Vercel.
 */
export function getGraphittiExecutionMode(): GraphittiExecutionMode {
  const raw = process.env.GRAPHITTI_EXECUTION_MODE?.trim().toLowerCase();
  if (raw === "durable") {
    return "durable";
  }
  return "in-process";
}

export function isInProcessExecutionMode(): boolean {
  return getGraphittiExecutionMode() === "in-process";
}
