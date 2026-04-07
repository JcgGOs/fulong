#!/usr/bin/env tsx
/**
 * 飞书消息机器人 CLI
 * 
 * 配置文件: .fsbot.json
 * {
 *   "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxx",
 *   "secret": "可选，签名密钥"
 * }
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import * as crypto from "crypto";

interface FsbotConfig {
  webhook: string;
  secret?: string;
}

// 加载配置
function loadConfig(): FsbotConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [
    resolve(cwd, ".fsbot.json"),
    resolve(home, ".fsbot.json"),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, "utf-8"));
      } catch { continue; }
    }
  }
  return null;
}

const config = loadConfig();
if (!config?.webhook) {
  console.error("❌ 错误: 缺少配置。请创建 .fsbot.json 文件:");
  console.error('   {"webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"}');
  process.exit(1);
}

// 发送请求
async function send(content: object): Promise<boolean> {
  let url = config.webhook;
  let body: any = content;

  // 如果有 secret，添加签名
  if (config.secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `${timestamp}\n${config.secret}`;
    const hmac = crypto.createHmac("sha256", config.secret);
    hmac.update(stringToSign);
    const sign = hmac.digest("base64");
    
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });

  const result = await res.json();
  if (result.code === 0 || result.StatusCode === 0) {
    console.log("✅ 发送成功");
    return true;
  } else {
    console.error("❌ 发送失败:", result);
    return false;
  }
}

// ============ 消息类型 ============

// 发送文本消息
async function sendText(text: string) {
  await send({
    msg_type: "text",
    content: { text },
  });
}

// 发送富文本消息
async function sendPost(title: string, content: string[]) {
  const elements = content.map(line => ({
    tag: "text",
    text: line,
  }));
  
  await send({
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title,
          content: [[{ tag: "text", text: content.join("\n") }]],
        },
      },
    },
  });
}

// 发送卡片消息
async function sendCard(card: {
  header?: { title: string; color?: string };
  elements: Array<{ tag: string; [key: string]: any }>;
}) {
  const payload = {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: card.header ? {
        title: { tag: "plain_text", content: card.header.title },
        color: card.header.color || "blue",
      } : undefined,
      elements: card.elements,
    },
  };
  
  // 移除 undefined 字段
  payload.card.header || delete payload.card.header;
  
  await send(payload);
}

// ============ 预设模板 ============

// Jenkins 构建通知
async function jenkinsNotify(job: string, build: string, status: string, url: string, duration?: string) {
  const color = status.includes("成功") || status.includes("SUCCESS") || status.includes("成功")
    ? "green" : status.includes("失败") || status.includes("FAILURE") ? "red" : "yellow";
  
  await sendCard({
    header: { title: `🏗️ ${job}`, color },
    elements: [
      { tag: "div", text: { tag: "lark_md", content: `**构建号:** ${build}` } },
      { tag: "div", text: { tag: "lark_md", content: `**状态:** ${status}` } },
      ...(duration ? [{ tag: "div", text: { tag: "lark_md", content: `**耗时:** ${duration}` } }] : []),
      { tag: "div", text: { tag: "lark_md", content: `**链接:** [点击查看](${url})` } },
      { tag: "hr" },
      { tag: "note", text: { tag: "plain_text", content: `发送时间: ${new Date().toLocaleString()}` } },
    ],
  });
}

// 通用通知
async function notify(title: string, message: string, type: "success" | "error" | "warning" | "info" = "info") {
  const colors = { success: "green", error: "red", warning: "yellow", info: "blue" };
  
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  
  await sendCard({
    header: { title: `${icons[type]} ${title}`, color: colors[type] },
    elements: [
      { tag: "div", text: { tag: "lark_md", content: message } },
      { tag: "hr" },
      { tag: "note", text: { tag: "plain_text", content: `发送时间: ${new Date().toLocaleString()}` } },
    ],
  });
}

// ============ 帮助 ============

function help() {
  console.log(`
📮 飞书机器人 CLI

📁 配置文件: .fsbot.json
   {"webhook": "https://.../hook/xxxx", "secret": "签名密钥"}

📋 命令:
   text <消息>              发送文本消息
   post <标题> <内容>       发送富文本消息 (内容用 | 分行)
   card                     发送卡片消息
   jenkins <job> <#build> <状态> <url> [耗时]  Jenkins构建通知
   notify <标题> <消息> [类型] 通用通知 (success|error|warning|info)

📝 示例:
   fsbot text "Hello World"
   fsbot post "标题" "第一行|第二行|第三行"
   fsbot jenkins "bc-account" "#2358" "成功" "https://..." "2m30s"
   fsbot notify "部署完成" "bc-account 已成功部署到测试环境" "success"
`);
}

// ============ 主入口 ============

const [, , action, ...args] = process.argv;

const commands: Record<string, () => void> = {
  text: () => {
    if (!args[0]) { help(); return; }
    sendText(args.join(" ")).catch(console.error);
  },
  post: () => {
    if (!args[0]) { help(); return; }
    const [title, ...content] = args;
    const lines = content.join("|").split("|");
    sendPost(title, lines).catch(console.error);
  },
  card: () => {
    if (!args[0]) { help(); return; }
    try {
      const card = JSON.parse(args.join(" "));
      sendCard(card).catch(console.error);
    } catch (e) {
      console.error("JSON 格式错误");
    }
  },
  jenkins: () => {
    if (args.length < 4) { help(); return; }
    const [job, build, status, url, duration] = args;
    jenkinsNotify(job, build, status, url, duration).catch(console.error);
  },
  notify: () => {
    if (args.length < 2) { help(); return; }
    const [title, message, type] = args;
    notify(title, message, type as any || "info").catch(console.error);
  },
};

if (commands[action || ""]) {
  commands[action || ""]();
} else {
  help();
}
