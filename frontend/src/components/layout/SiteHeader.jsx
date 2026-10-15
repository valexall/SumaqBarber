import { ArrowUpRight, Menu, Scissors, Sparkles, User } from 'lucide-react'

export function SiteHeader({ onOpenBooking, onOpenAccount, onOpenMirror, currentUser }) {
  const initials = currentUser
    ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
    : null

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Sumaq Barber, inicio">
        <span className="brand-mark"><Scissors size={17} strokeWidth={1.8} /></span>
        <span>NOVA<span className="brand-muted">/</span><small>BARBERSHOP</small></span>
      </a>
      <nav className="desktop-nav" aria-label="Navegación principal">
        <a href="#servicios">Servicios</a>
        <a href="#estilos">Estilos</a>
        <a href="#simulacion">Nosotros</a>
      </nav>
      <div className="header-actions">
        <button
          type="button"
          className="header-account-btn"
          onClick={onOpenAccount}
          aria-label={currentUser ? `Cuenta de ${currentUser.firstName}` : 'Mi Cuenta'}
        >
          {initials ? (
            <span className="header-user-avatar">{initials}</span>
          ) : (
            <User size={14} />
          )}
          <span>{currentUser ? currentUser.firstName : 'Mi Cuenta'}</span>
        </button>
        <button
          type="button"
          className="header-mirror-btn"
          onClick={onOpenMirror}
          aria-label="Probar peinado con espejo virtual"
        >
          <Sparkles size={13} aria-hidden="true" />
          <span>Probar look</span>
        </button>
        <a
          className="header-cta"
          href="#reserva"
          onClick={(e) => {
            e.preventDefault();
            onOpenBooking?.();
          }}
        >
          Reservar ahora <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <button
        className="mobile-menu"
        type="button"
        aria-label="Abrir panel"
        onClick={onOpenAccount}
      >
        <Menu size={21} aria-hidden="true" />
      </button>
    </header>
  )
}