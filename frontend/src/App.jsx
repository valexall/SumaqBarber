import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteHeader } from './components/layout/SiteHeader'
import { ScrollExperience } from './components/landing/ScrollExperience'
import { fetchMyProfile, logoutUser } from './services/api'
import './App.css'

const BookingModal = lazy(() => import('./components/booking/BookingModal').then((module) => ({ default: module.BookingModal })))
const UserAccountModal = lazy(() => import('./components/account/UserAccountModal').then((module) => ({ default: module.UserAccountModal })))
const BarberDashboard = lazy(() => import('./components/barber/BarberDashboard').then((module) => ({ default: module.BarberDashboard })))

const readCachedUser = () => {
  try {
    const cached = sessionStorage.getItem('sumaq_user')
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(() => ['#reserva', '#reservar'].includes(window.location.hash))
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isBarberOpen, setIsBarberOpen] = useState(() => ['#barbero', '#panel-barbero'].includes(window.location.hash))
  const [currentUser, setCurrentUser] = useState(readCachedUser)
  const [isSessionLoading, setIsSessionLoading] = useState(true)

  const storeUser = useCallback((user) => {
    setCurrentUser(user || null)
    if (user) sessionStorage.setItem('sumaq_user', JSON.stringify(user))
    else sessionStorage.removeItem('sumaq_user')
  }, [])

  useEffect(() => {
    let active = true
    fetchMyProfile()
      .then((user) => { if (active) storeUser(user) })
      .catch(() => { if (active) storeUser(null) })
      .finally(() => { if (active) setIsSessionLoading(false) })
    const clearExpiredSession = () => storeUser(null)
    window.addEventListener('sumaq:session-expired', clearExpiredSession)
    return () => {
      active = false
      window.removeEventListener('sumaq:session-expired', clearExpiredSession)
    }
  }, [storeUser])

  const handleLogin = useCallback((user) => storeUser(user), [storeUser])
  const handleLogout = useCallback(async () => {
    try { await logoutUser() } catch { /* The local session still needs to end. */ }
    storeUser(null)
  }, [storeUser])

  const handleOpenBarber = useCallback(() => {
    setIsAccountOpen(false)
    setIsBookingOpen(false)
    setIsBarberOpen(true)
    window.history.replaceState(null, '', '#barbero')
  }, [])
  const handleCloseBarber = useCallback(() => {
    setIsBarberOpen(false)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const handleOpenBooking = useCallback(() => {
    if (currentUser?.role === 'BARBER') return handleOpenBarber()
    setIsBookingOpen(true)
    window.history.replaceState(null, '', '#reserva')
  }, [currentUser, handleOpenBarber])
  const handleCloseBooking = useCallback(() => {
    setIsBookingOpen(false)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const handleOpenAccount = useCallback(() => setIsAccountOpen(true), [])
  const handleCloseAccount = useCallback(() => setIsAccountOpen(false), [])
  const handleSwitchToBooking = useCallback(() => {
    setIsAccountOpen(false)
    handleOpenBooking()
  }, [handleOpenBooking])

  const barberView = (
    <Suspense fallback={<div className="route-loading" role="status">Cargando agenda…</div>}>
      <BarberDashboard
        currentUser={currentUser}
        onLogout={async () => { await handleLogout(); handleCloseBarber() }}
        onBackToSite={handleCloseBarber}
      />
    </Suspense>
  )

  const mainView = (
    <div className="app-shell">
      <SiteHeader
        onOpenBooking={handleOpenBooking}
        onOpenAccount={handleOpenAccount}
        onOpenBarber={handleOpenBarber}
        currentUser={currentUser}
      />
      <main>
        <ScrollExperience onOpenBooking={handleOpenBooking} />
      </main>
      <Suspense fallback={<span className="sr-only" role="status">Cargando…</span>}>
        {isBookingOpen && (
          <BookingModal
            key={currentUser?.id || 'guest'}
            isOpen
            onClose={handleCloseBooking}
            currentUser={currentUser}
            onLogin={handleLogin}
          />
        )}
        {isAccountOpen && (
          <UserAccountModal
            key={currentUser?.id || 'guest'}
            isOpen
            onClose={handleCloseAccount}
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onUpdateUser={storeUser}
            onOpenBooking={handleSwitchToBooking}
            onOpenBarber={handleOpenBarber}
          />
        )}
      </Suspense>
    </div>
  )

  const isStaff = ['BARBER', 'OWNER', 'ADMIN'].includes(currentUser?.role)
  const protectedBarberView = isSessionLoading
    ? <div className="route-loading" role="status">Validando sesión…</div>
    : isStaff
      ? barberView
      : mainView

  return (
    <Routes>
      <Route path="/barbero" element={protectedBarberView} />
      <Route path="/" element={isBarberOpen ? protectedBarberView : mainView} />
      <Route path="*" element={mainView} />
    </Routes>
  )
}

export default App
