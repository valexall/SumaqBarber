import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from 'lucide-react'

const formatDateLabel = (dateString) => new Intl.DateTimeFormat('es-PE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
}).format(new Date(`${dateString}T12:00:00Z`))

const formatDateHeading = (dateString) => new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
}).format(new Date(`${dateString}T12:00:00Z`))

const getDateOptions = (startDate) => {
  const options = []
  const start = new Date(`${startDate}T12:00:00`)
  for (let offset = 0; options.length < 12 && offset < 20; offset += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    if (date.getDay() === 0) continue
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    options.push(`${yyyy}-${mm}-${dd}`)
  }
  return options
}

const groupSlots = (slots) => slots.reduce((groups, slot) => {
  const period = Number(slot.time.slice(0, 2)) < 13 ? 'Mañana' : 'Tarde'
  if (!groups[period]) groups[period] = []
  groups[period].push(slot)
  return groups
}, {})

export function BookingFormFields({
  services,
  selectedServiceId,
  setSelectedServiceId,
  loadingInitial,
  step,
  setStep,
  availability,
  loadingAvailability,
  availabilityError,
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
  errorMsg,
}) {
  const selectedService = services.find((service) => service.id === selectedServiceId)
  const dateOptions = getDateOptions(minDate)
  const availableSlots = (availability?.slots || []).filter((slot) => slot.available)
  const groupedSlots = groupSlots(availableSlots)

  const goToNextStep = () => {
    if (step === 1 && selectedServiceId) setStep(2)
    if (step === 2 && time) setStep(3)
  }

  return (
    <form className="booking-form booking-form--wizard" onSubmit={onSubmit} noValidate>
      <div className="booking-progress" aria-label="Progreso de la reserva">
        {[['01', 'Servicio'], ['02', 'Fecha y hora'], ['03', 'Tus datos']].map(([number, label], index) => {
          const itemStep = index + 1
          return (
            <div className={`booking-progress-step ${step >= itemStep ? 'is-active' : ''}`} key={number}>
              <span>{step > itemStep ? <Check size={12} /> : number}</span>
              <small>{label}</small>
            </div>
          )
        })}
      </div>

      {errorMsg && <div className="booking-error-banner" role="alert">{errorMsg}</div>}

      {step === 1 && (
        <section className="booking-step" aria-labelledby="booking-step-service">
          {!currentUser && (
            <div className="booking-login-banner">
              <div>
                <strong>¿Ya tienes una cuenta?</strong>
                <p>Inicia sesión y reserva con tus datos guardados.</p>
              </div>
              <button type="button" className="booking-login-btn" onClick={onSwitchToLogin}>Iniciar sesión</button>
            </div>
          )}

          <div className="booking-step-heading">
            <span className="booking-step-eyebrow">Paso 01</span>
            <h3 id="booking-step-service">Elige tu servicio</h3>
            <p>Selecciona el ritual que quieres vivir hoy.</p>
          </div>

          {loadingInitial ? (
            <div className="booking-loading-state"><Loader2 size={18} className="spin" /> Cargando servicios disponibles...</div>
          ) : (
            <div className="booking-services-grid booking-services-grid--wizard">
              {services.map((service) => {
                const isSelected = selectedServiceId === service.id
                return (
                  <button
                    type="button"
                    key={service.id}
                    className={`booking-service-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    <div className="service-card-top">
                      <span className="service-card-title">{service.name}</span>
                      <span className="service-card-price">S/ {service.price}</span>
                    </div>
                    <span className="service-card-desc">{service.duration} min · {service.description}</span>
                    {isSelected && <Check size={16} className="service-card-check" />}
                  </button>
                )
              })}
            </div>
          )}

          <button type="button" className="booking-submit-btn booking-submit-btn--wizard" onClick={goToNextStep} disabled={!selectedServiceId || loadingInitial}>
            <span>Continuar con este servicio</span><ArrowRight size={18} />
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="booking-step" aria-labelledby="booking-step-date">
          <div className="booking-step-heading">
            <span className="booking-step-eyebrow">Paso 02 · {selectedService?.name}</span>
            <h3 id="booking-step-date">Encuentra tu momento</h3>
            <p>Horarios reales según el servicio y la disponibilidad del equipo.</p>
          </div>

          <div className="booking-date-picker">
            <div className="booking-date-picker__header"><Calendar size={15} /><span>Elige una fecha</span></div>
            <div className="booking-date-strip">
              {dateOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`booking-date-option ${date === option ? 'is-selected' : ''}`}
                  onClick={() => setDate(option)}
                >
                  {formatDateLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="booking-field booking-field--compact">
            <label htmlFor="barberSelect" className="booking-field-label"><Sparkles size={13} /> Preferencia de barbero <span>(opcional)</span></label>
            <div className="booking-select-wrap">
              <select id="barberSelect" value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)}>
                <option value="any">Cualquier barbero disponible</option>
                {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.firstName} {barber.lastName}</option>)}
              </select>
              <ChevronDown size={14} className="booking-select-icon" />
            </div>
          </div>

          <div className="booking-time-section">
            <div className="booking-time-heading">
              <div><Clock size={15} /><span>Horarios disponibles</span></div>
              <strong>{formatDateHeading(date)}</strong>
            </div>
            {loadingAvailability ? (
              <div className="booking-loading-state"><Loader2 size={18} className="spin" /> Consultando disponibilidad...</div>
            ) : availabilityError ? (
              <div className="booking-empty-slots">{availabilityError}</div>
            ) : availableSlots.length === 0 ? (
              <div className="booking-empty-slots">No hay horarios libres para esta fecha. Prueba con otro día.</div>
            ) : (
              Object.entries(groupedSlots).map(([period, slots]) => (
                <div className="booking-time-group" key={period}>
                  <span>{period}</span>
                  <div className="booking-time-grid booking-time-grid--wizard">
                    {slots.map((slot) => (
                      <button type="button" key={slot.time} className={`booking-time-pill ${time === slot.time ? 'is-selected' : ''}`} onClick={() => setTime(slot.time)}>
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="booking-wizard-actions">
            <button type="button" className="booking-back-btn" onClick={() => setStep(1)}><ArrowLeft size={16} /> Atrás</button>
            <button type="button" className="booking-submit-btn booking-submit-btn--wizard" onClick={goToNextStep} disabled={!time || loadingAvailability}>Continuar con esta hora <ArrowRight size={18} /></button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="booking-step" aria-labelledby="booking-step-data">
          <div className="booking-booking-summary">
            <div><span>Tu selección</span><strong>{selectedService?.name}</strong></div>
            <div><span>Fecha y hora</span><strong>{formatDateLabel(date)} · {time}</strong></div>
          </div>

          <div className="booking-step-heading">
            <span className="booking-step-eyebrow">Paso 03</span>
            <h3 id="booking-step-data">Un último detalle</h3>
            <p>Déjanos tus datos para confirmar y proteger tu reserva.</p>
          </div>

          <div className="booking-row-2">
            <div className="booking-field">
              <label htmlFor="customerName" className="booking-field-label"><User size={13} /> Tu nombre</label>
              <input id="customerName" type="text" required placeholder="Ej. Juan Pérez" value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" />
            </div>
            <div className="booking-field">
              <label htmlFor="customerPhone" className="booking-field-label"><Phone size={13} /> WhatsApp / Celular</label>
              <input id="customerPhone" type="tel" required placeholder="Ej. 987 654 321" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" />
            </div>
          </div>

          {!currentUser && (
            <div className="booking-account-block">
              <div className="booking-account-block__heading"><Lock size={15} /><div><strong>Guarda tu reserva en una cuenta</strong><span>Se crea automáticamente al confirmar.</span></div></div>
              <div className="booking-row-2">
                <div className="booking-field">
                  <label htmlFor="customerEmail" className="booking-field-label"><Mail size={13} /> Correo electrónico</label>
                  <input id="customerEmail" type="email" required placeholder="tu@correo.com" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} autoComplete="email" />
                </div>
                <div className="booking-field">
                  <label htmlFor="customerPassword" className="booking-field-label"><Lock size={13} /> Contraseña</label>
                  <div className="booking-input-wrap">
                    <input id="customerPassword" type={showPassword ? 'text' : 'password'} required placeholder="Mínimo 8 caracteres" value={customerPassword} onChange={(event) => setCustomerPassword(event.target.value)} autoComplete="new-password" />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} aria-label="Ver u ocultar contraseña">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="booking-field">
            <label htmlFor="bookingNotes" className="booking-field-label booking-field-label--subtle">Nota o detalle especial <span>(opcional)</span></label>
            <input id="bookingNotes" type="text" placeholder="Ej. Prefiero degradado medio..." value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <div className="booking-wizard-actions">
            <button type="button" className="booking-back-btn" onClick={() => setStep(2)}><ArrowLeft size={16} /> Atrás</button>
            <button type="submit" className="booking-submit-btn booking-submit-btn--final" disabled={isLoading}>
              {isLoading ? <><Loader2 size={18} className="spin" /> Procesando reserva...</> : <><span>{currentUser ? 'Confirmar reserva' : 'Crear cuenta y reservar'}</span><ArrowRight size={18} /></>}
            </button>
          </div>
        </section>
      )}
    </form>
  )
}
