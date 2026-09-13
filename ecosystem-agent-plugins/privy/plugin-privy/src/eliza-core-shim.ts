/** Minimal @elizaos/core stand-in for unit tests in the Graphitti repo. */
export const logger = {
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
};
