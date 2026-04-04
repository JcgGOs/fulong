---
name: webcli
description: |
 - jenkins.ts
 - gitea.ts
 - gitlab.ts
 - weather.ts
---

# .agent Tools Skill

简洁的 TypeScript .agent CLI 工具集，专注于极简实现。

## 核心理念

- **极简**: 每个脚本 < 50 行
- **复用**: 通用逻辑抽取到 lib
- **灵活**: 支持配置文件 + 环境变量
- **HTTP**: 使用 fetch .agent，兼容性强

## 快速开始

```bash
# 执行任意脚本
npx tsx ~/.agent/agent/skills/service-cli/scripts/<script>.ts action [args]

# 示例：HTTP GET
npx tsx ~/.agent/agent/skills/service-cli/scripts/jenins.ts list

# 示例：HTTP POST
npx tsx ~/.agent/agent/skills/service-cli/scripts/gitea.ts repo '{"name":"test"}'
npx tsx ~/.agent/agent/skills/service-cli/scripts/gitlab.ts repo '{"name":"test"}'
npx tsx ~/.agent/agent/skills/service-cli/scripts/weather.ts wttr Beijing
```

## 天气查询 (weather.ts)

使用 wttr.in 服务查询天气，无需 .agent Key。

```bash
# 查询天气（建议使用城市拼音）
npx tsx weather.ts wttr beijing      # 北京
npx tsx weather.ts wttr shanghai     # 上海
npx tsx weather.ts wttr kaijiang     # 开江

# 注意：部分城市使用中文名称可能查询失败，建议统一使用拼音
```

### 注意事项
- **城市名称**：建议优先使用拼音（如 `beijing`、`shanghai`、`kaijiang`），以确保查询稳定性
- **天气图标**：支持终端显示 emoji 天气图标
- **数据来源**：wttr.in（聚合多个气象数据源）
