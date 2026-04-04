# Gitea CLI 文档

Gitea API (v1.25.4) 命令行工具，支持完整的仓库、Issue、PR、组织管理等功能。

## 配置

创建配置文件 `.gitea.json` 在当前目录或用户主目录：

```json
{
  "baseUrl": "http://nas:8418",
  "token": "<Token>"
}
```

---

## 用户操作

### 获取当前用户信息

```bash
npx tsx scripts/gitea.ts user
```

**输出示例**：
```json
{
  "id": 1,
  "login": "example",
  "email": "example@qq.com",
  "avatar_url": "http://nas:8418/avatars/acf8427ee10d91a7880f54d61079d4a4",
  "html_url": "http://nas:8418/example",
  "is_admin": true,
  "created": "2024-12-22T19:11:53+08:00"
}
```

### 列出用户仓库

```bash
# 当前用户的仓库
npx tsx scripts/gitea.ts repos

# 指定用户的仓库
npx tsx scripts/gitea.ts repos tao
```

### 列出用户组织

```bash
npx tsx scripts/gitea.ts user-orgs
```

---

## 仓库操作

### 获取仓库信息

```bash
npx tsx scripts/gitea.ts repo <owner> <repo>

# 示例
npx tsx scripts/gitea.ts repo org open-integration
```

**输出示例**：
```json
{
  "id": 4,
  "name": "open-integration",
  "full_name": "example/open-integration",
  "description": "",
  "private": false,
  "html_url": "http://nas:8418/org/open-integration",
  "clone_url": "http://nas:8418/org/open-integration.git",
  "default_branch": "develop",
  "language": "Java",
  "size": 1298
}
```

### 列出分支

```bash
npx tsx scripts/gitea.ts branches <owner> <repo>

# 示例
npx tsx scripts/gitea.ts branches org open-integration
```

**输出示例**：
```json
[
  {
    "name": "develop",
    "commit": {
      "id": "e1973574af9d132ec932abbdba25a802c288c32e",
      "message": "Merge branch 'dev-example' into 'develop'",
      "timestamp": "2025-02-26T15:40:39+08:00"
    },
    "protected": false
  }
]
```

### 列出提交

```bash
npx tsx scripts/gitea.ts commits <owner> <repo> [sha] [path]

# 示例
npx tsx scripts/gitea.ts commits org open-integration
npx tsx scripts/gitea.ts commits org open-integration develop
```

### 获取文件内容

```bash
npx tsx scripts/gitea.ts contents <owner> <repo> [path] [ref]

# 示例
npx tsx scripts/gitea.ts contents org open-integration README.md develop
npx tsx scripts/gitea.ts contents org open-integration src/main/java develop
```

### 创建仓库

```bash
npx tsx scripts/gitea.ts create-repo <name> [options-json]

# 示例
npx tsx scripts/gitea.ts create-repo myproject
npx tsx scripts/gitea.ts create-repo myproject '{"private":true,"description":"My project"}'
```

**选项**：
- `private`: 是否私有仓库 (默认: false)
- `description`: 仓库描述
- `readme`: 初始化 README (默认: "default")

### 创建组织仓库

```bash
npx tsx scripts/gitea.ts create-org-repo <org> <name> [options-json]

# 示例
npx tsx scripts/gitea.ts create-org-repo hm myproject '{"private":true}'
```

### Fork 仓库

```bash
npx tsx scripts/gitea.ts fork <owner> <repo> [target-org]

# 示例
npx tsx scripts/gitea.ts fork org open-integration
npx tsx scripts/gitea.ts fork org open-integration hm
```

### 删除仓库

```bash
npx tsx scripts/gitea.ts delete-repo <owner> <repo>

# 示例
npx tsx scripts/gitea.ts delete-repo tao myproject
```

---

## Issue 操作

### 列出 Issues

```bash
npx tsx scripts/gitea.ts issues <owner> <repo> [state]

# 示例
npx tsx scripts/gitea.ts issues org open-integration
npx tsx scripts/gitea.ts issues org open-integration open
npx tsx scripts/gitea.ts issues org open-integration closed
```

### 获取 Issue 详情

