import { Scissors, ArrowLeft, RotateCw, LogOut, Calendar, Users } from 'lucide-react'

export function BarberHeader({
  barberInitials,
  currentUser,
  isShiftActive,
  setIsShiftActive,
  isRefreshing,
  onRefresh,
  onLogout,
  onBackToSite,
  activeSection,
  setActiveSection
}) {
  const roleLabel =
    currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN'
      ? 'ADMINISTRADOR / OWNER'
      : 'MASTER BARBER'

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
                <Scissors size={10} /> {roleLabel}
              </span>
            </div>
            <p className="barber-subtitle">
              {currentUser?.email || 'sumaqbarber.pe'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs for management suite */}
      <div className="barber-os-nav-tabs">
        <button
          type="button"
          className={`barber-nav-tab ${activeSection === 'AGENDA' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('AGENDA')}
        >
          <Calendar size={13} />
          <span>Agenda</span>
        </button>
        <button
          type="button"
          className={`barber-nav-tab ${activeSection === 'BARBERS' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('BARBERS')}
        >
          <Scissors size={13} />
          <span>Equipo / Barberos</span>
        </button>
        <button
          type="button"
          className={`barber-nav-tab ${activeSection === 'CUSTOMERS' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('CUSTOMERS')}
        >
          <Users size={13} />
          <span>Clientes</span>
        </button>
      </div>

      <div className="barber-os-header-right">
        <button
          type="button"
          className={`barber-shift-toggle ${isShiftActive ? 'is-active' : 'is-paused'}`}
          onClick={() => setIsShiftActive(!isShiftActive)}
          title="Alternar estado de turno"
        >
          <span className="shift-indicator" />
          <span>{isShiftActive ? 'En Turno' : 'En Pausa'}</span>
        </button>

        <button
          type="button"
          className={`barber-action-icon-btn ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={onRefresh}
          title="Sincronizar agenda"
          aria-label="Sincronizar citas"
        >
          <RotateCw size={17} />
        </button>

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
