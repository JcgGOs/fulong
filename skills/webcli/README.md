# Service CLI

极简 TypeScript API CLI 工具集，每个脚本独立运行，零依赖。

## 核心理念

- **极简**: 每个脚本自包含，无共享依赖
- **灵活**: 支持配置文件 + 环境变量
- **HTTP**: 使用原生 fetch API，零依赖

## 安装

无需安装，直接使用 tsx 运行：

```bash
npx tsx ~/.pi/agent/skills/service-cli/scripts/<script>.ts <action> [args]
```

## 配置

每个脚本使用独立的配置文件（当前目录或用户主目录）：

### Gitea (`.gitea.json`)
```json
{
  "baseUrl": "http://nas:8418",
  "token": "your-token"
}
```

### Jenkins (`.jenkins.json`)
```json
{
  "baseUrl": "http://jenkins.example.com",
  "token": "your-api-token"
}
```

或使用用户名密码认证：
```json
{
  "baseUrl": "http://jenkins.example.com",
  "username": "your-username",
  "password": "your-api-token"
}
```

### GitLab (`.gitlab.json`)
```json
{
  "baseUrl": "https://gitlab.example.com",
  "token": "your-private-token"
}
```

## 使用

### Gitea

支持 Gitea API v1.25.4。详见 [Gitea.md](docs/Gitea.md)。

```bash
# === USER ===
npx tsx scripts/gitea.ts user                    # 获取当前用户
npx tsx scripts/gitea.ts repos [username]        # 列出用户仓库
npx tsx scripts/gitea.ts user-orgs               # 列出用户组织

# === REPOSITORY ===
npx tsx scripts/gitea.ts repo <owner> <repo>              # 获取仓库信息
npx tsx scripts/gitea.ts create-repo <name> [opts]        # 创建仓库
npx tsx scripts/gitea.ts create-org-repo <org> <name>     # 创建组织仓库
npx tsx scripts/gitea.ts delete-repo <owner> <repo>       # 删除仓库
npx tsx scripts/gitea.ts fork <owner> <repo> [org]        # Fork 仓库
npx tsx scripts/gitea.ts branches <owner> <repo>          # 列出分支
npx tsx scripts/gitea.ts commits <owner> <repo> [sha]     # 列出提交
npx tsx scripts/gitea.ts contents <owner> <repo> [path] [ref]  # 获取文件内容

# === ISSUES ===
npx tsx scripts/gitea.ts issues <owner> <repo> [state]           # 列出 Issues
npx tsx scripts/gitea.ts issue <owner> <repo> <index>            # 获取 Issue 详情
npx tsx scripts/gitea.ts create-issue <owner> <repo> <title> [body]  # 创建 Issue
npx tsx scripts/gitea.ts close-issue <owner> <repo> <index>      # 关闭 Issue

# === PULL REQUESTS ===
npx tsx scripts/gitea.ts pulls <owner> <repo> [state]              # 列出 PRs
npx tsx scripts/gitea.ts pull <owner> <repo> <index>               # 获取 PR 详情
npx tsx scripts/gitea.ts create-pull <owner> <repo> <title> <head> <base> [body]  # 创建 PR
npx tsx scripts/gitea.ts merge-pull <owner> <repo> <index> [method]  # 合并 PR

# === ORGANIZATION ===
npx tsx scripts/gitea.ts orgs                      # 列出用户组织
npx tsx scripts/gitea.ts org <name>                # 获取组织信息
npx tsx scripts/gitea.ts org-repos <org>           # 列出组织仓库
npx tsx scripts/gitea.ts create-org <name> [opts]  # 创建组织

# === ADMIN ===
npx tsx scripts/gitea.ts admin-users                         # 列出所有用户
npx tsx scripts/gitea.ts admin-create-user <username> <email> <password>  # 创建用户
npx tsx scripts/gitea.ts admin-delete-user <username>        # 删除用户

# === SEARCH ===
npx tsx scripts/gitea.ts search-repos <query>              # 搜索仓库
npx tsx scripts/gitea.ts search-users <query>              # 搜索用户
npx tsx scripts/gitea.ts search-issues <owner> <repo> <query>  # 搜索 Issues
```

### Jenkins

详见 [Jenkins.md](docs/Jenkins.md)。

```bash
# 列出所有 jobs
npx tsx scripts/jenkins.ts list

# 触发构建
npx tsx scripts/jenkins.ts build my-job
npx tsx scripts/jenkins.ts build my-job '{"branch":"main"}'

# 查看 job 状态
npx tsx scripts/jenkins.ts status my-job
```

### GitLab

详见 [GitLab.md](docs/GitLab.md)。

```bash
# 列出项目
npx tsx scripts/gitlab.ts projects

# 创建项目
npx tsx scripts/gitlab.ts project my-project

# 查看 issues
npx tsx scripts/gitlab.ts issues
npx tsx scripts/gitlab.ts issues "group/project"
```

### Weather

```bash
# 使用 wttr.in (无需配置)
npx tsx scripts/weather.ts wttr Beijing

# 使用 OpenWeatherMap (需配置 api key)
npx tsx scripts/weather.ts open Shanghai
```

## 扩展

基于现有模式快速创建新脚本：

```typescript
#!/usr/bin/env tsx
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

// 1. 定义配置接口
interface Config { baseUrl: string; token?: string; }

// 2. 加载配置
function loadConfig(): Config | null { /* ... */ }

// 3. 实现 _request 函数
async function _request(method: string, endpoint: string, body?: unknown) { /* ... */ }

// 4. 实现业务逻辑
async function myAction() { /* ... */ }

// 5. CLI 入口
const [,, action, ...args] = process.argv;
// switch/case 或 handlers 对象
```
