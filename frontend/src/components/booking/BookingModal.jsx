import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Scissors } from 'lucide-react'
import { fetchServices, fetchBarbers, createAppointment, loginUser } from '../../services/api'
import { BookingSuccessView } from './BookingSuccessView'
import { BookingLoginForm } from './BookingLoginForm'
import { BookingFormFields } from './BookingFormFields'
import './BookingModal.css'

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
  onLogin
}) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [authMode, setAuthMode] = useState('booking')
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!loginCredential.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor ingresa tu correo/teléfono y contraseña.')
      return
    }

    setIsLoading(true)
    try {
      const res = await loginUser({
        identifier: loginCredential.trim(),
        password: loginPassword,
      })

      if (res.user && res.token) {
        onLogin?.(res.user, res.token)
        setCustomerName(`${res.user.firstName} ${res.user.lastName || ''}`.trim())
        setCustomerPhone(res.user.phone || '')
        setCustomerEmail(res.user.email)
        setAuthMode('booking')
      } else {
        throw new Error('Respuesta incompleta del servidor')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!customerName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre.')
      return
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Por favor ingresa un número de teléfono o WhatsApp.')
      return
    }

    if (!currentUser && (!customerEmail.trim() || !customerPassword.trim())) {
      setErrorMsg('Ingresa un correo y contraseña para crear tu cuenta y proteger tu reserva.')
      return
    }

    if (!currentUser && customerPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setIsLoading(true)
    try {
      const combinedDateTime = new Date(`${date}T${time}:00`)
      const token = localStorage.getItem('sumaq_token')

      const payload = {
        serviceId: selectedServiceId,
        date: combinedDateTime.toISOString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim() || undefined,
        ...(selectedBarberId !== 'any' ? { barberId: selectedBarberId } : {}),
        ...(!currentUser
          ? {
              customerEmail: customerEmail.trim(),
              customerPassword: customerPassword,
            }
          : {}),
      }

      const res = await createAppointment(payload, token)

      if (!currentUser && res.token && res.user) {
        onLogin?.(res.user, res.token)
      }

      setSuccessData(res)
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar la cita. Por favor intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]
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
        <div className="booking-glow booking-glow--top" />
        <div className="booking-glow booking-glow--bottom" />

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

        {successData ? (
          <BookingSuccessView
            successData={successData}
            customerName={customerName}
            customerEmail={customerEmail}
            selectedService={selectedService}
            time={time}
            onRequestClose={handleRequestClose}
          />
        ) : authMode === 'login' ? (
          <BookingLoginForm
            loginCredential={loginCredential}
            setLoginCredential={setLoginCredential}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isLoading={isLoading}
            errorMsg={errorMsg}
            onSubmit={handleLoginSubmit}
            onSwitchToBooking={() => {
              setAuthMode('booking')
              setErrorMsg('')
            }}
          />
        ) : (
          <BookingFormFields
            {...{
              services, selectedServiceId, setSelectedServiceId, loadingInitial,
              customerName, setCustomerName, customerPhone, setCustomerPhone,
              customerEmail, setCustomerEmail, customerPassword, setCustomerPassword,
              showPassword, setShowPassword, currentUser,
              onSwitchToLogin: () => { setAuthMode('login'); setErrorMsg('') },
              date, setDate, minDate, selectedBarberId, setSelectedBarberId,
              barbers, time, setTime, notes, setNotes, isLoading,
              onSubmit: handleSubmit, errorMsg
            }}
          />
        )}
      </div>
    </div>
  )
}
