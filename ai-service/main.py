"""
Sumaq Barber – AI Microservice
HairFastGAN hair transfer + MediaPipe head tracking
"""


from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import time
import logging
import io

from models.hair_fast_gan import HairFastGANModel
from models.face_aligner import FaceAligner
from utils.image_utils import b64_to_pil, pil_to_b64, resize_for_inference
from utils.temporal import TemporalBlender

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s │ %(message)s")
log = logging.getLogger("sumaq-ai")

# ── Global model instances ───────────────────────────────────────────────────
hair_model: HairFastGANModel | None = None
face_aligner: FaceAligner | None = None
temporal_blender = TemporalBlender(alpha=0.35)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global hair_model, face_aligner
    log.info("Loading HairFastGAN model …")
    hair_model = HairFastGANModel()
    try:
        hair_model.load()
        log.info("HairFastGAN loaded ✓")
    except Exception as exc:
        log.warning("HairFastGAN not yet initialized (%s). Run setup.ps1 to download weights.", exc)

    log.info("Initializing FaceAligner (MediaPipe) …")
    try:
        face_aligner = FaceAligner()
        log.info("FaceAligner ready ✓")
    except Exception as exc:
        log.warning("Could not initialize FaceAligner: %s", exc)

    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sumaq Barber AI",
    description="HairFastGAN hair transfer microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)




# ── Schemas ──────────────────────────────────────────────────────────────────
class HairTransferRequest(BaseModel):
    """
    face_image  : base64 JPEG/PNG – current webcam frame (≤ 720p)
    hair_image  : base64 JPEG/PNG – reference hairstyle (from Pinterest etc.)
    session_id  : optional string for per-session temporal blending
    """
    face_image: str
    hair_image: str
    session_id: str = "default"


class HairTransferResponse(BaseModel):
    result_image: str          # base64 JPEG result
    landmarks: list            # [{x, y, z}] – 468 MediaPipe points
    processing_ms: int
    success: bool
    message: str = ""


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
async def health():
    import torch
    return HealthResponse(
        status="ok",
        model_loaded=hair_model is not None and hair_model.is_loaded,
        device="cuda" if torch.cuda.is_available() else "cpu",
    )


@app.post("/hair-transfer", response_model=HairTransferResponse)
async def hair_transfer(req: HairTransferRequest):
    if hair_model is None or not hair_model.is_loaded:
        raise HTTPException(503, "Model not yet loaded – retry in a moment")

    t0 = time.perf_counter()

    try:
        # 1. Decode images
        face_pil = b64_to_pil(req.face_image)
        hair_pil = b64_to_pil(req.hair_image)
        log.info("Incoming transfer request: face_size=%s, hair_size=%s", face_pil.size, hair_pil.size)

        # Save debug images to scratch for inspection if needed
        try:
            face_pil.save("debug_last_face.jpg")
            hair_pil.save("debug_last_hair.jpg")
        except Exception:
            pass

        # 2. Scale proportionally if larger than 1024 (preserving aspect ratio and hair)
        face_img = resize_for_inference(face_pil, size=1024)
        hair_img = resize_for_inference(hair_pil, size=1024)
        log.info("Prepared for inference: face=%s, hair=%s", face_img.size, hair_img.size)

        # 3. Extract face landmarks from the input frame
        landmarks = face_aligner.get_landmarks(face_img) if face_aligner is not None else []

        # 4. Run HairFastGAN
        result_pil = hair_model.transfer(face_img, hair_img)

        # 5. Temporal blending (smooth transitions between frames)
        blended = temporal_blender.blend(
            session_id=req.session_id,
            new_frame=result_pil,
        )

        # 6. Encode result
        result_b64 = pil_to_b64(blended, quality=88)

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        log.info("hair-transfer done in %d ms (session=%s)", elapsed_ms, req.session_id)

        return HairTransferResponse(
            result_image=result_b64,
            landmarks=landmarks,
            processing_ms=elapsed_ms,
            success=True,
        )

    except ValueError as exc:
        msg = str(exc)
        if "image 0" in msg:
            detail = "📷 En tu cámara web: No se detectó un rostro claro. Centra tu cabeza mirando de frente con buena luz dentro del marco."
        elif "image 1" in msg or "image 2" in msg:
            detail = "✂️ En la foto del peinado: No se detectó un rostro frontal. La foto de referencia necesita tener un rostro visible de frente (con ojos y frente), no de espaldas ni de perfil. Por favor prueba con uno de los peinados de la lista o sube otra foto de frente."
        elif "No faces detected" in msg:
            detail = "No se detectó un rostro frontal suficiente para mapear el cabello. Asegúrate de mirar de frente a la cámara."
        else:
            detail = f"Error de detección facial: {msg}"
        log.warning("hair-transfer: %s (original: %s)", detail, msg)
        raise HTTPException(status_code=422, detail=detail) from exc
    except Exception as exc:
        log.exception("hair-transfer failed: %s", exc)
        raise HTTPException(500, f"Inference error: {exc}") from exc


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Reset temporal state for a given session."""
    temporal_blender.clear(session_id)
    return {"cleared": session_id}
