import {
  Clock,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  Scissors,
  FileText,
  MessageCircle,
  Smartphone,
  Check,
  X
} from 'lucide-react'

const getRelativeTimeInfo = (dateString, status, currentTimeMs) => {
  if (status === 'COMPLETED') return { label: 'Completado', class: 'time-pill--done' }
  if (status === 'CANCELED') return { label: 'Cancelado', class: 'time-pill--canceled' }

  const appTime = new Date(dateString).getTime()
  const diffMinutes = Math.round((appTime - currentTimeMs) / (60 * 1000))

  if (diffMinutes < -45) return { label: 'Hora pasada', class: 'time-pill--past' }
  if (diffMinutes >= -45 && diffMinutes <= 15) return { label: 'En curso / Ahora', class: 'time-pill--now' }
  if (diffMinutes > 15 && diffMinutes <= 60) return { label: `En ${diffMinutes} min`, class: 'time-pill--soon' }
  if (diffMinutes > 60) {
    const hours = Math.round(diffMinutes / 60)
    return { label: `En ~${hours} h`, class: 'time-pill--upcoming' }
  }
  return { label: 'Programada', class: 'time-pill--upcoming' }
}

export function BarberAppointmentCard({
  app,
  currentTimeMs,
  waLink,
  isItemUpdating,
  onStatusChange,
  onOpenCancel
}) {
  const timeInfo = getRelativeTimeInfo(app.date, app.status, currentTimeMs)
  const formattedTime = new Date(app.date).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`barber-appointment-card barber-appointment-card--${app.status.toLowerCase()} ${
        isItemUpdating ? 'is-updating' : ''
      }`}
    >
      {/* Top Row: Time & Status Pill */}
      <div className="app-card-header">
        <div className="app-card-time-block">
          <Clock size={16} className="clock-icon" />
          <span className="app-time-strong">{formattedTime}</span>
          <span className={`time-pill ${timeInfo.class}`}>
            {timeInfo.label}
          </span>
        </div>

        <div className={`app-status-badge app-status-badge--${app.status.toLowerCase()}`}>
          {app.status === 'PENDING' && <AlertCircle size={12} />}
          {app.status === 'CONFIRMED' && <Sparkles size={12} />}
          {app.status === 'COMPLETED' && <CheckCircle2 size={12} />}
          {app.status === 'CANCELED' && <XCircle size={12} />}
          <span>
            {app.status === 'PENDING' && 'Pendiente'}
            {app.status === 'CONFIRMED' && 'Confirmada'}
            {app.status === 'COMPLETED' && 'Completada'}
            {app.status === 'CANCELED' && 'Cancelada'}
          </span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="app-card-customer">
        <div className="app-customer-avatar">
          <User size={18} />
        </div>
        <div className="app-customer-info">
          <h4 className="app-customer-name">
            {app.customer?.firstName} {app.customer?.lastName}
          </h4>
          <div className="app-customer-contact">
            {app.customer?.phone ? (
              <a
                href={`tel:${app.customer.phone}`}
                className="app-phone-link"
                title="Llamar al cliente"
              >
                <Phone size={12} />
                <span>{app.customer.phone}</span>
              </a>
            ) : (
              <span className="app-no-phone">Sin teléfono</span>
            )}
            {app.customer?.email && (
              <span className="app-customer-email">
                <Mail size={11} />
                <span>{app.customer.email}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Service & Price Block */}
      <div className="app-card-service-row">
        <div className="service-details">
          <span className="service-name">
            <Scissors size={13} /> {app.service?.name || 'Servicio Barbería'}
          </span>
          <span className="service-duration">
            {app.service?.duration || 45} min
          </span>
        </div>
        <div className="service-price">
          <small>Total:</small>
          <strong>S/ {(app.service?.price || 0).toFixed(2)}</strong>
        </div>
      </div>

      {/* Client Notes if any */}
      {app.notes && (
        <div className="app-card-notes">
          <FileText size={13} />
          <span>"{app.notes}"</span>
        </div>
      )}

      {/* Action Bar (1-Click buttons) */}
      <div className="app-card-actions">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="app-action-btn app-action-btn--whatsapp"
            title="Enviar WhatsApp de confirmación o recordatorio"
          >
            <MessageCircle size={15} />
            <span>WhatsApp</span>
          </a>
        )}

        {app.customer?.phone && (
          <a
            href={`tel:${app.customer.phone}`}
            className="app-action-btn app-action-btn--call"
            title="Llamar directo"
          >
            <Smartphone size={15} />
            <span>Llamar</span>
          </a>
        )}

        {app.status === 'PENDING' && (
          <button
            type="button"
            className="app-action-btn app-action-btn--confirm"
            onClick={() => onStatusChange(app.id, 'CONFIRMED')}
            disabled={isItemUpdating}
            title="Confirmar cita del cliente"
          >
            <Check size={15} />
            <span>Confirmar</span>
          </button>
        )}

        {(app.status === 'PENDING' || app.status === 'CONFIRMED') && (
          <button
            type="button"
            className="app-action-btn app-action-btn--complete"
            onClick={() => onStatusChange(app.id, 'COMPLETED')}
            disabled={isItemUpdating}
            title="Marcar corte como terminado y registrar cobro"
          >
            <Scissors size={15} />
            <span>Finalizar</span>
          </button>
        )}

        {app.status !== 'CANCELED' && app.status !== 'COMPLETED' && (
          <button
            type="button"
            className="app-action-btn app-action-btn--cancel"
            onClick={() => onOpenCancel(app)}
            disabled={isItemUpdating}
            title="Cancelar cita o reportar inasistencia"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
