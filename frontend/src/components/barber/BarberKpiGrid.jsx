import { Calendar, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react'

export function BarberKpiGrid({ stats, countsByStatus }) {
  return (
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
  )
}
