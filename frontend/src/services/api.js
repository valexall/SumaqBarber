const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:4000/api/v1');
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Robust fetch wrapper with timeout and single base URL.
 * Never attempts retries against localhost in production.
 */
async function apiRequest(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers = {}, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestHeaders = { ...headers };
    if (fetchOptions.body && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servidor.', { cause: err });
    }
    throw err;
  }
}

/**
 * Fetch all available services
 */
export async function fetchServices() {
  try {
    const res = await apiRequest('/services');
    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al obtener servicios`);
    }
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Fallo al conectar con el backend para servicios:', err.message);
    // Fallback data matching Sumaq Barber portfolio in case backend is loading
    return [
      { id: 'c9d9f8fc-6741-4e81-b0d8-46c4ba3cfb33', name: 'Corte Sumaq', description: 'Diagnóstico + corte personalizado + peinado final', price: 55, duration: 45 },
      { id: '432999da-5ff8-4f22-b74c-c5e66d0389fd', name: 'Corte & Barba', description: 'Ritual completo + perfilado de barba con navaja y toalla caliente', price: 80, duration: 65 },
      { id: '5b466dbd-24b0-430a-a3d1-5a9c97961949', name: 'Barba Clásica', description: 'Toalla caliente + diseño de barba + aceites aromáticos', price: 40, duration: 30 },
      { id: 'default-4', name: 'Tratamiento Capilar', description: 'Lavado detox + exfoliación + masaje capilar relajante', price: 70, duration: 40 },
    ];
  }
}

/**
 * Fetch available barbers
 */
export async function fetchBarbers() {
  try {
    const res = await apiRequest('/services/barbers');
    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al obtener barberos`);
    }
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Fallo al conectar con el backend para barberos:', err.message);
    return [
      { id: '9e0218f8-1611-4351-93e4-99e83ea4c970', firstName: 'Mateo', lastName: 'Ramos' },
      { id: '19fcbab3-bed2-42b8-8e49-8410efc46408', firstName: 'Carlos', lastName: 'Mendoza' },
    ];
  }
}

/**
 * Submit appointment reservation
 */
export async function createAppointment(bookingData) {
  let response;
  try {
    response = await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(bookingData),
      timeout: 10000,
    });
  } catch (err) {
    throw new Error(err.message || 'No se pudo conectar con el servidor de Sumaq Barber.', { cause: err });
  }

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Error al procesar la reserva. Por favor intenta nuevamente.');
  }

  return result;
}

/**
 * Login user with email or phone
 */
export async function loginUser(credential, password) {
  let response;
  try {
    response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ credential, password }),
      timeout: 8000,
    });
  } catch (err) {
    throw new Error(err.message || 'No se pudo conectar con el servidor.', { cause: err });
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al iniciar sesión.');
  }

  return result;
}

/**
 * Fetch appointments of logged-in user
 */
export async function fetchMyAppointments(token) {
  const res = await apiRequest('/appointments/my-appointments', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Error al obtener tus citas');
  }
  return json.data || [];
}

/**
 * Cancel an appointment
 */
export async function cancelUserAppointment(appointmentId, token) {
  const res = await apiRequest(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Error al cancelar la cita');
  }
  return json.data;
}

/**
 * Fetch current user profile
 */
export async function fetchMyProfile(token) {
  const res = await apiRequest('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Error al obtener perfil');
  }
  return json.data;
}

/**
 * Update current user profile
 */
export async function updateMyProfile(data, token) {
  const res = await apiRequest('/auth/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Error al actualizar perfil');
  }
  return json.data;
}
