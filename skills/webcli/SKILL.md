---
name: webcli
description: |
  Service CLI tools for interacting with various APIs via native fetch.
  - jenkins.ts - Jenkins REST API + 飞书通知
  - gitea.ts - Gitea API (v1.25.4)
  - gitlab.ts - GitLab REST API
  - gitee.ts - Gitee API (v5)
  - weather.ts - Weather via wttr.in
---

# Web CLI Tools

TypeScript CLI tools for interacting with service APIs using native `fetch`. No external dependencies beyond `tsx`.

## Scripts

| Tool | Script Path | Description |
|------|-------------|-------------|
| Jenkins | `scripts/jenkins.ts` | Jenkins REST API + 飞书通知 |
| Gitea | `scripts/gitea.ts` | Gitea API (v1.25.4) |
| GitLab | `scripts/gitlab.ts` | GitLab REST API |
| Gitee | `scripts/gitee.ts` | Gitee API (v5) |
| Weather | `scripts/weather.ts` | Weather via wttr.in |

## Jenkins CLI

### Configuration

Jenkins: `.jenkins.json`
```json
{
  "baseUrl": "https://jenkins.example.com",
  "username": "user",
  "token": "password-or-token",
  "timeout": 600,
  "tasks": {
    "dev": { "job": "folder/job", "params": { "BRANCH": "develop" }, "timeout": 700 },
    "sit": { "job": "folder/job", "params": { "BRANCH": "sit" } }
  }
}
```

飞书通知 (可选): `.fsbot.json`
```json
{
  "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxx",
  "secret": ""
}
```

### Commands

```bash
npx tsx scripts/jenkins.ts jobs                       # 列出所有 jobs (JSON)
npx tsx scripts/jenkins.ts info <job>                  # job 详情
npx tsx scripts/jenkins.ts params <job>                # 查看构建参数 (JSON)
npx tsx scripts/jenkins.ts build <job> [-p k=v]        # 触发构建并监控
npx tsx scripts/jenkins.ts status <job> [num]          # 查看构建状态
npx tsx scripts/jenkins.ts log <job> [num]            # 查看构建日志
npx tsx scripts/jenkins.ts tasks                       # 列出已配置任务
npx tsx scripts/jenkins.ts alias <name>               # 执行已配置任务
npx tsx scripts/jenkins.ts help                       # 帮助
```

### Features

- 触发构建后自动监控直到完成
- 支持超时检测 (默认 600s，可全局或任务级别配置)
- 自动发送飞书通知: 成功/失败/超时
- 从 Jenkins 队列 API 获取准确构建号
- JSON 格式输出，便于脚本处理

### Examples

```bash
# 列出所有 jobs
npx tsx scripts/jenkins.ts jobs

# 查看构建参数
npx tsx scripts/jenkins.ts params ees/ees-dev/bc-account

# 触发构建
npx tsx scripts/jenkins.ts build ees/ees-dev/bc-account -p BRANCH=develop

# 执行已配置任务
npx tsx scripts/jenkins.ts alias dev

# 查看状态
npx tsx scripts/jenkins.ts status ees/ees-dev/bc-account
npx tsx scripts/jenkins.ts log ees/ees-dev/bc-account 2360
```

### Output Examples

```bash
# jobs 输出
npx tsx scripts/jenkins.ts jobs
[
  { "type": "folder", "name": "ees", "path": "/ees" },
  { "type": "job", "name": "bc-account", "path": "ees/ees-dev/bc-account", "status": "blue" }
]

# params 输出
npx tsx scripts/jenkins.ts params ees/devops-tools/nexus-upload-snapshot
[
  { "name": "PROJECT_NAME", "type": "StringParameterDefinition", "description": "请输入工程名" },
  { "name": "BRANCH", "type": "ChoiceParameterDefinition", "choices": ["develop", "sit"] }
]

# build 输出
触发: ees/devops-tools/nexus-upload-snapshot
Build #1038 进行中... (超时: 200s)
...........#1038 成功 (58.4s)
📱 飞书通知已发送
```

---

## Other Tools

### Gitea (`scripts/gitea.ts`)

