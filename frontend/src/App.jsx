import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { SiteHeader } from './components/layout/SiteHeader'
import { ScrollExperience } from './components/landing/ScrollExperience'
import './App.css'

const BookingModal = lazy(() =>
  import('./components/booking/BookingModal').then((m) => ({ default: m.BookingModal }))
)
const UserAccountModal = lazy(() =>
  import('./components/account/UserAccountModal').then((m) => ({ default: m.UserAccountModal }))
)
const VirtualMirrorModal = lazy(() =>
  import('./components/mirror/VirtualMirrorModal').then((m) => ({ default: m.VirtualMirrorModal }))
)

function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(() => 
    typeof window !== 'undefined' && (window.location.hash === '#reserva' || window.location.hash === '#reservar')
  )
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isMirrorOpen, setIsMirrorOpen] = useState(() =>
    typeof window !== 'undefined' && window.location.hash === '#espejo'
  )
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sumaq_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Pre-cargar bundles de modales en tiempo ocioso para apertura instantánea sin latencia
  useEffect(() => {
    const prefetch = () => {
      import('./components/booking/BookingModal')
      import('./components/account/UserAccountModal')
      import('./components/mirror/VirtualMirrorModal')
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    } else {
      const id = setTimeout(prefetch, 1200)
      return () => clearTimeout(id)
    }
  }, [])

  // Sync user state on storage event or custom event
  const refreshUser = useCallback(() => {
    try {
      const saved = localStorage.getItem('sumaq_user')
      setCurrentUser(saved ? JSON.parse(saved) : null)
    } catch {
      setCurrentUser(null)
    }
  }, [])

  const handleLogin = useCallback((user, token) => {
    if (user && token) {
      localStorage.setItem('sumaq_user', JSON.stringify(user))
      localStorage.setItem('sumaq_token', token)
      setCurrentUser(user)
    }
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('sumaq_user')
    localStorage.removeItem('sumaq_token')
    setCurrentUser(null)
  }, [])

  const handleUpdateUser = useCallback((updatedUser) => {
    if (updatedUser) {
      localStorage.setItem('sumaq_user', JSON.stringify(updatedUser))
      setCurrentUser(updatedUser)
    }
  }, [])

  const handleOpenBooking = useCallback(() => {
    setIsBookingOpen(true)
  }, [])

  const handleCloseBooking = useCallback(() => {
    setIsBookingOpen(false)
    refreshUser()
    if (window.location.hash === '#reserva' || window.location.hash === '#reservar') {
      history.replaceState(null, '', window.location.pathname)
    }
  }, [refreshUser])

  const handleOpenAccount = useCallback(() => {
    refreshUser()
    setIsAccountOpen(true)
  }, [refreshUser])

  const handleCloseAccount = useCallback(() => {
    setIsAccountOpen(false)
    refreshUser()
    if (window.location.hash === '#cuenta' || window.location.hash === '#perfil') {
      history.replaceState(null, '', window.location.pathname)
    }
  }, [refreshUser])

  const handleSwitchToBooking = useCallback(() => {
    setIsAccountOpen(false)
    setIsBookingOpen(true)
  }, [])

  const handleOpenMirror = useCallback(() => {
    setIsMirrorOpen(true)
  }, [])

  const handleCloseMirror = useCallback(() => {
    setIsMirrorOpen(false)
    if (window.location.hash === '#espejo') {
      history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Intercept any click to #reserva across the entire application
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href="#reserva"], a[href="#reservar"]')
      if (anchor) {
        e.preventDefault()
        handleOpenBooking()
      }
      const accountAnchor = e.target.closest('a[href="#cuenta"], a[href="#perfil"]')
      if (accountAnchor) {
        e.preventDefault()
        handleOpenAccount()
      }
      const mirrorAnchor = e.target.closest('a[href="#espejo"]')
      if (mirrorAnchor) {
        e.preventDefault()
        handleOpenMirror()
      }
    }

    const handleHashChange = () => {
      if (window.location.hash === '#reserva' || window.location.hash === '#reservar') {
        setIsBookingOpen(true)
      } else if (window.location.hash === '#cuenta' || window.location.hash === '#perfil') {
        setIsAccountOpen(true)
      } else if (window.location.hash === '#espejo') {
        setIsMirrorOpen(true)
      }
    }

    window.addEventListener('storage', refreshUser)
    document.addEventListener('click', handleAnchorClick)
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('storage', refreshUser)
      document.removeEventListener('click', handleAnchorClick)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [handleOpenBooking, handleOpenAccount, handleOpenMirror, refreshUser])

  return (
    <div className="app-shell">
      <SiteHeader
        onOpenBooking={handleOpenBooking}
        onOpenAccount={handleOpenAccount}
        onOpenMirror={handleOpenMirror}
        currentUser={currentUser}
      />
      <main>
        <ScrollExperience onOpenBooking={handleOpenBooking} />
      </main>

      <Suspense fallback={null}>
        {isBookingOpen && (
          <BookingModal
            key={currentUser?.id || 'guest'}
            isOpen={isBookingOpen}
            onClose={handleCloseBooking}
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}

        {isAccountOpen && (
          <UserAccountModal
            key={currentUser?.id || 'guest'}
            isOpen={isAccountOpen}
            onClose={handleCloseAccount}
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
            onOpenBooking={handleSwitchToBooking}
          />
        )}

        {isMirrorOpen && (
          <VirtualMirrorModal
            isOpen={isMirrorOpen}
            onClose={handleCloseMirror}
            onOpenBooking={handleOpenBooking}
          />
        )}
      </Suspense>
    </div>
  )
}

export default App
