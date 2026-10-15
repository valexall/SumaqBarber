"""
Temporal blending between consecutive HairFastGAN frames.

Strategy:
  blended = alpha * new_frame + (1 - alpha) * previous_blended

A lower alpha (e.g. 0.3) produces smoother / slower transitions.
A higher alpha (e.g. 0.7) responds faster to head movement.
"""

import numpy as np
from PIL import Image
from collections import OrderedDict

_MAX_SESSIONS = 64  # maximum concurrent sessions to keep in memory


class TemporalBlender:
    """
    Per-session EMA blender.
    Maintains a small LRU cache of previous blended frames.
    """

    def __init__(self, alpha: float = 0.35):
        """
        Args:
            alpha: blend weight for the new frame (0 < alpha ≤ 1).
                   alpha=1.0 disables blending (always use new frame).
        """
        assert 0.0 < alpha <= 1.0, "alpha must be in (0, 1]"
        self.alpha = alpha
        # session_id → numpy float32 array  (H, W, 3)
        self._cache: OrderedDict[str, np.ndarray] = OrderedDict()

    def blend(self, session_id: str, new_frame: Image.Image) -> Image.Image:
        """
        Blend `new_frame` with the stored previous frame for `session_id`.

        Args:
            session_id: unique string per browser session
            new_frame:  PIL Image (RGB)

        Returns:
            Blended PIL Image (RGB)
        """
        new_arr = np.array(new_frame, dtype=np.float32)

        if session_id in self._cache:
            prev_arr = self._cache[session_id]
            # Resize previous if sizes differ (shouldn't happen, but guard anyway)
            if prev_arr.shape != new_arr.shape:
                prev_arr = np.array(
                    Image.fromarray(prev_arr.astype(np.uint8)).resize(
                        (new_arr.shape[1], new_arr.shape[0]), Image.LANCZOS
                    ),
                    dtype=np.float32,
                )
            blended_arr = self.alpha * new_arr + (1.0 - self.alpha) * prev_arr
        else:
            blended_arr = new_arr

        # Update LRU cache
        if session_id in self._cache:
            self._cache.move_to_end(session_id)
        self._cache[session_id] = blended_arr
        if len(self._cache) > _MAX_SESSIONS:
            self._cache.popitem(last=False)  # evict oldest

        return Image.fromarray(blended_arr.astype(np.uint8))

    def clear(self, session_id: str):
        """Remove stored state for a session (called when user resets)."""
        self._cache.pop(session_id, None)
