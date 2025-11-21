param(
    [string]$SitemapPath = "WorldConquestGame.Client\wwwroot\sitemap.xml",
    [string]$GzipPath = "WorldConquestGame.Client\wwwroot\sitemap.xml.gz"
)

# Resolve paths relative to the repository folder (parent of this tools folder)
$repoRoot = Split-Path $PSScriptRoot -Parent
$fullSitemap = Join-Path $repoRoot $SitemapPath
$fullGzip = Join-Path $repoRoot $GzipPath

if (-not (Test-Path $fullSitemap)) {
    Write-Error "Sitemap not found: $fullSitemap"
    exit 2
}

try {
    $bytes = [System.IO.File]::ReadAllBytes($fullSitemap)
    $fs = [System.IO.File]::Create($fullGzip)
    $gzip = New-Object System.IO.Compression.GzipStream($fs, [System.IO.Compression.CompressionLevel]::Optimal)
    $gzip.Write($bytes, 0, $bytes.Length)
    $gzip.Close()
    $fs.Close()

    $info = Get-Item $fullGzip
    Write-Host "Wrote gzip sitemap: $fullGzip (`$($info.Length) bytes)"
    exit 0
} catch {
    Write-Error "Failed to create gzip sitemap: $_"
    exit 1
}
