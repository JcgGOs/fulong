#!/usr/bin/env tsx
/**
 * GitLab CLI - 极简 GitLab API 工具
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

interface ServiceConfig {
  baseUrl: string;
  token?: string;
}

function loadConfig(): ServiceConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [
    resolve(cwd, ".gitlab.json"),
    resolve(home, ".gitlab.json"),
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
    "Error: Missing config. Create .gitlab.json with baseUrl and token.",
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
    headers["PRIVATE-TOKEN"] = config.token;
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

async function projects() {
  const projects = await _request("GET", "api/v4/projects?membership=true");
  console.log(JSON.stringify(projects, null, 2));
}

async function createProject(name: string, options?: { namespace_id?: number; visibility?: string }) {
  const result = await _request("POST", "api/v4/projects", {
    name,
    ...options,
  });
  console.log("Project created:", result);
}

async function issues(projectId?: string) {
  const path = projectId
    ? `api/v4/projects/${encodeURIComponent(projectId)}/issues`
    : "api/v4/issues";
  const issues = await _request("GET", path);
  console.log(JSON.stringify(issues, null, 2));
}

// CLI
const [,, action, ...args] = process.argv;

switch (action) {
  case "projects":
    projects().catch(console.error);
    break;
  case "project":
    if (!args[0]) {
      console.error("Usage: npx tsx gitlab.ts project <name> [options-json]");
      process.exit(1);
    }
    const opts = args[1] ? JSON.parse(args[1]) : {};
    createProject(args[0], opts).catch(console.error);
    break;
  case "issues":
    issues(args[0]).catch(console.error);
    break;
  default:
    console.log("Usage: npx tsx gitlab.ts <action> [args]");
    console.log("Actions: projects, project <name>, issues [projectId]");
}
