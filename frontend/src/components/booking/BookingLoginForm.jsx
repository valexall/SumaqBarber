import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from 'lucide-react'

export function BookingLoginForm({
  loginCredential,
  setLoginCredential,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  isLoading,
  errorMsg,
  onSubmit,
  onSwitchToBooking
}) {
  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
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
          onClick={onSwitchToBooking}
        >
          Continuar como nuevo cliente
        </button>
      </div>
    </form>
  )
}
