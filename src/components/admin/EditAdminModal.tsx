import { FormEvent } from 'react'
import type { AdminUser, Session } from '../../types'
import { updateAdmin } from '../../lib/supabase'
import { formatName } from '../../utils/validators'
import { PasswordInput } from '../common/PasswordInput'

interface EditAdminModalProps {
  admin: AdminUser
  session: Session
  close: () => void
  saved: (admin: AdminUser) => void
}

export function EditAdminModal({ admin, session, close, saved }: EditAdminModalProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next: AdminUser = {
      ...admin,
      name: String(form.get('name')),
      email: String(form.get('email')),
      role: String(form.get('role')) as 'admin' | 'superadmin',
      active: form.get('active') === 'on'
    }
    try {
      await updateAdmin(session, {
        userId: admin.id,
        email: next.email,
        fullName: next.name,
        role: next.role ?? 'admin',
        active: next.active,
        password: String(form.get('password')) || undefined
      })
      saved(next)
      close()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible actualizar el usuario')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal login-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={e => e.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">EDITAR USUARIO</span>
        <h2>{admin.name}</h2>
        <form onSubmit={submit}>
          <label className="wide validated-field">
            Nombre
            <input
              name="name"
              defaultValue={admin.name}
              onInput={formatName}
              minLength={3}
              maxLength={120}
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}"
              title="Usa solo letras. Cada palabra se formatea automáticamente."
              required
            />
            <small>Solo letras; cada palabra inicia en mayúscula.</small>
          </label>
          <label className="wide">
            Correo
            <input name="email" type="email" defaultValue={admin.email} required />
          </label>
          <label className="wide">
            Rol
            <select name="role" defaultValue={admin.role ?? 'admin'}>
              <option value="admin">Administrador</option>
              <option value="superadmin">Superadministrador</option>
            </select>
          </label>
          <label className="wide">
            Nueva contraseña <small>Déjala vacía para conservarla</small>
            <PasswordInput minLength={10} />
          </label>
          <label className="consent wide">
            <input name="active" type="checkbox" defaultChecked={admin.active} /> Usuario activo
          </label>
          <button className="primary wide">Guardar usuario</button>
        </form>
      </section>
    </div>
  )
}
