"""
HairFastGAN model wrapper.

HairFastGAN repo: https://github.com/AIRI-Institute/HairFastGAN
This wrapper assumes HairFastGAN is installed as a submodule or git-cloned
inside ai-service/vendor/HairFastGAN.

Setup (Windows):
    cd ai-service
    .\\setup.ps1          # clones repo + downloads ~2 GB weights

Setup (Linux/Mac):
    cd ai-service
    bash setup.sh
"""

from __future__ import annotations

import sys
import logging
from pathlib import Path
from typing import TYPE_CHECKING
from PIL import Image

log = logging.getLogger("sumaq-ai.model")

# ── Vendor path ───────────────────────────────────────────────────────────────
# HairFastGAN lives here after setup.ps1 / setup.sh runs.
# The static type-checker won't find it until then, which is expected.
VENDOR_DIR = Path(__file__).parent.parent / "vendor" / "HairFastGAN"


def _add_vendor_to_path() -> None:
    """Prepend the HairFastGAN vendor directory to sys.path (idempotent)."""
    vendor_str = str(VENDOR_DIR.resolve())
    if vendor_str not in sys.path:
        sys.path.insert(0, vendor_str)

    # HairFastGAN uses internal `from models.X import Y` and `from utils.X import Y` imports.
    # Since ai-service also has `models` and `utils` packages already loaded in sys.modules,
    # we extend their __path__ to include HairFastGAN's vendor directories as well.
    for pkg_name in ("models", "utils"):
        vendor_pkg = str((VENDOR_DIR / pkg_name).resolve())
        if pkg_name in sys.modules:
            mod = sys.modules[pkg_name]
            if hasattr(mod, "__path__") and vendor_pkg not in mod.__path__:
                mod.__path__.insert(0, vendor_pkg)

    # Evict any already-cached submodules of the conflicting packages so that
    # HairFastGAN's imports (e.g. `from utils.image_utils import DilateErosion`)
    # are re-resolved through the extended __path__ rather than hitting the
    # ai-service versions that were cached before vendor paths were added.
    stale_keys = [
        key for key in sys.modules
        if key.startswith("utils.") or key.startswith("models.")
    ]
    for key in stale_keys:
        del sys.modules[key]
    log.debug("Evicted %d cached submodule(s) to allow HairFastGAN imports.", len(stale_keys))



class HairFastGANModel:
    """
    Thin wrapper around HairFastGAN's inference pipeline.

    Lifecycle
    ---------
    1. Instantiate: ``model = HairFastGANModel()``
    2. Load weights: ``model.load()``   ← called once at FastAPI startup
    3. Infer:       ``result = model.transfer(face_pil, hair_pil)``
    """

    def __init__(self) -> None:
        self.is_loaded: bool = False
        self._pipeline: object | None = None  # HairFast instance after load()

    # ── Setup ─────────────────────────────────────────────────────────────────
    def load(self) -> None:
        """
        Load the HairFastGAN pipeline.

        Raises
        ------
        RuntimeError
            If the vendor directory doesn't exist (setup.ps1 not yet run)
            or if the import fails for any other reason.
        """
        if not VENDOR_DIR.exists():
            raise RuntimeError(
                f"\n\nHairFastGAN not found at:\n  {VENDOR_DIR}\n\n"
                "Run the setup script first:\n"
                "  Windows : cd ai-service && .\\setup.ps1\n"
                "  Linux   : cd ai-service && bash setup.sh\n"
            )

        _add_vendor_to_path()

        # hair_swap is part of the HairFastGAN vendor repo — it won't resolve
        # until vendor/HairFastGAN is cloned.  The # type: ignore suppresses
        # the static-analysis error that appears before setup runs.
        try:
            from hair_swap import HairFast, get_parser  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError(
                f"Could not import `hair_swap` from {VENDOR_DIR}.\n"
                "Make sure you ran setup.ps1 (Windows) or setup.sh (Linux).\n"
                f"Original error: {exc}"
            ) from exc

        import os
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        args = get_parser().parse_args(["--device", device])

        orig_cwd = os.getcwd()
        try:
            os.chdir(VENDOR_DIR)
            self._pipeline = HairFast(args)
        finally:
            os.chdir(orig_cwd)

        self.is_loaded = True
        log.info("HairFastGAN loaded ✓  device=%s", self._device)

    # ── Inference ─────────────────────────────────────────────────────────────
    def transfer(self, face_img: Image.Image, hair_img: Image.Image) -> Image.Image:
        """
        Apply the hairstyle from *hair_img* onto the face in *face_img*.

        Parameters
        ----------
        face_img:
            PIL Image (RGB).  Will be resized to 512×512 by the caller.
        hair_img:
            PIL Image (RGB) — the reference hairstyle from Pinterest etc.

        Returns
        -------
        PIL Image (RGB, same spatial size as *face_img*).
        """
        if not self.is_loaded or self._pipeline is None:
            raise RuntimeError(
                "HairFastGANModel.transfer() called before load(). "
                "This shouldn't happen — the FastAPI startup event should have loaded the model."
            )

        # HairFastGAN's swap() signature:
        #   swap(face, shape_ref, color_ref, align=True)
        # We use the same image for both shape and colour so the full style
        # (cut + colour) is transferred from a single Pinterest reference.
        import os
        import torch
        import torchvision.transforms.functional as TF

        orig_cwd = os.getcwd()
        try:
            os.chdir(VENDOR_DIR)
            result = self._pipeline.swap(  # type: ignore[union-attr]
                face_img,
                hair_img,  # shape reference
                hair_img,  # colour reference (same image → unified style transfer)
                align=True,
            )
        finally:
            os.chdir(orig_cwd)

        # HairFast.swap(..., align=True) returns (final_image_tensor, *aligned_images)
        final_tensor = result[0] if isinstance(result, (tuple, list)) else result

        # Convert CUDA tensor to a PIL Image on host memory
        if isinstance(final_tensor, torch.Tensor):
            final_tensor = final_tensor.detach().cpu().clamp(0.0, 1.0)
            return TF.to_pil_image(final_tensor)

        return final_tensor


    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def _device(self) -> str:
        try:
            import torch  # type: ignore[import-untyped]
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu (torch not found)"
