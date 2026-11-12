const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
const DEFAULT_TIMEOUT_MS = 8000

async function apiRequest(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers = {}, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const requestHeaders = { ...headers }
    if (fetchOptions.body && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json'
    }
    return await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include',
      headers: requestHeaders,
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Verifica tu conexión e intenta nuevamente.', { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function requestJson(endpoint, options) {
  const response = await apiRequest(endpoint, options)
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('sumaq:session-expired'))
    throw new Error(payload?.message || `La solicitud falló (${response.status}).`)
  }
  return payload
}

export async function fetchServices() {
  const payload = await requestJson('/services')
  return payload?.data || []
}

export async function fetchBarbers() {
  const payload = await requestJson('/services/barbers')
  return payload?.data || []
}

export async function createAppointment(bookingData) {
  const payload = await requestJson('/appointments', {
    method: 'POST',
    body: JSON.stringify(bookingData),
    timeout: 10000,
  })
  return payload.data
}

export async function fetchAvailability({ date, serviceId, barberId }) {
  const query = new URLSearchParams({ date, serviceId })
  if (barberId && barberId !== 'any') query.set('barberId', barberId)
  const payload = await requestJson(`/appointments/availability?${query}`)
  return payload?.data || { slots: [] }
}

export async function loginUser({ identifier, credential, password }) {
  const payload = await requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ credential: credential || identifier, password }),
  })
  return payload
}

export async function logoutUser() {
  await requestJson('/auth/logout', { method: 'POST' })
}

export async function fetchMyAppointments() {
  const payload = await requestJson('/appointments/my-appointments')
  return payload?.data || []
}

export async function cancelUserAppointment(appointmentId) {
  const payload = await requestJson(`/appointments/${appointmentId}/cancel`, { method: 'PATCH' })
  return payload?.data
}

export async function fetchMyProfile() {
  const payload = await requestJson('/auth/me')
  return payload?.data
}

export async function updateMyProfile(data) {
  const payload = await requestJson('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
  return payload?.data
}

export async function fetchBarberAppointments(filters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== 'ALL') query.set(key, value)
  }
  const payload = await requestJson(`/appointments/barber${query.size ? `?${query}` : ''}`)
  return payload?.data || []
}

export async function fetchBarberStats(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  const payload = await requestJson(`/appointments/barber/stats${query}`)
  return payload?.data
}

export async function updateAppointmentStatus(appointmentId, status, notes) {
  const payload = await requestJson(`/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  })
  return payload?.data
}

export async function fetchAdminBarbers() {
  const payload = await requestJson('/admin/barbers')
  return payload?.data || []
}

export async function createAdminBarber(barberData) {
  const payload = await requestJson('/admin/barbers', {
    method: 'POST',
    body: JSON.stringify(barberData),
  })
  return payload?.data
}

export async function deleteAdminBarber(barberId) {
  return requestJson(`/admin/barbers/${barberId}`, { method: 'DELETE' })
}

export async function fetchAdminCustomers() {
  const payload = await requestJson('/admin/customers')
  return payload?.data || []
}
