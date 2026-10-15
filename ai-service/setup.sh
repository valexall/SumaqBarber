#!/usr/bin/env bash
# =============================================================================
# Sumaq Barber - AI Service Setup Script (Linux / macOS)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$SCRIPT_DIR/vendor/HairFastGAN"

# Cargar .env si existe
if [ -f "$SCRIPT_DIR/.env" ]; then
  # Exportar solo lineas no comentadas
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

echo "================================================"
echo "   Sumaq Barber · AI Service Setup              "
echo "================================================"
echo ""

if [ -n "${HF_TOKEN:-}" ]; then
  echo "[OK] Token Hugging Face detectado (${HF_TOKEN:0:6}...) - descarga autenticada"
else
  echo "[!] Sin HF_TOKEN configurado. La descarga puede ser más lenta."
  echo "    Puedes agregarlo en ai-service/.env"
fi

# 1. Virtual Environment (.venv)
VENV_DIR="$SCRIPT_DIR/.venv"
VENV_PYTHON="$VENV_DIR/bin/python"

if [ ! -f "$VENV_PYTHON" ]; then
  echo "[*] Creating virtual environment (.venv) …"
  python3 -m venv "$VENV_DIR"
  echo "[OK] Virtual environment created"
fi

# 2. Clone HairFastGAN
if [ -d "$VENDOR_DIR/.git" ]; then
  echo "[OK] HairFastGAN already cloned at $VENDOR_DIR"
else
  echo "[*] Cloning HairFastGAN into $VENDOR_DIR …"
  git clone https://github.com/AIRI-Institute/HairFastGAN.git "$VENDOR_DIR"
  echo "[OK] Cloned"
fi

# 3. Install Python dependencies in .venv
echo ""
echo "[*] Installing Python requirements in .venv …"
"$VENV_PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt"
echo "[OK] Dependencies installed"

# 4. Download HairFastGAN model weights
echo ""
echo "[*] Downloading HairFastGAN model weights (~2 GB) …"
"$VENV_PYTHON" "$SCRIPT_DIR/download_models.py"
echo "[OK] Weights downloaded"

# 5. Verify setup
echo ""
echo "[*] Verifying setup …"
"$VENV_PYTHON" -c "
import sys
sys.path.insert(0, '$VENDOR_DIR')
import dlib
print('[OK] dlib import')
import torchvision
print('[OK] torchvision import')
from hair_swap import HairFast
print('[OK] HairFastGAN import')
import mediapipe
print('[OK] MediaPipe import')
import torch
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f'[OK] PyTorch device: {device}')
"

echo ""
echo "================================================"
echo "   Setup complete! Start the service with:      "
echo "   uvicorn main:app --reload --port 8000        "
echo "================================================"
