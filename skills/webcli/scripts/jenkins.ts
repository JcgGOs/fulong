#!/usr/bin/env tsx
/**
 * Jenkins CLI - 极简 Jenkins API 工具
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

interface ServiceConfig {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
}

function loadConfig(): ServiceConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [
    resolve(cwd, ".jenkins.json"),
    resolve(home, ".jenkins.json"),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8");
        return JSON.parse(content);
      } catch {
        continue;
      }
    }
  }
  return null;
}

const config = loadConfig();
if (!config?.baseUrl) {
  console.error(
    "Error: Missing config. Create .jenkins.json with baseUrl and token/username/password.",
  );
  process.exit(1);
}

async function _request(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  } else if (config.username && config.password) {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    headers.Authorization = `Basic ${auth}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  if (res.status === 204) {
    return {};
  }

  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

async function list() {
  const jobs = await _request("GET", "api/json?tree=jobs[name,url,color]");
  console.log(JSON.stringify(jobs, null, 2));
}

async function build(job: string, params?: Record<string, string>) {
  const path = params
    ? `job/${job}/buildWithParameters`
    : `job/${job}/build`;
  const result = await _request("POST", path, params || {});
  console.log("Build triggered:", job);
  return result;
}

async function status(job: string) {
  const info = await _request("GET", `job/${job}/api/json`);
  console.log(JSON.stringify(info, null, 2));
}

// CLI
const [,, action, ...args] = process.argv;

switch (action) {
  case "list":
    list().catch(console.error);
    break;
  case "build":
    if (!args[0]) {
      console.error("Usage: npx tsx jenkins.ts build <job> [params-json]");
      process.exit(1);
    }
    const params = args[1] ? JSON.parse(args[1]) : undefined;
    build(args[0], params).catch(console.error);
    break;
  case "status":
    if (!args[0]) {
      console.error("Usage: npx tsx jenkins.ts status <job>");
      process.exit(1);
    }
    status(args[0]).catch(console.error);
    break;
  default:
    console.log("Usage: npx tsx jenkins.ts <action> [args]");
    console.log("Actions: list, build <job>, status <job>");
}
