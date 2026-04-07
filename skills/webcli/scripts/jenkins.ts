#!/usr/bin/env tsx
/**
 * Jenkins CLI - Jenkins REST API + 飞书通知
 * 
 * 配置: .jenkins.json + .fsbot.json (可选)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const origEmitWarning = process.emitWarning.bind(process);
(process.emitWarning as any) = (warning: any, ...args: any[]) => {
  if (typeof warning === "string" && warning.includes("NODE_TLS_REJECT_UNAUTHORIZED")) return;
  origEmitWarning(warning, ...args);
};

import { readFileSync, existsSync } from "fs";
import * as os from "os";
import { resolve } from "path";

function homedir() { return os.homedir(); }

// ============ 配置 ============
interface JenkinsConfig {
  baseUrl: string;
  username?: string;
  token: string;
  timeout?: number;
  tasks?: Record<string, { job: string; params?: Record<string, string>; timeout?: number }>;
}

interface FsbotConfig {
  webhook: string;
  secret?: string;
}

function loadConfig<T>(name: string): T | null {
  for (const p of [resolve(process.cwd(), name), resolve(homedir(), name)]) {
    if (existsSync(p)) {
      try { return JSON.parse(readFileSync(p, "utf-8")); } catch {}
    }
  }
  return null;
}

const config = loadConfig<JenkinsConfig>(".jenkins.json")!;
if (!config?.baseUrl) { console.error("❌ 缺少 .jenkins.json 配置"); process.exit(1); }
const timeout = config.timeout || 600;
const fsbot = loadConfig<FsbotConfig>(".fsbot.json");

// ============ HTTP ============
function auth() { return `Basic ${Buffer.from(`${config.username}:${config.token}`).toString("base64")}`; }

async function request<T = any>(path: string): Promise<T> {
  const base = config.baseUrl.replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, { headers: { Authorization: auth(), Accept: "application/json" } });
  return res.json();
}

// ============ 飞书通知 ============
async function sendNotify(job: string, build: string, status: string, url: string, duration?: string) {
  if (!fsbot?.webhook) { console.log(`📱 ${status} - ${job} ${build}`); return; }
  
  const color = status.includes("成功") ? "green" : status.includes("失败") || status.includes("FAILURE") ? "red" : "yellow";
  await fetch(fsbot.webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "interactive",
      card: {
        config: { wide_screen_mode: true },
        header: { title: { tag: "plain_text", content: `🏗️ ${job}` }, color },
        elements: [
          { tag: "div", text: { tag: "lark_md", content: `**构建:** ${build}` } },
          { tag: "div", text: { tag: "lark_md", content: `**状态:** ${status}` } },
          ...(duration ? [{ tag: "div", text: { tag: "lark_md", content: `**耗时:** ${duration}` } }] : []),
          { tag: "div", text: { tag: "lark_md", content: `**链接:** [查看](${url})` } },
          { tag: "hr" },
          { tag: "note", text: { tag: "plain_text", content: new Date().toLocaleString() } },
        ],
      },
    }),
  });
  console.log("📱 飞书通知已发送");
}

// ============ 核心: 触发并监控构建 ============
async function build(name: string, params?: Record<string, string>, customTimeout?: number) {
  const path = name.split("/").filter(Boolean).map(p => `/job/${encodeURIComponent(p)}`).join("");
  const taskTimeout = customTimeout || timeout;
  console.log(`触发: ${name}${params ? ` (${JSON.stringify(params)})` : ""}`);

  // 触发构建
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}${path}${params ? "/buildWithParameters" : "/build"}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });

  // 从队列获取构建号
  let buildNum: number;
  const location = res.headers.get("location");
  if (location?.includes("/queue/")) {
    await new Promise(r => setTimeout(r, 2000));
    const queueId = location.match(/\/queue\/item\/(\d+)/)?.[1];
    const queueData = await request<any>(`/queue/item/${queueId}/api/json`);
    buildNum = queueData?.executable?.number;
  }

  // fallback: 使用 lastBuild
  if (!buildNum) {
    await new Promise(r => setTimeout(r, 5000));
    const data = await request<any>(`${path}/lastBuild/api/json?tree=number`);
    buildNum = data?.number || 0;
  }

  console.log(`Build #${buildNum} 进行中... (超时: ${taskTimeout}s)`);
  const start = Date.now();
  const maxTime = taskTimeout * 1000;

  while (Date.now() - start < maxTime) {
    const data = await request<any>(`${path}/${buildNum}/api/json?tree=number,result,building`);
    if (data && !data.building) {
      const result = data.result === "SUCCESS" ? "成功" : "失败";
      console.log(`#${buildNum} ${result} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      await sendNotify(name, `#${buildNum}`, result, `${config.baseUrl}${path}/${buildNum}/`, `${((Date.now() - start) / 1000).toFixed(1)}s`);
      return;
    }
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`\n#${buildNum} 超时 (${taskTimeout}s)`);
  await sendNotify(name, `#${buildNum}`, "超时", `${config.baseUrl}${path}/${buildNum}/`);
}

// ============ 命令 ============
const cmds: Record<string, () => void> = {
  alias: () => {
    const t = config.tasks?.[args[0]];
    if (!t) { console.log(`❌ 未找到: ${args[0]}\n可用: ${Object.keys(config.tasks || {}).join(", ")}`); return; }
    const taskTimeout = t.timeout || timeout;
    build(t.job, t.params, taskTimeout).catch(console.error);
  },
  search: () => request<any>(`/search/suggest?query=${args[0]}`).then(d => d.suggestions?.forEach((s: any) => console.log(`${s.name.replace(/.*» /, "")}  ${s.url.replace(config.baseUrl, "")}`))),
  jobs: () => {
    async function listFolder(path: string) {
      const data = await request<any>(`${path}/api/json?tree=jobs[name,color,_class]`);
      return (data?.jobs || []).map((j: any) => {
        const fullName = path ? `${path.replace("/job/", "").replace(/\/job\//g, "/")}/${j.name}` : j.name;
        if (j._class?.includes("Folder")) {
          return { type: "folder", name: j.name, path: fullName, children: null };
        }
        return { type: "job", name: j.name, path: fullName, status: j.color };
      });
    }
    async function expandFolder(path: string): Promise<any[]> {
      const data = await request<any>(`${path}/api/json?tree=jobs[name,color,_class]`);
      const result: any[] = [];
      for (const j of data?.jobs || []) {
        const fullName = path.replace("/job/", "").replace(/\/job\//g, "/") + "/" + j.name;
        if (j._class?.includes("Folder")) {
          result.push({ type: "folder", name: j.name, path: fullName });
          result.push(...await expandFolder(`${path}/job/${encodeURIComponent(j.name)}`));
        } else {
          result.push({ type: "job", name: j.name, path: fullName, status: j.color });
        }
      }
      return result;
    }
    expandFolder("").then(items => console.log(JSON.stringify(items, null, 2))).catch(console.error);
  },
  info: () => request<any>(`${buildJobPath(args[0])}/api/json`).then(d => { if (d?.name) console.log(`${d.name} | ${externalUrl(d.url)}`); else console.log("不存在"); }),
  params: () => request<any>(`${buildJobPath(args[0])}/api/json?tree=property[parameterDefinitions[name,description,type,choices,defaultValue,defaultParameterValue]]`).then(d => {
    const params = d?.property?.flatMap((p: any) => p.parameterDefinitions || []).map((p: any) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      defaultValue: p.defaultParameterValue?.value || p.defaultValue,
      choices: p.choices
    }));
    console.log(JSON.stringify(params, null, 2));
  }),
  build: () => { const p: Record<string, string> = {}; args.slice(1).forEach((a, i, arr) => { if (a === "-p" && arr[i+1]) { const [k,v] = arr[i+1].split("="); p[k] = v; } }); build(args[0], Object.keys(p).length ? p : undefined).catch(console.error); },
  status: () => request<any>(`${buildJobPath(args[0])}/${args[1] || "lastBuild"}/api/json?tree=number,result,building,url`).then(d => console.log(`#${d.number} ${d.result || (d.building ? "进行中" : "完成")} | ${externalUrl(d.url)}`)),
  log: () => fetch(`${config.baseUrl.replace(/\/$/, "")}${buildJobPath(args[0])}/${args[1] || "lastBuild"}/consoleText`, { headers: { Authorization: auth() } }).then(r => r.text()).then(console.log),
  tasks: () => Object.entries(config.tasks || {}).forEach(([n, t]) => console.log(`  ${n} -> ${t.job}${t.params ? ` (${JSON.stringify(t.params)})` : ""}`)),
  help: () => console.log(`
🔧 Jenkins CLI (timeout: ${timeout}s)

配置: .jenkins.json + .fsbot.json (可选)

命令:
  search <q>    搜索 jobs
  jobs          列出 jobs
  info <job>    job 详情
  params <job> 参数定义
  build <job> [-p k=v]  触发构建
  status <job> [num]    状态
  log <job> [num]       日志
  tasks         已配置任务
  alias <name>  执行任务
`),
};

function buildJobPath(name: string) { return name.split("/").filter(Boolean).map(p => `/job/${encodeURIComponent(p)}`).join(""); }
function externalUrl(url: string | undefined) { return (url || "").replace(/http:\/\/172\.16\.\d+\.\d+:\d+|http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+/g, config.baseUrl); }
function getStatusIcon(color?: string) { return color?.includes("blue") ? "[OK]" : color?.includes("red") ? "[FAIL]" : color?.includes("yellow") ? "[WARN]" : color?.includes("anime") ? "[RUN]" : "[---]"; }

const [, , action, ...args] = process.argv;
(cmds[action] || cmds.help)();
