export type PrivyCredentials = {
  PRIVY_APP_ID?: string;
  PRIVY_APP_SECRET?: string;
  PRIVY_AUTHORIZATION_KEY?: string;
  GRAPHITTI_BASE_URL?: string;
  GRAPHITTI_API_KEY?: string;
};

export type ToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export type PrivyToolDefinition = {
  name: string;
  description: string;
  category: "users" | "wallets" | "sign" | "controls" | "intents" | "graphitti";
  optional?: boolean;
  requiresGraphittiKey?: boolean;
  requiresTreasuryScope?: boolean;
  parameters: Record<string, unknown>;
};

export type ExecuteParams = Record<string, unknown>;
