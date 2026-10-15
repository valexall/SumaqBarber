import { useEffect, useRef, useState, useCallback } from 'react'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

/**
 * useFaceTracking
 *
 * Real-time 60 FPS face landmarker using MediaPipe Tasks Vision.
 * Provides head center, scale, and roll angle to anchor generated hairstyles in real-time.
 */
export function useFaceTracking() {
  const landmarkerRef = useRef(null)
  const [isTrackerReady, setIsTrackerReady] = useState(false)
  const [trackerError, setTrackerError] = useState(null)

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isMounted = true

    async function initLandmarker() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        if (!isMounted) return

        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        })

        if (!isMounted) return
        landmarkerRef.current = landmarker
        setIsTrackerReady(true)
      } catch (err) {
        console.warn('[FaceTracking] MediaPipe initialization error:', err)
        if (isMounted) {
          setTrackerError(err.message || 'Error al iniciar MediaPipe Face Landmarker')
        }
      }
    }

    initLandmarker()

    return () => {
      isMounted = false
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close()
        } catch (e) {
          console.debug('[FaceTracking] cleanup:', e)
        }
        landmarkerRef.current = null
      }
    }
  }, [])

  /**
   * Detect landmarks from a video element
   * @param {HTMLVideoElement} video
   * @param {number} timestamp
   * @returns {object|null} { center, eyeDistance, angle, landmarks }
   */
  const detectFrame = useCallback((video, timestamp = performance.now()) => {
    if (!landmarkerRef.current || !video || video.readyState < 2) return null

    try {
      const results = landmarkerRef.current.detectForVideo(video, timestamp)
      if (!results.faceLandmarks || results.faceLandmarks.length === 0) return null

      const lms = results.faceLandmarks[0]
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480

      // Landmark indices in MediaPipe Face Mesh:
      // 33: Left eye outer corner
      // 263: Right eye outer corner
      // 1: Nose tip
      // 10: Forehead / hair line top
      // 152: Chin
      const leftEye = { x: lms[33].x * w, y: lms[33].y * h }
      const rightEye = { x: lms[263].x * w, y: lms[263].y * h }
      const nose = { x: lms[1].x * w, y: lms[1].y * h }
      const forehead = { x: lms[10].x * w, y: lms[10].y * h }
      const chin = { x: lms[152].x * w, y: lms[152].y * h }

      // Head center between eyes and nose
      const center = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2,
      }

      // Eye distance determines scale
      const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)

      // Angle of head tilt (roll in radians)
      const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)

      return {
        center,
        eyeDistance,
        angle,
        leftEye,
        rightEye,
        nose,
        forehead,
        chin,
        raw: lms,
      }
    } catch {
      return null
    }
  }, [])

  return {
    isTrackerReady,
    trackerError,
    detectFrame,
  }
}
