"""
Script to download HairFastGAN pretrained weights and sample inputs from Hugging Face.
Shows real-time progress per file and resumes automatically.
Usage: python download_models.py [--token YOUR_HF_TOKEN]
"""
import argparse
import os
import sys
from pathlib import Path


def load_env_file(env_path: Path):
    if not env_path.exists():
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and not os.environ.get(k):
                    os.environ[k] = v
    except Exception:
        pass


def validate_token(token: str | None) -> str | None:
    if not token:
        return None
    token = token.strip()
    # Ignorar tokens de ejemplo / placeholders comunes
    if "xxx" in token.lower() or len(token) < 20 or token == "hf_token_aqui":
        print("[i] El token proporcionado parece ser un texto de ejemplo. Se continuará con descarga pública.")
        return None

    try:
        from huggingface_hub import HfApi
        api = HfApi()
        user_info = api.whoami(token=token)
        username = user_info.get("name", "usuario")
        print(f"[OK] Token válido autenticado para el usuario: {username}")
        return token
    except Exception as e:
        print(f"[!] Token no válido en Hugging Face ({e}). Se continuará con descarga pública.")
        return None


def main():
    parser = argparse.ArgumentParser(description="Download HairFastGAN models from Hugging Face")
    parser.add_argument("--token", "-t", default=None, help="Hugging Face access token")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent

    # Cargar variables de entorno desde .env
    load_env_file(script_dir / ".env")
    load_env_file(script_dir.parent / ".env")

    raw_token = args.token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    token = validate_token(raw_token)

    try:
        from huggingface_hub import HfApi, hf_hub_download
    except ImportError:
        print("[!] huggingface_hub no está instalado. Instalándolo...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
        from huggingface_hub import HfApi, hf_hub_download

    target_dir = script_dir / "vendor" / "HairFastGAN"
    if not target_dir.exists():
        print(f"[!] El directorio {target_dir} no existe. Por favor clona HairFastGAN primero.")
        sys.exit(1)

    print("==================================================")
    print("   Sumaq Barber - Descarga de Modelos HairFastGAN ")
    print("==================================================")

    api = HfApi(token=token)
    repo_id = "AIRI-Institute/HairFastGAN"

    print(f"[*] Obteniendo lista de archivos del repositorio {repo_id}...")
    try:
        model_info = api.model_info(repo_id, files_metadata=True)
    except Exception as e:
        print(f"[!] Error al conectar con Hugging Face: {e}")
        sys.exit(1)

    # Filtrar solo archivos requeridos: pretrained_models y input
    siblings = model_info.siblings or []
    files_to_download = [
        f for f in siblings
        if (f.rfilename.startswith("pretrained_models/") or f.rfilename.startswith("input/"))
        and not f.rfilename.endswith(".gitattributes")
    ]

    total_files = len(files_to_download)
    total_bytes = sum(f.size or 0 for f in files_to_download)
    print(f"[*] Total de archivos requeridos: {total_files} (~{total_bytes / (1024**3):.2f} GB)")

    downloaded_count = 0
    skipped_count = 0

    for i, file_item in enumerate(files_to_download, start=1):
        rel_path = file_item.rfilename
        expected_size = file_item.size or 0
        dest_file = target_dir / rel_path

        # Verificar si el archivo ya existe y tiene el tamaño esperado
        if dest_file.exists():
            current_size = dest_file.stat().st_size
            if expected_size > 0 and current_size == expected_size:
                size_mb = current_size / (1024 * 1024)
                print(f"[{i}/{total_files}] [OK] Ya existe: {rel_path} ({size_mb:.1f} MB)")
                skipped_count += 1
                continue

        size_mb = expected_size / (1024 * 1024)
        print(f"\n[{i}/{total_files}] [*] Descargando: {rel_path} ({size_mb:.1f} MB)...")

        try:
            hf_hub_download(
                repo_id=repo_id,
                filename=rel_path,
                local_dir=str(target_dir),
                token=token,
            )
            downloaded_count += 1
        except Exception as err:
            print(f"[!] Error al descargar {rel_path}: {err}")
            print("[!] Puedes reintentar ejecutando nuevamente este script.")

    print("\n==================================================")
    print(f"[OK] Proceso finalizado. Descargados: {downloaded_count}, Ya existentes: {skipped_count}")
    print("==================================================")


if __name__ == "__main__":
    main()
