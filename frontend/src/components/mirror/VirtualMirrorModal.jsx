import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Sparkles, Camera, ArrowRight, Wifi, WifiOff, Info } from 'lucide-react'
import { HairReferenceUploader } from './HairReferenceUploader'
import { VirtualMirror } from './VirtualMirror'
import { checkAiHealth } from '../../services/hairApi'
import './VirtualMirrorModal.css'

/**
 * VirtualMirrorModal
 *
 * Full-screen modal that wraps the hair reference uploader and virtual mirror.
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {() => void}
 *   onOpenBooking  {() => void}   – callback to open BookingModal after choosing a look
 */
export function VirtualMirrorModal({ isOpen, onClose, onOpenBooking }) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [hairImageB64, setHairImageB64] = useState(null)
  const [isMirrorActive, setIsMirrorActive] = useState(false)
  const [aiStatus, setAiStatus] = useState('checking') // 'checking'|'ok'|'offline'
  const [device, setDevice] = useState('')
  const closeTimerRef = useRef(null)

  // ── Close animation ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setIsMirrorActive(false)
    setIsAnimatingOut(true)
    closeTimerRef.current = setTimeout(() => {
      setIsAnimatingOut(false)
      onClose?.()
    }, 220)
  }, [onClose])

  // ── Keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  // ── Clean up timer ─────────────────────────────────────────────────────────
  useEffect(() => () => clearTimeout(closeTimerRef.current), [])

  // ── Check AI service health ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    checkAiHealth().then(({ ok, device: dev }) => {
      setAiStatus(ok ? 'ok' : 'offline')
      setDevice(dev || '')
    })
  }, [isOpen])

  // ── Hair image selected ────────────────────────────────────────────────────
  const handleHairSelected = useCallback((dataUrl) => {
    setHairImageB64(dataUrl)
    // Auto-activate camera if not already active
    setIsMirrorActive(true)
  }, [])

  const handleHairReset = useCallback(() => {
    setHairImageB64(null)
  }, [])

  // ── Activate mirror manually ───────────────────────────────────────────────
  const handleActivateMirror = useCallback(() => {
    setIsMirrorActive(true)
  }, [])

  // ── Book with selected look ────────────────────────────────────────────────
  const handleBookWithLook = useCallback(() => {
    handleClose()
    setTimeout(() => onOpenBooking?.(), 250)
  }, [handleClose, onOpenBooking])

  if (!isOpen && !isAnimatingOut) return null

  return (
    <div
      className={`vm-modal-overlay ${isOpen && !isAnimatingOut ? 'is-open' : ''} ${isAnimatingOut ? 'is-closing' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Espejo virtual de peinados"
    >
      <div className={`vm-modal-card ${isOpen && !isAnimatingOut ? 'is-open' : ''} ${isAnimatingOut ? 'is-closing' : ''}`}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="vm-modal-header">
          <div className="vm-modal-title">
            <Sparkles size={16} className="vm-modal-title-icon" />
            <span>Espejo Virtual</span>
            <span className="vm-modal-subtitle">Prueba un peinado antes de reservar</span>
          </div>
          <div className="vm-modal-header-actions">
            {/* AI status pill */}
            <AiStatusPill status={aiStatus} device={device} />
            <button
              className="vm-modal-close"
              onClick={handleClose}
              aria-label="Cerrar espejo virtual"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="vm-modal-body">
          {/* Left panel: reference uploader */}
          <div className="vm-modal-left">
            <p className="vm-panel-label">
              <span className="vm-step-num">1</span>
              Elige tu peinado de referencia
            </p>

            <HairReferenceUploader
              onHairSelected={handleHairSelected}
              onReset={handleHairReset}
            />

            {/* CTA: activate mirror */}
            {hairImageB64 && !isMirrorActive && (
              <button
                className="vm-activate-btn"
                onClick={handleActivateMirror}
                disabled={aiStatus !== 'ok'}
              >
                <Camera size={15} />
                {aiStatus === 'offline'
                  ? 'Servicio AI no disponible'
                  : 'Activar espejo con cámara'}
              </button>
            )}

            {/* Offline notice */}
            {aiStatus === 'offline' && (
              <OfflineNotice />
            )}

            {/* Book CTA */}
            {isMirrorActive && (
              <button className="vm-book-btn" onClick={handleBookWithLook}>
                Reservar con este look
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Right panel: mirror */}
          <div className="vm-modal-right">
            <p className="vm-panel-label">
              <span className="vm-step-num">2</span>
              Tu espejo en vivo
            </p>
            <VirtualMirror
              hairImageB64={hairImageB64}
              isActive={isMirrorActive}
              onToggleCamera={setIsMirrorActive}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function AiStatusPill({ status, device }) {
  const map = {
    checking: { color: 'muted', icon: <div className="vm-pill-spinner" />, label: 'Conectando…' },
    ok:       { color: 'ok',    icon: <Wifi size={11} />,    label: device === 'cuda' ? 'AI · GPU' : 'AI · CPU' },
    offline:  { color: 'err',   icon: <WifiOff size={11} />, label: 'AI offline' },
  }
  const { color, icon, label } = map[status] ?? map.checking
  return (
    <div className={`vm-ai-pill vm-ai-pill--${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

function OfflineNotice() {
  return (
    <div className="vm-offline-notice">
      <Info size={13} />
      <div>
        <strong>Servicio AI no disponible</strong>
        <p>
          Inicia el microservicio Python para usar el espejo:
        </p>
        <code>cd ai-service &amp;&amp; uvicorn main:app --reload</code>
      </div>
    </div>
  )
}
