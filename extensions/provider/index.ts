import type {
  ExtensionAPI,
  ProviderModelConfig,
} from "@earendil-works/pi-coding-agent";
import {
  COHERE_OVERFLOW_PATTERN,
  FALLBACK_COHERE_MODELS,
  fetchCohereModels,
} from "../../src";

function mergeProviderModels(
  remoteModels: ProviderModelConfig[],
): ProviderModelConfig[] {
  const byId = new Map(remoteModels.map((model) => [model.id, model]));

  for (const fallback of FALLBACK_COHERE_MODELS) {
    if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
  }

  return Array.from(byId.values());
}

async function getProviderModels(): Promise<ProviderModelConfig[]> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return FALLBACK_COHERE_MODELS;

  try {
    const remoteModels = await fetchCohereModels(apiKey);
    return mergeProviderModels(remoteModels);
  } catch {
    return FALLBACK_COHERE_MODELS;
  }
}

export default async function (pi: ExtensionAPI) {
  pi.registerProvider("cohere", {
    name: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    apiKey: "$COHERE_API_KEY",
    api: "openai-completions",
    models: await getProviderModels(),
  });

  pi.on("message_end", (event, ctx) => {
    const message = event.message;
    if (message.role !== "assistant") return;
    if (message.stopReason !== "error") return;
    if (message.provider !== "cohere" && ctx.model?.provider !== "cohere")
      return;

    const errorMessage = message.errorMessage ?? "";
    if (errorMessage.includes("context_length_exceeded")) return;
    if (!COHERE_OVERFLOW_PATTERN.test(errorMessage)) return;

    return {
      message: {
        ...message,
        errorMessage: `context_length_exceeded: ${errorMessage}`,
      },
    };
  });
}
