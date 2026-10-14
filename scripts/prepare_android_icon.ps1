param(
    [Parameter(Mandatory = $true)]
    [string]$SourceImage,

    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-LauncherBitmap {
    param(
        [System.Drawing.Image]$Source,
        [int]$Size,
        [double]$PaddingRatio,
        [bool]$Round,
        [string]$OutputPath
    )

    $bitmap = New-Object System.Drawing.Bitmap(
        $Size,
        $Size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        if ($Round) {
            $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
            try {
                $clipPath.AddEllipse(1, 1, $Size - 2, $Size - 2)
                $graphics.SetClip($clipPath)
                $graphics.Clear([System.Drawing.Color]::FromArgb(255, 4, 48, 38))
            }
            finally {
                $clipPath.Dispose()
            }
        }

        $targetSize = [int][Math]::Round($Size * (1.0 - (2.0 * $PaddingRatio)))
        $offset = [int][Math]::Round(($Size - $targetSize) / 2.0)
        $target = New-Object System.Drawing.Rectangle($offset, $offset, $targetSize, $targetSize)
        $graphics.DrawImage($Source, $target)
    }
    finally {
        $graphics.Dispose()
    }

    try {
        $directory = Split-Path -Parent $OutputPath
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $bitmap.Dispose()
    }
}

$resolvedSource = (Resolve-Path -LiteralPath $SourceImage).Path
$resolvedProject = (Resolve-Path -LiteralPath $ProjectRoot).Path
$resourceRoot = Join-Path $resolvedProject "android\src\main\res"
$masterDestination = Join-Path $resolvedProject "design\source\app-icon-master.png"

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $masterDestination) | Out-Null
Copy-Item -LiteralPath $resolvedSource -Destination $masterDestination -Force

$source = [System.Drawing.Image]::FromFile($masterDestination)
try {
    $densitySizes = [ordered]@{
        "mipmap-mdpi" = 48
        "mipmap-hdpi" = 72
        "mipmap-xhdpi" = 96
        "mipmap-xxhdpi" = 144
        "mipmap-xxxhdpi" = 192
    }

    foreach ($entry in $densitySizes.GetEnumerator()) {
        $directory = Join-Path $resourceRoot $entry.Key
        New-LauncherBitmap -Source $source -Size $entry.Value -PaddingRatio 0.04 -Round $false -OutputPath (Join-Path $directory "ic_launcher.png")
        New-LauncherBitmap -Source $source -Size $entry.Value -PaddingRatio 0.08 -Round $true -OutputPath (Join-Path $directory "ic_launcher_round.png")
    }

    New-LauncherBitmap `
        -Source $source `
        -Size 432 `
        -PaddingRatio 0.17 `
        -Round $false `
        -OutputPath (Join-Path $resourceRoot "drawable-nodpi\ic_launcher_foreground.png")
}
finally {
    $source.Dispose()
}

Write-Output "Android launcher assets generated from $masterDestination"
