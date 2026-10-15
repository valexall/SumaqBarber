import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Scissors,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCw,
  Search,
  DollarSign,
  LogOut,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  FileText,
  Coffee,
  CalendarDays,
  Smartphone
} from 'lucide-react'
import {
  fetchBarberAppointments,
  fetchBarberStats,
  updateAppointmentStatus
} from '../../services/api'
import './BarberDashboard.css'

// Pure module-level helpers for dates and relative times
const getTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getRelativeTimeInfo = (dateString, status, currentTimeMs) => {
  if (status === 'COMPLETED') return { label: 'Completado', class: 'time-pill--done' }
  if (status === 'CANCELED') return { label: 'Cancelado', class: 'time-pill--canceled' }

  const appTime = new Date(dateString).getTime()
  const diffMinutes = Math.round((appTime - currentTimeMs) / (60 * 1000))

  if (diffMinutes < -45) return { label: 'Hora pasada', class: 'time-pill--past' }
  if (diffMinutes >= -45 && diffMinutes <= 15) return { label: 'En curso / Ahora', class: 'time-pill--now' }
  if (diffMinutes > 15 && diffMinutes <= 60) return { label: `En ${diffMinutes} min`, class: 'time-pill--soon' }
  if (diffMinutes > 60) {
    const hours = Math.round(diffMinutes / 60)
    return { label: `En ~${hours} h`, class: 'time-pill--upcoming' }
  }
  return { label: 'Programada', class: 'time-pill--upcoming' }
}

