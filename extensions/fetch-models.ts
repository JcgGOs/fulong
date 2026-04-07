/**
 * Fetch Remote Models Extension
 *
 * 自动获取当前 provider 的远程模型列表，无需用户输入
 * 调用 provider 的 /models 端点获取模型并添加到配置
 *
 * Usage:
 *   /fetch-models
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface ModelInfo {
  id: string;
  object: string;
  owned_by?: string;
  ownedBy?: string;
}

interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

function getModelsPath(cwd: string): string {
  const projectModels = join(cwd, ".pi", "models.json");
  const globalModels = join(
    process.env.PI_CODING_AGENT_DIR ||
      join(process.env.HOME || process.env.USERPROFILE || "", ".pi", "agent"),
    "models.json",
  );

  // 优先使用项目级配置
  if (existsSync(projectModels)) {
    return projectModels;
  }
  return globalModels;
}

function loadSettings(settingsPath: string): any {
  try {
    if (existsSync(settingsPath)) {
      return JSON.parse(readFileSync(settingsPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return {};
}

function saveSettings(settingsPath: string, settings: any): void {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

export default function fetchModelsExtension(pi: ExtensionAPI) {
  pi.registerCommand("fetch-models", {
    description: "Fetch remote models from current provider",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("This command requires interactive mode", "error");
        return;
      }

      const cwd = ctx.cwd;

      // Get current model
      const currentModel = ctx.model;
      if (!currentModel) {
        ctx.ui.notify("No model selected", "error");
        return;
      }

      const providerName = currentModel.provider;
      const baseUrl = currentModel.baseUrl;

      if (!baseUrl) {
        ctx.ui.notify(
          `Provider "${providerName}" has no baseUrl configured`,
          "error",
        );
        return;
      }

      // Construct models URL
      const modelsUrl = baseUrl.replace(/\/$/, "") + "/models";
      // Get API key once
      let apiKey = "";
      try {
        apiKey = await ctx.modelRegistry.getApiKey(currentModel);
      } catch (e) {
        // Ignore
      }

      ctx.ui.notify(`Fetching models from ${providerName}...`, "info");

      let models: ModelInfo[];
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        // Add Anthropic-specific headers
        if (providerName.includes("anthropic")) {
          if (apiKey) {
            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";
          }
        }

        const response = await fetch(modelsUrl, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          ctx.ui.notify(
            `Failed: ${response.status} ${response.statusText}\n${errorText}`,
            "error",
          );
          return;
        }

        const data = (await response.json()) as ModelsResponse;

        if (!data.data || !Array.isArray(data.data)) {
          ctx.ui.notify("Invalid response: missing 'data' array", "error");
          return;
        }

        models = data.data;
      } catch (err) {
        ctx.ui.notify(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
        return;
      }

      if (models.length === 0) {
        ctx.ui.notify("No models found", "info");
        return;
      }

      // 获取本地已存在的模型
      const modelsPath = getModelsPath(cwd);
      const modelsData = loadSettings(modelsPath);
      const localModelIds = new Set<string>();
      if (modelsData.providers && modelsData.providers[providerName]) {
        const localModels = modelsData.providers[providerName].models || [];
        for (const m of localModels) {
          localModelIds.add(m.id);
        }
      }

      // 标记已存在的模型
      const displayModels: { info: ModelInfo; exists: boolean }[] = [];
      for (const m of models) {
        const existsInRegistry = ctx.modelRegistry.find(providerName, m.id);
        const existsLocally = localModelIds.has(m.id);
        const exists = existsInRegistry || existsLocally;
        displayModels.push({ info: m, exists });
      }

      // 显示所有模型，已存在的加 *
      const modelItems = displayModels.map(
        (m) => `${m.exists ? "* " : ""}${m.info.id} (${m.info.owned_by || m.info.ownedBy || "unknown"})`,
      );
      const selected = await ctx.ui.select("Select model to add (* = already exists)", modelItems);

      if (selected === undefined) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }

      const selectedModelId = selected.replace("* ", "").split(" (")[0].trim();

      // Determine API type
      let apiType = "openai-responses";
      const lowerUrl = baseUrl.toLowerCase();
      if (lowerUrl.includes("anthropic") || lowerUrl.includes("claude")) {
        apiType = "anthropic-messages";
      } else if (lowerUrl.includes("google") || lowerUrl.includes("gemini")) {
        apiType = "google-generativelanguage";
      }

      // 初始化 providers 对象 (apiKey 已在上方获取)
      if (!modelsData.providers) {
        modelsData.providers = {};
      }

      // 确保 provider 存在
      if (!modelsData.providers[providerName]) {
        modelsData.providers[providerName] = {
          baseUrl: baseUrl,
          api: apiType,
          apiKey: apiKey,
          models: [],
        };
      }

      // 检查模型是否已存在
      const existingModels = modelsData.providers[providerName].models || [];
      const modelExists = existingModels.some((m: any) => m.id === selectedModelId);

      if (!modelExists) {
        // 添加新模型
        modelsData.providers[providerName].models.push({
          id: selectedModelId,
        });
      }

      saveSettings(modelsPath, modelsData);
      ctx.ui.notify(`Saved to ${modelsPath}`, "success");

      ctx.ui.notify(`Added ${providerName}/${selectedModelId}`, "success");
      ctx.ui.notify(`Please restart pi to use the new model`, "info");
    },
  });
}
