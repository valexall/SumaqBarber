import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Scissors,
  LogOut,
  PlusCircle,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarDays,
  ShieldCheck,
  Ban,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import {
  fetchMyAppointments,
  cancelUserAppointment,
  updateMyProfile,
  loginUser
} from '../../services/api'
import './UserAccountModal.css'

export function UserAccountModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onUpdateUser,
  onOpenBooking
}) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [activeTab, setActiveTab] = useState('appointments') // 'appointments' | 'profile'

  // Data states
  const [appointments, setAppointments] = useState([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(() => Boolean(currentUser))
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Edit profile states
  const [editFirstName, setEditFirstName] = useState(currentUser?.firstName || '')
  const [editLastName, setEditLastName] = useState(currentUser?.lastName || '')
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)

  // Login form states for guest/logged-out view
  const [loginCredential, setLoginCredential] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const modalRef = useRef(null)

  // Clean close animation handler
  const handleRequestClose = useCallback(() => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsAnimatingOut(false)
      setErrorMsg('')
      setSuccessMsg('')
      onClose()
    }, 240)
  }, [onClose])

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // ESC key listener
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

  // Fetch appointments cleanly when modal is open and user is logged in
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

  // Cancel appointment handler
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

  // Save profile handler
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

  // Handle logout completely wiping all state
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

  // Handle guest login inside account modal
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!loginCredential.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor ingresa tu correo/teléfono y contraseña.')
      return
    }

    setIsLoggingIn(true)
    try {
      const res = await loginUser(loginCredential.trim(), loginPassword)
      setLoginCredential('')
      setLoginPassword('')
      onLogin?.(res.user, res.token)
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (!isOpen && !isAnimatingOut) return null

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase()
    : 'U'

  // Generate WhatsApp confirmation link for a pending appointment
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

  return (
    <div
      className={`account-overlay ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div
        className={`account-card ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
        ref={modalRef}
      >
        {/* Glow ambient background effects */}
        <div className="account-glow account-glow--top" />
        <div className="account-glow account-glow--bottom" />

        {/* Header & User Profile Info */}
        <div className="account-header">
          <div className="account-profile-summary">
            <div className="account-avatar">
              {currentUser ? initials : <User size={20} />}
            </div>
            <div className="account-info">
              <div className="account-badge-row">
                <span className="account-badge">
                  <Sparkles size={11} /> {currentUser ? 'CLIENTE NOVA / SUMAQ' : 'PORTAL CLIENTES SUMAQ'}
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
            onClick={handleRequestClose}
            aria-label="Cerrar panel de cuenta"
          >
            <X size={18} />
          </button>
        </div>

        {!currentUser ? (
          <form className="account-body account-login-form" onSubmit={handleLoginSubmit}>
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

            <p className="account-login-lead">
              Ingresa tus credenciales para consultar tus citas agendadas, cancelarlas o actualizar tu información.
            </p>

            <div className="account-field">
              <label htmlFor="accLoginCred" className="account-label">
                <Mail size={13} /> Correo o WhatsApp / Celular
              </label>
              <div className="account-input-wrap">
                <input
                  id="accLoginCred"
                  type="text"
                  required
                  placeholder="ejemplo@correo.com o 987654321"
                  value={loginCredential}
                  onChange={(e) => setLoginCredential(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="account-field">
              <label htmlFor="accLoginPass" className="account-label">
                <Lock size={13} /> Contraseña
              </label>
              <div className="account-input-wrap">
                <input
                  id="accLoginPass"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Ingresa tu contraseña"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label="Ver u ocultar contraseña"
                >
                  {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="account-save-btn account-login-submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a Mi Cuenta</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="account-unauth-prompt">
              <span>¿Aún no tienes cuenta en Sumaq?</span>
              <p>Tu cuenta se genera de forma inmediata y automática al reservar tu primera cita.</p>
              <button
                type="button"
                className="account-book-btn"
                onClick={() => {
                  handleRequestClose()
                  onOpenBooking?.()
                }}
              >
                <PlusCircle size={15} />
                <span>Reservar mi primera cita</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Tabs Bar */}
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

            {/* Feedback alerts */}
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

            {/* Tab 1: Appointments List */}
            {activeTab === 'appointments' && (
              <div className="account-body">
                {isLoadingAppointments ? (
                  <div className="account-loading-state">
                    <Loader2 size={20} className="spin" />
                    <span>Cargando tus citas...</span>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="account-empty-state">
                    <Scissors size={34} className="empty-icon" />
                    <h3>Aún no tienes citas agendadas</h3>
                    <p>Elige tu estilo favorito y reserva tu lugar en segundos.</p>
                    <button
                      type="button"
                      className="account-cta-btn"
                      onClick={() => {
                        handleRequestClose()
                        onOpenBooking?.()
                      }}
                    >
                      <PlusCircle size={16} /> Reservar mi primera cita
                    </button>
                  </div>
                ) : (
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

                          {/* Action buttons */}
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
                                onClick={() => handleCancelAppointment(app.id)}
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
                )}
              </div>
            )}

            {/* Tab 2: Profile Edit */}
            {activeTab === 'profile' && (
              <form className="account-body" onSubmit={handleSaveProfile}>
                <div className="account-field-row">
                  <div className="account-field">
                    <label htmlFor="editFirstName" className="account-label">
                      <User size={13} /> Nombre
                    </label>
                    <input
                      id="editFirstName"
                      type="text"
                      required
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>

                  <div className="account-field">
                    <label htmlFor="editLastName" className="account-label">
                      <User size={13} /> Apellidos
                    </label>
                    <input
                      id="editLastName"
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="account-field">
                  <label htmlFor="editEmail" className="account-label">
                    <Mail size={13} /> Correo electrónico
                  </label>
                  <input
                    id="editEmail"
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    title="El correo es el identificador principal de tu cuenta"
                  />
                  <small className="field-hint">El correo no puede modificarse directamente.</small>
                </div>

                <div className="account-field">
                  <label htmlFor="editPhone" className="account-label">
                    <Phone size={13} /> WhatsApp / Celular
                  </label>
                  <input
                    id="editPhone"
                    type="tel"
                    placeholder="Ej. +51 987 654 321"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="account-save-btn"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Actions */}
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
