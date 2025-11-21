param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,
    [string]$DestPath = "..\WorldConquestGame.Client\wwwroot\img\world-conquest-social.png",
    [int]$Width = 1200,
    [int]$Height = 630
)
# Resolve source path (accepts absolute or relative paths)
if (-not (Test-Path $SourcePath)) {
    Write-Error "Source image not found: $SourcePath`nProvide an absolute path or a path relative to your current directory."
    exit 2
}

$srcFull = (Resolve-Path $SourcePath).ProviderPath

# Resolve destination: if absolute, use as-is; if relative, resolve relative to repository root (parent of tools folder)
if ([System.IO.Path]::IsPathRooted($DestPath)) {
    $destFull = $DestPath
} else {
    $repoRoot = Split-Path $PSScriptRoot -Parent
    $destFull = Join-Path $repoRoot $DestPath
}

$destDir = Split-Path $destFull -Parent
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

Add-Type -AssemblyName System.Drawing

try {
    $img = [System.Drawing.Image]::FromFile($srcFull)
    $thumb = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($thumb)
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)

    $srcAspect = $img.Width / $img.Height
    $dstAspect = $Width / $Height

    if ($srcAspect -gt $dstAspect) {
        $newHeight = $Height
        $newWidth = [int]([math]::Round($Height * $srcAspect))
    } else {
        $newWidth = $Width
        $newHeight = [int]([math]::Round($Width / $srcAspect))
    }

    $offsetX = -[int](([math]::Round(($newWidth - $Width) / 2)))
    $offsetY = -[int](([math]::Round(($newHeight - $Height) / 2)))

    $tempBmp = New-Object System.Drawing.Bitmap $newWidth, $newHeight
    $tg = [System.Drawing.Graphics]::FromImage($tempBmp)
    $tg.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $tg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $tg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $tg.DrawImage($img, 0, 0, $newWidth, $newHeight)

    $g.DrawImage($tempBmp, $offsetX, $offsetY, $newWidth, $newHeight)

    $pngCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/png' }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, 90)

    $thumb.Save($destFull, $pngCodec, $encoderParams)

    $g.Dispose(); $tg.Dispose(); $img.Dispose(); $thumb.Dispose(); $tempBmp.Dispose()
    Write-Host "Saved resized image to: $destFull"
} catch {
    Write-Error "Failed to resize image: $_"
}
