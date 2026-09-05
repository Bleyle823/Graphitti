export const ErrorCategory = {
  VALIDATION: "VALIDATION",
  CONFIGURATION: "CONFIGURATION",
  EXTERNAL_SERVICE: "EXTERNAL_SERVICE",
  NETWORK_RPC: "NETWORK_RPC",
  TRANSACTION: "TRANSACTION",
  BILLING: "BILLING",
  DATABASE: "DATABASE",
  AUTH: "AUTH",
  INFRASTRUCTURE: "INFRASTRUCTURE",
  WORKFLOW_ENGINE: "WORKFLOW_ENGINE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCategory =
  (typeof ErrorCategory)[keyof typeof ErrorCategory]
  | "validation"
  | "configuration"
  | "external_service"
  | "network_rpc"
  | "transaction"
  | "billing"
  | "database"
  | "auth"
  | "infrastructure"
  | "workflow_engine"
  | "unknown";

type LogLabels = Record<string, string | undefined>;

function formatMessage(message: string, labels?: LogLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return message;
  }
  return `${message} ${JSON.stringify(labels)}`;
}

export function logUserError(
  _category: ErrorCategory,
  message: string,
  error?: unknown,
  labels?: LogLabels
): void {
  console.warn(formatMessage(message, labels), error ?? "");
}

export function logSystemError(
  _category: ErrorCategory,
  message: string,
  error?: unknown,
  labels?: LogLabels
): void {
  console.error(formatMessage(message, labels), error ?? "");
}

export function logSystemWarn(
  _category: ErrorCategory,
  message: string,
  error?: unknown,
  labels?: LogLabels
): void {
  console.warn(formatMessage(message, labels), error ?? "");
}

export function logInfo(message: string, labels?: LogLabels): void {
  console.log(formatMessage(message, labels));
}

export function logWarn(message: string, labels?: LogLabels): void {
  console.warn(formatMessage(message, labels));
}

export function logDebug(message: string, labels?: LogLabels): void {
  if (process.env.LOG_LEVEL === "debug") {
    console.log(formatMessage(message, labels));
  }
}

export function logSecurityEvent(
  name: string,
  fields?: LogLabels,
  _sentry?: boolean
): void {
  console.warn(`[Security] ${name}`, fields ?? {});
}
