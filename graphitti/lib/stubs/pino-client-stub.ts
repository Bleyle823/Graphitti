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

export default pino;
export { pino };
