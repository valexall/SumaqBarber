import {
  Scissors,
  User,
  Phone,
  Mail,
  Lock,
  Calendar,
  Sparkles,
  Clock,
  ChevronDown,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'

const POPULAR_TIME_SLOTS = [
  '10:00', '11:00', '12:00', '14:00', '15:30', '16:30', '17:30', '18:30', '19:30'
]

export function BookingFormFields({
  services,
  selectedServiceId,
  setSelectedServiceId,
  loadingInitial,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  customerPassword,
  setCustomerPassword,
  showPassword,
  setShowPassword,
  currentUser,
  onSwitchToLogin,
  date,
  setDate,
  minDate,
  selectedBarberId,
  setSelectedBarberId,
  barbers,
  time,
  setTime,
  notes,
  setNotes,
  isLoading,
  onSubmit,
  errorMsg
}) {
  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
      {errorMsg && (
        <div className="booking-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Guest Login Callout Banner */}
      {!currentUser && (
        <div className="booking-login-banner">
          <div>
            <strong>¿Ya tienes una cuenta o reservaste antes?</strong>
            <p>Inicia sesión para auto-completar tus datos y agendar más rápido.</p>
          </div>
          <button
            type="button"
            className="booking-login-btn"
            onClick={onSwitchToLogin}
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
                placeholder="Mínimo 8 caracteres"
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
  )
}
