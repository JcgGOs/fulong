# GitLab CLI 文档

GitLab 命令行工具，支持项目管理、Issue 跟踪等功能。

## 配置

创建配置文件 `.gitlab.json` 在当前目录或用户主目录：

```json
{
  "baseUrl": "https://gitlab.example.com",
  "token": "your-private-token"
}
```

> **注意**：Token 需要在 GitLab 中生成 Personal Access Token。路径：用户设置 → Access Tokens → 勾选 `api` scope。

---

## 命令

### 列出项目

```bash
# 列出我有权限的项目
npx tsx scripts/gitlab.ts projects
```

**输出示例**：
```json
[
  {
    "id": 1,
    "name": "my-project",
    "path_with_namespace": "group/my-project",
    "visibility": "private",
    "web_url": "https://gitlab.example.com/group/my-project",
    "default_branch": "main"
  }
]
```

### 创建项目

```bash
# 创建项目
npx tsx scripts/gitlab.ts project <name>

# 带选项创建
npx tsx scripts/gitlab.ts project <name> '{"namespace_id":123,"visibility":"private"}'
```

**示例**：
```bash
npx tsx scripts/gitlab.ts project my-new-project
npx tsx scripts/gitlab.ts project my-new-project '{"visibility":"private","description":"My project"}'
```

**选项**：
- `namespace_id`: 命名空间 ID（组或用户）
- `visibility`: 可见性 (`private`, `internal`, `public`)
- `description`: 项目描述

### 查看 Issues

```bash
# 查看所有分配的 Issues
npx tsx scripts/gitlab.ts issues

# 查看指定项目的 Issues
npx tsx scripts/gitlab.ts issues "<project-path>"
```

**示例**：
```bash
npx tsx scripts/gitlab.ts issues
npx tsx scripts/gitlab.ts issues "group/my-project"
npx tsx scripts/gitlab.ts issues "123"  # 使用项目 ID
```

---

## 完整命令列表

| 命令 | 描述 |
|------|------|
| `projects` | 列出项目 |
| `project <name> [options]` | 创建项目 |
| `issues [projectId]` | 查看 Issues |

---

## 常见问题

### 401 Unauthorized

- 检查 `token` 是否正确
- 确认 Token 具有 `api` scope

### 404 Not Found

- 检查项目名称/路径是否正确
- 确认是否有访问权限

### 连接失败

- 检查 `baseUrl` 是否正确
- 确认 GitLab 服务是否运行
