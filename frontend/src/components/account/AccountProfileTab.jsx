import { User, Mail, Phone, CheckCircle2, Loader2 } from 'lucide-react'

export function AccountProfileTab({
  currentUser,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  editPhone,
  setEditPhone,
  isSaving,
  onSubmit
}) {
  return (
    <form className="account-body" onSubmit={onSubmit}>
      <div className="account-field-row">
        <div className="account-field">
          <label htmlFor="editFirstName" className="account-label">
            <User size={13} /> Nombre
          </label>
          <input
            id="editFirstName"
            type="text"
            required
            value={editFirstName}
            onChange={(e) => setEditFirstName(e.target.value)}
          />
        </div>

        <div className="account-field">
          <label htmlFor="editLastName" className="account-label">
            <User size={13} /> Apellidos
          </label>
          <input
            id="editLastName"
            type="text"
            value={editLastName}
            onChange={(e) => setEditLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="account-field">
        <label htmlFor="editEmail" className="account-label">
          <Mail size={13} /> Correo electrónico
        </label>
        <input
          id="editEmail"
          type="email"
          disabled
          value={currentUser?.email || ''}
          title="El correo es el identificador principal de tu cuenta"
        />
        <small className="field-hint">El correo no puede modificarse directamente.</small>
      </div>

      <div className="account-field">
        <label htmlFor="editPhone" className="account-label">
          <Phone size={13} /> WhatsApp / Celular
        </label>
        <input
          id="editPhone"
          type="tel"
          placeholder="Ej. +51 987 654 321"
          value={editPhone}
          onChange={(e) => setEditPhone(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="account-save-btn"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 size={15} className="spin" />
            <span>Guardando cambios...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={15} />
            <span>Guardar cambios</span>
          </>
        )}
      </button>
    </form>
  )
}
