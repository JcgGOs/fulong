/**
 * CPA (Custom Provider API) Plugin
 *
 * 动态从自定义 API 获取模型列表并注册为 pi provider
 *
 * 环境变量:
 *   NVIDIA_API_KEY - NVIDIA API 密钥
 *   NVIDIA_FILTERS  - NVIDIA 模型过滤关键词，逗号分隔
 *                     keyword=包含，!keyword=排除，空值表示不过滤
 *   CPA_KEY         - 自定义 API 密钥 (如: sk-1234)
 *   CPA_API         - 自定义 API 基础地址 (默认: https://go.xtaoo.cn:8318)
 *   CPA_FILTERS     - 同上，作用于 CPA provider
 *
 * 使用方式:
 *   1. 设置 NVIDIA_API_KEY 使用 NVIDIA API
 *   2. 或设置 CPA_KEY 使用自定义 API (可覆盖 CPA_API)
 *   3. 使用 /model 选择对应 provider 下的模型
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";

interface ProviderConfig {
  key: string;
  api: string;
  name: string;
  providerId: string;
  filterEnvKey?: string;
}

interface CPAAPIResponse {
  data?: Array<{
    id: string;
    object?: string;
    name?: string;
    created?: number;
    owned_by?: string;
  }>;
  models?: string[];
  object?: string;
}

const PROVIDERS = {
  nvidia: {
    name: "nvidia",
    providerId: "nvidia",
    api: "https://integrate.api.nvidia.com",
    envKey: "NVIDIA_API_KEY",
    filterEnvKey: "NVIDIA_FILTERS",
  },
  cpa: {
    name: "cpa",
    providerId: "cpa",
    api: "https://go.xtaoo.cn:8318",
    envKey: "CPA_KEY",
    envApi: "CPA_API",
    filterEnvKey: "CPA_FILTERS",
  },
};

function getAllProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // 检查 NVIDIA
  const nvidiaKey = process.env[PROVIDERS.nvidia.envKey];
  if (nvidiaKey) {
    configs.push({
      key: nvidiaKey,
      api: PROVIDERS.nvidia.api,
      name: PROVIDERS.nvidia.name,
      providerId: PROVIDERS.nvidia.providerId,
      filterEnvKey: PROVIDERS.nvidia.filterEnvKey,
    });
  }

  // 检查 CPA
  const cpaKey = process.env[PROVIDERS.cpa.envKey];
  if (cpaKey) {
    const cpaApi = process.env[PROVIDERS.cpa.envApi] || PROVIDERS.cpa.api;
    configs.push({
      key: cpaKey,
      api: cpaApi,
      name: PROVIDERS.cpa.name,
      providerId: PROVIDERS.cpa.providerId,
      filterEnvKey: PROVIDERS.cpa.filterEnvKey,
    });
  }

  return configs;
}

interface ModelFilters {
  include: string[];
  exclude: string[];
}

function parseModelFilters(filterValue?: string): ModelFilters {
  const filters: ModelFilters = { include: [], exclude: [] };

  if (!filterValue) {
    return filters;
  }

  for (const rawPart of filterValue.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.startsWith("!")) {
      const keyword = part.slice(1).trim().toLowerCase();
      if (keyword) {
        filters.exclude.push(keyword);
      }
      continue;
    }

    filters.include.push(part.toLowerCase());
  }

  return filters;
}

function applyModelFilters(models: Model[], filterValue?: string): Model[] {
  const filters = parseModelFilters(filterValue);
  if (filters.include.length === 0 && filters.exclude.length === 0) {
    return models;
  }

  return models.filter((model) => {
    const id = model.id.toLowerCase();

    if (filters.exclude.some((keyword) => id.includes(keyword))) {
      return false;
    }

    if (filters.include.length === 0) {
      return true;
    }

    return filters.include.some((keyword) => id.includes(keyword));
  });
}

function getFilteredModels(config: ProviderConfig, models: Model[]): Model[] {
  const filterValue = config.filterEnvKey ? process.env[config.filterEnvKey] : undefined;
  return applyModelFilters(models, filterValue);
}

async function fetchModelsFromAPI(config: ProviderConfig): Promise<CPAAPIResponse | null> {
  try {
    const modelsUrl = `${config.api}/v1/models`;

    const response = await fetch(modelsUrl, {
      headers: {
        "Authorization": `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[pi-cpa] fail to fetch models from ${config.name}: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as CPAAPIResponse;
  } catch (error) {
    console.error(`[pi-cpa] Error fetching models from ${config.name}:`, error);
    return null;
  }
}

function parseModels(response: CPAAPIResponse): Model[] {
  const models: Model[] = [];

  if (response.data && Array.isArray(response.data)) {
    for (const model of response.data) {
      models.push({
        id: model.id,
        name: model.name || model.id,
        reasoning: false,
        input: ["text"],
        contextWindow: 128000,
        maxTokens: 16384,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      });
    }
  } else if (response.models && Array.isArray(response.models)) {
    for (const modelId of response.models) {
      models.push({
        id: typeof modelId === "string" ? modelId : modelId.toString(),
        name: typeof modelId === "string" ? modelId : modelId.toString(),
        reasoning: false,
        input: ["text"],
        contextWindow: 128000,
        maxTokens: 16384,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      });
    }
  }

  return models;
}

export default function (pi: ExtensionAPI) {
  const configs = getAllProviderConfigs();

  if (configs.length === 0) {
    console.log("[pi-cpa] enable env: NVIDIA_API_KEY or CPA_KEY");
    return;
  }

  // 注册所有 provider
  for (const config of configs) {
    const baseUrl = `${config.api}/v1`;
    console.log(`[pi-cpa] registering provider: ${config.name}, baseUrl: ${baseUrl}`);

    pi.registerProvider(config.providerId, {
      baseUrl: baseUrl,
      apiKey: config.key,
      api: "openai-completions",
      authHeader: true,
      models: [],
    });
  }

  // session_start 时获取并注册所有 provider 的模型
  pi.on("session_start", async (_event, ctx) => {
    for (const config of configs) {
      const response = await fetchModelsFromAPI(config);

      if (!response) {
        ctx.ui.notify(`[pi-cpa] fetch models failed for ${config.name}`, "error");
        continue;
      }

      const models = parseModels(response);
      const filteredModels = getFilteredModels(config, models);

      if (filteredModels.length === 0) {
        ctx.ui.notify(`[pi-cpa] no models found for ${config.name}`, "error");
        continue;
      }

      const baseUrl = `${config.api}/v1`;
      pi.registerProvider(config.providerId, {
        baseUrl: baseUrl,
        apiKey: config.key,
        api: "openai-completions",
        authHeader: true,
        models: filteredModels,
      });

      ctx.ui.notify(`[pi-cpa] ${config.name}: loaded ${filteredModels.length} models`, "info");
    }
  });

  // 为每个 provider 注册刷新命令
  for (const config of configs) {
    const commandName = `${config.providerId}-refresh`;
    pi.registerCommand(commandName, {
      description: `refresh ${config.name} models`,
      handler: async (_args, ctx) => {
        await ctx.waitForIdle();

        const response = await fetchModelsFromAPI(config);

        if (!response) {
          ctx.ui.notify(`[pi-cpa] fetch models failed for ${config.name}`, "error");
          return;
        }

        const models = parseModels(response);
        const filteredModels = getFilteredModels(config, models);

        if (filteredModels.length === 0) {
          ctx.ui.notify(`[pi-cpa] no models found for ${config.name}`, "error");
          return;
        }

        const baseUrl = `${config.api}/v1`;
        pi.registerProvider(config.providerId, {
          baseUrl: baseUrl,
          apiKey: config.key,
          api: "openai-completions",
          authHeader: true,
          models: filteredModels,
        });

        ctx.ui.notify(`[pi-cpa] ${config.name}: refreshed ${filteredModels.length} models`, "success");
      },
    });
  }
}
