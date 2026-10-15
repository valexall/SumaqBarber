import { Camera, CameraOff, RefreshCw, AlertTriangle } from 'lucide-react'

export function VirtualMirrorPlaceholder({
  camState,
  errorMessage,
  onStartCamera
}) {
  if (camState === 'denied') {
    return (
      <div className="vm-placeholder vm-placeholder--denied">
        <CameraOff size={32} className="vm-placeholder-icon" />
        <h4>Cámara bloqueada</h4>
        <p>
          Tu navegador bloqueó el permiso para la cámara. Haz clic en el ícono
          del candado o cámara en la barra de direcciones para habilitarla.
        </p>
        <button className="vm-action-btn" onClick={onStartCamera}>
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
        <button className="vm-action-btn" onClick={onStartCamera}>
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
        <button className="vm-action-btn" onClick={onStartCamera}>
          <Camera size={15} /> Activar Cámara
        </button>
      </div>
    )
  }

  return null
}
