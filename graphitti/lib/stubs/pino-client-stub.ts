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

function createLogger(): Logger {
  const noop = () => {};
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

export default createLogger;
