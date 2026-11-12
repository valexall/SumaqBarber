import { AlertCircle, X } from 'lucide-react'
import { useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export function BarberCancelModal({
  cancelModalItem,
  cancelReason,
  setCancelReason,
  isCanceling,
  onClose,
  onConfirm
}) {
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef, Boolean(cancelModalItem))
  if (!cancelModalItem) return null

  return (
    <div className="barber-modal-overlay" onClick={onClose}>
      <div
        className="barber-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-appointment-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="barber-modal-header">
          <div className="barber-modal-icon-badge">
            <AlertCircle size={22} />
          </div>
          <h3 id="cancel-appointment-title">¿Cancelar esta cita?</h3>
          <button
            type="button"
            className="barber-modal-close"
            onClick={onClose}
            aria-label="Cerrar confirmación"
          >
            <X size={18} />
          </button>
        </div>

        <div className="barber-modal-body">
          <p>
            Estás por cancelar la cita de{' '}
            <strong>
              {cancelModalItem.customer?.firstName} {cancelModalItem.customer?.lastName}
            </strong>{' '}
            para{' '}
            <strong>{cancelModalItem.service?.name}</strong> a las{' '}
            <strong>
              {new Date(cancelModalItem.date).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>.
          </p>

          <label className="barber-modal-label">
            <span>Motivo de la cancelación (opcional):</span>
            <input
              type="text"
              placeholder="Ej: Cliente canceló por WhatsApp, no asistió, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="barber-modal-input"
            />
          </label>
        </div>

        <div className="barber-modal-footer">
          <button
            type="button"
            className="barber-modal-btn barber-modal-btn--ghost"
            onClick={onClose}
            disabled={isCanceling}
          >
            Regresar
          </button>
          <button
            type="button"
            className="barber-modal-btn barber-modal-btn--danger"
            onClick={onConfirm}
            disabled={isCanceling}
          >
            {isCanceling ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      </div>
    </div>
  )
}
