import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LogOut,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  User
} from 'lucide-react'
import {
  fetchMyAppointments,
  cancelUserAppointment,
  updateMyProfile
} from '../../services/api'
import { AccountHeader } from './AccountHeader'
import { AccountGuestLogin } from './AccountGuestLogin'
import { AccountAppointmentsTab } from './AccountAppointmentsTab'
import { AccountProfileTab } from './AccountProfileTab'
import './UserAccountModal.css'

export function UserAccountModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onUpdateUser,
  onOpenBooking,
  onOpenBarber
}) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [activeTab, setActiveTab] = useState('appointments')

  const [appointments, setAppointments] = useState([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(() => Boolean(currentUser))
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [editFirstName, setEditFirstName] = useState(currentUser?.firstName || '')
  const [editLastName, setEditLastName] = useState(currentUser?.lastName || '')
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)

  const modalRef = useRef(null)

  const handleRequestClose = useCallback(() => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsAnimatingOut(false)
      setErrorMsg('')
      setSuccessMsg('')
      onClose()
    }, 240)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRequestClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleRequestClose])

  useEffect(() => {
    if (!isOpen || !currentUser) return
    let isMounted = true
    const token = localStorage.getItem('sumaq_token')
    if (!token) return

    fetchMyAppointments(token)
      .then((data) => {
        if (isMounted) setAppointments(data || [])
      })
      .catch((err) => {
        if (isMounted) setErrorMsg(err.message || 'Error al cargar tus reservas')
      })
      .finally(() => {
        if (isMounted) setIsLoadingAppointments(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, currentUser])

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta reserva?')) return
    const token = localStorage.getItem('sumaq_token')
    if (!token) return

    setCancelingId(appointmentId)
    try {
      await cancelUserAppointment(appointmentId, token)
      setAppointments((prev) =>
        prev.map((app) =>
          app.id === appointmentId ? { ...app, status: 'CANCELED' } : app
        )
      )
      setSuccessMsg('Cita cancelada correctamente.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.message || 'Error al cancelar la cita.')
    } finally {
      setCancelingId(null)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const token = localStorage.getItem('sumaq_token')
    if (!token) return

    setIsSavingProfile(true)
    try {
      const updated = await updateMyProfile(
        {
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
        },
        token
      )
      onUpdateUser?.(updated)
      setSuccessMsg('¡Datos actualizados con éxito!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.message || 'Error al actualizar tus datos.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleLogoutClick = () => {
    setAppointments([])
    setEditFirstName('')
    setEditLastName('')
    setEditPhone('')
    setErrorMsg('')
    setSuccessMsg('')
    setActiveTab('appointments')
    onLogout?.()
    handleRequestClose()
  }

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
    : 'U'

  const roleBadgeLabel = currentUser
    ? currentUser.role === 'BARBER'
      ? 'MASTER BARBER / SUMAQ STAFF'
      : currentUser.role === 'OWNER' || currentUser.role === 'ADMIN'
      ? 'ADMINISTRADOR / OWNER'
      : 'CLIENTE NOVA / SUMAQ'
    : 'PORTAL CLIENTES SUMAQ'

  return (
    <div
      className={`account-overlay ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div
        className={`account-card ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
        ref={modalRef}
      >
        <div className="account-glow account-glow--top" />
        <div className="account-glow account-glow--bottom" />

        <AccountHeader
          currentUser={currentUser}
          roleBadgeLabel={roleBadgeLabel}
          initials={initials}
          onRequestClose={handleRequestClose}
          onOpenBarber={onOpenBarber}
        />

        {!currentUser ? (
          <AccountGuestLogin
            onLogin={onLogin}
            onOpenBooking={onOpenBooking}
            onRequestClose={handleRequestClose}
          />
        ) : (
          <>
            <div className="account-tabs">
              <button
                type="button"
                className={`account-tab ${activeTab === 'appointments' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('appointments')
                  setErrorMsg('')
                }}
              >
                <CalendarDays size={15} />
                <span>Mis Citas</span>
                {appointments.length > 0 && (
                  <span className="account-tab-count">{appointments.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`account-tab ${activeTab === 'profile' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('profile')
                  setErrorMsg('')
                }}
              >
                <User size={15} />
                <span>Mis Datos</span>
              </button>
            </div>

            {errorMsg && (
              <div className="account-alert account-alert--error" role="alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="account-alert account-alert--success" role="alert">
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'appointments' && (
              <AccountAppointmentsTab
                appointments={appointments}
                isLoading={isLoadingAppointments}
                cancelingId={cancelingId}
                onCancel={handleCancelAppointment}
                onOpenBooking={onOpenBooking}
                onRequestClose={handleRequestClose}
              />
            )}

            {activeTab === 'profile' && (
              <AccountProfileTab
                currentUser={currentUser}
                editFirstName={editFirstName}
                setEditFirstName={setEditFirstName}
                editLastName={editLastName}
                setEditLastName={setEditLastName}
                editPhone={editPhone}
                setEditPhone={setEditPhone}
                isSaving={isSavingProfile}
                onSubmit={handleSaveProfile}
              />
            )}

            <div className="account-footer">
              <button
                type="button"
                className="account-book-btn"
                onClick={() => {
                  handleRequestClose()
                  onOpenBooking?.()
                }}
              >
                <PlusCircle size={15} />
                <span>Nueva Reserva</span>
              </button>

              <button
                type="button"
                className="account-logout-btn"
                onClick={handleLogoutClick}
              >
                <LogOut size={15} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
