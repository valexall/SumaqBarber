import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import { transferHair, clearHairSession } from '../../services/hairApi'
import { useFaceTracking } from '../../hooks/useFaceTracking'
import { VirtualMirrorPlaceholder } from './VirtualMirrorPlaceholder'
import { VirtualMirrorOverlays } from './VirtualMirrorOverlays'
import './VirtualMirror.css'

const SESSION_ID = `sumaq-${Math.random().toString(36).slice(2, 9)}`

// VirtualMirror: High-Fidelity HairFastGAN + Real-time 60 FPS MediaPipe Tracking
export function VirtualMirror({ hairImageB64, isActive, onToggleCamera }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const arCanvasRef = useRef(null)
  const streamRef = useRef(null)

  const anchorPoseRef = useRef(null)
  const aiImageObjRef = useRef(null)

  const { isTrackerReady, detectFrame } = useFaceTracking()

  const [camState, setCamState] = useState('idle')
  const [isInferring, setIsInferring] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [viewMode, setViewMode] = useState('ar')
  const [sliderPos, setSliderPos] = useState(50)
  const [lastMs, setLastMs] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [showGuide, setShowGuide] = useState(true)

  // Camera setup
  const startCamera = useCallback(async () => {
    setCamState('requesting')
    setErrorMessage(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamState('active')
      onToggleCamera?.(true)
    } catch (err) {
      console.warn('[VirtualMirror] Camera error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCamState('denied')
      } else {
        setCamState('error')
        setErrorMessage(err.message || 'No se pudo iniciar la cámara')
      }
    }
  }, [onToggleCamera])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCamState('idle')
    onToggleCamera?.(false)
  }, [onToggleCamera])

  // Frame capture helper
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null

    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  // Trigger Hair Inference
  const runHairTransfer = useCallback(async () => {
    if (!hairImageB64 || camState !== 'active') return

    const video = videoRef.current
    if (!video) return

    const initialPose = detectFrame(video)
    if (initialPose) {
      anchorPoseRef.current = initialPose
    }

    const frameB64 = captureFrame()
    if (!frameB64) {
      setErrorMessage('Espera a que la cámara cargue completamente.')
      return
    }

    setIsInferring(true)
    setErrorMessage(null)

    try {
      const { resultImage, processingMs } = await transferHair(
        frameB64,
        hairImageB64,
        SESSION_ID,
      )

      const img = new Image()
      img.onload = () => {
        aiImageObjRef.current = img
        startTransition(() => {
          setAiResult(resultImage)
          setLastMs(processingMs)
          setViewMode('ar')
        })
      }
      img.src = `data:image/jpeg;base64,${resultImage}`
    } catch (err) {
      console.warn('[VirtualMirror] Hair transfer error:', err)
      setErrorMessage(
        err.message?.includes('Failed to fetch')
          ? 'Servicio de IA no disponible. Asegúrate de iniciar ai-service (puerto 8000).'
          : err.message || 'Error al generar el peinado con IA'
      )
    } finally {
      setIsInferring(false)
    }
  }, [hairImageB64, camState, captureFrame, detectFrame])

  // Automatically start camera on mount if requested
  useEffect(() => {
    if (isActive && camState === 'idle') {
      const timer = setTimeout(() => {
        startCamera()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isActive, camState, startCamera])

  // When hairstyle changes, reset previous AI output
  useEffect(() => {
    if (hairImageB64 && camState === 'active') {
      aiImageObjRef.current = null
      clearHairSession(SESSION_ID)
      const timer = setTimeout(() => {
        runHairTransfer()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [hairImageB64, camState, runHairTransfer])

  // 60 FPS Real-Time AR Tracking Loop
  useEffect(() => {
    let animId

    const renderArFrame = () => {
      animId = requestAnimationFrame(renderArFrame)

      const video = videoRef.current
      const arCanvas = arCanvasRef.current
      const aiImg = aiImageObjRef.current
      const anchorPose = anchorPoseRef.current

      if (!video || !arCanvas || video.readyState < 2) return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480

      if (arCanvas.width !== w || arCanvas.height !== h) {
        arCanvas.width = w
        arCanvas.height = h
      }

      const ctx = arCanvas.getContext('2d')
      if (!ctx) return

      if (viewMode === 'ar' && aiImg) {
        ctx.clearRect(0, 0, w, h)
        const currentPose = detectFrame(video)

        if (currentPose && anchorPose) {
          const scale = currentPose.eyeDistance / (anchorPose.eyeDistance || 1)
          const deltaAngle = currentPose.angle - anchorPose.angle

          ctx.save()
          ctx.translate(w, 0)
          ctx.scale(-1, 1)

          ctx.translate(currentPose.center.x, currentPose.center.y)
          ctx.rotate(deltaAngle)
          ctx.scale(scale, scale)
          ctx.translate(-anchorPose.center.x, -anchorPose.center.y)

          ctx.globalAlpha = 0.94
          ctx.drawImage(aiImg, 0, 0, w, h)
          ctx.restore()
        } else {
          ctx.save()
          ctx.translate(w, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(aiImg, 0, 0, w, h)
          ctx.restore()
        }
      } else {
        ctx.clearRect(0, 0, w, h)
      }
    }

    if (camState === 'active') {
      animId = requestAnimationFrame(renderArFrame)
    }

    return () => cancelAnimationFrame(animId)
  }, [camState, viewMode, detectFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      clearHairSession(SESSION_ID)
    }
  }, [])

  return (
    <div className="vm-container">
      <canvas ref={canvasRef} className="vm-canvas-hidden" aria-hidden="true" />

      <div className="vm-viewport">
        <video
          ref={videoRef}
          className={`vm-video-feed ${
            camState === 'active' && (!aiResult || viewMode !== 'ai')
              ? 'is-visible'
              : ''
          }`}
          playsInline
          autoPlay
          muted
          aria-label="Cámara en vivo"
        />

        <canvas
          ref={arCanvasRef}
          className={`vm-ar-canvas ${
            camState === 'active' && viewMode === 'ar' && aiResult ? 'is-visible' : ''
          }`}
          aria-hidden="true"
        />

        <VirtualMirrorPlaceholder
          camState={camState}
          errorMessage={errorMessage}
          onStartCamera={startCamera}
        />

        <VirtualMirrorOverlays
          {...{
            camState, viewMode, setViewMode, aiResult, showGuide, setShowGuide,
            hairImageB64, runHairTransfer, isInferring, stopCamera, sliderPos,
            setSliderPos, lastMs, isTrackerReady, errorMessage, setErrorMessage
          }}
        />
      </div>

      {camState === 'active' && !hairImageB64 && (
        <div className="vm-bottom-hint">
          👈 Selecciona o sube un peinado para probarlo en tu rostro
        </div>
      )}
    </div>
  )
}
