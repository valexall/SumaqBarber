import { Calendar, CalendarDays, Search, X } from 'lucide-react'

export function BarberToolbar({
  selectedDate,
  todayStr,
  tomorrowStr,
  onSelectDate,
  activeTab,
  setActiveTab,
  countsByStatus,
  searchQuery,
  setSearchQuery
}) {
  return (
    <>
      <div className="barber-banner-row">
        <div className="barber-date-controls">
          <button
            type="button"
            className={`barber-date-btn ${selectedDate === todayStr ? 'is-selected' : ''}`}
            onClick={() => onSelectDate(todayStr)}
          >
            <Calendar size={14} />
            <span>Hoy</span>
          </button>
          <button
            type="button"
            className={`barber-date-btn ${selectedDate === tomorrowStr ? 'is-selected' : ''}`}
            onClick={() => onSelectDate(tomorrowStr)}
          >
            Mañana
          </button>
          <div className="barber-calendar-picker-wrapper">
            <input
              type="date"
              className="barber-date-input"
              value={selectedDate}
              onChange={(e) => e.target.value && onSelectDate(e.target.value)}
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
    </>
  )
}
