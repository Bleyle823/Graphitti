declare module "@elizaos/core" {
  export type Memory = {
    content: { text?: string; source?: string };
  };

  export type State = Record<string, unknown>;

  export type HandlerCallback = (content: {
    text?: string;
    source?: string;
    actions?: string[];
  }) => Promise<unknown[] | void> | unknown[] | void;

  export interface ActionResult {
    success: boolean;
    text?: string;
    data?: unknown;
    error?: string | Error;
  }

  export type IAgentRuntime = {
    getSetting: (key: string) => string | undefined;
  };

  export type Action = {
    name: string;
    similes?: string[];
    description: string;
    examples: unknown[];
    validate: (runtime: IAgentRuntime) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: Record<string, unknown>,
      callback?: HandlerCallback
    ) => Promise<ActionResult | void>;
  };

  export type Plugin = {
    name: string;
    description: string;
    actions: Action[];
    providers: unknown[];
    services: unknown[];
    init?: (config: unknown, runtime: IAgentRuntime) => Promise<void>;
  };

  export const logger: {
    warn: (...args: unknown[]) => void;
  };
}
