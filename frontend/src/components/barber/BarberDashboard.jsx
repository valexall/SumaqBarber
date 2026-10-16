import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchBarberAppointments,
  fetchBarberStats,
  updateAppointmentStatus
} from '../../services/api'
import { BarberHeader } from './BarberHeader'
import { BarberToolbar } from './BarberToolbar'
import { BarberKpiGrid } from './BarberKpiGrid'
import { BarberAppointmentsFeed } from './BarberAppointmentsFeed'
import { BarberCancelModal } from './BarberCancelModal'
import { BarbersManagementTab } from '../admin/BarbersManagementTab'
import { CustomersManagementTab } from '../admin/CustomersManagementTab'
import './BarberDashboard.css'

const getTodayStr = () => new Date().toLocaleDateString('en-CA')
const getTomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

export function BarberDashboard({ currentUser, onLogout, onBackToSite }) {
  const [activeSection, setActiveSection] = useState('AGENDA')
  const [todayStr] = useState(getTodayStr)
  const [tomorrowStr] = useState(getTomorrowStr)
  const [selectedDate, setSelectedDate] = useState(getTodayStr)
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())

  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isShiftActive, setIsShiftActive] = useState(true)

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

  const [toast, setToast] = useState(null)
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const loadData = useCallback(
    async (dateParam = selectedDate, isSilent = false) => {
      if (!token) return
      if (!isSilent) setIsLoading(true)
      setIsRefreshing(true)

      try {
        const [appData, statsData] = await Promise.all([
          fetchBarberAppointments(dateParam, token),
          fetchBarberStats(token),
        ])
        setAppointments(appData || [])
        if (statsData) setStats(statsData)
      } catch (err) {
        showToast(err.message || 'Error al sincronizar citas', 'error')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [token, selectedDate, showToast]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(selectedDate)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadData, selectedDate])

  const handleRefresh = () => {
    loadData(selectedDate, true)
    showToast('Agenda sincronizada en tiempo real', 'info')
  }

  const handleSelectDate = (dateVal) => {
    setSelectedDate(dateVal)
    loadData(dateVal)
  }

  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId)
    try {
      await updateAppointmentStatus(appointmentId, newStatus, token)
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      )
      loadData(selectedDate, true)
      const label =
        newStatus === 'CONFIRMED'
          ? 'Cita confirmada'
          : newStatus === 'COMPLETED'
          ? 'Cita completada con éxito'
          : 'Estado actualizado'
      showToast(label, 'success')
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el estado', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelModalItem) return
    setIsCanceling(true)
    try {
      await updateAppointmentStatus(
        cancelModalItem.id,
        'CANCELED',
        token,
        cancelReason.trim() || undefined
      )
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === cancelModalItem.id ? { ...a, status: 'CANCELED' } : a
        )
      )
      loadData(selectedDate, true)
      showToast('Cita cancelada correctamente', 'info')
      setCancelModalItem(null)
      setCancelReason('')
    } catch (err) {
      showToast(err.message || 'Error al cancelar la cita', 'error')
    } finally {
      setIsCanceling(false)
    }
  }

  const countsByStatus = useMemo(() => {
    return {
      ALL: appointments.length,
      PENDING: appointments.filter((a) => a.status === 'PENDING').length,
      CONFIRMED: appointments.filter((a) => a.status === 'CONFIRMED').length,
      COMPLETED: appointments.filter((a) => a.status === 'COMPLETED').length,
      CANCELED: appointments.filter((a) => a.status === 'CANCELED').length,
    }
  }, [appointments])

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (activeTab !== 'ALL' && app.status !== activeTab) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const customerName = `${app.customer?.firstName || ''} ${app.customer?.lastName || ''}`.toLowerCase()
        const phone = (app.customer?.phone || '').toLowerCase()
        const serviceName = (app.service?.name || '').toLowerCase()
        return customerName.includes(q) || phone.includes(q) || serviceName.includes(q)
      }
      return true
    })
  }, [appointments, activeTab, searchQuery])

  const barberInitials = currentUser
    ? `${currentUser.firstName?.[0] || 'B'}${currentUser.lastName?.[0] || 'B'}`.toUpperCase()
    : 'SB'

  const getWhatsAppLink = (app) => {
    if (!app.customer?.phone) return null
    const cleanPhone = app.customer.phone.replace(/\D/g, '')
    const targetPhone = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`
    const timeFormatted = new Date(app.date).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const text = `¡Hola ${app.customer.firstName}! 👋 Te saluda tu barbero de Sumaq Barber. Te confirmo tu cita de ${app.service?.name} para hoy a las ${timeFormatted} hrs.`
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="barber-os-root">
      {toast && (
        <div className={`barber-toast barber-toast--${toast.type}`} role="alert">
          <span>{toast.message}</span>
        </div>
      )}

      <BarberHeader
        barberInitials={barberInitials}
        currentUser={currentUser}
        isShiftActive={isShiftActive}
        setIsShiftActive={setIsShiftActive}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onLogout={onLogout}
        onBackToSite={onBackToSite}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <main className="barber-os-content">
        {activeSection === 'BARBERS' && (
          <BarbersManagementTab showToast={showToast} />
        )}

        {activeSection === 'CUSTOMERS' && (
          <CustomersManagementTab showToast={showToast} />
        )}

        {activeSection === 'AGENDA' && (
          <>
            <BarberToolbar
              selectedDate={selectedDate}
              todayStr={todayStr}
              tomorrowStr={tomorrowStr}
              onSelectDate={handleSelectDate}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              countsByStatus={countsByStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <BarberKpiGrid stats={stats} countsByStatus={countsByStatus} />

            <BarberAppointmentsFeed
              isLoading={isLoading}
              filteredAppointments={filteredAppointments}
              activeTab={activeTab}
              searchQuery={searchQuery}
              selectedDate={selectedDate}
              setActiveTab={setActiveTab}
              currentTimeMs={currentTimeMs}
              getWhatsAppLink={getWhatsAppLink}
              updatingId={updatingId}
              onStatusChange={handleStatusChange}
              onOpenCancel={setCancelModalItem}
            />
          </>
        )}
      </main>

      <BarberCancelModal
        cancelModalItem={cancelModalItem}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        isCanceling={isCanceling}
        onClose={() => setCancelModalItem(null)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}
