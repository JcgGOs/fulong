# Pandoc Installation Guide for Linux

## Prerequisites
- Linux distribution (Ubuntu/Debian, Fedora, Arch, etc.)
- sudo or root access

## Installation Methods

### Ubuntu/Debian

#### Method 1: Using APT (Repository Version)

```bash
sudo apt update
sudo apt install pandoc
```

**Note:** This may install an older version. For the latest version, use Method 2.

#### Method 2: Download from GitHub Releases (Latest Version)

1. **Download the .deb package:**
   ```bash
   # Check latest version at: https://github.com/jgm/pandoc/releases
   wget https://github.com/jgm/pandoc/releases/download/3.6/pandoc-3.6-1-amd64.deb
   ```

2. **Install the package:**
   ```bash
   sudo dpkg -i pandoc-3.6-1-amd64.deb
   ```

3. **Fix dependencies if needed:**
   ```bash
   sudo apt -f install
   ```

4. **Verify Installation:**
   ```bash
   pandoc --version
   ```

### Fedora

```bash
sudo dnf install pandoc
```

**Verify Installation:**
```bash
pandoc --version
```

### Arch Linux

```bash
sudo pacman -S pandoc
```

**Verify Installation:**
```bash
pandoc --version
```

### Using Snap (Any Distribution)

Snap works on most Linux distributions that support snapd.

1. **Install snapd** (if not already installed):
   ```bash
   # Ubuntu
   sudo apt install snapd
   
   # Fedora
   sudo dnf install snapd
   sudo ln -s /var/lib/snapd/snap /snap
   
   # Arch
   sudo pacman -S snapd
   sudo systemctl enable --now snapd.apparmor.service
   ```

2. **Install Pandoc:**
   ```bash
   sudo snap install pandoc
   ```

3. **Verify Installation:**
   ```bash
   pandoc --version
   ```

### Using Cabal (Haskell Package Manager)

This method works on any Linux distribution.

1. **Install GHC and Cabal:**
   ```bash
   # Ubuntu/Debian
   sudo apt install ghc cabal-install
   
   # Fedora
   sudo dnf install ghc cabal-install
   
   # Arch
   sudo pacman -S ghc cabal-install
   ```

2. **Update Cabal:**
   ```bash
   cabal update
   ```

3. **Install Pandoc:**
   ```bash
   cabal install pandoc
   ```

4. **Add to PATH:**
   ```bash
   export PATH="$HOME/.cabal/bin:$PATH"
   ```
   Add this line to your `~/.bashrc` or `~/.zshrc`.

5. **Verify Installation:**
   ```bash
   pandoc --version
   ```

### Using Stack (Haskell Stack)

1. **Install Stack:**
   ```bash
   curl -sSL https://get.haskellstack.org/ | sh
   ```

2. **Install Pandoc:**
   ```bash
   stack install pandoc
   ```

3. **Add to PATH:**
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```

## Install PDF Engine (Optional)

For PDF generation, you need a PDF engine. LaTeX is the most common choice.

### Ubuntu/Debian

```bash
# Basic LaTeX packages (recommended - smaller installation)
sudo apt install texlive-xetex texlive-latex-recommended texlive-fonts-recommended

# Or full TeX Live installation (~4GB)
sudo apt install texlive-full
```

### Fedora

```bash
# Basic LaTeX packages
sudo dnf install texlive-xetex texlive-latex texlive-fonts

# Or full TeX Live installation
sudo dnf install texlive-scheme-full
```

### Arch Linux

```bash
# Basic LaTeX packages
sudo pacman -S texlive-core texlive-bin

# Or full TeX Live installation
sudo pacman -S texlive-most
```

### Verify LaTeX Installation

```bash
pdflatex --version
```

## Install pandoc-citeproc (Optional)

For citation processing (note: recent Pandoc versions include citeproc built-in):

```bash
# Ubuntu/Debian
sudo apt install pandoc-citeproc

# Fedora
sudo dnf install pandoc-citeproc

# Arch
sudo pacman -S pandoc-citeproc
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
pandoc --list-highlight-languages
pandoc --list-highlight-styles
```

## Troubleshooting

### Pandoc not found

If you get "command not found: pandoc":

1. **For Cabal installation:**
   ```bash
   export PATH="$HOME/.cabal/bin:$PATH"
   ```
   Add to `~/.bashrc` or `~/.zshrc`.

2. **For Stack installation:**
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```
   Add to `~/.bashrc` or `~/.zshrc`.

3. **For Snap installation:**
   ```bash
   # Ensure snapd is running
   sudo systemctl status snapd
   
   # Rehash PATH
   source /etc/profile.d/apps-bin-path.sh
   ```

### PDF generation fails

- Ensure a PDF engine (LaTeX) is installed
- Test with: `pdflatex --version`
- Specify engine explicitly: `pandoc --pdf-engine=xelatex input.md -o output.pdf`
- Install missing LaTeX packages:
  ```bash
  # Ubuntu/Debian
  sudo apt install texlive-xetex
  
  # Fedora
  sudo dnf install texlive-xetex
  
  # Arch
  sudo pacman -S texlive-xetex
  ```

### Dependency errors (APT)

```bash
sudo apt -f install
sudo apt update
sudo apt upgrade
```

### Update Pandoc

```bash
# APT (Ubuntu/Debian)
sudo apt update
sudo apt upgrade pandoc

# DNF (Fedora)
sudo dnf upgrade pandoc

# Pacman (Arch)
sudo pacman -Syu pandoc

# Snap
sudo snap refresh pandoc

# Cabal
cabal update
cabal install pandoc

# From GitHub releases (Ubuntu/Debian)
wget https://github.com/jgm/pandoc/releases/download/3.6/pandoc-3.6-1-amd64.deb
sudo dpkg -i pandoc-3.6-1-amd64.deb
```

## Uninstall

```bash
# APT (Ubuntu/Debian)
sudo apt remove pandoc

# DNF (Fedora)
sudo dnf remove pandoc

# Pacman (Arch)
sudo pacman -R pandoc

# Snap
sudo snap remove pandoc

# Cabal
cabal uninstall pandoc

# Manual (if installed from .deb)
sudo dpkg -r pandoc
```

## Distribution-Specific Notes

### WSL (Windows Subsystem for Linux)

Pandoc installation on WSL is the same as native Linux. Ensure you have the appropriate PDF engine installed for PDF generation.

### Docker

You can use Pandoc in Docker:

```bash
# Official Pandoc Docker image
docker run --rm -v "$(pwd)":/data pandoc/core input.md -o output.html

# With custom volume mounts
docker run --rm -v "$PWD:/data" -u $(id -u):$(id -g) pandoc/core input.md -o output.pdf
```

### NixOS

```bash
# Install Pandoc
nix-env -iA nixpkgs.pandoc

# Or using nix-shell
nix-shell -p pandoc
```
