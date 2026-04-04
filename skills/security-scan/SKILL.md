---
name: security-scan
description: Use when committing code, reviewing changes, or auditing repositories for leaked secrets, tokens, API keys, passwords, or sensitive configuration files
---

# Security Scan

## Overview

Systematic scan for secrets, tokens, and sensitive data before committing or auditing code. Prevents credential leaks that could compromise services.

## When to Use

- Before committing changes (pre-commit check)
- When reviewing PRs or code changes
- When auditing a repository for security hygiene
- After adding new configuration files or environment variables
- When onboarding to a new project

**Do NOT use for:**
- Runtime security monitoring
- Network security auditing
- Dependency vulnerability scanning (use `npm audit`, `pip audit`, etc.)

## Scan Targets

| Target | Pattern | Examples |
|--------|---------|----------|
| **Tokens** | Hex strings, JWT-like patterns | `8cc4debcd5379d5e453ff40da0835c56d8feb320` |
| **API Keys** | `*_KEY`, `*_API_KEY` env vars | `OPENAI_API_KEY=sk-...` |
| **Passwords** | `password`, `passwd`, `pass` assignments | `"password": "realpass123"` |
| **Secrets** | `*_SECRET`, `*_TOKEN` env vars | `GITHUB_TOKEN=ghp_...` |
| **Credentials** | `.env`, `*credentials*`, `*secret*` files | `.env`, `aws_credentials` |
| **Private Keys** | `-----BEGIN.*PRIVATE KEY-----` | SSH keys, TLS certs |
| **Emails/PII** | Personal emails, phone numbers in code | `287828521@qq.com` |

## Scan Process

### 1. File-Level Scan

Search for sensitive patterns across the codebase:

```bash
# Search for common secret patterns
rg -n "(token|api[_-]?key|secret|password|passwd|private[_-]?key|credential)" --glob "!node_modules" --glob "!.git" --glob "!*.lock"
```

### 2. Git History Scan

Check if secrets were ever committed:

```bash
# Search git history for secrets
git log -p --all -S "token" -- "*.json" "*.env" "*.config.*" "*.yml" "*.yaml"
```

### 3. Config File Audit

Identify config files that should be gitignored:

```bash
# Find config files that might contain secrets
rg --files | rg -i "(\.env|config|secret|credential|\.json|\.yaml|\.yml)" | rg -v "node_modules|\.git|dist|build"
```

### 4. .gitignore Verification

Ensure sensitive files are excluded:

```bash
# Check if .gitignore covers common secret patterns
cat .gitignore | rg -i "(\.env|secret|credential|token|key|password|\.json)"
```

## Common Patterns to Flag

### ❌ Hardcoded Credentials
```typescript
// BAD
const token = "ghp_xxxxxxxxxxxxxxxxxxxx";
const config = { password: "real_password_123" };
```

### ❌ Real Values in Examples/Docs
```json
// BAD
{
  "baseUrl": "http://real-server.com",
  "token": "ee96b34d7f52d9f0863e7bcb0994464a05b5070d"
}
```

### ✅ Safe Patterns
```json
// GOOD
{
  "baseUrl": "http://example.com",
  "token": "your-token-here"
}
```

```typescript
// GOOD - read from environment
const token = process.env.GITHUB_TOKEN;
```

## Remediation

When secrets are found:

1. **Rotate immediately** - Assume the secret is compromised
2. **Remove from code** - Replace with placeholder or env var reference
3. **Add to .gitignore** - Prevent future commits
4. **Use secrets manager** - For production, use vault/secret manager

## Quick Reference

| Issue | Fix |
|-------|-----|
| Token in code | Replace with `process.env.TOKEN_NAME` |
| Token in config JSON | Replace with `"your-token-here"` |
| Config file not gitignored | Add `*.json` or specific filename to `.gitignore` |
| Secret in git history | Use `git filter-repo` or `bfg-repo-cleaner` |
| Password in test fixtures | Use mock/test credentials only |

## Common Mistakes

- **Scanning only current files** - Secrets may be in git history
- **Ignoring documentation** - README/docs often contain real tokens
- **Not rotating found secrets** - Finding a leaked token means it's compromised
- **Trusting .gitignore alone** - Already-committed secrets remain in history
- **Using "example" values that are real** - `test@example.com` may be real

## Red Flags

- Any 40+ character hex string in code
- Base64-encoded strings that decode to credentials
- URLs with embedded credentials (`http://user:pass@host`)
- Files named `.env`, `*secret*`, `*credential*` not in `.gitignore`
- Email addresses that look personal (not `test@`, `user@`, `example@`)
