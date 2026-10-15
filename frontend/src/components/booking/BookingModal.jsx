import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Lock,
  Scissors,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  MessageCircle,
  ExternalLink,
  UserCheck,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react'
import { fetchServices, fetchBarbers, createAppointment, loginUser } from '../../services/api'
import './BookingModal.css'

const POPULAR_TIME_SLOTS = [
  '10:00', '11:00', '12:00', '14:00', '15:30', '16:30', '17:30', '18:30', '19:30'
]

const getTodayString = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function BookingModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  // Mode: 'booking' or 'login'
  const [authMode, setAuthMode] = useState('booking') // 'booking' | 'login'
  const [loginCredential, setLoginCredential] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedBarberId, setSelectedBarberId] = useState('any')
  const [customerName, setCustomerName] = useState(() => currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '')
  const [customerPhone, setCustomerPhone] = useState(() => currentUser?.phone || '')
  const [customerEmail, setCustomerEmail] = useState(() => currentUser?.email || '')
  const [customerPassword, setCustomerPassword] = useState('')
  const [date, setDate] = useState(getTodayString)
  const [time, setTime] = useState('15:30')
  const [notes, setNotes] = useState('')

  // UI status
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [loadingInitial, setLoadingInitial] = useState(true)

  const modalRef = useRef(null)



  // Clean close animation handler
  const handleRequestClose = useCallback(() => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsAnimatingOut(false)
      setSuccessData(null)
      setErrorMsg('')
      setAuthMode('booking')
      onClose()
    }, 240)
  }, [onClose])

  // Prevent background scroll when modal is visible
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Fetch initial services & barbers when opened
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    Promise.all([fetchServices(), fetchBarbers()])
      .then(([servicesData, barbersData]) => {
        if (!isMounted) return
        setServices(servicesData)
        setBarbers(barbersData)
        if (servicesData.length > 0) {
          setSelectedServiceId((prev) => (prev ? prev : servicesData[0].id))
        }
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Handle ESC key press
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

  const handleLogout = () => {
    onLogout?.()
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerPassword('')
    setAuthMode('booking')
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!loginCredential.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor ingresa tu correo/teléfono y contraseña.')
      return
    }

    setIsLoading(true)
    try {
      const res = await loginUser(loginCredential.trim(), loginPassword)
      onLogin?.(res.user, res.token)
      setCustomerName(`${res.user.firstName} ${res.user.lastName || ''}`.trim())
      if (res.user.phone) setCustomerPhone(res.user.phone)
      if (res.user.email) setCustomerEmail(res.user.email)
      setAuthMode('booking')
      setLoginPassword('')
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!customerName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.')
      return
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Por favor ingresa tu número de WhatsApp o teléfono.')
      return
    }
    if (!currentUser && !customerEmail.trim()) {
      setErrorMsg('Por favor ingresa un correo electrónico para tu cuenta.')
      return
    }
    if (!currentUser && (!customerPassword || customerPassword.length < 6)) {
      setErrorMsg('Por favor crea una contraseña de al menos 6 caracteres para tu cuenta.')
      return
    }
    if (!selectedServiceId) {
      setErrorMsg('Por favor selecciona un servicio.')
      return
    }
    if (!date) {
      setErrorMsg('Por favor selecciona una fecha.')
      return
    }
    if (!time) {
      setErrorMsg('Por favor selecciona un horario.')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        password: customerPassword || undefined,
        customerId: currentUser?.id,
        serviceId: selectedServiceId,
        barberId: selectedBarberId === 'any' ? undefined : selectedBarberId,
        date,
        time,
        notes: notes.trim() || undefined,
      }

      const response = await createAppointment(payload)
      const data = response.data

      // Save user session if returned
      if (data.user && data.token) {
        onLogin?.(data.user, data.token)
      }

      setSuccessData(data)
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la reserva.')
    } finally {
      setIsLoading(false)
    }
  }

  // If not open and not animating out, do not render
  if (!isOpen && !isAnimatingOut) return null

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const minDate = getTodayString()

  return (
    <div
      className={`booking-overlay ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div
        className={`booking-card ${isAnimatingOut ? 'is-closing' : 'is-open'}`}
        ref={modalRef}
      >
        {/* Glow ambient background effects */}
        <div className="booking-glow booking-glow--top" />
        <div className="booking-glow booking-glow--bottom" />

        {/* Modal Header */}
        <div className="booking-header">
          <div className="booking-header__brand">
            <span className="booking-badge">
              <Scissors size={13} strokeWidth={2.2} /> SUMAQ / RESERVAS
            </span>
            <h2 id="booking-modal-title">
              {successData
                ? '¡Cita pre-confirmada!'
                : authMode === 'login'
                ? 'Iniciar sesión'
                : 'Reserva tu lugar'}
            </h2>
          </div>
          <button
            type="button"
            className="booking-close-btn"
            onClick={handleRequestClose}
            aria-label="Cerrar ventana de reserva"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success View with WhatsApp Anti-Fraud Confirmation */}
        {successData ? (
          <div className="booking-success-view">
            <div className="booking-success-icon-wrap">
              <CheckCircle2 size={54} className="booking-success-icon" />
              <div className="success-pulse" />
            </div>

            <div className="booking-success-message">
              <span className="booking-code-pill">
                CÓDIGO: {successData.bookingCode || 'SB-CONFIRM'}
              </span>
              <h3>¡Casi listo, {successData.user?.firstName || customerName}!</h3>
              <p>Tu cita ha sido pre-registrada con éxito en el sistema.</p>
            </div>

            {/* Anti-Fraud WhatsApp Callout */}
            <div className="booking-fraud-alert">
              <div className="fraud-alert-header">
                <ShieldCheck size={18} className="shield-icon" />
                <strong>Paso final: Confirma por WhatsApp</strong>
              </div>
              <p>
                Para evitar reservas falsas y apartar tu sillón, por favor confirma tu cita en los próximos <strong>15 minutos</strong>.
              </p>
              {successData.whatsappUrl && (
                <a
                  href={successData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="booking-whatsapp-btn"
                >
                  <MessageCircle size={18} />
                  <span>Confirmar por WhatsApp (1 clic)</span>
                  <ExternalLink size={15} />
                </a>
              )}
            </div>

            {/* Summary Box */}
            <div className="booking-summary-box">
              <div className="booking-summary-row">
                <span className="summary-label">Servicio</span>
                <span className="summary-value">
                  {successData.appointment?.service?.name || selectedService?.name}
                </span>
              </div>
              <div className="booking-summary-row">
                <span className="summary-label">Precio</span>
                <span className="summary-value summary-price">
                  S/ {successData.appointment?.service?.price || selectedService?.price}
                </span>
              </div>
              <div className="booking-summary-row">
                <span className="summary-label">Fecha y Hora</span>
                <span className="summary-value highlight-date">
                  {new Date(successData.appointment?.date).toLocaleDateString('es-PE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  - {time} hrs
                </span>
              </div>
              <div className="booking-summary-row">
                <span className="summary-label">Especialista</span>
                <span className="summary-value">
                  {successData.appointment?.barber
                    ? `${successData.appointment.barber.firstName} ${successData.appointment.barber.lastName}`
                    : 'Barbero asignado'}
                </span>
              </div>
              <div className="booking-summary-row">
                <span className="summary-label">Cuenta creada</span>
                <span className="summary-value">
                  {successData.user?.email || customerEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="booking-secondary-btn"
              onClick={handleRequestClose}
            >
              Listo, cerrar ventana <ArrowRight size={15} />
            </button>
          </div>
        ) : authMode === 'login' ? (
          /* Login Form View */
          <form className="booking-form" onSubmit={handleLoginSubmit} noValidate>
            {errorMsg && (
              <div className="booking-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <p className="auth-subtext">
              Ingresa a tu cuenta para reservar en segundos con tus datos guardados.
            </p>

            <div className="booking-field">
              <label htmlFor="loginCredential" className="booking-field-label">
                <Mail size={13} /> Correo o Teléfono
              </label>
              <div className="booking-input-wrap">
                <input
                  id="loginCredential"
                  type="text"
                  required
                  placeholder="ejemplo@correo.com o 987654321"
                  value={loginCredential}
                  onChange={(e) => setLoginCredential(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="booking-field">
              <label htmlFor="loginPassword" className="booking-field-label">
                <Lock size={13} /> Contraseña
              </label>
              <div className="booking-input-wrap">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ingresa tu contraseña"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Ver u ocultar contraseña"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="booking-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar y continuar reserva</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-switch-prompt">
              <span>¿No tienes cuenta?</span>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setErrorMsg('')
                  setAuthMode('booking')
                }}
              >
                Crear cuenta al reservar
              </button>
            </div>
          </form>
        ) : (
          /* Main Booking + Registration Form View */
          <form className="booking-form" onSubmit={handleSubmit} noValidate>
            {errorMsg && (
              <div className="booking-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Authenticated user pill or quick login toggle */}
            {currentUser ? (
              <div className="auth-status-bar">
                <div className="auth-status-info">
                  <UserCheck size={15} className="auth-user-icon" />
                  <span>
                    Reservando como <strong>{currentUser.firstName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="auth-logout-btn"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <LogOut size={13} /> Cambiar
                </button>
              </div>
            ) : (
              <div className="auth-prompt-bar">
                <span>¿Ya tienes cuenta en NOVA / Sumaq?</span>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setErrorMsg('')
                    setAuthMode('login')
                  }}
                >
                  Iniciar sesión
                </button>
              </div>
            )}

            {/* Service Selection */}
            <div className="booking-field-group">
              <label className="booking-field-label">
                <Scissors size={14} /> Selecciona tu servicio
              </label>

              {loadingInitial ? (
                <div className="booking-loading-state">
                  <Loader2 size={18} className="spin" />
                  <span>Cargando servicios disponibles...</span>
                </div>
              ) : (
                <div className="booking-services-grid">
                  {services.map((srv) => {
                    const isSelected = selectedServiceId === srv.id
                    return (
                      <button
                        type="button"
                        key={srv.id}
                        className={`booking-service-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedServiceId(srv.id)}
                      >
                        <div className="service-card-top">
                          <span className="service-card-title">{srv.name}</span>
                          <span className="service-card-price">S/ {srv.price}</span>
                        </div>
                        <span className="service-card-desc">
                          {srv.duration} min · {srv.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Contact details: Name & Phone */}
            <div className="booking-row-2">
              <div className="booking-field">
                <label htmlFor="customerName" className="booking-field-label">
                  <User size={13} /> Tu nombre
                </label>
                <div className="booking-input-wrap">
                  <input
                    id="customerName"
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="customerPhone" className="booking-field-label">
                  <Phone size={13} /> WhatsApp / Celular
                </label>
                <div className="booking-input-wrap">
                  <input
                    id="customerPhone"
                    type="tel"
                    required
                    placeholder="Ej. 987 654 321"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* Account Registration Fields (if not logged in) */}
            {!currentUser && (
              <div className="booking-row-2">
                <div className="booking-field">
                  <label htmlFor="customerEmail" className="booking-field-label">
                    <Mail size={13} /> Correo electrónico
                  </label>
                  <div className="booking-input-wrap">
                    <input
                      id="customerEmail"
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="booking-field">
                  <label htmlFor="customerPassword" className="booking-field-label">
                    <Lock size={13} /> Crea una contraseña
                  </label>
                  <div className="booking-input-wrap">
                    <input
                      id="customerPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Ver u ocultar contraseña"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date & Barber Selection */}
            <div className="booking-row-2">
              <div className="booking-field">
                <label htmlFor="bookingDate" className="booking-field-label">
                  <Calendar size={13} /> Fecha
                </label>
                <div className="booking-input-wrap">
                  <input
                    id="bookingDate"
                    type="date"
                    required
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="barberSelect" className="booking-field-label">
                  <Sparkles size={13} /> Barbero preferido
                </label>
                <div className="booking-select-wrap">
                  <select
                    id="barberSelect"
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                  >
                    <option value="any">Cualquier barbero disponible</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.firstName} {b.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="booking-select-icon" />
                </div>
              </div>
            </div>

            {/* Time Slot Chips */}
            <div className="booking-field-group">
              <label className="booking-field-label">
                <Clock size={13} /> Hora preferida
              </label>
              <div className="booking-time-grid">
                {POPULAR_TIME_SLOTS.map((slot) => {
                  const isSelected = time === slot
                  return (
                    <button
                      type="button"
                      key={slot}
                      className={`booking-time-pill ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Optional note */}
            <div className="booking-field">
              <label htmlFor="bookingNotes" className="booking-field-label booking-field-label--subtle">
                Nota o detalle especial (opcional)
              </label>
              <div className="booking-input-wrap">
                <input
                  id="bookingNotes"
                  type="text"
                  placeholder="Ej. Prefiero degradado medio, perfilado con navaja..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className="booking-submit-btn"
              disabled={isLoading || loadingInitial}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Procesando reserva y cuenta...</span>
                </>
              ) : (
                <>
                  <span>{currentUser ? 'Confirmar reserva' : 'Crear cuenta y reservar'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