```bash
npx tsx scripts/gitea.ts user                            # Get current user
npx tsx scripts/gitea.ts repos [username]                # List repos
npx tsx scripts/gitea.ts repo <owner> <repo>             # Get repo info
npx tsx scripts/gitea.ts create-repo <name> [opts]       # Create repo
npx tsx scripts/gitea.ts delete-repo <owner> <repo>      # Delete repo
npx tsx scripts/gitea.ts branches <owner> <repo>          # List branches
npx tsx scripts/gitea.ts commits <owner> <repo> [sha]    # List commits
npx tsx scripts/gitea.ts issues <owner> <repo> [state]   # List issues
npx tsx scripts/gitea.ts pulls <owner> <repo> [state]    # List pull requests
npx tsx scripts/gitea.ts create-pull <owner> <repo> <title> <head> <base>
npx tsx scripts/gitea.ts merge-pull <owner> <repo> <index> [method]
npx tsx scripts/gitea.ts search-repos <query>            # Search repos
npx tsx scripts/gitea.ts orgs                            # List organizations
npx tsx scripts/gitea.ts admin-users                     # List all users (admin)
```

### GitLab (`scripts/gitlab.ts`)

```bash
npx tsx scripts/gitlab.ts user                           # Get current user
npx tsx scripts/gitlab.ts projects [opts]                 # List projects
npx tsx scripts/gitlab.ts project <id>                   # Get project
npx tsx scripts/gitlab.ts create-project <name> [opts]   # Create project
npx tsx scripts/gitlab.ts branches <projectId>           # List branches
npx tsx scripts/gitlab.ts commits <projectId> [opts]    # List commits
npx tsx scripts/gitlab.ts issues <projectId> [opts]      # List issues
npx tsx scripts/gitlab.ts create-issue <projectId> <title> [opts]
npx tsx scripts/gitlab.ts mrs <projectId> [opts]         # List merge requests
npx tsx scripts/gitlab.ts create-mr <projectId> <src> <target> <title> [opts]
npx tsx scripts/gitlab.ts accept-mr <projectId> <iid>    # Merge MR
npx tsx scripts/gitlab.ts pipelines <projectId> [opts]  # List pipelines
npx tsx scripts/gitlab.ts groups [opts]                  # List groups
npx tsx scripts/gitlab.ts runners [opts]                # List runners
npx tsx scripts/gitlab.ts version                        # Get GitLab version
```

### Gitee (`scripts/gitee.ts`)

```bash
npx tsx scripts/gitee.ts user                            # Get current user
npx tsx scripts/gitee.ts user-repos [type] [sort]        # List user repos
npx tsx scripts/gitee.ts repo <owner> <repo>             # Get repo info
npx tsx scripts/gitee.ts create-repo <name> [opts]       # Create repo
npx tsx scripts/gitee.ts branches <owner> <repo>         # List branches
npx tsx scripts/gitee.ts commits <owner> <repo> [sha]    # List commits
npx tsx scripts/gitee.ts issues <owner> <repo> [state]  # List issues
npx tsx scripts/gitee.ts create-issue <owner> <repo> <title> [opts]
npx tsx scripts/gitee.ts pulls <owner> <repo> [state]   # List pull requests
npx tsx scripts/gitee.ts create-pull <owner> <repo> <title> <head> <base> [opts]
npx tsx scripts/gitee.ts merge-pull <owner> <repo> <number> [method]
npx tsx scripts/gitee.ts search-repos <query> [opts]    # Search repos
npx tsx scripts/gitee.ts releases <owner> <repo>        # List releases
npx tsx scripts/gitee.ts webhooks <owner> <repo>        # List webhooks
npx tsx scripts/gitee.ts star <owner> <repo>           # Star a repo
```

### Weather (`scripts/weather.ts`)

```bash
npx tsx scripts/weather.ts wttr beijing      # Beijing weather
npx tsx scripts/weather.ts wttr shanghai    # Shanghai weather
```

## Configuration

Each tool reads its config from a JSON file in the current working directory or home directory:

| Tool | Config File | Required Fields |
|------|-------------|-----------------|
| `scripts/jenkins.ts` | `.jenkins.json` | `baseUrl`, `token` |
| `scripts/gitea.ts` | `.gitea.json` | `baseUrl`, `token` |
| `scripts/gitlab.ts` | `.gitlab.json` | `baseUrl`, `token` |
| `scripts/gitee.ts` | `.gitee.json` | `baseUrl`, `token` |

Example `.gitea.json`:
```json
{
  "baseUrl": "http://nas:8418",
  "token": "your-token-here"
}
```
