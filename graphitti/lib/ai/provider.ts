import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGateway, type LanguageModel } from "ai";

export type AiProviderName = "openrouter" | "vercel" | "agentrouter";

function isOpenRouterKey(apiKey: string): boolean {
  return apiKey.startsWith("sk-or-");
}

/**
 * Resolve which AI backend to use.
 * Prefers AI_PROVIDER; otherwise infers OpenRouter from sk-or- keys.
 */
export function getAiProvider(apiKey?: string): AiProviderName {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (
    explicit === "openrouter" ||
    explicit === "vercel" ||
    explicit === "agentrouter"
  ) {
    return explicit;
  }

  const key =
    apiKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    "";
  if (key && isOpenRouterKey(key)) {
    return "openrouter";
  }

  return "vercel";
}

export function getAiApiKey(): string | undefined {
  const provider = getAiProvider();
  if (provider === "openrouter" || provider === "agentrouter") {
    return (
      process.env.OPENROUTER_API_KEY ||
      process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY
    );
  }
  return process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
}

export function getWorkflowModelId(): string {
  if (process.env.AI_WORKFLOW_MODEL?.trim()) {
    return process.env.AI_WORKFLOW_MODEL.trim();
  }
  const provider = getAiProvider();
  if (provider === "openrouter" || provider === "agentrouter") {
    return "nvidia/nemotron-3.5-lightning:free";
  }
  return "openai/gpt-5.1-instant";
}

function resolveProviderForKey(
  apiKey: string,
  preferred?: AiProviderName
): AiProviderName {
  if (preferred) {
    return preferred;
  }
  if (isOpenRouterKey(apiKey)) {
    return "openrouter";
  }
  return getAiProvider(apiKey);
}

/**
 * Create a language model for the configured provider.
 * When apiKey is passed (plugin credentials), provider is inferred from the key
 * unless AI_PROVIDER forces openrouter/agentrouter for sk-or- keys.
 */
export function createLanguageModel(options?: {
  modelId?: string;
  apiKey?: string;
  provider?: AiProviderName;
}): LanguageModel {
  const apiKey = options?.apiKey || getAiApiKey();
  if (!apiKey) {
    throw new Error(
      "AI API key not configured. Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY."
    );
  }

  const modelId = options?.modelId || getWorkflowModelId();
  const provider = resolveProviderForKey(apiKey, options?.provider);

  if (provider === "openrouter" || provider === "agentrouter") {
    const openrouter = createOpenRouter({
      apiKey,
      baseURL:
        process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer":
          process.env.OPENROUTER_HTTP_REFERER ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Graphitti",
      },
    });
    return openrouter(modelId);
  }

  const gateway = createGateway({ apiKey });
  return gateway(modelId);
}
