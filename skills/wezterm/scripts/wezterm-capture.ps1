param(
    [int]$PaneId = -1,
    [string]$Title = "",
    [switch]$List,
    [switch]$Open
)

if (-not ("ScreenCaptureWin32" -as [type]))
{

    Add-Type @"
using System;
using System.Runtime.InteropServices;

public class ScreenCaptureWin32
{
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hwnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hwnd, ref POINT point);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }
}
"@

}

Add-Type -AssemblyName System.Drawing

function Get-WezTermProcess
{

    $proc = Get-Process wezterm-gui -ErrorAction SilentlyContinue | Select-Object -First 1

    if (-not $proc)
    {
        throw "wezterm-gui is not running"
    }

    return $proc

}

function Get-WezTermWindowRect
{

    $proc = Get-WezTermProcess

    $rect = New-Object ScreenCaptureWin32+RECT
    [ScreenCaptureWin32]::GetWindowRect(
            $proc.MainWindowHandle,
            [ref]$rect
    ) | Out-Null

    return $rect
}

function Get-ClientScreenRect
{
    param($hWnd)

    $client = New-Object ScreenCaptureWin32+RECT
    [ScreenCaptureWin32]::GetClientRect($hWnd, [ref]$client) | Out-Null

    $pt = New-Object ScreenCaptureWin32+POINT
    $pt.X = 0
    $pt.Y = 0
    [ScreenCaptureWin32]::ClientToScreen($hWnd, [ref]$pt) | Out-Null

    $result = New-Object ScreenCaptureWin32+RECT
    $result.Left = $pt.X
    $result.Top = $pt.Y
    $result.Right = $pt.X + ($client.Right - $client.Left)
    $result.Bottom = $pt.Y + ($client.Bottom - $client.Top)

    return $result
}

function Get-PaneScreenRect
{
    param(
        $Pane,
        $ClientRect,
        [int]$TabBarHeight = 0
    )

    $cellW = $Pane.size.pixel_width / [double]$Pane.size.cols
    $cellH = $Pane.size.pixel_height / [double]$Pane.size.rows

    $left = [int][Math]::Round($ClientRect.Left + $Pane.left_col * $cellW)
    $top  = [int][Math]::Round($ClientRect.Top + $TabBarHeight + $Pane.top_row * $cellH)

    $rect = New-Object ScreenCaptureWin32+RECT
    $rect.Left   = $left
    $rect.Top    = $top
    $rect.Right  = $left + $Pane.size.pixel_width
    $rect.Bottom = $top  + $Pane.size.pixel_height

    return $rect
}

function Get-TabBarHeight
{
    param(
        $Panes,
        $ClientRect
    )

    # Calculate font cell size from first pane
    $cellW = $Panes[0].size.pixel_width / [double]$Panes[0].size.cols
    $cellH = $Panes[0].size.pixel_height / [double]$Panes[0].size.rows

    # Find the total terminal grid extent (in character cells)
    $maxCol = 0
    $maxRow = 0
    foreach ($p in $Panes)
    {
        $c = $p.left_col + $p.size.cols
        $r = $p.top_row + $p.size.rows
        if ($c -gt $maxCol) { $maxCol = $c }
        if ($r -gt $maxRow) { $maxRow = $r }
    }

    $gridWidth  = [int][Math]::Round($maxCol * $cellW)
    $gridHeight = [int][Math]::Round($maxRow * $cellH)

    $clientW = $ClientRect.Right - $ClientRect.Left
    $clientH = $ClientRect.Bottom - $ClientRect.Top

    # Any excess client height beyond the grid is likely the tab bar (with 2px tolerance)
    $tabH = [Math]::Max(0, $clientH - $gridHeight - 2)
    $tabW = [Math]::Max(0, $clientW - $gridWidth - 2)

    # Only consider it a tab bar if it's at the top (height > width usually)
    if ($tabH -ge 5 -and $tabW -lt 10)
    {
        return $tabH
    }

    return 0
}

function Save-Screenshot
{

    param(
        [string]$File,
        $PaneRect = $null
    )

    if ($PaneRect)
    {
        # Capture only the pane region
        $width  = $PaneRect.Right - $PaneRect.Left
        $height = $PaneRect.Bottom - $PaneRect.Top

        $bmp = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen(
                $PaneRect.Left,
                $PaneRect.Top,
                0,
                0,
                $bmp.Size
        )

        $bmp.Save($File, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
    }
    else
    {
        # Full window capture (existing behavior)
        $rect = Get-WezTermWindowRect
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top

        $bmp = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen(
                $rect.Left,
                $rect.Top,
                0,
                0,
                $bmp.Size
        )

        $bmp.Save($File, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
    }

    $full = [System.IO.Path]::GetFullPath($File)

    Write-Host ""
    Write-Host "Saved => $full" -ForegroundColor Green
    Write-Host ""

    if ($Open)
    {
        Start-Process $full
    }

}

function New-FileName
{

    param(
        [string]$Prefix
    )

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = ($Prefix -replace '[\\/:*?"<>|]', '_')
    return Join-Path (Get-Location).Path "$timestamp-$safe.png"

}

# --- Main ---

$panes = wezterm cli list --format json | ConvertFrom-Json

if (-not $panes)
{
    throw "No panes found"
}

if ($List)
{

    $panes | Select-Object pane_id,
    title,
    cwd,
    is_active,
    @{n='cols/rows';e={"$($_.size.cols)x$($_.size.rows)"}},
    @{n='pixel';e={"$($_.size.pixel_width)x$($_.size.pixel_height)"}},
    @{n='offset';e={"($($_.left_col), $($_.top_row))"}} |
    Format-Table -AutoSize
    return
}

# No specific pane requested -> capture entire window
if ($PaneId -lt 0 -and [string]::IsNullOrWhiteSpace($Title))
{

    $file = New-FileName "wezterm"
    Save-Screenshot $file -PaneRect $null
    return

}

# Resolve pane(s) to capture
$targets = @()

if ($PaneId -ge 0)
{

    $pane = $panes | Where-Object { $_.pane_id -eq $PaneId }

    if (-not $pane)
    {
        throw "PaneId $PaneId not found"
    }

    $targets = @($pane)

}
else
{

    $matches = $panes |
            Where-Object {
                $_.title -like "*$Title*" `
         -or $_.cwd -like "*$Title*" `
         -or $_.window_title -like "*$Title*"
            }

    if (-not $matches)
    {
        throw "No pane matched '$Title'"
    }

    $targets = @($matches)

}

# Pre-compute client rect and tab bar height (same for all panes in a single window)
$proc = Get-WezTermProcess
$clientRect = Get-ClientScreenRect $proc.MainWindowHandle
$tabBarHeight = Get-TabBarHeight $panes $clientRect

foreach ($pane in $targets)
{

    $paneRect = Get-PaneScreenRect $pane $clientRect -TabBarHeight $tabBarHeight

    $name = "pane-$($pane.pane_id)-$($pane.title)"
    $file = New-FileName $name

    Save-Screenshot $file -PaneRect $paneRect

}
