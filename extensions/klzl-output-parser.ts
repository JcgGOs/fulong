import type {
  ExtensionAPI,
  AssistantMessageEvent,
} from "@mariozechner/pi-coding-agent";

/**
 * KLZL 模型输出解析器扩展
 *
 * 功能：当使用 klzl/* 开头的模型时，自动解析其复杂的嵌套 JSON 输出，
 * 提取纯净的 Markdown 内容。
 */

export default function (pi: ExtensionAPI) {
  // 检查是否是 klzl 模型
  function isKlzlModel(modelName: string): boolean {
    return modelName?.toLowerCase().startsWith("klzl") ?? false;
  }

  /**
   * 递归解压嵌套的 JSON 结构
   * 处理 klzl 模型特有的多层嵌套 {"items":[{"type":"text","Item":{"Text":"..."}}]} 格式
   */
  function recursiveUnwrap(
    input: string,
    depth: number = 0,
    maxDepth: number = 100,
  ): { text: string; depth: number } {
    if (depth >= maxDepth) {
      return { text: input, depth };
    }

    let current = input.trim();

    // 如果不是 JSON 结构（不以 { 或 [ 开头），说明是真实内容
    if (!current.startsWith("{") && !current.startsWith("[")) {
      return { text: current, depth };
    }

    // 如果包含转义字符，先反转义一层
    if (
      current.includes('\\"') ||
      current.includes("\\n") ||
      current.includes("\\t")
    ) {
      const unescaped = unescapeByLevel(current, 1);
      if (unescaped !== current) {
        return recursiveUnwrap(unescaped, depth + 1, maxDepth);
      }
    }

    // 尝试提取 Text 字段
    const extracted = extractTextFromLLMOutput(current);

    if (extracted.found) {
      const inner = extracted.text.trim();
      // 检查提取的内容是否是真实内容（非JSON结构）
      if (!inner.startsWith("{") && !inner.startsWith("[")) {
        return { text: inner, depth: depth + 1 };
      }
      // 还是 JSON 结构，继续递归
      const result = recursiveUnwrap(extracted.text, depth + 1, maxDepth);
      return result;
    }

    // 无法继续解压，返回当前内容
    return { text: current, depth };
  }

  /**
   * 从 LLM 输出中提取 "Text" 后面的文本内容
   */
  function extractTextFromLLMOutput(input: string): {
    text: string;
    found: boolean;
    method?: string;
  } {
    const result = { text: "", found: false, method: "" };
    let current = input.trim();

    // 方法1: 完整 JSON 解析（最可靠，优先尝试）
    try {
      const parsed = JSON.parse(current);
      if (parsed.items && Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          if (item.type === "text" && item.Item?.Text !== undefined) {
            result.text = String(item.Item.Text);
            result.found = true;
            result.method = "parsed_items";
            return result;
          }
        }
      }
      if (parsed.Text !== undefined) {
        result.text = String(parsed.Text);
        result.found = true;
        result.method = "parsed_direct";
        return result;
      }
    } catch (e) {
      // JSON 解析失败，继续用其他方法
    }

    // 方法2: 如果包含转义字符，先反转义再试
    if (current.includes('\\"') || current.includes("\\n")) {
      const unescaped = unescapeByLevel(current, 1);
      if (unescaped !== current) {
        try {
          const parsed = JSON.parse(unescaped);
          if (parsed.items && Array.isArray(parsed.items)) {
            for (const item of parsed.items) {
              if (item.type === "text" && item.Item?.Text !== undefined) {
                result.text = String(item.Item.Text);
                result.found = true;
                result.method = "parsed_unescaped";
                return result;
              }
            }
          }
        } catch (e) {
          // 继续下一步
        }
      }
    }

    // 方法3: 平衡引号匹配（最后的备选）
    const textFieldMatch = current.match(/"Text"\s*:\s*"/);
    if (textFieldMatch) {
      const startIdx = textFieldMatch.index! + textFieldMatch[0].length;
      let endIdx = startIdx;
      let escaped = false;

      while (endIdx < current.length) {
        const char = current[endIdx];
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          break;
        }
        endIdx++;
      }

      result.text = current.substring(startIdx, endIdx);
      result.found = true;
      result.method = "balanced_quotes";
      return result;
    }

    return result;
  }

  /**
   * 反转义指定层数
   */
  function unescapeByLevel(str: string, level: number = 1): string {
    let result = str;
    for (let i = 0; i < level; i++) {
      result = result
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\\\/g, "\\");
    }
    return result;
  }

  /**
   * 最终清理
   */
  function finalCleanup(text: string): string {
    return text
      .replace(/\\n/g, "\n")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * 解析 klzl 模型的输出
   */
  function parseKlzlOutput(input: any): {
    success: boolean;
    markdown: string;
    metadata: any;
  } {
    try {
      const inputStr =
        typeof input === "string" ? input : JSON.stringify(input);
      const unwrapped = recursiveUnwrap(inputStr);
      const cleaned = finalCleanup(unwrapped.text);

      return {
        success: true,
        markdown: cleaned,
        metadata: {
          nestingDepth: unwrapped.depth,
          originalLength: inputStr.length,
          finalLength: cleaned.length,
          compressionRatio:
            ((1 - cleaned.length / inputStr.length) * 100).toFixed(1) + "%",
        },
      };
    } catch (error) {
      return {
        success: false,
        markdown: typeof input === "string" ? input : JSON.stringify(input),
        metadata: { error: String(error) },
      };
    }
  }

  // 监听消息结束事件，解析完整的 klzl 输出
  pi.on("message_end", async (event, ctx) => {
    const model = ctx.model;
    if (!model || !isKlzlModel(model.id)) {
      return;
    }

    const message = event.message;
    if (message.role !== "assistant" || !message.content) {
      return;
    }

    const textContent = message.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    if (textContent && textContent.trim().startsWith("{")) {
      try {
        const parsed = parseKlzlOutput(textContent);
        if (parsed.success && parsed.metadata.nestingDepth > 0) {
          message.content = [{ type: "text", text: parsed.markdown }];
          (message as any).details = {
            ...(message as any).details,
            klzlParsed: true,
            klzlMetadata: parsed.metadata,
          };
        }
      } catch (e) {
        console.error("parse error in message_end:", e);
      }
    }
  });

  // 注册一个命令用于手动触发解析（调试用）
  // pi.registerCommand("klzl-parse", {
  //   description: "手动解析剪贴板中的 KLZL 格式内容",
  //   handler: async (args, ctx) => {
  //     ctx.ui.notify("KLZL Output Parser 已加载", "info");
  //     ctx.ui.notify("当使用 klzl/* 模型时，输出将自动解析", "info");
  //   }
  // });

  // 会话启动时显示提示
  pi.on("session_start", async (_event, ctx) => {
    const model = ctx.model;
    if (model && isKlzlModel(model.id)) {
      ctx.ui.notify(`detect: ${model.id}，auto parse`, "info");
    }
  });

  // 模型切换时检测
  // pi.on("model_select", async (event, ctx) => {
  //   if (isKlzlModel(event.model.id)) {
  //     ctx.ui.notify(
  //       `已切换到 KLZL 模型: ${event.model.id}，输出将自动解析`,
  //       "info",
  //     );
  //   }
  // });
}
