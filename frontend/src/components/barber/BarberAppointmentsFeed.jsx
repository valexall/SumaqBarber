import { RotateCw, CheckCircle2, Coffee } from 'lucide-react'
import { BarberAppointmentCard } from './BarberAppointmentCard'

export function BarberAppointmentsFeed({
  isLoading,
  filteredAppointments,
  activeTab,
  searchQuery,
  selectedDate,
  setActiveTab,
  currentTimeMs,
  getWhatsAppLink,
  updatingId,
  onStatusChange,
  onOpenCancel
}) {
  if (isLoading) {
    return (
      <div className="barber-feed-container">
        <div className="barber-loading-state">
          <RotateCw size={32} className="is-spinning" />
          <p>Sincronizando agenda de Sumaq Barber...</p>
        </div>
      </div>
    )
  }

  if (filteredAppointments.length === 0) {
    return (
      <div className="barber-feed-container">
        <div className="barber-empty-state">
          <div className="barber-empty-icon">
            {activeTab === 'PENDING' ? <CheckCircle2 size={40} /> : <Coffee size={40} />}
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
      </div>
    )
  }

  return (
    <div className="barber-feed-container">
      <div className="barber-cards-grid">
        {filteredAppointments.map((app) => (
          <BarberAppointmentCard
            key={app.id}
            app={app}
            currentTimeMs={currentTimeMs}
            waLink={getWhatsAppLink(app)}
            isItemUpdating={updatingId === app.id}
            onStatusChange={onStatusChange}
            onOpenCancel={onOpenCancel}
          />
        ))}
      </div>
    </div>
  )
}
