import {
  Focus,
  RefreshCw,
  CameraOff,
  Activity,
  Sparkles,
  SlidersHorizontal,
  Eye,
  Zap,
  AlertTriangle,
  X
} from 'lucide-react'

export function VirtualMirrorOverlays({
  camState,
  viewMode,
  setViewMode,
  aiResult,
  showGuide,
  setShowGuide,
  hairImageB64,
  runHairTransfer,
  isInferring,
  stopCamera,
  sliderPos,
  setSliderPos,
  lastMs,
  isTrackerReady,
  errorMessage,
  setErrorMessage
}) {
  return (
    <>
      {/* Static HD Result Layer */}
      {aiResult && camState === 'active' && viewMode === 'ai' && (
        <div className="vm-ai-layer is-full">
          <img
            src={`data:image/jpeg;base64,${aiResult}`}
            alt="Peinado aplicado por IA"
            className="vm-ai-image"
          />
        </div>
      )}

      {/* Split slider comparison view */}
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

      {/* Face silhouette / alignment guide */}
      {camState === 'active' && (!aiResult || viewMode === 'live') && showGuide && (
        <div className="vm-face-guide">
          <div className="vm-face-oval" />
          <span className="vm-guide-text">Centra tu rostro dentro del óvalo</span>
        </div>
      )}

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

      {/* Mode Selector Pill */}
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

      {/* Stats footer */}
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
    </>
  )
}
