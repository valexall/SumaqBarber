"""Image utilities: base64 ↔ PIL, resize helpers."""

import base64
import io
from PIL import Image


def b64_to_pil(b64_str: str) -> Image.Image:
    """Decode a base64 string (with or without data-URL prefix) to a PIL image."""
    # Strip data-URL prefix if present:  data:image/jpeg;base64,<data>
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]

    raw = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def pil_to_b64(img: Image.Image, quality: int = 88) -> str:
    """Encode a PIL image to a base64 JPEG string (no data-URL prefix)."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def resize_for_inference(img: Image.Image, size: int = 1024) -> Image.Image:
    """
    Scale image proportionally so its maximum dimension is at most `size`.
    Preserves the full aspect ratio and full head/hair geometry (never crops),
    allowing HairFastGAN's facial alignment to find landmarks reliably.
    """
    w, h = img.size
    if max(w, h) > size:
        scale = size / max(w, h)
        return img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img
