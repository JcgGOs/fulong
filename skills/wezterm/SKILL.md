---
name: wezterm
description: Use when managing wezterm panes, tabs, windows, or capturing pane screenshots via CLI
---

# Wezterm CLI Tools

PowerShell/CLI tools for controlling wezterm terminal multiplexer operations and pane capture.

## Quick Reference

### CLI Commands

All commands use `wezterm cli`. Use `WEZTERM_PANE` env var or `--pane-id` to target panes.

| Category | Command | Description |
|----------|---------|-------------|
| **List** | `list --format json` | List panes/tabs/windows (JSON) |
| **Split** | `split-pane --horizontal` | Split right |
| | `split-pane --bottom` | Split below (default) |
| | `split-pane --left` | Split left |
| | `split-pane --top` | Split top |
| | `split-pane --top-level --right` | Split full window |
| | `split-pane --cells 40 -- bash -l` | Split with size + custom cmd |
| **Spawn** | `spawn` | New tab in current window |
| | `spawn --new-window` | New window |
| | `spawn --cwd /path -- bash` | Spawn with cwd and command |
| **Focus** | `activate-pane --pane-id N` | Focus a pane by ID |
| | `activate-pane-direction Up/Down/Left/Right/Next/Prev` | Navigate panes |
| **Resize** | `adjust-pane-size Up/Down/Left/Right --amount 5` | Resize by cells |
| **Zoom** | `zoom-pane --toggle` | Toggle pane zoom |
| | `zoom-pane --zoom` / `zoom-pane --unzoom` | Explicit zoom |
| **Text** | `get-text --pane-id N` | Get pane text content |
| | `get-text --start-line -200` | Include scrollback |
| | `get-text --escapes` | Include ANSI escapes |
| | `send-text --pane-id N "cmd"` | Send text to pane |
| | `send-text --pane-id N --no-paste` | Direct send (no bracketed paste) |
| **Kill** | `kill-pane --pane-id N` | Kill a pane |
| **Tabs** | `activate-tab --tab-index 0` | Switch to tab by index |
| | `activate-tab --tab-relative 1` | Next tab (wraps) |
| | `activate-tab --tab-relative -1 --no-wrap` | Prev tab (no wrap) |
| | `set-tab-title "My Tab"` | Rename current tab |
| | `move-pane-to-new-tab` | Detach pane to new tab |
| **Window** | `set-window-title "My Window"` | Rename window |
| **Workspace** | `rename-workspace "work"` | Rename workspace |

### Common Workflows

```bash
# List all panes with details
wezterm cli list --format json | ConvertFrom-Json | Format-Table pane_id, title, is_active

# Split and spawn in specific directory
wezterm cli split-pane --right --cwd "C:/project" -- pwsh.exe

# Get scrollback from a pane
wezterm cli get-text --pane-id 0 --start-line -200

# Send command to a specific pane
wezterm cli send-text --pane-id 1 "git status`n"

# Toggle zoom on active pane
wezterm cli zoom-pane --toggle

# Navigate to pane below and resize it
wezterm cli activate-pane-direction Down
wezterm cli adjust-pane-size Down --amount 5
```

## Pane Capture Tool

The `scripts/wezterm-capture.ps1` script captures screenshots of wezterm panes.

### Usage

```powershell
pwsh.exe scripts/wezterm-capture.ps1                          # Full window screenshot
pwsh.exe scripts/wezterm-capture.ps1 -PaneId 0                # Specific pane by ID
pwsh.exe scripts/wezterm-capture.ps1 -Title "pwsh"            # Panes matching title
pwsh.exe scripts/wezterm-capture.ps1 -List                    # List all panes
pwsh.exe scripts/wezterm-capture.ps1 -PaneId 1 -Open          # Capture + open
```

### Features

- Captures only the pane region (not the full window) when `-PaneId` or `-Title` specified
- Auto-calculates pane pixel position from character cell offset (`left_col`/`top_row`)
- Auto-detects tab bar height for accurate positioning
- Output filenames include timestamp and pane info
- Saves as PNG in current working directory

### Output

```text
pwsh.exe scripts/wezterm-capture.ps1 -PaneId 0

Saved => C:\Users\me\20260531-165050-pane-0-npm-view-version.png
```

## Common Mistakes

- **Wrong pane**: Use `wezterm cli list --format json` (or `-List`) to find the correct `pane_id` before operating on panes
- **Split size**: Omit `--cells`/`--percent` for 50/50 split, or specify exact cells
- **Text paste**: Some programs need `--no-paste` (direct send) instead of bracketed paste
- **Tab navigation**: `--tab-relative` wraps by default; add `--no-wrap` to clamp
