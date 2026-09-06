import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGateway, generateText } from "ai";

function createTestModel(apiKey: string) {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const useOpenRouter =
    provider === "openrouter" ||
    provider === "agentrouter" ||
    apiKey.startsWith("sk-or-");

  if (useOpenRouter) {
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
    return openrouter(
      process.env.AI_WORKFLOW_MODEL || "openai/gpt-4o-mini"
    );
  }

  const gateway = createGateway({ apiKey });
  return gateway("openai/gpt-4o-mini");
}

export async function testAiGateway(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "AI_GATEWAY_API_KEY is required",
      };
    }

    await generateText({
      model: createTestModel(apiKey),
      prompt: "Say 'test' if you can read this.",
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
