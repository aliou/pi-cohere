import type {
  ExtensionAPI,
  ProviderModelConfig,
} from "@earendil-works/pi-coding-agent";
import {
  COHERE_OVERFLOW_PATTERN,
  FALLBACK_COHERE_MODELS,
  fetchCohereModels,
} from "../../src";

const MODEL_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const COHERE_BASE_URL = "https://api.cohere.ai/compatibility/v1";
const COHERE_API = "openai-completions";

type StoredCohereModel = ProviderModelConfig & {
  api: typeof COHERE_API;
  provider: "cohere";
  baseUrl: typeof COHERE_BASE_URL;
};

function isModelCacheFresh(checkedAt: number | undefined): boolean {
  return checkedAt !== undefined && Date.now() - checkedAt < MODEL_CACHE_TTL_MS;
}

function toStoredModels(models: ProviderModelConfig[]): StoredCohereModel[] {
  return models.map((model) => ({
    ...model,
    api: COHERE_API,
    provider: "cohere",
    baseUrl: COHERE_BASE_URL,
  }));
}

function toProviderModels(
  models: readonly ProviderModelConfig[],
): ProviderModelConfig[] {
  return models.map((model) => {
    const {
      api: _api,
      baseUrl: _baseUrl,
      provider: _provider,
      ...providerModel
    } = model as ProviderModelConfig & { provider?: string };
    return providerModel;
  });
}

function mergeProviderModels(
  remoteModels: ProviderModelConfig[],
): ProviderModelConfig[] {
  const byId = new Map(remoteModels.map((model) => [model.id, model]));

  for (const fallback of FALLBACK_COHERE_MODELS) {
    if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
  }

  return Array.from(byId.values());
}

export default function (pi: ExtensionAPI) {
  pi.registerProvider("cohere", {
    name: "Cohere",
    baseUrl: COHERE_BASE_URL,
    apiKey: "$COHERE_API_KEY",
    api: COHERE_API,
    models: FALLBACK_COHERE_MODELS,
    async refreshModels(context) {
      const cached = await context.store.read();
      if (!context.allowNetwork) {
        return cached
          ? toProviderModels(cached.models)
          : FALLBACK_COHERE_MODELS;
      }

      if (!context.force && cached && isModelCacheFresh(cached.checkedAt)) {
        return toProviderModels(cached.models);
      }

      const apiKey =
        context.credential?.type === "api_key" && context.credential.key
          ? context.credential.key
          : process.env.COHERE_API_KEY;
      if (!apiKey) {
        return cached
          ? toProviderModels(cached.models)
          : FALLBACK_COHERE_MODELS;
      }

      try {
        const remoteModels = await fetchCohereModels(apiKey, context.signal);
        const models = mergeProviderModels(remoteModels);
        await context.store.write({
          models: toStoredModels(models),
          checkedAt: Date.now(),
        });
        return models;
      } catch {
        return cached
          ? toProviderModels(cached.models)
          : FALLBACK_COHERE_MODELS;
      }
    },
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