```bash
npx tsx scripts/gitea.ts issue <owner> <repo> <index>

# 示例
npx tsx scripts/gitea.ts issue org open-integration 1
```

### 创建 Issue

```bash
npx tsx scripts/gitea.ts create-issue <owner> <repo> <title> [body] [options-json]

# 示例
npx tsx scripts/gitea.ts create-issue org open-integration "Bug Report" "Found a bug in the code"
npx tsx scripts/gitea.ts create-issue org open-integration "Feature Request" "" '{"labels":["enhancement"]}'
```

### 关闭 Issue

```bash
npx tsx scripts/gitea.ts close-issue <owner> <repo> <index>

# 示例
npx tsx scripts/gitea.ts close-issue org open-integration 1
```

---

## Pull Request 操作

### 列出 Pull Requests

```bash
npx tsx scripts/gitea.ts pulls <owner> <repo> [state]

# 示例
npx tsx scripts/gitea.ts pulls org open-integration
npx tsx scripts/gitea.ts pulls org open-integration open
```

### 获取 PR 详情

```bash
npx tsx scripts/gitea.ts pull <owner> <repo> <index>

# 示例
npx tsx scripts/gitea.ts pull org open-integration 1
```

### 创建 Pull Request

```bash
npx tsx scripts/gitea.ts create-pull <owner> <repo> <title> <head> <base> [body]

# 示例
npx tsx scripts/gitea.ts create-pull org open-integration "Fix bug" "feature/fix-login:develop" "develop" "修复登录问题"
```

- `head`: 源分支（格式：`branch` 或 `owner:branch`）
- `base`: 目标分支

### 合并 Pull Request

```bash
npx tsx scripts/gitea.ts merge-pull <owner> <repo> <index> [method]

# 示例
npx tsx scripts/gitea.ts merge-pull org open-integration 1
npx tsx scripts/gitea.ts merge-pull org open-integration 1 squash
npx tsx scripts/gitea.ts merge-pull org open-integration 1 rebase
```

**合并方法**：
- `merge`: 合并提交 (默认)
- `squash`: 压缩提交
- `rebase`: 变基合并

---

## 组织操作

### 列出组织

```bash
npx tsx scripts/gitea.ts orgs
```

**输出示例**：
```json
[
  {
    "id": 2,
    "name": "hm",
    "description": "",
    "visibility": "limited",
    "username": "hm"
  },
  {
    "id": 3,
    "name": "org",
    "description": "",
    "visibility": "limited",
    "username": "org"
  }
]
```

### 获取组织信息

```bash
npx tsx scripts/gitea.ts org <name>

# 示例
npx tsx scripts/gitea.ts org hm
```

### 列出组织仓库

```bash
npx tsx scripts/gitea.ts org-repos <org>

# 示例
npx tsx scripts/gitea.ts org-repos hm
```

### 创建组织

```bash
npx tsx scripts/gitea.ts create-org <name> [options-json]

# 示例
npx tsx scripts/gitea.ts create-org myorg
npx tsx scripts/gitea.ts create-org myorg '{"description":"My organization","visibility":"public"}'
```

---

## 搜索操作

### 搜索仓库

```bash
npx tsx scripts/gitea.ts search-repos <query>

# 示例
npx tsx scripts/gitea.ts search-repos open
```

**输出示例**：
```json
{
  "ok": true,
  "data": [
    {
      "id": 4,
      "name": "open-integration",
      "full_name": "org/open-integration",
      "description": "",
      "language": "Java"
    }
  ]
}
```

### 搜索用户

```bash
npx tsx scripts/gitea.ts search-users <query>

# 示例
npx tsx scripts/gitea.ts search-users tao
```

### 搜索 Issues

```bash
npx tsx scripts/gitea.ts search-issues <owner> <repo> <query>

# 示例
npx tsx scripts/gitea.ts search-issues org open-integration bug
```

---

## 管理员操作

> 需要管理员权限

### 列出所有用户

```bash
npx tsx scripts/gitea.ts admin-users
```

### 创建用户

```bash
npx tsx scripts/gitea.ts admin-create-user <username> <email> <password>

# 示例
npx tsx scripts/gitea.ts admin-create-user newuser user@example.com Password123
```

