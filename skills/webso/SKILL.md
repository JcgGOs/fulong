---
name: webso
description: Use when searching the web via CLI - unified interface for 11 search backends with auto-failover, multi-key load balancing, and JSON output for LLM consumption
---

# Webso - Unified Web Search CLI

## Overview

Single CLI tool with 11 search backends, automatic failover, and multi-key load balancing. Designed for LLM consumption with JSON output.

## Providers

| Provider | Auth Env | Notes |
|----------|----------|-------|
| exa | `EXA_API_KEY` | |
| brave | `BRAVE_API_KEY` | |
| jina | `JINA_API_KEY` | |
| kimi | `MOONSHOT_API_KEY` | |
| zai | `ZAI_API_KEY` | |
| perplexity | `PERPLEXITY_API_KEY` | Returns answer + citations |
| tavily | `TAVILY_API_KEY` | |
| parallel | `PARALLEL_API_KEY` | |
| kagi | `KAGI_API_KEY` | |
| synthetic | `SYNTHETIC_API_KEY` | |
| searxng | `SEARXNG_URL` | Self-hosted, no auth |

## Usage

```bash
# Basic search (auto-failover through chain)
BRAVE_API_KEY=xxx webso "rust async runtime"

# Pin provider
webso --provider tavily "news today"

# JSON output (for scripts/LLMs)
webso --json "query"

# List providers & key status
webso --list

# Max results
webso --max 10 "query"
```

## Multi-Key Support

Comma-separated keys for load balancing:

```bash
BRAVE_API_KEY="key1,key2,key3" webso "query"
```

## Config Files

Priority: `.webso.json` (cwd) → `~/.agents/webso.json` → env vars

```json
{
  "providers": {
    "brave": {
      "keys": ["key1", "key2"],
      "load_balance": "round_robin",
      "enabled": true,
      "timeout": 30
    }
  },
  "failover": true,
  "chain": ["brave", "tavily", "exa"]
}
```

## Load Balancing Strategies

- `first` - Always use first key
- `round_robin` - Rotate through keys (default)
- `random` - Random key selection

## Failover

Auto mode tries providers in chain order. On failure/timeout, moves to next.

```
brave → tavily → exa → jina → ...
```

## Build from Source

```bash
git clone http://nas:8418/tao/webso.git
cd webso
cargo build --release
cp target/release/webso /usr/local/bin/
```

## Output Format

### Default (human-readable)
```
── brave (5 results, 2251ms) ──
  1. Title Here
     https://example.com
     Snippet text...
```

### JSON (--json)
```json
[{
  "provider": "brave",
  "results": [{"title": "...", "url": "...", "snippet": "..."}],
  "elapsed_ms": 2251
}]
```
