import { useState } from 'react'
import { X, UserPlus, Scissors, Mail, Phone, Lock, Sparkles, Award, Loader2, AlertCircle } from 'lucide-react'
import { createAdminBarber } from '../../services/api'

export function AddBarberModal({ isOpen, onClose, onBarberCreated }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('SumaqBarber2026')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('Nombre, apellido y correo son obligatorios.')
      return
    }

    const token = localStorage.getItem('sumaq_token')
    setIsSubmitting(true)

    try {
      const newBarber = await createAdminBarber(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          bio: bio.trim() || undefined,
          experience: Number(experience) || 1,
        },
        token
      )

      onBarberCreated(newBarber)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar al barbero.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>
            <Scissors size={18} color="#f59e0b" />
            <span>Contratar / Registrar Barbero</span>
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {errorMsg && (
              <div className="booking-error-banner" role="alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="admin-modal-row-2">
              <div className="admin-input-group">
                <label><Sparkles size={12} /> Nombres</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mateo"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="admin-input-group">
                <label>Apellidos</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ramos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-modal-row-2">
              <div className="admin-input-group">
                <label><Mail size={12} /> Correo de Acceso</label>
                <input
                  type="email"
                  required
                  placeholder="mateo@sumaqbarber.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="admin-input-group">
                <label><Phone size={12} /> WhatsApp / Celular</label>
                <input
                  type="tel"
                  placeholder="+51 987 111 222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-modal-row-2">
              <div className="admin-input-group">
                <label><Award size={12} /> Años de Experiencia</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
              <div className="admin-input-group">
                <label><Lock size={12} /> Contraseña de Acceso</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-input-group">
              <label>Especialidad / Biografía corta</label>
              <textarea
                rows={2}
                placeholder="Ej. Experto en fade medio, texturizado con navaja y perfilado de barba clásica."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-modal-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="admin-modal-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Confirmar Alta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
