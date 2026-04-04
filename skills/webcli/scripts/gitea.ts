#!/usr/bin/env tsx
/**
 * Gitea CLI - Gitea API (v1.25.4) 工具
 * Usage: npx tsx gitea.ts <action> [args]
 *
 * 配置文件: 当前目录或用户主目录下的 .gitea.json
 * {
 *   "baseUrl": "http://nas:8418",
 *   "token": "your-token-here"
 * }
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

interface GiteaConfig {
  baseUrl: string;
  token: string;
}

function loadConfig(): GiteaConfig | null {
  const cwd = process.cwd();
  const home = homedir();
  const paths = [resolve(cwd, ".gitea.json"), resolve(home, ".gitea.json")];

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
    "Error: Missing config. Create .gitea.json with baseUrl and token.",
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
    headers.Authorization = `token ${config.token}`;
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

// ============ USER ============
async function user() {
  const data = await _request("GET", "api/v1/user");
  console.log(JSON.stringify(data, null, 2));
}

async function userRepos() {
  const data = await _request("GET", "api/v1/user/repos");
  console.log(JSON.stringify(data, null, 2));
}

async function userOrgs() {
  const data = await _request("GET", "api/v1/user/orgs");
  console.log(JSON.stringify(data, null, 2));
}

// ============ REPOSITORY ============
async function repo(owner: string, repo: string) {
  const data = await _request("GET", `api/v1/repos/${owner}/${repo}`);
  console.log(JSON.stringify(data, null, 2));
}

async function repos(username?: string) {
  const path = username
    ? `api/v1/users/${username}/repos`
    : "api/v1/user/repos";
  const data = await _request("GET", path);
  console.log(JSON.stringify(data, null, 2));
}

async function createRepo(
  name: string,
  opts?: { private?: boolean; description?: string; readme?: string },
) {
  const data = await _request("POST", "api/v1/user/repos", {
    name,
    private: opts?.private ?? false,
    description: opts?.description || "",
    readme: opts?.readme || "default",
  });
  console.log("Created:", (data as Record<string, unknown>).full_name);
}

async function createOrgRepo(
  org: string,
  name: string,
  opts?: { private?: boolean; description?: string },
) {
  const data = await _request("POST", `api/v1/orgs/${org}/repos`, {
    name,
    private: opts?.private ?? false,
    description: opts?.description || "",
  });
  console.log("Created:", (data as Record<string, unknown>).full_name);
}

async function delRepo(owner: string, repo: string) {
  await _request("DELETE", `api/v1/repos/${owner}/${repo}`);
  console.log("Deleted:", `${owner}/${repo}`);
}

async function fork(owner: string, repo: string, org?: string) {
  const body = org ? { organization: org } : {};
  const data = await _request("POST", `api/v1/repos/${owner}/${repo}/forks`, body);
  console.log("Forked:", (data as Record<string, unknown>).full_name);
}

async function branches(owner: string, repo: string) {
  const data = await _request("GET", `api/v1/repos/${owner}/${repo}/branches`);
  console.log(JSON.stringify(data, null, 2));
}

async function commits(
  owner: string,
  repo: string,
  opts?: { sha?: string; path?: string },
) {
  let url = `api/v1/repos/${owner}/${repo}/commits`;
  if (opts?.sha) url += `?sha=${opts.sha}`;
  if (opts?.path) url += `${opts.sha ? "&" : "?"}path=${opts.path}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function contents(
  owner: string,
  repo: string,
  filepath = "",
  ref?: string,
) {
  let url = `api/v1/repos/${owner}/${repo}/contents/${filepath}`;
  if (ref) url += `?ref=${ref}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

// ============ ISSUES ============
async function issues(
  owner: string,
  repo: string,
  opts?: { state?: string; labels?: string },
) {
  let url = `api/v1/repos/${owner}/${repo}/issues`;
  const params = [];
  if (opts?.state) params.push(`state=${opts.state}`);
  if (opts?.labels) params.push(`labels=${opts.labels}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function issue(owner: string, repo: string, index: string) {
  const data = await _request("GET", `api/v1/repos/${owner}/${repo}/issues/${index}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  opts?: { labels?: string[] },
) {
  const data = await _request("POST", `api/v1/repos/${owner}/${repo}/issues`, {
    title,
    body: body || "",
    labels: opts?.labels || [],
  });
  console.log("Created issue #", (data as Record<string, unknown>).number);
}

async function closeIssue(owner: string, repo: string, index: string) {
  await _request("PATCH", `api/v1/repos/${owner}/${repo}/issues/${index}`, {
    state: "closed",
  });
  console.log("Closed issue #", index);
}

// ============ PULL REQUESTS ============
async function pulls(owner: string, repo: string, opts?: { state?: string }) {
  let url = `api/v1/repos/${owner}/${repo}/pulls`;
  if (opts?.state) url += `?state=${opts.state}`;
  const data = await _request("GET", url);
  console.log(JSON.stringify(data, null, 2));
}

async function pull(owner: string, repo: string, index: string) {
  const data = await _request("GET", `api/v1/repos/${owner}/${repo}/pulls/${index}`);
  console.log(JSON.stringify(data, null, 2));
}

async function createPull(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
) {
  const data = await _request("POST", `api/v1/repos/${owner}/${repo}/pulls`, {
    title,
    head,
    base,
    body: body || "",
  });
  console.log("Created PR #", (data as Record<string, unknown>).number);
}

async function mergePull(
  owner: string,
  repo: string,
  index: string,
  method = "merge",
) {
  await _request("POST", `api/v1/repos/${owner}/${repo}/pulls/${index}/merge`, {
    Do: method,
  });
  console.log("Merged PR #", index);
}

// ============ ORGANIZATION ============
async function org(name: string) {
  const data = await _request("GET", `api/v1/orgs/${name}`);
  console.log(JSON.stringify(data, null, 2));
}

async function orgs() {
  const data = await _request("GET", "api/v1/user/orgs");
  console.log(JSON.stringify(data, null, 2));
}

async function orgRepos(org: string) {
  const data = await _request("GET", `api/v1/orgs/${org}/repos`);
  console.log(JSON.stringify(data, null, 2));
}

async function createOrg(
  name: string,
  opts?: { description?: string; visibility?: string },
) {
  const data = await _request("POST", "api/v1/orgs", {
    username: name,
    full_name: name,
    description: opts?.description || "",
    visibility: opts?.visibility || "public",
  });
  console.log("Created org:", (data as Record<string, unknown>).name);
}

// ============ ADMIN ============
async function adminUsers() {
  const data = await _request("GET", "api/v1/admin/users");
  console.log(JSON.stringify(data, null, 2));
}

async function adminCreateUser(
  username: string,
  email: string,
  password: string,
) {
  const data = await _request("POST", "api/v1/admin/users", {
    username,
    email,
    password,
    must_change_password: false,
  });
  console.log("Created user:", (data as Record<string, unknown>).login);
}

async function adminDeleteUser(username: string) {
  await _request("DELETE", `api/v1/admin/users/${username}`);
  console.log("Deleted user:", username);
}

// ============ SEARCH ============
async function searchRepos(q: string) {
  const data = await _request("GET", `api/v1/repos/search?q=${encodeURIComponent(q)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function searchUsers(q: string) {
  const data = await _request("GET", `api/v1/users/search?q=${encodeURIComponent(q)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function searchIssues(owner: string, repo: string, q: string) {
  const data = await _request("GET", 
    `api/v1/repos/issues/search?q=${encodeURIComponent(q)}&owner=${owner}&repo=${repo}`,
  );
  console.log(JSON.stringify(data, null, 2));
}

// ============ CLI ============
const [, , action, ...args] = process.argv;

async function help() {
  console.log(`
Gitea CLI - Gitea API (v1.25.4) Tool

USAGE:
  npx tsx gitea.ts <action> [args]

USER:
  user                          Get current user
  repos [username]              List user repos (or current user if no username)
  user-repos                    List current user repos
  user-orgs                     List current user organizations

REPOSITORY:
  repo <owner> <repo>           Get repository info
  create-repo <name> [opts]     Create user repo
  create-org-repo <org> <name>  Create organization repo
  delete-repo <owner> <repo>    Delete repository
  fork <owner> <repo> [org]     Fork repository
  branches <owner> <repo>       List branches
  commits <owner> <repo> [sha]  List commits (optionally filter by sha/path)
  contents <owner> <repo> [path] [ref]  Get file/directory contents

ISSUES:
  issues <owner> <repo> [state] List issues (state: open/closed/all)
  issue <owner> <repo> <index>  Get issue detail
  create-issue <owner> <repo> <title> [body]  Create issue
  close-issue <owner> <repo> <index>  Close issue

PULL REQUESTS:
  pulls <owner> <repo> [state]  List pull requests
  pull <owner> <repo> <index>   Get pull request detail
  create-pull <owner> <repo> <title> <head:branch> <base:branch> [body]  Create PR
  merge-pull <owner> <repo> <index> [method]  Merge PR (method: merge/rebase/squash)

ORGANIZATION:
  orgs                          List current user organizations
  org <name>                    Get organization info
  org-repos <org>               List organization repositories
  create-org <name> [opts]      Create organization

ADMIN:
  admin-users                   List all users (admin only)
  admin-create-user <username> <email> <password>  Create user (admin only)
  admin-delete-user <username>  Delete user (admin only)

SEARCH:
  search-repos <query>          Search repositories
  search-users <query>          Search users
  search-issues <owner> <repo> <query>  Search issues in repo

EXAMPLES:
  npx tsx gitea.ts user
  npx tsx gitea.ts repos myuser
  npx tsx gitea.ts repo gitea gitea
  npx tsx gitea.ts create-repo myproject '{"private":true}'
  npx tsx gitea.ts issues gitea gitea open
  npx tsx gitea.ts create-pull gitea gitea "Fix bug" "feature/x:main" "main" "PR description"
  npx tsx gitea.ts merge-pull gitea gitea 123
`);
}

// CLI dispatcher
const handlers: Record<string, () => Promise<void>> = {
  // User
  user: () => user(),
  "user-repos": () => userRepos(),
  "user-orgs": () => userOrgs(),

  // Repo
  repo: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: repo <owner> <repo>");
    return repo(args[0], args[1]);
  },
  repos: () => repos(args[0]),
  "create-repo": () => {
    if (!args[0]) throw new Error("Usage: create-repo <name> [opts-json]");
    return createRepo(args[0], args[1] ? JSON.parse(args[1]) : {});
  },
  "create-org-repo": () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: create-org-repo <org> <name>");
    return createOrgRepo(args[0], args[1], args[2] ? JSON.parse(args[2]) : {});
  },
  "delete-repo": () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: delete-repo <owner> <repo>");
    return delRepo(args[0], args[1]);
  },
  fork: () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: fork <owner> <repo> [org]");
    return fork(args[0], args[1], args[2]);
  },
  branches: () => {
    if (!args[0] || !args[1]) throw new Error("Usage: branches <owner> <repo>");
    return branches(args[0], args[1]);
  },
  commits: () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: commits <owner> <repo> [sha]");
    return commits(args[0], args[1], { sha: args[2], path: args[3] });
  },
  contents: () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: contents <owner> <repo> [path] [ref]");
    return contents(args[0], args[1], args[2], args[3]);
  },

  // Issues
  issues: () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: issues <owner> <repo> [state]");
    return issues(args[0], args[1], { state: args[2] });
  },
  issue: () => {
    if (!args[0] || !args[1] || !args[2])
      throw new Error("Usage: issue <owner> <repo> <index>");
    return issue(args[0], args[1], args[2]);
  },
  "create-issue": () => {
    if (!args[0] || !args[1] || !args[2])
      throw new Error("Usage: create-issue <owner> <repo> <title> [body]");
    return createIssue(
      args[0],
      args[1],
      args[2],
      args[3],
      args[4] ? JSON.parse(args[4]) : {},
    );
  },
  "close-issue": () => {
    if (!args[0] || !args[1] || !args[2])
      throw new Error("Usage: close-issue <owner> <repo> <index>");
    return closeIssue(args[0], args[1], args[2]);
  },

  // PRs
  pulls: () => {
    if (!args[0] || !args[1])
      throw new Error("Usage: pulls <owner> <repo> [state]");
    return pulls(args[0], args[1], { state: args[2] });
  },
  pull: () => {
    if (!args[0] || !args[1] || !args[2])
      throw new Error("Usage: pull <owner> <repo> <index>");
    return pull(args[0], args[1], args[2]);
  },
  "create-pull": () => {
    if (!args[0] || !args[1] || !args[2] || !args[3] || !args[4]) {
      throw new Error(
        "Usage: create-pull <owner> <repo> <title> <head:branch> <base:branch> [body]",
      );
    }
    return createPull(args[0], args[1], args[2], args[3], args[4], args[5]);
  },
  "merge-pull": () => {
    if (!args[0] || !args[1] || !args[2])
      throw new Error("Usage: merge-pull <owner> <repo> <index> [method]");
    return mergePull(args[0], args[1], args[2], args[3]);
  },

  // Org
  orgs: () => orgs(),
  org: () => {
    if (!args[0]) throw new Error("Usage: org <name>");
    return org(args[0]);
  },
  "org-repos": () => {
    if (!args[0]) throw new Error("Usage: org-repos <org>");
    return orgRepos(args[0]);
  },
  "create-org": () => {
    if (!args[0]) throw new Error("Usage: create-org <name> [opts-json]");
    return createOrg(args[0], args[1] ? JSON.parse(args[1]) : {});
  },

  // Admin
  "admin-users": () => adminUsers(),
  "admin-create-user": () => {
    if (!args[0] || !args[1] || !args[2]) {
      throw new Error("Usage: admin-create-user <username> <email> <password>");
    }
    return adminCreateUser(args[0], args[1], args[2]);
  },
  "admin-delete-user": () => {
    if (!args[0]) throw new Error("Usage: admin-delete-user <username>");
    return adminDeleteUser(args[0]);
  },

  // Search
  "search-repos": () => {
    if (!args[0]) throw new Error("Usage: search-repos <query>");
    return searchRepos(args[0]);
  },
  "search-users": () => {
    if (!args[0]) throw new Error("Usage: search-users <query>");
    return searchUsers(args[0]);
  },
  "search-issues": () => {
    if (!args[0] || !args[1] || !args[2]) {
      throw new Error("Usage: search-issues <owner> <repo> <query>");
    }
    return searchIssues(args[0], args[1], args[2]);
  },

  help: () => help(),
};

const handler = handlers[action] || help;
handler().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
