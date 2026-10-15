"""
Face landmark detection using MediaPipe FaceMesh.
Used to extract the 468-point mesh so the frontend can do
real-time warping between inference calls.
"""

import logging
import numpy as np
from PIL import Image

log = logging.getLogger("sumaq-ai.aligner")


class FaceAligner:
    """
    Wraps MediaPipe FaceMesh to extract 468 facial landmarks
    from a PIL image.
    """

    def __init__(self):
        self._mp_face_mesh = None
        self._face_mesh = None
        self._init_mediapipe()

    def _init_mediapipe(self):
        try:
            import mediapipe as mp  # noqa: F401
            if hasattr(mp, "solutions"):
                self._mp_face_mesh = mp.solutions.face_mesh
                self._face_mesh = self._mp_face_mesh.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                )
                log.info("MediaPipe FaceMesh initialised ✓")
            else:
                log.info("MediaPipe %s detected (using fallback for mesh landmarks).", getattr(mp, "__version__", ""))
        except Exception as exc:
            log.warning("Could not initialize FaceAligner: %s", exc)

    def get_landmarks(self, img: Image.Image) -> list[dict]:
        """
        Extract 468 normalised facial landmarks from a PIL image.

        Returns a list of dicts: [{"x": float, "y": float, "z": float}, ...]
        Returns empty list if no face detected or mediapipe not available.
        """
        if self._face_mesh is None:
            return []

        import cv2

        # PIL → numpy BGR for MediaPipe
        rgb = np.array(img.convert("RGB"))
        result = self._face_mesh.process(rgb)

        if not result.multi_face_landmarks:
            log.debug("No face landmarks detected in frame")
            return []

        # Return the first (and only) face
        face = result.multi_face_landmarks[0]
        landmarks = [
            {"x": lm.x, "y": lm.y, "z": lm.z}
            for lm in face.landmark
        ]
        return landmarks

    def close(self):
        if self._face_mesh:
            self._face_mesh.close()
