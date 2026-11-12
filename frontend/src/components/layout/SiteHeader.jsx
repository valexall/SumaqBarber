import { ArrowUpRight, Menu, Scissors, User, X } from 'lucide-react'
import { useState } from 'react'

export function SiteHeader({ onOpenBooking, onOpenAccount, onOpenBarber, currentUser }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const initials = currentUser
    ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
    : null
  const isStaff = ['BARBER', 'OWNER', 'ADMIN'].includes(currentUser?.role)

  const closeMobile = () => setMobileOpen(false)
  const openBooking = () => { closeMobile(); onOpenBooking?.() }

  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Sumaq Barber, inicio" onClick={closeMobile}>
        <span className="brand-mark"><Scissors size={18} strokeWidth={1.8} /></span>
        <span>SUMAQ<small>BARBER</small></span>
      </a>

      <nav className={`desktop-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
        <a href="#servicios" onClick={closeMobile}>Servicios</a>
        <a href="#experiencia" onClick={closeMobile}>Experiencia</a>
        <a href="#visitanos" onClick={closeMobile}>Visítanos</a>
        <button type="button" className="mobile-nav-account" onClick={() => { closeMobile(); onOpenAccount?.() }}>
          <User size={17} /> Mi cuenta
        </button>
        <button type="button" className="mobile-nav-booking" onClick={openBooking}>Reservar cita</button>
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className="header-account-btn"
          onClick={onOpenAccount}
          aria-label={currentUser ? `Cuenta de ${currentUser.firstName}` : 'Mi cuenta'}
        >
          {initials ? <span className="header-user-avatar">{initials}</span> : <User size={15} />}
          <span>{currentUser ? currentUser.firstName : 'Mi cuenta'}</span>
        </button>
        {isStaff ? (
          <button type="button" className="header-cta header-cta--barber" onClick={onOpenBarber}>
            Mi panel
          </button>
        ) : (
          <button type="button" className="header-cta" onClick={openBooking}>
            Reservar <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <button
        className="mobile-menu"
        type="button"
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  )
}
