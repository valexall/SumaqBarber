import { useState } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { loginUser } from '../../services/api'

export function AccountGuestLogin({
  onLogin,
  onOpenBooking,
  onRequestClose
}) {
  const [loginCredential, setLoginCredential] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

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
      const res = await loginUser({
        identifier: loginCredential.trim(),
        password: loginPassword,
      })

      if (res.user) {
        setSuccessMsg('¡Bienvenido de nuevo!')
        setTimeout(() => {
          onLogin?.(res.user)
        }, 300)
      } else {
        throw new Error('Respuesta de autenticación incompleta')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales incorrectas. Verifica tu contraseña.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
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
            onRequestClose()
            onOpenBooking?.()
          }}
        >
          <PlusCircle size={15} />
          <span>Reservar mi primera cita</span>
        </button>
      </div>
    </form>
  )
}
