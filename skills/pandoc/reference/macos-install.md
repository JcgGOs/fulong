# Pandoc Installation Guide for macOS

## Prerequisites
- macOS 10.12 (Sierra) or later
- Homebrew (recommended) or MacPorts

## Installation Methods

### Method 1: Using Homebrew (Recommended)

Homebrew is the most popular package manager for macOS.

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Pandoc:**
   ```bash
   brew install pandoc
   ```

3. **Verify Installation:**
   ```bash
   pandoc --version
   ```

**Advantages:**
- Easy installation and updates
- Manages dependencies automatically
- Large community support

### Method 2: Using MacPorts

MacPorts is an alternative package manager for macOS.

1. **Install MacPorts:**
   - Download from: https://www.macports.org/install.php
   - Follow the installation instructions for your macOS version

2. **Install Pandoc:**
   ```bash
   sudo port install pandoc
   ```

3. **Verify Installation:**
   ```bash
   pandoc --version
   ```

### Method 3: Using the.pkg Installer

1. **Download the installer:**
   - Visit: https://pandoc.org/installing.html
   - Download the macOS `.pkg` installer

2. **Run the installer:**
   - Double-click the `.pkg` file
   - Follow the installation wizard
   - Pandoc will be installed to `/usr/local/bin/`

3. **Verify Installation:**
   ```bash
   pandoc --version
   ```

## Install PDF Engine (Optional)

For PDF generation, you need a PDF engine. LaTeX is the most common choice.

### BasicTeX (Recommended - Smaller)

BasicTeX is a minimal LaTeX distribution (~100MB vs ~4GB for full MacTeX).

1. **Install BasicTeX:**
   ```bash
   brew install --cask basictex
   ```

2. **Add to PATH:**
   ```bash
   export PATH="/Library/TeX/texbin:$PATH"
   ```
   Add this line to your `~/.zshrc` or `~/.bash_profile` to make it permanent.

3. **Install required packages:**
   ```bash
   sudo tlmgr update --self
   sudo tlmgr install scheme-basic
   ```

4. **Verify Installation:**
   ```bash
   pdflatex --version
   ```

### MacTeX (Full LaTeX Distribution)

MacTeX is the complete LaTeX distribution (~4GB).

1. **Install MacTeX:**
   ```bash
   brew install --cask mactex
   ```
   
   Or download from: https://www.tug.org/mactex/

2. **Add to PATH:**
   ```bash
   export PATH="/Library/TeX/texbin:$PATH"
   ```
   Add this line to your `~/.zshrc` or `~/.bash_profile`.

3. **Verify Installation:**
   ```bash
   pdflatex --version
   ```

### MacTeX-NetInstall (Custom Installation)

For a custom installation with only the packages you need:

1. Download the netinstaller from: https://www.tug.org/mactex/mactex-download.html
2. Run the installer and choose "Customize"
3. Select only the packages you need

## Install pandoc-citeproc (Optional)

For citation processing (note: recent Pandoc versions include citeproc built-in):

```bash
brew install pandoc-citeproc
```

## Post-Installation

### Verify Installation
```bash
pandoc --version
```

Expected output should show Pandoc version number and supported features.

### Test Basic Conversion
```bash
echo "# Hello Pandoc" | pandoc -t html
```

### Test PDF Generation
```bash
echo "# Hello PDF" | pandoc -o test.pdf
```

### Check Available Formats
```bash
pandoc --list-input-formats
pandoc --list-output-formats
```

## Troubleshooting

### Pandoc not found

If you get "command not found: pandoc":

1. **For Homebrew installation:**
   ```bash
   # Check if Homebrew is in your PATH
   echo $PATH
   
   # Add Homebrew to PATH (Apple Silicon)
   export PATH="/opt/homebrew/bin:$PATH"
   
   # Add Homebrew to PATH (Intel Mac)
   export PATH="/usr/local/bin:$PATH"
   ```
   
   Add the appropriate line to your `~/.zshrc` or `~/.bash_profile`.

2. **For.pkg installation:**
   ```bash
   export PATH="/usr/local/bin:$PATH"
   ```

### PDF generation fails

- Ensure a PDF engine (LaTeX) is installed
- Test with: `pdflatex --version`
- Specify engine explicitly: `pandoc --pdf-engine=xelatex input.md -o output.pdf`
- For BasicTeX, you may need to install additional packages:
  ```bash
  sudo tlmgr install <package-name>
  ```

### Permission denied errors

```bash
# Fix Homebrew permissions
sudo chown -R $(whoami) $(brew --prefix)/*

# Or use --user-scope for scoop-like behavior
```

### Update Pandoc

```bash
# Using Homebrew
brew update
brew upgrade pandoc

# Using MacPorts
sudo port selfupdate
sudo port upgrade pandoc
```

## Uninstall

```bash
# Using Homebrew
brew uninstall pandoc

# Using MacPorts
sudo port uninstall pandoc

# Manual: Remove the binary
sudo rm /usr/local/bin/pandoc
```

## Apple Silicon (M1/M2) Notes

For Apple Silicon Macs:

- Homebrew installs to `/opt/homebrew/bin/` by default
- Most packages work natively on Apple Silicon
- If you encounter issues, you can use Rosetta 2:
  ```bash
  arch -x86_64 brew install pandoc
  ```
