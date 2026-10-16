import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, RotateCw, User, MessageCircle, X } from 'lucide-react'
import { fetchAdminCustomers } from '../../services/api'
import './AdminManagement.css'

export function CustomersManagementTab({ showToast }) {
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const token = localStorage.getItem('sumaq_token')

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchAdminCustomers(token)
      setCustomers(data)
    } catch (err) {
      showToast?.(err.message || 'Error al cargar directorio de clientes', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [token, showToast])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadCustomers])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase().trim()
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    )
  }, [customers, searchQuery])

  return (
    <div className="admin-suite-container">
      <div className="admin-toolbar-row">
        <div className="admin-toolbar-info">
          <h3>Directorio de Clientes ({customers.length})</h3>
          <p>Historial de reservas, frecuencia y contacto directo para fidelización.</p>
        </div>

        <div className="barber-search-box" style={{ maxWidth: '320px', width: '100%' }}>
          <Search size={15} className="barber-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o celular..."
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

      {isLoading ? (
        <div className="barber-loading-state">
          <RotateCw size={28} className="is-spinning" />
          <p>Consultando clientes registrados...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="barber-empty-state">
          <User size={38} />
          <h3>No se encontraron clientes</h3>
          <p>Los clientes se registrarán automáticamente cuando agenden su primera cita.</p>
        </div>
      ) : (
        <div className="admin-customer-table-card">
          <div className="admin-customer-list">
            {filteredCustomers.map((c) => {
              const initials = `${c.firstName?.[0] || 'C'}${c.lastName?.[0] || ''}`.toUpperCase()
              const cleanPhone = c.phone?.replace(/\D/g, '') || ''
              const waLink = cleanPhone
                ? `https://wa.me/${cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`}?text=${encodeURIComponent(
                    `¡Hola ${c.firstName}! 👋 Te escribimos de Sumaq Barber para agradecer tu preferencia.`
                  )}`
                : null

              return (
                <div key={c.id} className="admin-customer-row">
                  <div className="admin-customer-info">
                    <div className="admin-customer-avatar">{initials}</div>
                    <div className="admin-customer-text">
                      <h5>{c.firstName} {c.lastName}</h5>
                      <span>{c.email}</span>
                    </div>
                  </div>

                  <div className="admin-customer-stats-group">
                    <div className="admin-customer-stat">
                      <small>Citas</small>
                      <strong>{c.totalAppointments} ({c.completedAppointments} asist.)</strong>
                    </div>

                    <div className="admin-customer-stat">
                      <small>Inversión</small>
                      <strong className="highlight">S/ {(c.totalSpent || 0).toFixed(2)}</strong>
                    </div>

                    {c.phone && (
                      <div className="admin-customer-stat">
                        <small>Teléfono</small>
                        <strong>{c.phone}</strong>
                      </div>
                    )}
                  </div>

                  <div className="admin-customer-actions">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-wa-pill"
                        title="Contactar al cliente por WhatsApp"
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
