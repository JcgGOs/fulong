/**
 * CPA (Custom Provider API) Plugin
 *
 * 动态从自定义 API 获取模型列表并注册为 pi provider
 *
 * 环境变量:
 *   CPA_KEY   - API 密钥 (如: sk-1234)
 *   CPA_API   - API 基础地址 (如: https://example:1234)
 *
 * 使用方式:
 *   1. 设置环境变量后启动 pi
 *   2. 使用 /model 选择 cpa 下的模型
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";

interface CPAConfig {
  key: string;
  api: string;
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

function getConfig(): CPAConfig | null {
  const key = process.env.CPA_KEY;
  const api = process.env.CPA_API;

  if (!key || !api) {
    return null;
  }

  return { key, api };
}

async function fetchModelsFromAPI(config: CPAConfig): Promise<CPAAPIResponse | null> {
  try {
    // 获取模型列表: baseUrl + /v1/models
    const modelsUrl = `${config.api}/v1/models`;

    const response = await fetch(modelsUrl, {
      headers: {
        "Authorization": `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[pi-cpa] fail to fetch models: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as CPAAPIResponse;
  } catch (error) {
    console.error(`[pi-cpa] Error fetching models:`, error);
    return null;
  }
}

function parseModels(response: CPAAPIResponse): Model[] {
  const models: Model[] = [];

  // 支持 OpenAI 格式的响应
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
  }
  // 支持简单数组格式
  else if (response.models && Array.isArray(response.models)) {
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
  const config = getConfig();

  if (!config) {
    console.log("[pi-cpa] enable env: CPA_KEY 和 CPA_API");
    return;
  }

  // 请求地址: baseUrl + /v1
  const baseUrl = `${config.api}/v1`;
  console.log(`[pi-cpa] baseUrl: ${baseUrl}`);

  // 注册 provider
  pi.registerProvider("cpa", {
    baseUrl: baseUrl,
    apiKey: config.key,
    api: "openai-completions",
    authHeader: true,
    models: [],
  });

  // session_start 时获取并注册模型
  pi.on("session_start", async (_event, ctx) => {
    const response = await fetchModelsFromAPI(config);

    if (!response) {
      ctx.ui.notify("[pi-cpa] fetch models failed", "error");
      return;
    }

    const models = parseModels(response);

    if (models.length === 0) {
      ctx.ui.notify("[pi-cpa] not found", "error");
      return;
    }

    // 重新注册 provider,填充模型列表
    pi.registerProvider("cpa", {
      baseUrl: baseUrl,
      apiKey: config.key,
      api: "openai-completions",
      authHeader: true,
      models,
    });

    const modelNames = models.map(m => m.id).join(", ");
    ctx.ui.notify(`[pi-cpa] load ${models.length} models: ${modelNames.slice(0, 100)}${modelNames.length > 100 ? "..." : ""}`, "info");
  });

  // 注册刷新模型列表的命令
  pi.registerCommand("cpa-refresh", {
    description: "refresh models",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle();

      const response = await fetchModelsFromAPI(config);

      if (!response) {
        ctx.ui.notify("[pi-cpa] fetch models failed", "error");
        return;
      }

      const models = parseModels(response);

      if (models.length === 0) {
        ctx.ui.notify("[pi-cpa] model not found", "error");
        return;
      }

      pi.registerProvider("cpa", {
        baseUrl: baseUrl,
        apiKey: config.key,
        api: "openai-completions",
        authHeader: true,
        models,
      });

      const modelNames = models.map(m => m.id).join(", ");
      ctx.ui.notify(`[pi-cpa] refresh ${models.length} models`, "success");
    },
  });

}
