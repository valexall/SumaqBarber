import {
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  ArrowRight
} from 'lucide-react'

export function BookingSuccessView({
  successData,
  customerName,
  customerEmail,
  selectedService,
  time,
  onRequestClose
}) {
  return (
    <div className="booking-success-view">
      <div className="booking-success-icon-wrap">
        <CheckCircle2 size={54} className="booking-success-icon" />
        <div className="success-pulse" />
      </div>

      <div className="booking-success-message">
        <span className="booking-code-pill">
          CÓDIGO: {successData.bookingCode || 'SB-CONFIRM'}
        </span>
        <h3>¡Casi listo, {successData.user?.firstName || customerName}!</h3>
        <p>Tu cita ha sido pre-registrada con éxito en el sistema.</p>
      </div>

      {/* Anti-Fraud WhatsApp Callout */}
      <div className="booking-fraud-alert">
        <div className="fraud-alert-header">
          <ShieldCheck size={18} className="shield-icon" />
          <strong>Paso final: Confirma por WhatsApp</strong>
        </div>
        <p>
          Para evitar reservas falsas y apartar tu sillón, por favor confirma tu cita en los próximos <strong>15 minutos</strong>.
        </p>
        {successData.whatsappUrl && (
          <a
            href={successData.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="booking-whatsapp-btn"
          >
            <MessageCircle size={18} />
            <span>Confirmar por WhatsApp (1 clic)</span>
            <ExternalLink size={15} />
          </a>
        )}
      </div>

      {/* Summary Box */}
      <div className="booking-summary-box">
        <div className="booking-summary-row">
          <span className="summary-label">Servicio</span>
          <span className="summary-value">
            {successData.appointment?.service?.name || selectedService?.name}
          </span>
        </div>
        <div className="booking-summary-row">
          <span className="summary-label">Precio</span>
          <span className="summary-value summary-price">
            S/ {successData.appointment?.service?.price || selectedService?.price}
          </span>
        </div>
        <div className="booking-summary-row">
          <span className="summary-label">Fecha y Hora</span>
          <span className="summary-value highlight-date">
            {new Date(successData.appointment?.date).toLocaleDateString('es-PE', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            - {time} hrs
          </span>
        </div>
        <div className="booking-summary-row">
          <span className="summary-label">Especialista</span>
          <span className="summary-value">
            {successData.appointment?.barber
              ? `${successData.appointment.barber.firstName} ${successData.appointment.barber.lastName}`
              : 'Barbero asignado'}
          </span>
        </div>
        <div className="booking-summary-row">
          <span className="summary-label">Cuenta creada</span>
          <span className="summary-value">
            {successData.user?.email || customerEmail}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="booking-secondary-btn"
        onClick={onRequestClose}
      >
        Listo, cerrar ventana <ArrowRight size={15} />
      </button>
    </div>
  )
}
