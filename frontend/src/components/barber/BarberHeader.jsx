import { Scissors, ArrowLeft, RotateCw, LogOut } from 'lucide-react'

export function BarberHeader({
  barberInitials,
  currentUser,
  isShiftActive,
  setIsShiftActive,
  isRefreshing,
  onRefresh,
  onLogout,
  onBackToSite
}) {
  return (
    <header className="barber-os-header">
      <div className="barber-os-header-left">
        <button
          type="button"
          className="barber-back-to-site-btn"
          onClick={onBackToSite}
          title="Regresar a la página principal de Sumaq Barber"
        >
          <ArrowLeft size={16} />
          <span>Volver al Sitio</span>
        </button>

        <div className="barber-profile-pill">
          <div className="barber-avatar-halo">
            <span className="barber-avatar-text">{barberInitials}</span>
            <span className={`barber-status-dot ${isShiftActive ? 'is-active' : 'is-paused'}`} />
          </div>
          <div className="barber-profile-meta">
            <div className="barber-title-row">
              <h2>
                {currentUser?.firstName || 'Barbero'} {currentUser?.lastName || ''}
              </h2>
              <span className="barber-role-pill">
                <Scissors size={10} /> MASTER BARBER
              </span>
            </div>
            <p className="barber-subtitle">
              {currentUser?.email || 'sumaqbarber.pe'}
            </p>
          </div>
        </div>
      </div>

      <div className="barber-os-header-right">
        {/* Shift status switch */}
        <button
          type="button"
          className={`barber-shift-toggle ${isShiftActive ? 'is-active' : 'is-paused'}`}
          onClick={() => setIsShiftActive(!isShiftActive)}
          title="Alternar estado de turno"
        >
          <span className="shift-indicator" />
          <span>{isShiftActive ? 'En Turno' : 'En Pausa'}</span>
        </button>

        {/* Refresh button */}
        <button
          type="button"
          className={`barber-action-icon-btn ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={onRefresh}
          title="Sincronizar agenda"
          aria-label="Sincronizar citas"
        >
          <RotateCw size={17} />
        </button>

        {/* Logout button */}
        <button
          type="button"
          className="barber-logout-btn"
          onClick={onLogout}
          title="Cerrar sesión"
        >
          <LogOut size={16} />
          <span className="logout-text">Salir</span>
        </button>
      </div>
    </header>
  )
}
