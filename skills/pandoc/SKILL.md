---
name: pandoc
description: Convert documents between various markup formats using Pandoc. Use when converting between Markdown, HTML, LaTeX, DOCX, PDF, EPUB, and other document formats.
---

# Pandoc Document Converter

## Overview
Pandoc is a universal document converter. Use this skill for document format conversion tasks.

## Quick Start

### Basic Conversion
```bash
pandoc -f INPUT_FORMAT -t OUTPUT_FORMAT input -o output
```

### Common Conversions
```bash
# HTML to Markdown
pandoc -f html -t markdown input.html -o output.md

# Markdown to HTML
pandoc input.md -o output.html

# Markdown to PDF
pandoc input.md -o output.pdf

# Markdown to DOCX
pandoc input.md -o output.docx

# DOCX to Markdown
pandoc input.docx -o output.md
```

## Key Options

| Option | Description |
|--------|-------------|
| `-f, --from=FORMAT` | Input format |
| `-t, --to=FORMAT` | Output format |
| `-o FILE` | Output file |
| `-s, --standalone` | Include header/footer |
| `--toc` | Add table of contents |
| `--pdf-engine=ENGINE` | PDF engine (pdflatex, xelatex, weasyprint) |
| `--citeproc` | Process citations |
| `--bibliography=FILE` | Bibliography file |
| `--css=FILE` | CSS stylesheet |
| `--template=FILE` | Custom template |

## Common Workflows

### Web Page to Markdown
```bash
curl -k URL | pandoc -f html -t markdown -o output.md
```

### With Table of Contents
```bash
pandoc -s --toc input.md -o output.html
```

### With Citations
```bash
pandoc --citeproc --bibliography=refs.bib input.md -o output.html
```

### Multi-file Document
```bash
pandoc chap1.md chap2.md chap3.md -s -o book.html
```

### Self-contained HTML
```bash
pandoc --self-contained input.md -o output.html
```

## Supported Formats

### Input
markdown, html, latex, docx, org, rst, mediawiki, ipynb, epub, odt, and more

### Output
markdown, html, latex, pdf, docx, epub, odt, pptx, ipynb, and more

Full lists: `pandoc --list-input-formats` / `pandoc --list-output-formats`

## Installation

Pandoc must be installed on the system. See reference files for platform-specific instructions:

- **Windows**: See `reference/windows-install.md`
- **macOS**: See `reference/macos-install.md`  
- **Linux**: See `reference/linux-install.md`

Quick install commands:
```bash
# Windows (winget)
winget install JohnMacFarlane.Pandoc

# macOS (Homebrew)
brew install pandoc

# Ubuntu/Debian
sudo apt install pandoc
```

## Notes

- Input from stdin if no files specified
- Output to stdout if no `-o` specified
- UTF-8 encoding by default
- File extensions determine format if not specified explicitly
- PDF generation requires a PDF engine (LaTeX recommended)
