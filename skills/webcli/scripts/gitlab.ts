#!/usr/bin/env tsx
/**
 * GitLab CLI - GitLab REST API 工具
 * Usage: npx tsx gitlab.ts <action> [args]
 *
 * API Docs: https://docs.gitlab.com/api/rest/
 *
 * 配置文件: 当前目录或用户主目录下的 .gitlab.json
 * {
 *   "baseUrl": "https://gitlab.com",
 *   "token": "your-token-here"
 * }
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

interface GitLabConfig {
  baseUrl: string;
  token: string;
}

function loadConfig(): GitLabConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [resolve(cwd, ".gitlab.json"), resolve(home, ".gitlab.json")];

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

// ==================== User ====================

async function user() {
  const data = await _request("GET", "api/v4/user");
  console.log(JSON.stringify(data, null, 2));
}

async function users(search?: string) {
  const url = search ? `api/v4/users?search=${encodeURIComponent(search)}` : "api/v4/users";
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function currentUser() {
  const data = await _request("GET", "api/v4/user");
  console.log(JSON.stringify(data, null, 2));
}

// ==================== Projects ====================

async function projects(opts?: { owned?: boolean; search?: string; page?: number; perPage?: number }) {
  const params = [];
  if (opts?.owned) params.push("owned=true");
  if (opts?.search) params.push(`search=${encodeURIComponent(opts.search)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  if (opts?.perPage) params.push(`per_page=${opts.perPage}`);
  const url = `api/v4/projects${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function project(id: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(id)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createProject(name: string, opts?: { 
  namespaceId?: number; 
  description?: string; 
  visibility?: "public" | "private" | "internal";
  readme?: boolean;
}) {
  const data = await _request("POST", "api/v4/projects", {
    name,
    namespace_id: opts?.namespaceId,
    description: opts?.description,
    visibility: opts?.visibility || "private",
    initialize_with_readme: opts?.readme ?? true,
  });
  console.log("Created:", (data as Record<string, unknown>).path_with_namespace);
}

async function updateProject(id: string, opts: Record<string, unknown>) {
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(id)}`, opts);
  console.log("Updated:", (data as Record<string, unknown>).path_with_namespace);
}

async function deleteProject(id: string) {
  await _request("DELETE", `api/v4/projects/${encodeURIComponent(id)}`);
  console.log("Deleted:", id);
}

async function forkProject(id: string, opts?: { namespace?: string; name?: string }) {
  const body: Record<string, string> = {};
  if (opts?.namespace) body.namespace = opts.namespace;
  if (opts?.name) body.name = opts.name;
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(id)}/fork`, body);
  console.log("Forked:", (data as Record<string, unknown>).path_with_namespace);
}

// ==================== Repository ====================

async function branches(projectId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`);
  console.log(JSON.stringify(data, null, 2));
}

async function branch(projectId: string, branchName: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branchName)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createBranch(projectId: string, branch: string, ref: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`, {
    branch,
    ref,
  });
  console.log("Created branch:", (data as Record<string, unknown>).name);
}

async function deleteBranch(projectId: string, branchName: string) {
  await _request("DELETE", `api/v4/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branchName)}`);
  console.log("Deleted branch:", branchName);
}

async function protectBranch(projectId: string, branchName: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/protected_branches`, {
    name: branchName,
  });
  console.log("Protected branch:", (data as Record<string, unknown>).name);
}

async function tags(projectId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/tags`);
  console.log(JSON.stringify(data, null, 2));
}

async function createTag(projectId: string, tagName: string, ref: string, message?: string) {
  const body: Record<string, string> = { tag_name: tagName, ref };
  if (message) body.message = message;
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/repository/tags`, body);
  console.log("Created tag:", (data as Record<string, unknown>).name);
}

async function deleteTag(projectId: string, tagName: string) {
  await _request("DELETE", `api/v4/projects/${encodeURIComponent(projectId)}/repository/tags/${encodeURIComponent(tagName)}`);
  console.log("Deleted tag:", tagName);
}

// ==================== Commits ====================

async function commits(projectId: string, opts?: { refName?: string; path?: string; page?: number }) {
  const params = [];
  if (opts?.refName) params.push(`ref_name=${encodeURIComponent(opts.refName)}`);
  if (opts?.path) params.push(`path=${encodeURIComponent(opts.path)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/projects/${encodeURIComponent(projectId)}/repository/commits${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function commit(projectId: string, sha: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/commits/${sha}`);
  console.log(JSON.stringify(data, null, 2));
}

async function commitDiff(projectId: string, sha: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/commits/${sha}/diff`);
  console.log(JSON.stringify(data, null, 2));
}

// ==================== Files ====================

async function file(projectId: string, filePath: string, ref: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createFile(projectId: string, filePath: string, content: string, branch: string, message: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`, {
    branch,
    content,
    commit_message: message,
  });
  console.log("Created file:", filePath);
}

async function updateFile(projectId: string, filePath: string, content: string, branch: string, message: string) {
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`, {
    branch,
    content,
    commit_message: message,
  });
  console.log("Updated file:", filePath);
}

async function deleteFile(projectId: string, filePath: string, branch: string, message: string) {
  await _request("DELETE", `api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?branch=${encodeURIComponent(branch)}&commit_message=${encodeURIComponent(message)}`);
  console.log("Deleted file:", filePath);
}

// ==================== Issues ====================

async function issues(projectId: string, opts?: { state?: string; labels?: string; page?: number }) {
  const params = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.labels) params.push(`labels=${encodeURIComponent(opts.labels)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/projects/${encodeURIComponent(projectId)}/issues${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function issue(projectId: string, iid: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/issues/${iid}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createIssue(projectId: string, title: string, opts?: { description?: string; labels?: string; assigneeIds?: number[] }) {
  const body: Record<string, unknown> = { title };
  if (opts?.description) body.description = opts.description;
  if (opts?.labels) body.labels = opts.labels;
  if (opts?.assigneeIds) body.assignee_ids = opts.assigneeIds;
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/issues`, body);
  console.log("Created issue #", (data as Record<string, unknown>).iid, (data as Record<string, unknown>).title);
}

async function updateIssue(projectId: string, iid: string, opts: Record<string, unknown>) {
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(projectId)}/issues/${iid}`, opts);
  console.log("Updated issue #", (data as Record<string, unknown>).iid);
}

async function closeIssue(projectId: string, iid: string) {
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(projectId)}/issues/${iid}`, { state_event: "close" });
  console.log("Closed issue #", (data as Record<string, unknown>).iid);
}

// ==================== Merge Requests ====================

async function mergeRequests(projectId: string, opts?: { state?: string; page?: number }) {
  const params = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function mergeRequest(projectId: string, iid: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${iid}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createMergeRequest(projectId: string, sourceBranch: string, targetBranch: string, title: string, opts?: { description?: string; targetProjectId?: number }) {
  const body: Record<string, unknown> = {
    source_branch: sourceBranch,
    target_branch: targetBranch,
    title,
  };
  if (opts?.description) body.description = opts.description;
  if (opts?.targetProjectId) body.target_project_id = opts.targetProjectId;
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests`, body);
  console.log("Created MR !", (data as Record<string, unknown>).iid, (data as Record<string, unknown>).title);
}

async function acceptMergeRequest(projectId: string, iid: string, opts?: { mergeCommitMessage?: string; squash?: boolean }) {
  const body: Record<string, unknown> = {};
  if (opts?.mergeCommitMessage) body.merge_commit_message = opts.mergeCommitMessage;
  if (opts?.squash !== undefined) body.squash = opts.squash;
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${iid}/merge`, body);
  console.log("Merged MR !", (data as Record<string, unknown>).iid);
}

async function closeMergeRequest(projectId: string, iid: string) {
  const data = await _request("PUT", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${iid}`, { state_event: "close" });
  console.log("Closed MR !", (data as Record<string, unknown>).iid);
}

async function mrChanges(projectId: string, iid: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${iid}/changes`);
  console.log(JSON.stringify(data, null, 2));
}

async function mrCommits(projectId: string, iid: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${iid}/commits`);
  console.log(JSON.stringify(data, null, 2));
}

// ==================== Groups ====================

async function groups(opts?: { search?: string; page?: number }) {
  const params = [];
  if (opts?.search) params.push(`search=${encodeURIComponent(opts.search)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/groups${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function group(id: string) {
  const data = await _request("GET", `api/v4/groups/${encodeURIComponent(id)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function groupProjects(id: string) {
  const data = await _request("GET", `api/v4/groups/${encodeURIComponent(id)}/projects`);
  console.log(JSON.stringify(data, null, 2));
}

async function createGroup(name: string, path: string, opts?: { parentId?: number; visibility?: string }) {
  const body: Record<string, unknown> = { name, path };
  if (opts?.parentId) body.parent_id = opts.parentId;
  if (opts?.visibility) body.visibility = opts.visibility;
  const data = await _request("POST", "api/v4/groups", body);
  console.log("Created group:", (data as Record<string, unknown>).full_path);
}

// ==================== Pipelines ====================

async function pipelines(projectId: string, opts?: { status?: string; ref?: string; page?: number }) {
  const params = [];
  if (opts?.status) params.push(`status=${opts.status}`);
  if (opts?.ref) params.push(`ref=${encodeURIComponent(opts.ref)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/projects/${encodeURIComponent(projectId)}/pipelines${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function pipeline(projectId: string, pipelineId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createPipeline(projectId: string, ref: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/pipeline`, { ref });
  console.log("Created pipeline #", (data as Record<string, unknown>).id);
}

async function retryPipeline(projectId: string, pipelineId: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/retry`, {});
  console.log("Retried pipeline #", (data as Record<string, unknown>).id);
}

async function cancelPipeline(projectId: string, pipelineId: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/cancel`, {});
  console.log("Cancelled pipeline #", (data as Record<string, unknown>).id);
}

// ==================== Jobs ====================

async function jobs(projectId: string, opts?: { scope?: string; page?: number }) {
  const params = [];
  if (opts?.scope) params.push(`scope[]=${opts.scope}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  const url = `api/v4/projects/${encodeURIComponent(projectId)}/jobs${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function job(projectId: string, jobId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/jobs/${jobId}`);
  console.log(JSON.stringify(data, null, 2));
}

async function jobLog(projectId: string, jobId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/trace`);
  console.log(data);
}

async function retryJob(projectId: string, jobId: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/retry`, {});
  console.log("Retried job #", (data as Record<string, unknown>).id);
}

async function cancelJob(projectId: string, jobId: string) {
  const data = await _request("POST", `api/v4/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/cancel`, {});
  console.log("Cancelled job #", (data as Record<string, unknown>).id);
}

// ==================== Runners ====================

async function runners(opts?: { status?: string; type?: string }) {
  const params = [];
  if (opts?.status) params.push(`status=${opts.status}`);
  if (opts?.type) params.push(`type=${opts.type}`);
  const url = `api/v4/runners${params.length ? "?" + params.join("&") : ""}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function projectRunners(projectId: string) {
  const data = await _request("GET", `api/v4/projects/${encodeURIComponent(projectId)}/runners`);
  console.log(JSON.stringify(data, null, 2));
}

// ==================== Search ====================

async function search(scope: string, query: string) {
  const data = await _request("GET", `api/v4/search?scope=${scope}&search=${encodeURIComponent(query)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function globalSearch(query: string) {
  const data = await _request("GET", `api/v4/search?scope=projects&search=${encodeURIComponent(query)}`);
  console.log(JSON.stringify(data, null, 2));
}

// ==================== System ====================

async function version() {
  const data = await _request("GET", "api/v4/version");
  console.log(JSON.stringify(data, null, 2));
}

async function metadata() {
  const data = await _request("GET", "api/v4/metadata");
  console.log(JSON.stringify(data, null, 2));
}

async function sidekiq() {
  const data = await _request("GET", "api/v4/sidekiq/process_metrics");
  console.log(JSON.stringify(data, null, 2));
}

// ==================== Help ====================

function help() {
  console.log(`
GitLab CLI - GitLab REST API 工具

Usage: npx tsx gitlab.ts <action> [args]

User:
  user                          Get current user
  users [search]                List users (optional search)
  
Projects:
  projects [opts]               List projects (JSON: {"owned":true,"search":"name"})
  project <id>                  Get project by id or path (e.g. "group/project")
  create-project <name> [opts]  Create project
  update-project <id> <json>    Update project
  delete-project <id>           Delete project
  fork <id> [opts]              Fork project

Repository:
  branches <projectId>          List branches
  branch <projectId> <name>     Get branch details
  create-branch <projectId> <branch> <ref>
  delete-branch <projectId> <branch>
  protect-branch <projectId> <branch>
  tags <projectId>              List tags
  create-tag <projectId> <tag> <ref> [message]
  delete-tag <projectId> <tag>

Commits:
  commits <projectId> [opts]    List commits (JSON: {"refName":"main","path":"src"})
  commit <projectId> <sha>      Get commit details
  commit-diff <projectId> <sha> Get commit diff

Files:
  file <projectId> <path> <ref> Get file content
  create-file <projectId> <path> <content> <branch> <message>
  update-file <projectId> <path> <content> <branch> <message>
  delete-file <projectId> <path> <branch> <message>

Issues:
  issues <projectId> [opts]     List issues (JSON: {"state":"opened","labels":"bug"})
  issue <projectId> <iid>       Get issue
  create-issue <projectId> <title> [opts]
  update-issue <projectId> <iid> <json>
  close-issue <projectId> <iid>

Merge Requests:
  mrs <projectId> [opts]        List merge requests
  mr <projectId> <iid>          Get merge request
  create-mr <projectId> <src> <target> <title> [opts]
  accept-mr <projectId> <iid>   Accept/merge MR
  close-mr <projectId> <iid>    Close MR
  mr-changes <projectId> <iid>  Get MR changes/diffs
  mr-commits <projectId> <iid>  Get MR commits

Groups:
  groups [opts]                 List groups
  group <id>                    Get group
  group-projects <id>           List group projects
  create-group <name> <path> [opts]

Pipelines:
  pipelines <projectId> [opts]  List pipelines
  pipeline <projectId> <id>     Get pipeline
  create-pipeline <projectId> <ref>
  retry-pipeline <projectId> <id>
  cancel-pipeline <projectId> <id>

Jobs:
  jobs <projectId> [opts]       List jobs
  job <projectId> <id>          Get job
  job-log <projectId> <id>      Get job log/trace
  retry-job <projectId> <id>    Retry job
  cancel-job <projectId> <id>   Cancel job

Runners:
  runners [opts]                List all runners
  project-runners <projectId>   List project runners

Search:
  search <scope> <query>        Search (scope: projects, issues, merge_requests, users)
  global-search <query>         Search projects globally

System:
  version                       Get GitLab version
  metadata                      Get GitLab metadata
  sidekiq                       Get Sidekiq metrics

Examples:
  npx tsx gitlab.ts user
  npx tsx gitlab.ts projects '{"owned":true}'
  npx tsx gitlab.ts project "mygroup/myproject"
  npx tsx gitlab.ts branches 123
  npx tsx gitlab.ts issues 123 '{"state":"opened"}'
  npx tsx gitlab.ts create-issue 123 "Bug report" '{"description":"Details here"}'
  npx tsx gitlab.ts pipelines 123 '{"status":"running"}'
`);
}

// ==================== Main ====================

const [,, action, ...args] = process.argv;

const handlers: Record<string, () => Promise<void>> = {
  // User
  user: () => user(),
  users: () => users(args[0]),
  
  // Projects
  projects: () => projects(args[0] ? JSON.parse(args[0]) : undefined),
  project: () => project(args[0]),
  "create-project": () => createProject(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  "update-project": () => updateProject(args[0], JSON.parse(args[1])),
  "delete-project": () => deleteProject(args[0]),
  fork: () => forkProject(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  
  // Repository
  branches: () => branches(args[0]),
  branch: () => branch(args[0], args[1]),
  "create-branch": () => createBranch(args[0], args[1], args[2]),
  "delete-branch": () => deleteBranch(args[0], args[1]),
  "protect-branch": () => protectBranch(args[0], args[1]),
  tags: () => tags(args[0]),
  "create-tag": () => createTag(args[0], args[1], args[2], args[3]),
  "delete-tag": () => deleteTag(args[0], args[1]),
  
  // Commits
  commits: () => commits(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  commit: () => commit(args[0], args[1]),
  "commit-diff": () => commitDiff(args[0], args[1]),
  
  // Files
  file: () => file(args[0], args[1], args[2]),
  "create-file": () => createFile(args[0], args[1], args[2], args[3], args[4]),
  "update-file": () => updateFile(args[0], args[1], args[2], args[3], args[4]),
  "delete-file": () => deleteFile(args[0], args[1], args[2], args[3]),
  
  // Issues
  issues: () => issues(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  issue: () => issue(args[0], args[1]),
  "create-issue": () => createIssue(args[0], args[1], args[2] ? JSON.parse(args[2]) : undefined),
  "update-issue": () => updateIssue(args[0], args[1], JSON.parse(args[2])),
  "close-issue": () => closeIssue(args[0], args[1]),
  
  // Merge Requests
  mrs: () => mergeRequests(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  mr: () => mergeRequest(args[0], args[1]),
  "create-mr": () => createMergeRequest(args[0], args[1], args[2], args[3], args[4] ? JSON.parse(args[4]) : undefined),
  "accept-mr": () => acceptMergeRequest(args[0], args[1], args[2] ? JSON.parse(args[2]) : undefined),
  "close-mr": () => closeMergeRequest(args[0], args[1]),
  "mr-changes": () => mrChanges(args[0], args[1]),
  "mr-commits": () => mrCommits(args[0], args[1]),
  
  // Groups
  groups: () => groups(args[0] ? JSON.parse(args[0]) : undefined),
  group: () => group(args[0]),
  "group-projects": () => groupProjects(args[0]),
  "create-group": () => createGroup(args[0], args[1], args[2] ? JSON.parse(args[2]) : undefined),
  
  // Pipelines
  pipelines: () => pipelines(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  pipeline: () => pipeline(args[0], args[1]),
  "create-pipeline": () => createPipeline(args[0], args[1]),
  "retry-pipeline": () => retryPipeline(args[0], args[1]),
  "cancel-pipeline": () => cancelPipeline(args[0], args[1]),
  
  // Jobs
  jobs: () => jobs(args[0], args[1] ? JSON.parse(args[1]) : undefined),
  job: () => job(args[0], args[1]),
  "job-log": () => jobLog(args[0], args[1]),
  "retry-job": () => retryJob(args[0], args[1]),
  "cancel-job": () => cancelJob(args[0], args[1]),
  
  // Runners
  runners: () => runners(args[0] ? JSON.parse(args[0]) : undefined),
  "project-runners": () => projectRunners(args[0]),
  
  // Search
  search: () => search(args[0], args[1]),
  "global-search": () => globalSearch(args[0]),
  
  // System
  version: () => version(),
  metadata: () => metadata(),
  sidekiq: () => sidekiq(),
  
  help: () => Promise.resolve(help()),
};

const handler = handlers[action] || help;
handler().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
