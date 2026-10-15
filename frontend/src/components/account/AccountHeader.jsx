import { X, User, Scissors, Sparkles, ArrowRight } from 'lucide-react'

export function AccountHeader({
  currentUser,
  roleBadgeLabel,
  initials,
  onRequestClose,
  onOpenBarber
}) {
  return (
    <>
      <div className="account-header">
        <div className="account-profile-summary">
          <div className="account-avatar">
            {currentUser ? initials : <User size={20} />}
          </div>
          <div className="account-info">
            <div className="account-badge-row">
              <span className="account-badge">
                <Sparkles size={11} /> {roleBadgeLabel}
              </span>
            </div>
            <h2 id="account-modal-title">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Acceso a Mi Cuenta'}
            </h2>
            <p className="account-meta">
              {currentUser ? (
                <>
                  <span>{currentUser.email}</span>
                  {currentUser.phone && <span>· {currentUser.phone}</span>}
                </>
              ) : (
                <span>Inicia sesión para ver tus citas agendadas y tus datos</span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="account-close-btn"
          onClick={onRequestClose}
          aria-label="Cerrar panel de cuenta"
        >
          <X size={18} />
        </button>
      </div>

      {currentUser && (currentUser.role === 'BARBER' || currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') && (
        <div className="account-staff-banner">
          <div className="account-staff-info">
            <Scissors size={18} />
            <div>
              <strong>Acceso Staff / Barbero</strong>
              <p>Gestiona tu agenda de citas, atenciones e ingresos en vivo.</p>
            </div>
          </div>
          <button
            type="button"
            className="account-staff-cta"
            onClick={() => {
              onRequestClose()
              onOpenBarber?.()
            }}
          >
            <span>Abrir Panel Barbero</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </>
  )
}
