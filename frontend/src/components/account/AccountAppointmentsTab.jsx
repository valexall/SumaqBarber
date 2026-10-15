import {
  Calendar,
  Clock,
  User,
  Scissors,
  PlusCircle,
  MessageCircle,
  ShieldCheck,
  Ban,
  Loader2
} from 'lucide-react'

export function AccountAppointmentsTab({
  appointments,
  isLoading,
  cancelingId,
  onCancel,
  onOpenBooking,
  onRequestClose
}) {
  const getWhatsAppLink = (app) => {
    const phone = '51987111222'
    const code = `SB-${app.id.slice(0, 6).toUpperCase()}`
    const dateFormatted = new Date(app.date).toLocaleDateString('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    const timeFormatted = new Date(app.date).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const text = `¡Hola Sumaq Barber! 👋 Confirmo mi reserva ${code} para ${app.service?.name} el ${dateFormatted} a las ${timeFormatted} hrs.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }

  if (isLoading) {
    return (
      <div className="account-body">
        <div className="account-loading-state">
          <Loader2 size={20} className="spin" />
          <span>Cargando tus citas...</span>
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="account-body">
        <div className="account-empty-state">
          <Scissors size={34} className="empty-icon" />
          <h3>Aún no tienes citas agendadas</h3>
          <p>Elige tu estilo favorito y reserva tu lugar en segundos.</p>
          <button
            type="button"
            className="account-cta-btn"
            onClick={() => {
              onRequestClose()
              onOpenBooking?.()
            }}
          >
            <PlusCircle size={16} /> Reservar mi primera cita
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="account-body">
      <div className="appointments-list">
        {appointments.map((app) => {
          const appDate = new Date(app.date)
          const isFuture = appDate >= new Date()
          const statusConfig = {
            PENDING: { label: 'Por confirmar', class: 'status-pending' },
            CONFIRMED: { label: 'Confirmada', class: 'status-confirmed' },
            COMPLETED: { label: 'Completada', class: 'status-completed' },
            CANCELED: { label: 'Cancelada', class: 'status-canceled' },
          }[app.status] || { label: app.status, class: 'status-pending' }

          return (
            <article key={app.id} className="appointment-card">
              <div className="appointment-card-header">
                <div className="appointment-service-title">
                  <strong>{app.service?.name}</strong>
                  <span className="appointment-price">
                    S/ {app.service?.price}
                  </span>
                </div>
                <span className={`status-pill ${statusConfig.class}`}>
                  {statusConfig.label}
                </span>
              </div>

              <div className="appointment-details-grid">
                <div className="detail-item">
                  <Calendar size={13} />
                  <span>
                    {appDate.toLocaleDateString('es-PE', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="detail-item">
                  <Clock size={13} />
                  <span>
                    {appDate.toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    hrs ({app.service?.duration} min)
                  </span>
                </div>
                <div className="detail-item">
                  <User size={13} />
                  <span>
                    {app.barber
                      ? `${app.barber.firstName} ${app.barber.lastName}`
                      : 'Barbero asignado'}
                  </span>
                </div>
                <div className="detail-item code-item">
                  <ShieldCheck size={13} />
                  <span>Cód: SB-{app.id.slice(0, 6).toUpperCase()}</span>
                </div>
              </div>

              {app.notes && (
                <p className="appointment-note">
                  <em>Nota:</em> {app.notes}
                </p>
              )}

              <div className="appointment-actions">
                {app.status === 'PENDING' && (
                  <a
                    href={getWhatsAppLink(app)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-whatsapp-confirm"
                  >
                    <MessageCircle size={14} /> Confirmar en WhatsApp
                  </a>
                )}

                {isFuture && app.status !== 'CANCELED' && (
                  <button
                    type="button"
                    className="btn-cancel-appointment"
                    disabled={cancelingId === app.id}
                    onClick={() => onCancel(app.id)}
                  >
                    {cancelingId === app.id ? (
                      <Loader2 size={13} className="spin" />
                    ) : (
                      <Ban size={13} />
                    )}
                    <span>Cancelar</span>
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
