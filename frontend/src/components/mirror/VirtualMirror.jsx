import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  AlertTriangle,
  Sparkles,
  Eye,
  SlidersHorizontal,
  X,
  Focus,
  Activity,
} from 'lucide-react'
import { transferHair, clearHairSession } from '../../services/hairApi'
import { useFaceTracking } from '../../hooks/useFaceTracking'
import './VirtualMirror.css'

const SESSION_ID = `sumaq-${Math.random().toString(36).slice(2, 9)}`

/**
 * VirtualMirror
 *
 * Hybrid High-Fidelity HairFastGAN + Real-time 60 FPS MediaPipe Face Tracking.
 * Anchors the photorealistic hairstyle to the user's head as they move, tilt, and turn.
 */
export function VirtualMirror({ hairImageB64, isActive, onToggleCamera }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null) // offscreen capture canvas
  const arCanvasRef = useRef(null) // 60 FPS AR tracking canvas
  const streamRef = useRef(null)

  const anchorPoseRef = useRef(null) // Pose recorded when capture was taken
  const aiImageObjRef = useRef(null) // HTML Image element of HairFastGAN result

  const { isTrackerReady, detectFrame } = useFaceTracking()

  const [camState, setCamState] = useState('idle') // 'idle'|'requesting'|'active'|'denied'|'error'
  const [isInferring, setIsInferring] = useState(false)
  const [aiResult, setAiResult] = useState(null) // base64 result from HairFastGAN
  const [viewMode, setViewMode] = useState('ar') // 'ar' (60 FPS AR) | 'ai' (Static HD) | 'split' | 'live'
  const [sliderPos, setSliderPos] = useState(50) // percentage for split view
  const [lastMs, setLastMs] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [showGuide, setShowGuide] = useState(true)

  // ── Camera setup ───────────────────────────────────────────────────────────
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

  // ── Frame capture helper ───────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null

    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    // Mirror image for realistic selfie perspective
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  // ── Trigger Hair Inference ─────────────────────────────────────────────────
  const runHairTransfer = useCallback(async () => {
    if (!hairImageB64 || camState !== 'active') return

    const video = videoRef.current
    if (!video) return

    // Record baseline anchor pose at the exact moment of capture
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

      // Preload image for the 60 FPS canvas loop
      const img = new Image()
      img.onload = () => {
        aiImageObjRef.current = img
        startTransition(() => {
          setAiResult(resultImage)
          setLastMs(processingMs)
          setViewMode('ar') // Auto-switch to Real-Time 60 FPS AR Tracking!
        })
      }
      img.src = `data:image/jpeg;base64,${resultImage}`
    } catch (err) {
      console.warn('[VirtualMirror] Hair transfer error:', err)
      let detail = err.message || 'No se pudo transferir el peinado.'
      if (
        err.name === 'TimeoutError' ||
        detail.includes('timed out') ||
        detail.includes('aborted')
      ) {
        detail =
          'El modelo estaba terminando de inicializarse en la GPU. Por favor pulsa "Reintentar pose" ahora que ya está listo.'
      }
      setErrorMessage(detail)
    } finally {
      setIsInferring(false)
    }
  }, [hairImageB64, camState, captureFrame, detectFrame])

  // ── Sync camera with isActive prop ─────────────────────────────────────────
  useEffect(() => {
    if (isActive && camState === 'idle') {
      startTransition(() => {
        startCamera()
      })
    } else if (!isActive && camState === 'active') {
      startTransition(() => {
        stopCamera()
      })
    }
  }, [isActive, camState, startCamera, stopCamera])

  // ── Trigger inference when hair style is selected ─────────────────────────
  useEffect(() => {
    if (camState === 'active' && hairImageB64) {
      clearHairSession(SESSION_ID)
      const timer = setTimeout(() => {
        runHairTransfer()
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [hairImageB64, camState, runHairTransfer])

  // ── Real-Time 60 FPS AR Face Tracking Loop ────────────────────────────────
  useEffect(() => {
    let animId

    const renderArFrame = () => {
      animId = requestAnimationFrame(renderArFrame)

      const canvas = arCanvasRef.current
      const video = videoRef.current
      const aiImg = aiImageObjRef.current
      const anchorPose = anchorPoseRef.current

      if (!canvas || !video || video.readyState < 2 || camState !== 'active') return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const ctx = canvas.getContext('2d')

      // Only perform 60 FPS AR tracking when in 'ar' mode with a ready AI image
      if (viewMode === 'ar' && aiImg) {
        ctx.clearRect(0, 0, w, h)

        const currentPose = detectFrame(video)

        if (currentPose && anchorPose) {
          // Dynamic scale and rotation offsets relative to capture pose
          const scale = currentPose.eyeDistance / (anchorPose.eyeDistance || 1)
          const deltaAngle = currentPose.angle - anchorPose.angle

          ctx.save()
          // Mirror context horizontally to match mirrored selfie camera
          ctx.translate(w, 0)
          ctx.scale(-1, 1)

          // Center on live face position and apply rotation & scale
          ctx.translate(currentPose.center.x, currentPose.center.y)
          ctx.rotate(deltaAngle)
          ctx.scale(scale, scale)
          ctx.translate(-anchorPose.center.x, -anchorPose.center.y)

          // Render the high-fidelity AI hairstyle smoothly tracked on the head
          ctx.globalAlpha = 0.94
          ctx.drawImage(aiImg, 0, 0, w, h)
          ctx.restore()
        } else {
          // Fallback if face is temporarily out of frame: draw static look
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

  // ── Render placeholders ────────────────────────────────────────────────────
  const renderPlaceholder = () => {
    if (camState === 'denied') {
      return (
        <div className="vm-placeholder vm-placeholder--denied">
          <CameraOff size={32} className="vm-placeholder-icon" />
          <h4>Cámara bloqueada</h4>
          <p>
            Tu navegador bloqueó el permiso para la cámara. Haz clic en el ícono
            del candado o cámara en la barra de direcciones para habilitarla.
          </p>
          <button className="vm-action-btn" onClick={startCamera}>
            <RefreshCw size={15} /> Reintentar permiso
          </button>
        </div>
      )
    }

    if (camState === 'error') {
      return (
        <div className="vm-placeholder vm-placeholder--error">
          <AlertTriangle size={32} className="vm-placeholder-icon" />
          <h4>Error de cámara</h4>
          <p>{errorMessage || 'No se pudo acceder a tu dispositivo de video.'}</p>
          <button className="vm-action-btn" onClick={startCamera}>
            <RefreshCw size={15} /> Intentar de nuevo
          </button>
        </div>
      )
    }

    if (camState === 'requesting') {
      return (
        <div className="vm-placeholder">
          <div className="vm-spinner" />
          <h4>Iniciando cámara…</h4>
          <p>Por favor confirma el permiso en tu navegador si aparece la solicitud.</p>
        </div>
      )
    }

    if (camState === 'idle') {
      return (
        <div className="vm-placeholder">
          <Camera size={34} className="vm-placeholder-icon" />
          <h4>Espejo Desactivado</h4>
          <p>Enciende tu cámara para probar los peinados en tu rostro en tiempo real.</p>
          <button className="vm-action-btn" onClick={startCamera}>
            <Camera size={15} /> Activar Cámara
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="vm-container">
      {/* Offscreen capture canvas */}
      <canvas ref={canvasRef} className="vm-canvas-hidden" aria-hidden="true" />

      {/* Main Viewport */}
      <div className="vm-viewport">
        {/* Live Video Feed (Always active in background for 60 FPS realism) */}
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

        {/* 60 FPS Real-Time AR Tracking Canvas */}
        <canvas
          ref={arCanvasRef}
          className={`vm-ar-canvas ${
            camState === 'active' && viewMode === 'ar' && aiResult ? 'is-visible' : ''
          }`}
          aria-hidden="true"
        />

        {/* Static HD Result Layer (for inspect / static mode) */}
        {aiResult && camState === 'active' && viewMode === 'ai' && (
          <div className="vm-ai-layer is-full">
            <img
              src={`data:image/jpeg;base64,${aiResult}`}
              alt="Peinado aplicado por IA"
              className="vm-ai-image"
            />
          </div>
        )}

        {/* Split slider control when in split mode */}
        {aiResult && camState === 'active' && viewMode === 'split' && (
          <>
            <div
              className="vm-ai-layer is-split"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <img
                src={`data:image/jpeg;base64,${aiResult}`}
                alt="Peinado aplicado por IA"
                className="vm-ai-image"
              />
            </div>
            <div className="vm-split-handle" style={{ left: `${sliderPos}%` }}>
              <div className="vm-split-line" />
              <div className="vm-split-knob">
                <SlidersHorizontal size={12} />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="vm-split-range"
                aria-label="Comparador antes y después"
              />
            </div>
          </>
        )}

        {/* Face silhouette / alignment guide (bosquejo de rostro) */}
        {camState === 'active' && (!aiResult || viewMode === 'live') && showGuide && (
          <div className="vm-face-guide">
            <div className="vm-face-oval" />
            <span className="vm-guide-text">Centra tu rostro dentro del óvalo</span>
          </div>
        )}

        {/* Placeholder for idle / error / loading states */}
        {renderPlaceholder()}

        {/* Top Badges & Controls */}
        {camState === 'active' && (
          <div className="vm-topbar">
            <div className="vm-live-badge">
              <span className="vm-live-dot" />
              {viewMode === 'ar' && aiResult ? 'AR EN VIVO (60 FPS)' : 'CÁMARA EN VIVO'}
            </div>

            <div className="vm-topbar-actions">
              <button
                className={`vm-icon-btn ${showGuide ? 'is-active' : ''}`}
                onClick={() => setShowGuide(!showGuide)}
                title={showGuide ? 'Ocultar silueta guía' : 'Mostrar silueta guía'}
              >
                <Focus size={13} />
                <span>{showGuide ? 'Ocultar guía' : 'Bosquejo rostro'}</span>
              </button>

              {hairImageB64 && (
                <button
                  className="vm-icon-btn"
                  onClick={runHairTransfer}
                  disabled={isInferring}
                  title="Capturar pose actual y regenerar peinado con IA"
                >
                  <RefreshCw size={13} className={isInferring ? 'is-spinning' : ''} />
                  <span>{isInferring ? 'Generando…' : 'Capturar pose'}</span>
                </button>
              )}

              <button
                className="vm-icon-btn vm-icon-btn--danger"
                onClick={stopCamera}
                title="Apagar cámara"
              >
                <CameraOff size={13} />
                <span>Apagar</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector Pill (when AI result is available) */}
        {aiResult && camState === 'active' && (
          <div className="vm-mode-selector">
            <button
              className={`vm-mode-pill ${viewMode === 'ar' ? 'is-active' : ''}`}
              onClick={() => setViewMode('ar')}
              title="El peinado sigue tus movimientos de cabeza en tiempo real a 60 FPS"
            >
              <Activity size={11} />
              AR en vivo
            </button>
            <button
              className={`vm-mode-pill ${viewMode === 'ai' ? 'is-active' : ''}`}
              onClick={() => setViewMode('ai')}
              title="Foto estática de ultra alta resolución (1024x1024)"
            >
              <Sparkles size={11} />
              Foto HD
            </button>
            <button
              className={`vm-mode-pill ${viewMode === 'split' ? 'is-active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Comparador antes y después con barra deslizadora"
            >
              <SlidersHorizontal size={11} />
              Dividir
            </button>
            <button
              className={`vm-mode-pill ${viewMode === 'live' ? 'is-active' : ''}`}
              onClick={() => setViewMode('live')}
              title="Ver solo tu cámara web en vivo"
            >
              <Eye size={11} />
              Cámara
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isInferring && (
          <div className="vm-processing-badge">
            <div className="vm-spinner-sm" />
            <span>Generando peinado fotorrealista con IA…</span>
          </div>
        )}

        {/* Stats footer (inference speed & tracking) */}
        {camState === 'active' && (
          <div className="vm-stats">
            <Zap size={10} />
            {aiResult && lastMs ? `${lastMs}ms · HairFastGAN` : 'Cámara lista'}
            {isTrackerReady ? ' · MediaPipe 60fps' : ''}
          </div>
        )}

        {/* Floating error notification */}
        {errorMessage && camState === 'active' && (
          <div className="vm-error-toast" role="alert">
            <AlertTriangle size={14} className="vm-error-toast-icon" />
            <span>{errorMessage}</span>
            <button
              className="vm-error-toast-close"
              onClick={() => setErrorMessage(null)}
              aria-label="Cerrar alerta"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Helpful Hint */}
      {camState === 'active' && !hairImageB64 && (
        <div className="vm-bottom-hint">
          👈 Selecciona o sube un peinado para probarlo en tu rostro
        </div>
      )}
    </div>
  )
}
