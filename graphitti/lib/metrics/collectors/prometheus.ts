/** Prometheus metrics stubs for Graphitti (no prom-client dependency). */

export const ERROR_LABELS = ["errorCategory", "errorType", "orgSlug"] as const;

export function recordWorkflowExecutionError(
  _labels: Record<string, string>
): void {}

export function recordWorkflowExecutionFinished(
  _labels: Record<string, string>
): void {}

export function recordWorkflowExecutionErrorByWorkflow(
  _labels: Record<string, string>
): void {}

export function recordWorkflowExecutionSkipped(
  _labels: Record<string, string>
): void {}

export function recordWorkflowExecutionHealed(
  _labels: Record<string, string>
): void {}

export const prometheusMetricsCollector = {
  incrementCounter: () => {},
  observeHistogram: () => {},
};

export async function updateDbMetrics(): Promise<void> {}

export async function getPrometheusMetrics(): Promise<string> {
  return "";
}

export async function getDbMetrics(): Promise<string> {
  return "";
}

export async function getApiProcessMetrics(): Promise<string> {
  return "";
}

export function getPrometheusContentType(): string {
  return "text/plain; version=0.0.4; charset=utf-8";
}

const metricCounter = { inc: (..._args: unknown[]) => {} };
const metricGauge = { set: (..._args: unknown[]) => {} };
const metricHistogram = { observe: (..._args: unknown[]) => {} };

export const rpcMetrics = {
  recordRequest: () => {},
  recordFailover: () => {},
  primaryAttempts: metricCounter,
  primaryFailures: metricCounter,
  fallbackAttempts: metricCounter,
  fallbackFailures: metricCounter,
  failoverEvents: metricCounter,
  recoveryEvents: metricCounter,
  bothFailedEvents: metricCounter,
  healthState: metricGauge,
  latency: metricHistogram,
  errorsByType: metricCounter,
  currentProvider: metricGauge,
};

export const rpcProbeMetrics = {
  recordProbe: () => {},
};

export const processMemoryMetrics = {
  record: () => {},
};
