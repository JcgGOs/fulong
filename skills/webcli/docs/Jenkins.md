# Jenkins CLI 文档

Jenkins 命令行工具，支持列出任务、触发构建、查看状态等功能。

## 配置

创建配置文件 `.jenkins.json` 在当前目录或用户主目录：

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

> **注意**：推荐使用 API Token 而非密码。在 Jenkins 中：用户 → 设置 → API Token → 添加新 Token。

---

## 命令

### 列出所有 Jobs

```bash
npx tsx scripts/jenkins.ts list
```

**输出示例**：
```json
{
  "_class": "hudson.model.Hudson",
  "jobs": [
    {
      "_class": "hudson.model.FreeStyleProject",
      "name": "my-project",
      "url": "http://jenkins.example.com/job/my-project/",
      "color": "blue"
    }
  ]
}
```

### 触发构建

```bash
# 无参数构建
npx tsx scripts/jenkins.ts build <job-name>

# 带参数构建
npx tsx scripts/jenkins.ts build <job-name> '{"branch":"main","env":"staging"}'
```

**示例**：
```bash
npx tsx scripts/jenkins.ts build my-project
npx tsx scripts/jenkins.ts build deploy-service '{"branch":"develop"}'
```

### 查看 Job 状态

```bash
npx tsx scripts/jenkins.ts status <job-name>
```

**示例**：
```bash
npx tsx scripts/jenkins.ts status my-project
```

**输出示例**：
```json
{
  "_class": "hudson.model.FreeStyleProject",
  "name": "my-project",
  "url": "http://jenkins.example.com/job/my-project/",
  "color": "blue",
  "lastBuild": {
    "number": 42,
    "result": "SUCCESS",
    "timestamp": 1712345678000,
    "duration": 30000
  }
}
```

---

## 完整命令列表

| 命令 | 描述 |
|------|------|
| `list` | 列出所有 Jobs |
| `build <job> [params]` | 触发构建 |
| `status <job>` | 查看 Job 状态 |

---

## 常见问题

### 认证失败

- 检查 `token` 或 `username/password` 是否正确
- Jenkins API Token 需要在用户设置中生成

### 403 Forbidden

- 检查用户是否有相应的 Job 权限
- 如果使用 CSRF 保护，需要额外配置

### 连接超时

- 检查 `baseUrl` 是否正确
- 检查 Jenkins 服务是否运行
