declare module "@elizaos/core" {
  export type Memory = {
    content: { text?: string };
  };

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
      message: Memory
    ) => Promise<{
      success: boolean;
      text?: string;
      data?: unknown;
      error?: Error;
    }>;
  };

  export type Plugin = {
    name: string;
    description: string;
    actions: Action[];
    providers: unknown[];
    services: unknown[];
    init?: (config: unknown, runtime: IAgentRuntime) => Promise<void>;
  };
}
