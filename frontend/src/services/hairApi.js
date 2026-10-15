/**
 * Sumaq Barber – Hair AI Service client
 * Communicates with the Python FastAPI microservice (ai-service/)
 */

const AI_BASE_URL =
  import.meta.env.VITE_AI_URL || 'http://localhost:8000'

/**
 * Check if the AI microservice is available and the model is loaded.
 * @returns {{ ok: boolean, device: string }}
 */
export async function checkAiHealth() {
  try {
    const res = await fetch(`${AI_BASE_URL}/health`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return { ok: false, device: 'unknown' }
    const data = await res.json()
    return { ok: data.model_loaded, device: data.device }
  } catch {
    return { ok: false, device: 'unknown' }
  }
}

/**
 * Send a webcam frame + hair reference image to HairFastGAN.
 *
 * @param {string} faceImageB64   – base64 JPEG (from canvas.toDataURL)
 * @param {string} hairImageB64   – base64 image (reference hair style)
 * @param {string} sessionId      – unique string per browser session
 * @returns {Promise<{ resultImage: string, landmarks: Array, processingMs: number }>}
 */
export async function transferHair(faceImageB64, hairImageB64, sessionId = 'default') {
  const res = await fetch(`${AI_BASE_URL}/hair-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      face_image: faceImageB64,
      hair_image: hairImageB64,
      session_id: sessionId,
    }),
    signal: AbortSignal.timeout(60_000), // 60s max for deep neural network inference
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `AI service error ${res.status}`)
  }

  const data = await res.json()
  return {
    resultImage: data.result_image,   // base64 JPEG
    landmarks: data.landmarks,         // [{x,y,z}] × 468
    processingMs: data.processing_ms,
  }
}

/**
 * Clear temporal blending state for a session (call on hair style change).
 */
export async function clearHairSession(sessionId) {
  try {
    await fetch(`${AI_BASE_URL}/session/${sessionId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Non-critical, swallow
  }
}
