param(
  [int]$FrameRate = 24,
  [int]$Quality = 92,
  [int]$Padding = 320
)

$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $frontendRoot 'src\assets\sumaq\fondo2.mp4'
$output = Join-Path $frontendRoot 'src\assets\sumaq\sequence\desktop'

if (-not (Test-Path $source)) {
  throw "Video source not found: $source"
}

New-Item -ItemType Directory -Force $output | Out-Null
$filter = "split=3[main][left][right];[left]crop=${Padding}:ih:0:0,hflip[leftPad];[right]crop=${Padding}:ih:iw-${Padding}:0,hflip[rightPad];[leftPad][main][rightPad]hstack=inputs=3,fps=$FrameRate"
ffmpeg -y -i $source -vf $filter -frames:v 240 -c:v libwebp -quality $Quality -compression_level 6 -preset picture -an (Join-Path $output 'frame-%04d.webp')