import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Scissors,
  Phone,
  Mail,
  Trash2,
  RotateCw,
  Sparkles
} from 'lucide-react'
import { fetchAdminBarbers, deleteAdminBarber } from '../../services/api'
import { AddBarberModal } from './AddBarberModal'
import './AdminManagement.css'

export function BarbersManagementTab({ showToast, currentUser }) {
  const [barbers, setBarbers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const canManageTeam = ['OWNER', 'ADMIN'].includes(currentUser?.role)

  const loadBarbers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchAdminBarbers()
      setBarbers(data)
    } catch (err) {
      showToast?.(err.message || 'Error al cargar el equipo de barberos', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBarbers()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadBarbers])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de desvincular al barbero ${name}?`)) return

    setDeletingId(id)
    try {
      await deleteAdminBarber(id)
      setBarbers((prev) => prev.filter((b) => b.id !== id))
      showToast?.(`Barbero ${name} desactivado; su historial se conservó.`, 'info')
    } catch (err) {
      showToast?.(err.message || 'No se pudo eliminar al barbero.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBarberCreated = (newBarber) => {
    showToast?.(`¡Barbero ${newBarber.firstName} ${newBarber.lastName} dado de alta con éxito!`, 'success')
    loadBarbers()
  }

  return (
    <div className="admin-suite-container">
      <div className="admin-toolbar-row">
        <div className="admin-toolbar-info">
          <h3>Equipo de Master Barbers ({barbers.length})</h3>
          <p>Gestiona a los profesionales activos en la sucursal y sus accesos.</p>
        </div>
        {canManageTeam && (
        <button
          type="button"
          className="admin-add-btn"
          onClick={() => setIsAddOpen(true)}
        >
          <UserPlus size={16} />
          <span>Contratar / Añadir Barbero</span>
        </button>
        )}
      </div>

      {isLoading ? (
        <div className="barber-loading-state">
          <RotateCw size={28} className="is-spinning" />
          <p>Cargando equipo de Sumaq Barber...</p>
        </div>
      ) : barbers.length === 0 ? (
        <div className="barber-empty-state">
          <Scissors size={38} />
          <h3>No hay barberos registrados</h3>
          <p>Comienza dando de alta a los profesionales de tu salón.</p>
        </div>
      ) : (
        <div className="admin-cards-grid">
          {barbers.map((barber) => {
            const initials = `${barber.firstName?.[0] || 'B'}${barber.lastName?.[0] || 'B'}`.toUpperCase()
            const waPhone = barber.phone?.replace(/\D/g, '') || ''
            const waLink = waPhone ? `https://wa.me/${waPhone.startsWith('51') ? waPhone : `51${waPhone}`}` : null

            return (
              <div key={barber.id} className="admin-barber-card">
                <div className="admin-barber-top">
                  <div className="admin-barber-avatar">{initials}</div>
                  <div className="admin-barber-meta">
                    <h4>{barber.firstName} {barber.lastName}</h4>
                    <span className="admin-barber-role-tag">
                      <Sparkles size={10} /> {barber.role || 'BARBER'}
                    </span>
                  </div>
                </div>

                <p className="admin-barber-bio">
                  "{barber.bio || 'Especialista en estilismo masculino y visagismo.'}"
                </p>

                <div className="admin-barber-metrics">
                  <div className="admin-metric-box">
                    <span className="admin-metric-label">Experiencia</span>
                    <strong className="admin-metric-value">{barber.experience || 0} años</strong>
                  </div>
                  <div className="admin-metric-box">
                    <span className="admin-metric-label">Citas Asignadas</span>
                    <strong className="admin-metric-value">{barber.totalAppointments || 0}</strong>
                  </div>
                </div>

                <div className="admin-barber-footer">
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="admin-card-contact">
                      <Phone size={13} color="#34d399" />
                      <span>{barber.phone}</span>
                    </a>
                  ) : (
                    <span className="admin-card-contact">
                      <Mail size={13} />
                      <span>{barber.email}</span>
                    </span>
                  )}

                  {canManageTeam && (
                  <button
                    type="button"
                    className="admin-delete-btn"
                    disabled={deletingId === barber.id}
                    onClick={() => handleDelete(barber.id, `${barber.firstName} ${barber.lastName}`)}
                    title="Dar de baja barbero"
                  >
                    <Trash2 size={13} />
                    <span>Dar de baja</span>
                  </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {canManageTeam && <AddBarberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onBarberCreated={handleBarberCreated}
      />}
    </div>
  )
}