export function BarberDashboard({ currentUser, onLogout, onBackToSite }) {
  // Stable dates calculated via lazy state initializers
  const [todayStr] = useState(getTodayStr)
  const [tomorrowStr] = useState(getTomorrowStr)
  const [selectedDate, setSelectedDate] = useState(getTodayStr)
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())

  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
  const [searchQuery, setSearchQuery] = useState('')
  const [isShiftActive, setIsShiftActive] = useState(true)

  // Data states
  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({
    todayTotal: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    canceledCount: 0,
    todayRevenue: 0,
    projectedRevenue: 0,
    weekCompletedCount: 0,
    weekRevenue: 0,
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('sumaq_token')))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  // Feedback toast
  const [toast, setToast] = useState(null)

  // Cancel modal state
  const [cancelModalItem, setCancelModalItem] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCanceling, setIsCanceling] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  const token = localStorage.getItem('sumaq_token')

  // Interval to update current clock for relative time calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    if (!token || isRefreshing) return
    setIsRefreshing(true)

    try {
      const [appsData, statsData] = await Promise.all([
        fetchBarberAppointments(token, { date: selectedDate }),
        fetchBarberStats(token, selectedDate),
      ])
      setAppointments(appsData || [])
      if (statsData) setStats(statsData)
      showToast('Agenda sincronizada con éxito', 'success')
    } catch (err) {
      console.error('Error refreshing barber data:', err)
      showToast(err.message || 'Error al sincronizar datos', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }, [token, isRefreshing, selectedDate, showToast])

  // Synchronize appointments and stats without calling setState synchronously in effect body
  useEffect(() => {
    if (!token) return

    let isMounted = true

    Promise.all([
      fetchBarberAppointments(token, { date: selectedDate }),
      fetchBarberStats(token, selectedDate),
    ])
      .then(([appsData, statsData]) => {
        if (isMounted) {
          setAppointments(appsData || [])
          if (statsData) setStats(statsData)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error loading barber data:', err)
          showToast(err.message || 'Error al sincronizar datos', 'error')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token, selectedDate, showToast])

  const handleSelectDate = useCallback((dateStr) => {
    setIsLoading(true)
    setSelectedDate(dateStr)
  }, [])

  // Handle status update
  const handleStatusChange = async (appointmentId, newStatus, notes) => {
    if (!token) return
    setUpdatingId(appointmentId)

    try {
      const updated = await updateAppointmentStatus(appointmentId, newStatus, token, notes)

      // Optimistically update list
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, ...updated } : app))
      )

      // Refresh stats
      const newStats = await fetchBarberStats(token, selectedDate)
      if (newStats) setStats(newStats)

      const statusLabels = {
        CONFIRMED: '¡Cita confirmada!',
        COMPLETED: '¡Servicio completado! Ingreso registrado.',
        CANCELED: 'Cita cancelada.',
      }
      showToast(statusLabels[newStatus] || 'Estado actualizado', 'success')
    } catch (err) {
      console.error('Error updating status:', err)
      showToast(err.message || 'Error al actualizar el estado', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle confirm cancel modal
  const handleConfirmCancel = async () => {
    if (!cancelModalItem) return
    setIsCanceling(true)
    try {
      await handleStatusChange(cancelModalItem.id, 'CANCELED', cancelReason || 'Cancelado por el barbero')
      setCancelModalItem(null)
      setCancelReason('')
    } finally {
      setIsCanceling(false)
    }
  }

  // Generate WhatsApp message and URL
  const getWhatsAppLink = (app) => {
    if (!app.customer?.phone) return null
    const cleanPhone = app.customer.phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone

    const barberName = currentUser?.firstName || 'tu barbero'
    const serviceName = app.service?.name || 'tu servicio'

    const timeFormatted = new Date(app.date).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const isToday = selectedDate === todayStr
    const dayText = isToday
      ? 'hoy'
      : `el ${new Date(app.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`

    const message = `¡Hola ${app.customer.firstName}! 👋 Te saluda ${barberName} de Sumaq Barber. Te confirmo tu cita de ${dayText} a las ${timeFormatted} hrs para ${serviceName}. ¿Todo listo para atenderte? 💈✂️`

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
  }

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    let list = [...appointments]

    // Status filter
    if (activeTab !== 'ALL') {
      list = list.filter((app) => app.status === activeTab)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((app) => {
        const clientName = `${app.customer?.firstName || ''} ${app.customer?.lastName || ''}`.toLowerCase()
        const clientPhone = (app.customer?.phone || '').toLowerCase()
        const serviceName = (app.service?.name || '').toLowerCase()
        return clientName.includes(q) || clientPhone.includes(q) || serviceName.includes(q)
      })
    }

    return list
  }, [appointments, activeTab, searchQuery])

  // Count helper by status
  const countsByStatus = useMemo(() => {
    const counts = { ALL: appointments.length, PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELED: 0 }
    for (const app of appointments) {
      if (counts[app.status] !== undefined) {
        counts[app.status]++
      }
    }
    return counts
  }, [appointments])

  const barberInitials = currentUser
    ? `${currentUser.firstName?.[0] || 'M'}${currentUser.lastName?.[0] || 'R'}`.toUpperCase()
    : 'SB'

  return (
    <div className="barber-os-root">
      {/* Toast Alert */}
      {toast && (
        <div className={`barber-toast barber-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header / Status Bar */}
      <header className="barber-os-header">
        <div className="barber-os-header-left">
          <button
            type="button"
            className="barber-back-btn"
            onClick={onBackToSite}
            title="Volver a la web principal"
          >
            <ArrowLeft size={16} />
            <span>Sitio Web</span>
          </button>

          <div className="barber-profile-brand">
            <div className="barber-avatar-halo">
              <span className="barber-avatar-text">{barberInitials}</span>
              <span className={`barber-status-dot ${isShiftActive ? 'is-active' : 'is-paused'}`} />
            </div>
            <div className="barber-profile-meta">
              <div className="barber-title-row">
                <h2>
                  {currentUser?.firstName || 'Barbero'} {currentUser?.lastName || ''}
                </h2>
                <span className="barber-role-pill">
                  <Scissors size={10} /> MASTER BARBER
                </span>
              </div>
              <p className="barber-subtitle">
                {currentUser?.email || 'sumaqbarber.pe'}
              </p>
            </div>
          </div>
        </div>

        <div className="barber-os-header-right">
          {/* Shift status switch */}
          <button
            type="button"
            className={`barber-shift-toggle ${isShiftActive ? 'is-active' : 'is-paused'}`}
            onClick={() => setIsShiftActive(!isShiftActive)}
            title="Alternar estado de turno"
          >
            <span className="shift-indicator" />
            <span>{isShiftActive ? 'En Turno' : 'En Pausa'}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            className={`barber-action-icon-btn ${isRefreshing ? 'is-spinning' : ''}`}
            onClick={handleRefresh}
            title="Sincronizar agenda"
            aria-label="Sincronizar citas"
          >
            <RotateCw size={17} />
          </button>

          {/* Logout button */}
          <button
            type="button"
            className="barber-logout-btn"
            onClick={onLogout}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="logout-text">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="barber-os-content">
        {/* Date Selector & Shift Overview Banner */}
        <div className="barber-banner-row">
          <div className="barber-date-controls">
            <button
              type="button"
              className={`barber-date-btn ${selectedDate === todayStr ? 'is-selected' : ''}`}
              onClick={() => handleSelectDate(todayStr)}
            >
              <Calendar size={14} />
              <span>Hoy</span>
            </button>
            <button
              type="button"
              className={`barber-date-btn ${selectedDate === tomorrowStr ? 'is-selected' : ''}`}
              onClick={() => handleSelectDate(tomorrowStr)}
            >
              Mañana
            </button>
            <div className="barber-calendar-picker-wrapper">
              <input
                type="date"
                className="barber-date-input"
                value={selectedDate}
                onChange={(e) => e.target.value && handleSelectDate(e.target.value)}
              />
              <CalendarDays size={14} className="calendar-icon-hint" />
            </div>
          </div>

          <div className="barber-date-display">
            <span>Agenda del día:</span>
            <strong>
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
          </div>
        </div>

        {/* HUD Metrics Cards */}
        <div className="barber-kpis-grid">
          <div className="barber-kpi-card">
            <div className="barber-kpi-icon barber-kpi-icon--blue">
              <Calendar size={20} />
            </div>
            <div className="barber-kpi-info">
              <span className="barber-kpi-label">Citas del Día</span>
              <strong className="barber-kpi-value">{stats.todayTotal}</strong>
              <small className="barber-kpi-sub">
                {countsByStatus.COMPLETED} completadas
              </small>
            </div>
          </div>

          <div className={`barber-kpi-card ${stats.pendingCount > 0 ? 'is-alert-pending' : ''}`}>
            <div className="barber-kpi-icon barber-kpi-icon--amber">
              <AlertCircle size={20} />
            </div>
            <div className="barber-kpi-info">
              <span className="barber-kpi-label">Por Confirmar</span>
              <strong className="barber-kpi-value barber-kpi-value--amber">
                {stats.pendingCount}
              </strong>
              <small className="barber-kpi-sub">Requieren atención</small>
            </div>
          </div>

          <div className="barber-kpi-card">
            <div className="barber-kpi-icon barber-kpi-icon--emerald">
              <CheckCircle2 size={20} />
            </div>
            <div className="barber-kpi-info">
              <span className="barber-kpi-label">Confirmadas</span>
              <strong className="barber-kpi-value barber-kpi-value--emerald">
                {stats.confirmedCount}
              </strong>
              <small className="barber-kpi-sub">Listas para atender</small>
            </div>
          </div>

          <div className="barber-kpi-card barber-kpi-card--revenue">
            <div className="barber-kpi-icon barber-kpi-icon--gold">
              <DollarSign size={20} />
            </div>
            <div className="barber-kpi-info">
              <span className="barber-kpi-label">Ingresos de Hoy</span>
              <strong className="barber-kpi-value barber-kpi-value--gold">
                S/ {stats.todayRevenue.toFixed(2)}
              </strong>
              <small className="barber-kpi-sub">
                Proyectado: S/ {stats.projectedRevenue.toFixed(2)}
              </small>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="barber-toolbar">
          <div className="barber-status-tabs" role="tablist">
            <button
              type="button"
              className={`barber-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              <span>Todas</span>
              <span className="barber-tab-badge">{countsByStatus.ALL}</span>
            </button>
            <button
              type="button"
              className={`barber-tab barber-tab--pending ${activeTab === 'PENDING' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('PENDING')}
            >
              <span>Pendientes</span>
              {countsByStatus.PENDING > 0 && (
                <span className="barber-tab-badge barber-tab-badge--amber">
                  {countsByStatus.PENDING}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`barber-tab barber-tab--confirmed ${activeTab === 'CONFIRMED' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('CONFIRMED')}
            >
              <span>Confirmadas</span>
              <span className="barber-tab-badge">{countsByStatus.CONFIRMED}</span>
            </button>
            <button
              type="button"
              className={`barber-tab barber-tab--completed ${activeTab === 'COMPLETED' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('COMPLETED')}
            >
              <span>Completadas</span>
              <span className="barber-tab-badge">{countsByStatus.COMPLETED}</span>
            </button>
            <button
              type="button"
              className={`barber-tab barber-tab--canceled ${activeTab === 'CANCELED' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('CANCELED')}
            >
              <span>Canceladas</span>
              <span className="barber-tab-badge">{countsByStatus.CANCELED}</span>
            </button>
          </div>

          <div className="barber-search-box">
            <Search size={15} className="barber-search-icon" />
            <input
              type="text"
              placeholder="Buscar cliente, teléfono o servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="barber-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="barber-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Appointments Feed */}
        <div className="barber-feed-container">
          {isLoading ? (
            <div className="barber-loading-state">
              <RotateCw size={32} className="is-spinning" />
              <p>Sincronizando agenda de Sumaq Barber...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="barber-empty-state">
              <div className="barber-empty-icon">
                {activeTab === 'PENDING' ? (
                  <CheckCircle2 size={40} />
                ) : (
                  <Coffee size={40} />
                )}
              </div>
              <h3>
                {activeTab === 'PENDING'
                  ? '¡Excelente! No hay citas pendientes por confirmar'
                  : 'No hay citas registradas en esta vista'}
              </h3>
              <p>
                {searchQuery
                  ? 'No se encontraron resultados para tu búsqueda.'
                  : `No se encontraron citas con filtro "${activeTab}" para el ${selectedDate}.`}
              </p>
              {activeTab !== 'ALL' && (
                <button
                  type="button"
                  className="barber-empty-action-btn"
                  onClick={() => setActiveTab('ALL')}
                >
                  Ver todas las citas del día
                </button>
              )}
            </div>
          ) : (
            <div className="barber-cards-grid">
              {filteredAppointments.map((app) => {
                const timeInfo = getRelativeTimeInfo(app.date, app.status, currentTimeMs)
                const waLink = getWhatsAppLink(app)
                const isItemUpdating = updatingId === app.id

                const formattedTime = new Date(app.date).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={app.id}
                    className={`barber-appointment-card barber-appointment-card--${app.status.toLowerCase()} ${
                      isItemUpdating ? 'is-updating' : ''
                    }`}
                  >
                    {/* Top Row: Time & Status Pill */}
                    <div className="app-card-header">
                      <div className="app-card-time-block">
                        <Clock size={16} className="clock-icon" />
                        <span className="app-time-strong">{formattedTime}</span>
                        <span className={`time-pill ${timeInfo.class}`}>
                          {timeInfo.label}
                        </span>
                      </div>

                      <div className={`app-status-badge app-status-badge--${app.status.toLowerCase()}`}>
                        {app.status === 'PENDING' && <AlertCircle size={12} />}
                        {app.status === 'CONFIRMED' && <Sparkles size={12} />}
                        {app.status === 'COMPLETED' && <CheckCircle2 size={12} />}
                        {app.status === 'CANCELED' && <XCircle size={12} />}
                        <span>
                          {app.status === 'PENDING' && 'Pendiente'}
                          {app.status === 'CONFIRMED' && 'Confirmada'}
                          {app.status === 'COMPLETED' && 'Completada'}
                          {app.status === 'CANCELED' && 'Cancelada'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="app-card-customer">
                      <div className="app-customer-avatar">
                        <User size={18} />
                      </div>
                      <div className="app-customer-info">
                        <h4 className="app-customer-name">
                          {app.customer?.firstName} {app.customer?.lastName}
                        </h4>
                        <div className="app-customer-contact">
                          {app.customer?.phone ? (
                            <a
                              href={`tel:${app.customer.phone}`}
                              className="app-phone-link"
                              title="Llamar al cliente"
                            >
                              <Phone size={12} />
                              <span>{app.customer.phone}</span>
                            </a>
                          ) : (
                            <span className="app-no-phone">Sin teléfono</span>
                          )}
                          {app.customer?.email && (
                            <span className="app-customer-email">
                              <Mail size={11} />
                              <span>{app.customer.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service & Price Block */}
                    <div className="app-card-service-row">
                      <div className="service-details">
                        <span className="service-name">
                          <Scissors size={13} /> {app.service?.name || 'Servicio Barbería'}
                        </span>
                        <span className="service-duration">
                          {app.service?.duration || 45} min
                        </span>
                      </div>
                      <div className="service-price">
                        <small>Total:</small>
                        <strong>S/ {(app.service?.price || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Client Notes if any */}
                    {app.notes && (
                      <div className="app-card-notes">
                        <FileText size={13} />
                        <span>"{app.notes}"</span>
                      </div>
                    )}

                    {/* Action Bar (1-Click buttons) */}
                    <div className="app-card-actions">
                      {/* WhatsApp Direct */}
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="app-action-btn app-action-btn--whatsapp"
                          title="Enviar WhatsApp de confirmación o recordatorio"
                        >
                          <MessageCircle size={15} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* Call Direct */}
                      {app.customer?.phone && (
                        <a
                          href={`tel:${app.customer.phone}`}
                          className="app-action-btn app-action-btn--call"
                          title="Llamar directo"
                        >
                          <Smartphone size={15} />
                          <span>Llamar</span>
                        </a>
                      )}

                      {/* Status transitions */}
                      {app.status === 'PENDING' && (
                        <button
                          type="button"
                          className="app-action-btn app-action-btn--confirm"
                          onClick={() => handleStatusChange(app.id, 'CONFIRMED')}
                          disabled={isItemUpdating}
                          title="Confirmar cita del cliente"
                        >
                          <Check size={15} />
                          <span>Confirmar</span>
                        </button>
                      )}

                      {(app.status === 'PENDING' || app.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          className="app-action-btn app-action-btn--complete"
                          onClick={() => handleStatusChange(app.id, 'COMPLETED')}
                          disabled={isItemUpdating}
                          title="Marcar corte como terminado y registrar cobro"
                        >
                          <Scissors size={15} />
                          <span>Finalizar</span>
                        </button>
                      )}

                      {app.status !== 'CANCELED' && app.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          className="app-action-btn app-action-btn--cancel"
                          onClick={() => setCancelModalItem(app)}
                          disabled={isItemUpdating}
                          title="Cancelar cita o reportar inasistencia"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModalItem && (
        <div className="barber-modal-overlay" onClick={() => setCancelModalItem(null)}>
          <div
            className="barber-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="barber-modal-header">
              <div className="barber-modal-icon-badge">
                <AlertCircle size={22} />
              </div>
              <h3>¿Cancelar esta cita?</h3>
              <button
                type="button"
                className="barber-modal-close"
                onClick={() => setCancelModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="barber-modal-body">
              <p>
                Estás por cancelar la cita de{' '}
                <strong>
                  {cancelModalItem.customer?.firstName} {cancelModalItem.customer?.lastName}
                </strong>{' '}
                para{' '}
                <strong>{cancelModalItem.service?.name}</strong> a las{' '}
                <strong>
                  {new Date(cancelModalItem.date).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>.
              </p>

              <label className="barber-modal-label">
                <span>Motivo de la cancelación (opcional):</span>
                <input
                  type="text"
                  placeholder="Ej: Cliente canceló por WhatsApp, no asistió, etc."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="barber-modal-input"
                />
              </label>
            </div>

            <div className="barber-modal-footer">
              <button
                type="button"
                className="barber-modal-btn barber-modal-btn--ghost"
                onClick={() => setCancelModalItem(null)}
                disabled={isCanceling}
              >
                Regresar
              </button>
              <button
                type="button"
                className="barber-modal-btn barber-modal-btn--danger"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
              >
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