### 删除用户

```bash
npx tsx scripts/gitea.ts admin-delete-user <username>

# 示例
npx tsx scripts/gitea.ts admin-delete-user olduser
```

---

## 完整命令列表

| 命令 | 描述 |
|------|------|
| **User** | |
| `user` | 获取当前用户信息 |
| `repos [username]` | 列出用户仓库 |
| `user-orgs` | 列出当前用户组织 |
| **Repository** | |
| `repo <owner> <repo>` | 获取仓库信息 |
| `create-repo <name>` | 创建仓库 |
| `create-org-repo <org> <name>` | 创建组织仓库 |
| `delete-repo <owner> <repo>` | 删除仓库 |
| `fork <owner> <repo> [org]` | Fork 仓库 |
| `branches <owner> <repo>` | 列出分支 |
| `commits <owner> <repo> [sha]` | 列出提交 |
| `contents <owner> <repo> [path] [ref]` | 获取文件内容 |
| **Issue** | |
| `issues <owner> <repo> [state]` | 列出 Issues |
| `issue <owner> <repo> <index>` | 获取 Issue 详情 |
| `create-issue <owner> <repo> <title>` | 创建 Issue |
| `close-issue <owner> <repo> <index>` | 关闭 Issue |
| **Pull Request** | |
| `pulls <owner> <repo> [state]` | 列出 PRs |
| `pull <owner> <repo> <index>` | 获取 PR 详情 |
| `create-pull <owner> <repo> <title> <head> <base>` | 创建 PR |
| `merge-pull <owner> <repo> <index> [method]` | 合并 PR |
| **Organization** | |
| `orgs` | 列出组织 |
| `org <name>` | 获取组织信息 |
| `org-repos <org>` | 列出组织仓库 |
| `create-org <name>` | 创建组织 |
| **Search** | |
| `search-repos <query>` | 搜索仓库 |
| `search-users <query>` | 搜索用户 |
| `search-issues <owner> <repo> <query>` | 搜索 Issues |
| **Admin** | |
| `admin-users` | 列出所有用户 |
| `admin-create-user <u> <e> <p>` | 创建用户 |
| `admin-delete-user <username>` | 删除用户 |

---

## 验证记录

以下操作已在 `http://nas:8418` 上验证通过（2026-04-05）：

✅ **已验证功能**：
- `user` - 获取当前用户信息
- `repos` - 列出仓库
- `user-orgs` - 列出用户组织
- `repo` - 获取仓库详情
- `branches` - 列出分支
- `commits` - 列出提交
- `contents` - 获取文件内容
- `issues` - 列出 Issues
- `pulls` - 列出 PRs
- `orgs` - 列出组织
- `org` - 获取组织详情
- `org-repos` - 列出组织仓库
- `search-repos` - 搜索仓库
- `search-users` - 搜索用户
- `admin-users` - 列出所有用户

✅ **已验证写操作**：
- `create-repo` - 创建仓库 ✅
- `create-issue` - 创建 Issue ✅
- `close-issue` - 关闭 Issue ✅
- `create-pull` - 创建 PR ✅
- `merge-pull` - 合并 PR ✅
- `create-org` - 创建组织 ✅
- `admin-create-user` - 创建用户 ✅
- `delete-repo` - 删除仓库 ✅
- `admin-delete-user` - 删除用户 ✅

---

## 常见问题

### Token 权限错误

如果遇到 `HTTP 403: token does not have at least one of required scope(s)`，需要在 Gitea 中生成具有相应 scope 的 Token：

1. 进入 Gitea Web 界面
2. 点击头像 → 设置 → 应用
3. 生成 Token，勾选需要的 scope：
   - 读取操作：`read:repository`, `read:user`, `read:organization`
   - 写入操作：`write:repository`, `write:user`, `write:issue`, `write:pull_request`
   - 管理员操作：`admin:user`

### 404 Not Found

- 检查仓库/组织名称是否正确
- 检查是否有访问权限（私有仓库需要相应权限）

### 无法连接到服务器

- 检查 `baseUrl` 是否正确
- 检查网络连接
- 检查 Gitea 服务是否运行
