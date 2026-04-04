# Pandoc Installation Guide for Windows

## Prerequisites
- Windows 10 or later
- Administrator access (for some installation methods)

## Installation Methods

### Method 1: Using winget (Recommended)

Windows Package Manager (winget) is included in Windows 11 and Windows 10 (App Installer).

```powershell
winget install --source winget --exact --id JohnMacFarlane.Pandoc
```

**Advantages:**
- Official Microsoft package manager
- Easy updates: `winget upgrade JohnMacFarlane.Pandoc`
- Automatic PATH configuration

### Method 2: Using Chocolatey

Chocolatey is a popular Windows package manager.

1. **Install Chocolatey** (if not already installed):
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install Pandoc:**
   ```powershell
   choco install pandoc
   ```

3. **Verify Installation:**
   ```powershell
   pandoc --version
   ```

**Advantages:**
- Large package repository
- Easy to manage multiple packages

### Method 3: Using Scoop

Scoop is a command-line installer for Windows.

1. **Install Scoop** (if not already installed):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. **Install Pandoc:**
   ```powershell
   scoop install pandoc
   ```

3. **Verify Installation:**
   ```powershell
   pandoc --version
   ```

**Advantages:**
- No administrator privileges required
- Clean installations without polluting system directories

### Method 4: Manual Installation

1. **Download the installer:**
   - Visit: https://pandoc.org/installing.html
   - Download the Windows installer (`.msi` file)
   - Choose the appropriate version (32-bit or 64-bit)

2. **Run the installer:**
   - Double-click the `.msi` file
   - Follow the installation wizard
   - Pandoc will be added to your PATH automatically

3. **Verify Installation:**
   ```powershell
   pandoc --version
   ```

## Install PDF Engine (Optional)

For PDF generation, you need a PDF engine. The most common is LaTeX.

### MiKTeX (Recommended for Windows)

1. **Download MiKTeX:**
   - Visit: https://miktex.org/download
   - Download and run the installer

2. **Install MiKTeX:**
   - Follow the installation wizard
   - Choose "Download MiKTeX" (recommended) or "Keep packages up-to-date"

3. **Verify Installation:**
   ```powershell
   pdflatex --version
   ```

### TeX Live

1. **Download TeX Live:**
   - Visit: https://www.tug.org/texlive/acquire-netinstall.html
   - Download the installer

2. **Install TeX Live:**
   - Run `install-tl-windows.bat`
   - Follow the installation wizard (may take 1-2 hours)

3. **Verify Installation:**
   ```powershell
   pdflatex --version
   ```

## Install pandoc-citeproc (Optional)

For citation processing (note: recent Pandoc versions include citeproc built-in):

```powershell
choco install pandoc-citeproc
```

## Post-Installation

### Verify Installation
```powershell
pandoc --version
```

Expected output should show Pandoc version number and supported features.

### Test Basic Conversion
```powershell
echo "# Hello Pandoc" | pandoc -t html
```

### Test PDF Generation
```powershell
echo "# Hello PDF" | pandoc -o test.pdf
```

### Check Available Formats
```powershell
pandoc --list-input-formats
pandoc --list-output-formats
```

## Troubleshooting

### Pandoc not found in PATH

If you get "pandoc is not recognized as an internal or external command":

1. Close and reopen your terminal
2. If still not found, add Pandoc to PATH manually:
   - Default location: `C:\Program Files\Pandoc\`
   - Add to system PATH via System Properties > Environment Variables

### PDF generation fails

- Ensure a PDF engine (LaTeX) is installed
- Test with: `pdflatex --version`
- Specify engine explicitly: `pandoc --pdf-engine=xelatex input.md -o output.pdf`

### Update Pandoc

```powershell
# Using winget
winget upgrade JohnMacFarlane.Pandoc

# Using Chocolatey
choco upgrade pandoc

# Using Scoop
scoop update pandoc
```

## Uninstall

```powershell
# Using winget
winget uninstall JohnMacFarpane.Pandoc

# Using Chocolatey
choco uninstall pandoc

# Using Scoop
scoop uninstall pandoc

# Manual: Use Windows Settings > Apps > Installed apps
```
