type LogFn = (...args: unknown[]) => void;

type Logger = {
  info: LogFn;
  error: LogFn;
  warn: LogFn;
  debug: LogFn;
  trace: LogFn;
  fatal: LogFn;
  child: () => Logger;
};

export const levels = {
  values: {
    silent: Number.POSITIVE_INFINITY,
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
  },
  labels: {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal",
  },
} as const;

function createLogger(): Logger {
  const noop: LogFn = () => undefined;
  return {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: createLogger,
  };
}

function pino(): Logger {
  return createLogger();
}

pino.levels = levels;

export default pino;
export { pino };
