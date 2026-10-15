import { useState, useRef, useCallback } from 'react'
import { ImagePlus, Link2, X, CheckCircle, AlertCircle, Scissors } from 'lucide-react'
import './HairReferenceUploader.css'

// Preset reference styles with verified frontal faces
const PRESET_STYLES = [
  { id: 'fade-clasico', label: 'Fade Clásico', src: '/presets/fade-clasico.jpg' },
  { id: 'texturizado', label: 'Texturizado', src: '/presets/texturizado.jpg' },
  { id: 'corto-moderno', label: 'Corto Moderno', src: '/presets/corto-moderno.jpg' },
  { id: 'pompadour', label: 'Pompadour', src: '/presets/pompadour.jpg' },
  { id: 'rizado', label: 'Rizado Natural', src: '/presets/rizado.jpg' },
  { id: 'buzz-cut', label: 'Buzz Cut', src: '/presets/buzz-cut.jpg' },
]

/**
 * HairReferenceUploader
 *
 * Allows the user to:
 *   1. Upload a photo from disk
 *   2. Paste a URL (from Pinterest, Instagram, etc.)
 *   3. Pick a preset style
 *
 * Calls onHairSelected(base64DataUrl) when a valid image is ready.
 */
export function HairReferenceUploader({ onHairSelected, onReset }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'url' | 'selected' | 'error'
  const [urlInput, setUrlInput] = useState('')
  const [preview, setPreview] = useState(null)  // { src: dataUrl, label: string }
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageReady = useCallback((dataUrl, label = 'Referencia personalizada') => {
    setPreview({ src: dataUrl, label })
    setMode('selected')
    setError('')
    onHairSelected?.(dataUrl)
  }, [onHairSelected])

  // ── File upload ────────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) {
      setError('Por favor sube una imagen válida (JPG, PNG, WEBP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => handleImageReady(e.target.result, file.name)
    reader.readAsDataURL(file)
  }, [handleImageReady])

  const handleFileChange = (e) => processFile(e.target.files?.[0])

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }, [processFile])

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  // ── URL import ─────────────────────────────────────────────────────────────
  const handleUrlSubmit = useCallback(async (e) => {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return

    setIsLoading(true)
    setError('')
    try {
      // Proxy through canvas to convert to base64 (bypasses CORS for most CDN images)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('No se pudo cargar la imagen desde esa URL'))
        img.src = url
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 512
      canvas.height = img.naturalHeight || 512
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      handleImageReady(dataUrl, 'Imagen de URL')
    } catch {
      setError(`No se pudo cargar la imagen. Intenta descargarla y subirla manualmente.`)
    } finally {
      setIsLoading(false)
    }
  }, [urlInput, handleImageReady])

  // ── Preset selection ───────────────────────────────────────────────────────
  const handlePresetSelect = useCallback(async (preset) => {
    setIsLoading(true)
    setError('')
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = preset.src
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      handleImageReady(canvas.toDataURL('image/jpeg', 0.92), preset.label)
    } catch {
      setError('No se pudo cargar el estilo. Intenta con otro.')
    } finally {
      setIsLoading(false)
    }
  }, [handleImageReady])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setMode('idle')
    setPreview(null)
    setUrlInput('')
    setError('')
    onReset?.()
  }

  // ── Selected state ─────────────────────────────────────────────────────────
  if (mode === 'selected' && preview) {
    return (
      <div className="hair-uploader hair-uploader--selected">
        <div className="hair-uploader__preview-wrap">
          <img src={preview.src} alt="Estilo de referencia" className="hair-uploader__preview" />
          <button className="hair-uploader__reset-btn" onClick={handleReset} title="Cambiar estilo">
            <X size={14} />
          </button>
        </div>
        <div className="hair-uploader__selected-info">
          <CheckCircle size={14} className="hair-uploader__check" />
          <span>{preview.label}</span>
        </div>
      </div>
    )
  }

  // ── Idle / upload state ────────────────────────────────────────────────────
  return (
    <div className="hair-uploader">
      {/* Drop zone */}
      <div
        className={`hair-uploader__dropzone ${isDragging ? 'is-dragging' : ''} ${isLoading ? 'is-loading' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Subir imagen de referencia"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hair-uploader__file-input"
          aria-hidden="true"
        />
        {isLoading ? (
          <div className="hair-uploader__spinner" aria-label="Cargando…" />
        ) : (
          <>
            <div className="hair-uploader__icon-wrap">
              <ImagePlus size={22} />
            </div>
            <p className="hair-uploader__label">
              Arrastra una foto o <span>selecciona archivo</span>
            </p>
            <p className="hair-uploader__hint">Foto de frente con rostro y cabello visibles</p>
          </>
        )}
      </div>

      {/* Frontal face tip */}
      <div className="hair-uploader__guide-tip">
        <span>💡 Clave:</span> La foto debe mostrar un rostro de frente (con ojos y frente) para que la IA pueda calzar el peinado.
      </div>

      {/* URL input */}
      <form className="hair-uploader__url-form" onSubmit={handleUrlSubmit}>
        <Link2 size={14} className="hair-uploader__url-icon" />
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="O pega una URL de imagen…"
          className="hair-uploader__url-input"
          id="hair-url-input"
          disabled={isLoading}
        />
        {urlInput && (
          <button type="submit" className="hair-uploader__url-btn" disabled={isLoading}>
            Usar
          </button>
        )}
      </form>

      {/* Error */}
      {error && (
        <p className="hair-uploader__error" role="alert">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {/* Preset grid */}
      <div className="hair-uploader__presets">
        <p className="hair-uploader__presets-label">
          <Scissors size={11} /> O elige un estilo popular
        </p>
        <div className="hair-uploader__preset-grid">
          {PRESET_STYLES.map((style) => (
            <button
              key={style.id}
              className="hair-uploader__preset-item"
              onClick={() => handlePresetSelect(style)}
              disabled={isLoading}
              title={style.label}
            >
              <img src={style.src} alt={style.label} loading="lazy" />
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
