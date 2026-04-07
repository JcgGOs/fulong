#!/usr/bin/env tsx
/**
 * Gitee CLI - Gitee API (v5) 工具
 * Usage: npx tsx gitee.ts <action> [args]
 *
 * 配置文件: 当前目录或用户主目录下的 .gitee.json
 * {
 *   "baseUrl": "https://gitee.com",
 *   "token": "your-token-here"
 * }
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

interface GiteeConfig {
  baseUrl: string;
  token: string;
}

function loadConfig(): GiteeConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [resolve(cwd, ".gitee.json"), resolve(home, ".gitee.json")];

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
    "Error: Missing config. Create .gitee.json with baseUrl and token.",
  );
  process.exit(1);
}

async function _request(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${config.baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}${endpoint.includes("access_token") ? "" : `${separator}access_token=${config.token}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

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

// ============ USER ============
async function user() {
  const data = await _request("GET", "api/v5/user");
  console.log(JSON.stringify(data, null, 2));
}

async function userRepos(type = "all", sort = "updated", page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/user/repos?type=${type}&sort=${sort}&page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function userOrgs() {
  const data = await _request("GET", "api/v5/user/orgs");
  console.log(JSON.stringify(data, null, 2));
}

async function userStarred(username?: string, page = 1, per_page = 20) {
  const path = username 
    ? `api/v5/users/${username}/starred?page=${page}&per_page=${per_page}`
    : `api/v5/user/starred?page=${page}&per_page=${per_page}`;
  const data = await _request("GET", path);
  console.log(JSON.stringify(data, null, 2));
}

async function userFollowers(username?: string, page = 1, per_page = 20) {
  const path = username
    ? `api/v5/users/${username}/followers?page=${page}&per_page=${per_page}`
    : `api/v5/user/followers?page=${page}&per_page=${per_page}`;
  const data = await _request("GET", path);
  console.log(JSON.stringify(data, null, 2));
}

async function userFollowing(username?: string, page = 1, per_page = 20) {
  const path = username
    ? `api/v5/users/${username}/following?page=${page}&per_page=${per_page}`
    : `api/v5/user/following?page=${page}&per_page=${per_page}`;
  const data = await _request("GET", path);
  console.log(JSON.stringify(data, null, 2));
}

// ============ REPOSITORY ============
async function repo(owner: string, repo: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}`);
  console.log(JSON.stringify(data, null, 2));
}

async function repos(username: string, type = "all", sort = "updated", page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/users/${username}/repos?type=${type}&sort=${sort}&page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createRepo(name: string, opts?: { 
  private?: boolean; 
  description?: string; 
  homepage?: string;
  has_issues?: boolean;
  has_wiki?: boolean;
  can_comment?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}) {
  const data = await _request("POST", "api/v5/user/repos", {
    name,
    private: opts?.private ?? false,
    description: opts?.description || "",
    homepage: opts?.homepage || "",
    has_issues: opts?.has_issues ?? true,
    has_wiki: opts?.has_wiki ?? true,
    can_comment: opts?.can_comment ?? true,
    auto_init: opts?.auto_init ?? false,
    gitignore_template: opts?.gitignore_template || "",
    license_template: opts?.license_template || "",
  });
  console.log("Created:", (data as Record<string, unknown>).full_name);
}

async function createOrgRepo(org: string, name: string, opts?: { 
  private?: boolean; 
  description?: string;
  homepage?: string;
  has_issues?: boolean;
  has_wiki?: boolean;
}) {
  const data = await _request("POST", `api/v5/orgs/${org}/repos`, {
    name,
    private: opts?.private ?? false,
    description: opts?.description || "",
    homepage: opts?.homepage || "",
    has_issues: opts?.has_issues ?? true,
    has_wiki: opts?.has_wiki ?? true,
  });
  console.log("Created:", (data as Record<string, unknown>).full_name);
}

async function delRepo(owner: string, repo: string) {
  await _request("DELETE", `api/v5/repos/${owner}/${repo}`);
  console.log("Deleted:", `${owner}/${repo}`);
}

async function fork(owner: string, repo: string, org?: string, name?: string, path?: string) {
  const body: Record<string, unknown> = {};
  if (org) body.organization = org;
  if (name) body.name = name;
  if (path) body.path = path;
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/forks`, body);
  console.log("Forked:", (data as Record<string, unknown>).full_name);
}

async function updateRepo(owner: string, repo: string, opts: {
  name?: string;
  description?: string;
  homepage?: string;
  private?: boolean;
  can_comment?: boolean;
  has_issues?: boolean;
  has_wiki?: boolean;
}) {
  const data = await _request("PATCH", `api/v5/repos/${owner}/${repo}`, opts);
  console.log("Updated:", (data as Record<string, unknown>).full_name);
}

// ============ BRANCHES & COMMITS ============
async function branches(owner: string, repo: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/branches`);
  console.log(JSON.stringify(data, null, 2));
}

async function branch(owner: string, repo: string, branchName: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/branches/${branchName}`);
  console.log(JSON.stringify(data, null, 2));
}

async function commits(owner: string, repo: string, opts?: { 
  sha?: string; 
  path?: string;
  page?: number;
  per_page?: number;
}) {
  let url = `api/v5/repos/${owner}/${repo}/commits`;
  const params: string[] = [];
  if (opts?.sha) params.push(`sha=${opts.sha}`);
  if (opts?.path) params.push(`path=${encodeURIComponent(opts.path)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  if (opts?.per_page) params.push(`per_page=${opts.per_page}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function commit(owner: string, repo: string, sha: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/commits/${sha}`);
  console.log(JSON.stringify(data, null, 2));
}

// ============ CONTENTS ============
async function contents(owner: string, repo: string, filepath = "", ref?: string) {
  let url = `api/v5/repos/${owner}/${repo}/contents/${filepath}`;
  if (ref) url += `?ref=${ref}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function readme(owner: string, repo: string, ref?: string) {
  let url = `api/v5/repos/${owner}/${repo}/readme`;
  if (ref) url += `?ref=${ref}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

// ============ ISSUES ============
async function issues(owner: string, repo: string, opts?: { 
  state?: "open" | "progressing" | "closed" | "rejected" | "all";
  labels?: string;
  assignee?: string;
  creator?: string;
  page?: number;
  per_page?: number;
}) {
  let url = `api/v5/repos/${owner}/${repo}/issues`;
  const params: string[] = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.labels) params.push(`labels=${encodeURIComponent(opts.labels)}`);
  if (opts?.assignee) params.push(`assignee=${opts.assignee}`);
  if (opts?.creator) params.push(`creator=${opts.creator}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  if (opts?.per_page) params.push(`per_page=${opts.per_page}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function issue(owner: string, repo: string, number: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/issues/${number}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createIssue(owner: string, repo: string, title: string, opts?: { 
  body?: string; 
  labels?: string;
  assignee?: string;
  milestone?: number;
}) {
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/issues`, {
    title,
    body: opts?.body || "",
    labels: opts?.labels || "",
    assignee: opts?.assignee || "",
    milestone: opts?.milestone,
  });
  console.log("Created issue #", (data as Record<string, unknown>).number);
}

async function updateIssue(owner: string, repo: string, number: string, opts: {
  title?: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string;
  assignee?: string;
  milestone?: number;
}) {
  const data = await _request("PATCH", `api/v5/repos/${owner}/${repo}/issues/${number}`, opts);
  console.log("Updated issue #", number, "state:", (data as Record<string, unknown>).state);
}

async function closeIssue(owner: string, repo: string, number: string) {
  const data = await _request("PATCH", `api/v5/repos/${owner}/${repo}/issues/${number}`, { state: "closed" });
  console.log("Closed issue #", number);
}

async function repoAllIssues(opts?: {
  state?: "open" | "progressing" | "closed" | "rejected" | "all";
  labels?: string;
  page?: number;
  per_page?: number;
  since?: string;
}) {
  let url = `api/v5/issues`;
  const params: string[] = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.labels) params.push(`labels=${encodeURIComponent(opts.labels)}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  if (opts?.per_page) params.push(`per_page=${opts.per_page}`);
  if (opts?.since) params.push(`since=${opts.since}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

// ============ PULL REQUESTS ============
async function pulls(owner: string, repo: string, opts?: { 
  state?: "open" | "closed" | "merged" | "all";
  head?: string;
  base?: string;
  sort?: "created" | "updated" | "popularity" | "long-running";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
}) {
  let url = `api/v5/repos/${owner}/${repo}/pulls`;
  const params: string[] = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.head) params.push(`head=${encodeURIComponent(opts.head)}`);
  if (opts?.base) params.push(`base=${encodeURIComponent(opts.base)}`);
  if (opts?.sort) params.push(`sort=${opts.sort}`);
  if (opts?.direction) params.push(`direction=${opts.direction}`);
  if (opts?.page) params.push(`page=${opts.page}`);
  if (opts?.per_page) params.push(`per_page=${opts.per_page}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function pull(owner: string, repo: string, number: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/pulls/${number}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createPull(owner: string, repo: string, title: string, head: string, base: string, opts?: {
  body?: string;
  milestone?: number;
  labels?: string;
  assignee?: string;
  testers?: string;
  assignees?: string;
}) {
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/pulls`, {
    title,
    head,
    base,
    body: opts?.body || "",
    milestone: opts?.milestone,
    labels: opts?.labels || "",
    assignee: opts?.assignee || "",
    testers: opts?.testers || "",
    assignees: opts?.assignees || "",
  });
  console.log("Created PR !", (data as Record<string, unknown>).number);
}

async function updatePull(owner: string, repo: string, number: string, opts: {
  title?: string;
  body?: string;
  state?: "open" | "closed";
}) {
  const data = await _request("PATCH", `api/v5/repos/${owner}/${repo}/pulls/${number}`, opts);
  console.log("Updated PR !", number);
}

async function pullCommits(owner: string, repo: string, number: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/pulls/${number}/commits`);
  console.log(JSON.stringify(data, null, 2));
}

async function pullFiles(owner: string, repo: string, number: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/pulls/${number}/files`);
  console.log(JSON.stringify(data, null, 2));
}

async function mergePull(owner: string, repo: string, number: string, opts?: {
  merge_method?: "merge" | "squash" | "rebase";
  pr_title?: string;
  description?: string;
}) {
  const body: Record<string, unknown> = {};
  if (opts?.merge_method) body.merge_method = opts.merge_method;
  if (opts?.pr_title) body.pr_title = opts.pr_title;
  if (opts?.description) body.description = opts.description;
  await _request("PUT", `api/v5/repos/${owner}/${repo}/pulls/${number}/merge`, body);
  console.log("Merged PR !", number);
}

// ============ ORGANIZATION ============
async function org(name: string) {
  const data = await _request("GET", `api/v5/orgs/${name}`);
  console.log(JSON.stringify(data, null, 2));
}

async function orgs() {
  const data = await _request("GET", "api/v5/user/orgs");
  console.log(JSON.stringify(data, null, 2));
}

async function orgRepos(org: string, type = "all", page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/orgs/${org}/repos?type=${type}&page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function orgMembers(org: string, page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/orgs/${org}/members?page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

// ============ SEARCH ============
async function searchRepos(q: string, opts?: {
  page?: number;
  per_page?: number;
  owner?: string;
  fork?: string;
  language?: string;
  sort?: "stars_count" | "forks_count" | "updated" | "watches_count";
  order?: "asc" | "desc";
}) {
  let url = `api/v5/search/repositories?q=${encodeURIComponent(q)}`;
  if (opts?.page) url += `&page=${opts.page}`;
  if (opts?.per_page) url += `&per_page=${opts.per_page}`;
  if (opts?.owner) url += `&owner=${encodeURIComponent(opts.owner)}`;
  if (opts?.fork) url += `&fork=${opts.fork}`;
  if (opts?.language) url += `&language=${opts.language}`;
  if (opts?.sort) url += `&sort=${opts.sort}`;
  if (opts?.order) url += `&order=${opts.order}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function searchUsers(q: string, opts?: {
  page?: number;
  per_page?: number;
  sort?: "followers_count" | "public_repos" | "created";
  order?: "asc" | "desc";
}) {
  let url = `api/v5/search/users?q=${encodeURIComponent(q)}`;
  if (opts?.page) url += `&page=${opts.page}`;
  if (opts?.per_page) url += `&per_page=${opts.per_page}`;
  if (opts?.sort) url += `&sort=${opts.sort}`;
  if (opts?.order) url += `&order=${opts.order}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function searchIssues(q: string, opts?: {
  page?: number;
  per_page?: number;
  state?: "open" | "closed" | "all";
  labels?: string;
  sort?: "created" | "updated" | "comments";
  order?: "asc" | "desc";
}) {
  let url = `api/v5/search/issues?q=${encodeURIComponent(q)}`;
  if (opts?.page) url += `&page=${opts.page}`;
  if (opts?.per_page) url += `&per_page=${opts.per_page}`;
  if (opts?.state) url += `&state=${opts.state}`;
  if (opts?.labels) url += `&labels=${encodeURIComponent(opts.labels)}`;
  if (opts?.sort) url += `&sort=${opts.sort}`;
  if (opts?.order) url += `&order=${opts.order}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

// ============ RELEASES ============
async function releases(owner: string, repo: string, page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/releases?page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function release(owner: string, repo: string, id: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/releases/${id}`);
  console.log(JSON.stringify(data, null, 2));
}

async function latestRelease(owner: string, repo: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/releases/latest`);
  console.log(JSON.stringify(data, null, 2));
}

async function createRelease(owner: string, repo: string, tag_name: string, opts?: {
  name?: string;
  body?: string;
  prerelease?: boolean;
  target_commitish?: string;
}) {
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/releases`, {
    tag_name,
    name: opts?.name || tag_name,
    body: opts?.body || "",
    prerelease: opts?.prerelease ?? false,
    target_commitish: opts?.target_commitish || "master",
  });
  console.log("Created release:", (data as Record<string, unknown>).tag_name);
}

// ============ TAGS ============
async function tags(owner: string, repo: string, page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/tags?page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createTag(owner: string, repo: string, tag_name: string, refs: string, opts?: {
  message?: string;
}) {
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/tags`, {
    tag_name,
    refs,
    message: opts?.message || `Release ${tag_name}`,
  });
  console.log("Created tag:", (data as Record<string, unknown>).name);
}

// ============ WEBHOOKS ============
async function webhooks(owner: string, repo: string) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/hooks`);
  console.log(JSON.stringify(data, null, 2));
}

async function createWebhook(owner: string, repo: string, url: string, push_events = true, opts?: {
  issues_events?: boolean;
  pull_requests_events?: boolean;
  tag_push_events?: boolean;
  password?: string;
}) {
  const data = await _request("POST", `api/v5/repos/${owner}/${repo}/hooks`, {
    url,
    push_events,
    issues_events: opts?.issues_events ?? false,
    pull_requests_events: opts?.pull_requests_events ?? false,
    tag_push_events: opts?.tag_push_events ?? false,
    password: opts?.password || "",
  });
  console.log("Created webhook #", (data as Record<string, unknown>).id);
}

async function deleteWebhook(owner: string, repo: string, id: string) {
  await _request("DELETE", `api/v5/repos/${owner}/${repo}/hooks/${id}`);
  console.log("Deleted webhook #", id);
}

// ============ STARGAZERS ============
async function stargazers(owner: string, repo: string, page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/stargazers?page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function starRepo(owner: string, repo: string) {
  await _request("PUT", `api/v5/user/starred/${owner}/${repo}`);
  console.log("Starred:", `${owner}/${repo}`);
}

async function unstarRepo(owner: string, repo: string) {
  await _request("DELETE", `api/v5/user/starred/${owner}/${repo}`);
  console.log("Unstarred:", `${owner}/${repo}`);
}

// ============ WATCHERS ============
async function watchers(owner: string, repo: string, page = 1, per_page = 20) {
  const data = await _request("GET", `api/v5/repos/${owner}/${repo}/subscribers?page=${page}&per_page=${per_page}`);
  console.log(JSON.stringify(data, null, 2));
}

async function watchRepo(owner: string, repo: string) {
  await _request("PUT", `api/v5/user/subscriptions/${owner}/${repo}`);
  console.log("Watching:", `${owner}/${repo}`);
}

async function unwatchRepo(owner: string, repo: string) {
  await _request("DELETE", `api/v5/user/subscriptions/${owner}/${repo}`);
  console.log("Unwatched:", `${owner}/${repo}`);
}

// ============ IMPORT FROM GITHUB ============
async function importGithubRepo(github_repo_url: string, opts?: {
  name?: string;
  path?: string;
  private?: boolean;
  description?: string;
}) {
  const data = await _request("POST", "api/v5/import", {
    github_repo_url,
    name: opts?.name,
    path: opts?.path,
    private: opts?.private ?? false,
    description: opts?.description || "",
  });
  console.log("Importing:", (data as Record<string, unknown>).full_name);
}

// ============ CLI ============
const [,, action, ...args] = process.argv;

async function help() {
  console.log(`
Gitee CLI - Gitee API (v5) Tool

USAGE:
  npx tsx gitee.ts <action> [args]

CONFIGURATION:
  .gitee.json:
  {
    "baseUrl": "https://gitee.com",
    "token": "your_access_token"
  }

USER:
  user                          Get current user
  user-repos [type] [sort]      List current user repos
  user-orgs                     List current user organizations
  user-starred [username]       List starred repos
  user-followers [username]     List followers
  user-following [username]     List following

REPOSITORY:
  repo <owner> <repo>           Get repository info
  repos <username> [type]       List user repos (type: all/public/private/forks/sources)
  create-repo <name> [opts]     Create user repo
  create-org-repo <org> <name>  Create organization repo
  update-repo <owner> <repo> [opts]  Update repository
  delete-repo <owner> <repo>    Delete repository
  fork <owner> <repo> [org]     Fork repository

BRANCHES & COMMITS:
  branches <owner> <repo>       List branches
  branch <owner> <repo> <name>  Get branch info
  commits <owner> <repo> [sha]  List commits
  commit <owner> <repo> <sha>   Get commit detail

CONTENTS:
  contents <owner> <repo> [path] [ref]  Get file/directory contents
  readme <owner> <repo> [ref]   Get README content

ISSUES:
  issues <owner> <repo> [state] List issues
  issue <owner> <repo> <number> Get issue detail
  create-issue <owner> <repo> <title> [opts]  Create issue
  update-issue <owner> <repo> <number> [opts] Update issue
  close-issue <owner> <repo> <number>  Close issue
  my-issues [state]             List issues assigned to current user

PULL REQUESTS:
  pulls <owner> <repo> [state]  List pull requests
  pull <owner> <repo> <number>  Get pull request detail
  create-pull <owner> <repo> <title> <head> <base> [body]  Create PR
  update-pull <owner> <repo> <number> [opts]  Update PR
  pull-commits <owner> <repo> <number>  List commits in PR
  pull-files <owner> <repo> <number>    List changed files in PR
  merge-pull <owner> <repo> <number> [method]  Merge PR

ORGANIZATION:
  orgs                          List current user organizations
  org <name>                    Get organization info
  org-repos <org>               List organization repositories
  org-members <org>             List organization members

SEARCH:
  search-repos <query> [opts]   Search repositories
  search-users <query> [opts]   Search users
  search-issues <query> [opts]  Search issues

RELEASES:
  releases <owner> <repo>       List releases
  release <owner> <repo> <id>   Get release detail
  latest-release <owner> <repo> Get latest release
  create-release <owner> <repo> <tag> [opts]  Create release

TAGS:
  tags <owner> <repo>           List tags
  create-tag <owner> <repo> <tag> <refs> [msg]  Create tag

WEBHOOKS:
  webhooks <owner> <repo>       List webhooks
  create-webhook <owner> <repo> <url> [push] [opts]  Create webhook
  delete-webhook <owner> <repo> <id>  Delete webhook

SOCIAL:
  stargazers <owner> <repo>     List stargazers
  star <owner> <repo>           Star a repo
  unstar <owner> <repo>         Unstar a repo
  watchers <owner> <repo>       List watchers
  watch <owner> <repo>          Watch a repo
  unwatch <owner> <repo>        Unwatch a repo

IMPORT:
  import-github <github_url> [opts]  Import from GitHub

EXAMPLES:
  npx tsx gitee.ts user
  npx tsx gitee.ts repo gitee gitee
  npx tsx gitee.ts create-repo myproject '{"private":true}'
  npx tsx gitee.ts issues gitee gitee open
  npx tsx gitee.ts create-pull gitee gitee "Fix bug" "feature-branch" "master"
  npx tsx gitee.ts merge-pull gitee gitee 123 merge
  npx tsx gitee.ts search-repos "machine learning" '{"language":"Python","sort":"stars_count"}'
`);
}

// CLI dispatcher
const handlers: Record<string, () => Promise<void>> = {
  // User
  user: () => user(),
  "user-repos": () => userRepos(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20),
  "user-orgs": () => userOrgs(),
  "user-starred": () => userStarred(args[0], args[1] ? parseInt(args[1]) : 1, args[2] ? parseInt(args[2]) : 20),
  "user-followers": () => userFollowers(args[0], args[1] ? parseInt(args[1]) : 1, args[2] ? parseInt(args[2]) : 20),
  "user-following": () => userFollowing(args[0], args[1] ? parseInt(args[1]) : 1, args[2] ? parseInt(args[2]) : 20),
  
  // Repo
  repo: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: repo <owner> <repo>");
    return repo(args[0], args[1]);
  },
  repos: () => {
    if (!args[0]) throw new Error("Usage: repos <username> [type] [sort]");
    return repos(args[0], args[1], args[2], args[3] ? parseInt(args[3]) : 1, args[4] ? parseInt(args[4]) : 20);
  },
  "create-repo": () => {
    if (!args[0]) throw new Error("Usage: create-repo <name> [opts-json]");
    return createRepo(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  "create-org-repo": () => {
    if (!args[0] || !args[1]) throw new Error("Usage: create-org-repo <org> <name> [opts-json]");
    return createOrgRepo(args[0], args[1], args[2] ? JSON.parse(args[2]) : {});
  },
  "update-repo": () => {
    if (!args[0] || !args[1]) throw new Error("Usage: update-repo <owner> <repo> <opts-json>");
    return updateRepo(args[0], args[1], JSON.parse(args[2] || "{}"));
  },
  "delete-repo": () => {
    if (!args[0] || !args[1]) throw new Error("Usage: delete-repo <owner> <repo>");
    return delRepo(args[0], args[1]);
  },
  fork: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: fork <owner> <repo> [org] [name] [path]");
    return fork(args[0], args[1], args[2], args[3], args[4]);
  },
  
  // Branches & Commits
  branches: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: branches <owner> <repo>");
    return branches(args[0], args[1]);
  },
  branch: () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: branch <owner> <repo> <name>");
    return branch(args[0], args[1], args[2]);
  },
  commits: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: commits <owner> <repo> [sha] [path] [page]");
    return commits(args[0], args[1], { 
      sha: args[2], 
      path: args[3],
      page: args[4] ? parseInt(args[4]) : 1,
      per_page: args[5] ? parseInt(args[5]) : 20
    });
  },
  commit: () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: commit <owner> <repo> <sha>");
    return commit(args[0], args[1], args[2]);
  },
  
  // Contents
  contents: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: contents <owner> <repo> [path] [ref]");
    return contents(args[0], args[1], args[2], args[3]);
  },
  readme: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: readme <owner> <repo> [ref]");
    return readme(args[0], args[1], args[2]);
  },
  
  // Issues
  issues: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: issues <owner> <repo> [state] [labels]");
    return issues(args[0], args[1], { 
      state: args[2] as any, 
      labels: args[3],
      page: args[4] ? parseInt(args[4]) : 1,
      per_page: args[5] ? parseInt(args[5]) : 20
    });
  },
  issue: () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: issue <owner> <repo> <number>");
    return issue(args[0], args[1], args[2]);
  },
  "create-issue": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: create-issue <owner> <repo> <title> [opts-json]");
    return createIssue(args[0], args[1], args[2], args[3] ? JSON.parse(args[3]) : {});
  },
  "update-issue": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: update-issue <owner> <repo> <number> <opts-json>");
    return updateIssue(args[0], args[1], args[2], JSON.parse(args[3] || "{}"));
  },
  "close-issue": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: close-issue <owner> <repo> <number>");
    return closeIssue(args[0], args[1], args[2]);
  },
  "my-issues": () => repoAllIssues({ state: args[0] as any, page: args[1] ? parseInt(args[1]) : 1 }),
  
  // PRs
  pulls: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: pulls <owner> <repo> [state] [sort] [direction]");
    return pulls(args[0], args[1], { 
      state: args[2] as any, 
      sort: args[3] as any,
      direction: args[4] as any,
      page: args[5] ? parseInt(args[5]) : 1,
      per_page: args[6] ? parseInt(args[6]) : 20
    });
  },
  pull: () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: pull <owner> <repo> <number>");
    return pull(args[0], args[1], args[2]);
  },
  "create-pull": () => {
    if (!args[0] || !args[1] || !args[2] || !args[3] || !args[4]) {
      throw new Error("Usage: create-pull <owner> <repo> <title> <head> <base> [opts-json]");
    }
    return createPull(args[0], args[1], args[2], args[3], args[4], args[5] ? JSON.parse(args[5]) : {});
  },
  "update-pull": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: update-pull <owner> <repo> <number> <opts-json>");
    return updatePull(args[0], args[1], args[2], JSON.parse(args[3] || "{}"));
  },
  "pull-commits": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: pull-commits <owner> <repo> <number>");
    return pullCommits(args[0], args[1], args[2]);
  },
  "pull-files": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: pull-files <owner> <repo> <number>");
    return pullFiles(args[0], args[1], args[2]);
  },
  "merge-pull": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: merge-pull <owner> <repo> <number> [method]");
    return mergePull(args[0], args[1], args[2], { merge_method: args[3] as any });
  },
  
  // Org
  orgs: () => orgs(),
  org: () => {
    if (!args[0]) throw new Error("Usage: org <name>");
    return org(args[0]);
  },
  "org-repos": () => {
    if (!args[0]) throw new Error("Usage: org-repos <org> [type] [page] [per_page]");
    return orgRepos(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20);
  },
  "org-members": () => {
    if (!args[0]) throw new Error("Usage: org-members <org> [page] [per_page]");
    return orgMembers(args[0], args[1] ? parseInt(args[1]) : 1, args[2] ? parseInt(args[2]) : 20);
  },
  
  // Search
  "search-repos": () => {
    if (!args[0]) throw new Error("Usage: search-repos <query> [opts-json]");
    return searchRepos(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  "search-users": () => {
    if (!args[0]) throw new Error("Usage: search-users <query> [opts-json]");
    return searchUsers(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  "search-issues": () => {
    if (!args[0]) throw new Error("Usage: search-issues <query> [opts-json]");
    return searchIssues(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  
  // Releases
  releases: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: releases <owner> <repo> [page] [per_page]");
    return releases(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20);
  },
  release: () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: release <owner> <repo> <id>");
    return release(args[0], args[1], args[2]);
  },
  "latest-release": () => {
    if (!args[0] || !args[1]) throw new Error("Usage: latest-release <owner> <repo>");
    return latestRelease(args[0], args[1]);
  },
  "create-release": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: create-release <owner> <repo> <tag> [opts-json]");
    return createRelease(args[0], args[1], args[2], args[3] ? JSON.parse(args[3]) : {});
  },
  
  // Tags
  tags: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: tags <owner> <repo> [page] [per_page]");
    return tags(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20);
  },
  "create-tag": () => {
    if (!args[0] || !args[1] || !args[2] || !args[3]) throw new Error("Usage: create-tag <owner> <repo> <tag_name> <refs> [message]");
    return createTag(args[0], args[1], args[2], args[3], { message: args[4] });
  },
  
  // Webhooks
  webhooks: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: webhooks <owner> <repo>");
    return webhooks(args[0], args[1]);
  },
  "create-webhook": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: create-webhook <owner> <repo> <url> [push] [opts-json]");
    return createWebhook(args[0], args[1], args[2], args[3] !== "false", args[4] ? JSON.parse(args[4]) : {});
  },
  "delete-webhook": () => {
    if (!args[0] || !args[1] || !args[2]) throw new Error("Usage: delete-webhook <owner> <repo> <id>");
    return deleteWebhook(args[0], args[1], args[2]);
  },
  
  // Social
  stargazers: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: stargazers <owner> <repo> [page] [per_page]");
    return stargazers(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20);
  },
  star: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: star <owner> <repo>");
    return starRepo(args[0], args[1]);
  },
  unstar: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: unstar <owner> <repo>");
    return unstarRepo(args[0], args[1]);
  },
  watchers: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: watchers <owner> <repo> [page] [per_page]");
    return watchers(args[0], args[1], args[2] ? parseInt(args[2]) : 1, args[3] ? parseInt(args[3]) : 20);
  },
  watch: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: watch <owner> <repo>");
    return watchRepo(args[0], args[1]);
  },
  unwatch: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: unwatch <owner> <repo>");
    return unwatchRepo(args[0], args[1]);
  },
  
  // Import
  "import-github": () => {
    if (!args[0]) throw new Error("Usage: import-github <github_repo_url> [opts-json]");
    return importGithubRepo(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  
  help: () => help(),
};

const handler = handlers[action] || help;
handler().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
