# Sumaq Barber - AI Service (PowerShell setup for Windows)
# Run: .\setup.ps1 [-HfToken "hf_..."] from inside ai-service/
param(
    [string]$HfToken = $env:HF_TOKEN
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VendorDir = Join-Path $ScriptDir "vendor\HairFastGAN"
$VenvDir   = Join-Path $ScriptDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"

# Cargar variables desde .env si existe
$EnvFile = Join-Path $ScriptDir ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line -split "=", 2
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            if ($key -and -not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}

if (-not $HfToken -and $env:HF_TOKEN) {
    $HfToken = $env:HF_TOKEN
}
if ($HfToken) {
    $env:HF_TOKEN = $HfToken
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Sumaq Barber - AI Service Setup (Windows)    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($env:HF_TOKEN) {
    $maskedToken = $env:HF_TOKEN.Substring(0, [Math]::Min(6, $env:HF_TOKEN.Length)) + "..."
    Write-Host "[OK] Token de Hugging Face detectado ($maskedToken) - descarga autenticada" -ForegroundColor Green
} else {
    Write-Host "[!] Sin HF_TOKEN configurado. La descarga de modelos puede ser lenta." -ForegroundColor Yellow
    Write-Host "    Puedes configurar tu token en ai-service\.env o pasar -HfToken 'hf_...'" -ForegroundColor Gray
}

# 1. Virtual Environment (.venv)
Write-Host ""
if (-not (Test-Path $VenvPython)) {
    Write-Host "[*] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $VenvPython)) { throw "Failed to create virtual environment" }
    Write-Host "[OK] Virtual environment created at $VenvDir" -ForegroundColor Green
} else {
    Write-Host "[OK] Virtual environment already exists at $VenvDir" -ForegroundColor Green
}

# 2. Clone HairFastGAN
if (Test-Path (Join-Path $VendorDir ".git")) {
    Write-Host "[OK] HairFastGAN already cloned" -ForegroundColor Green
} else {
    Write-Host "[*] Cloning HairFastGAN..." -ForegroundColor Yellow
    $VendorParent = Split-Path -Parent $VendorDir
    if (-not (Test-Path $VendorParent)) {
        New-Item -ItemType Directory -Path $VendorParent -Force | Out-Null
    }
    git clone https://github.com/AIRI-Institute/HairFastGAN.git $VendorDir
    if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
    Write-Host "[OK] Cloned" -ForegroundColor Green
}

# 3. Install Python dependencies in .venv
Write-Host ""
Write-Host "[*] Installing Python requirements in .venv..." -ForegroundColor Yellow
$ReqPath = Join-Path $ScriptDir "requirements.txt"
& $VenvPython -m pip install --upgrade pip wheel "setuptools<70"
if ($LASTEXITCODE -ne 0) { throw "pip/setuptools bootstrap failed" }
& $VenvPython -m pip install --no-build-isolation -r $ReqPath
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
Write-Host "[OK] Dependencies installed in .venv" -ForegroundColor Green

# 4. Download weights via HuggingFace
Write-Host ""
Write-Host "[*] Downloading model weights (~2 GB)..." -ForegroundColor Yellow
$DownloadScript = Join-Path $ScriptDir "download_models.py"
& $VenvPython $DownloadScript
if ($LASTEXITCODE -ne 0) { throw "Model download failed" }
Write-Host "[OK] Weights downloaded" -ForegroundColor Green

# 5. Verify
Write-Host ""
Write-Host "[*] Verifying setup inside .venv..." -ForegroundColor Yellow
$VendorDirNorm = $VendorDir.Replace("\", "/")
$VerifyScript = "import sys; sys.path.insert(0, '$VendorDirNorm'); import dlib; print('[OK] dlib import'); import torchvision; print('[OK] torchvision import'); from hair_swap import HairFast; print('[OK] HairFastGAN import'); import mediapipe; print('[OK] MediaPipe import'); import torch; print('[OK] PyTorch device: ' + ('cuda' if torch.cuda.is_available() else 'cpu'))"
& $VenvPython -c $VerifyScript
if ($LASTEXITCODE -ne 0) { throw "Verification failed" }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Setup completed successfully!                 " -ForegroundColor Green
Write-Host "  To activate venv in PowerShell:               " -ForegroundColor Yellow
Write-Host "    .\.venv\Scripts\Activate.ps1                " -ForegroundColor Yellow
Write-Host "  Start service with:                           " -ForegroundColor Cyan
Write-Host "    .\.venv\Scripts\uvicorn main:app --reload --port 8000 " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

