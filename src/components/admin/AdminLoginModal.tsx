import { FormEvent, useState } from 'react'
import type { Session } from '../../types'
import { getAdminProfile, login, logout } from '../../lib/supabase'
import { PasswordInput } from '../common/PasswordInput'

interface AdminLoginModalProps {
  close: () => void
  success: (session: Session, profile: { full_name: string; role: 'admin' | 'superadmin' }) => void
}

export function AdminLoginModal({ close, success }: AdminLoginModalProps) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const session = await login(String(form.get('email')), String(form.get('password')))
      const profile = await getAdminProfile(session)
      success(session, profile)
    } catch (e) {
      logout()
      setError(e instanceof Error ? e.message : 'Acceso rechazado')
    } finally {
      setBusy(false)
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
        <span className="eyebrow">ÁREA RESTRINGIDA</span>
        <h2>Ingreso administrativo</h2>
        <p>Accede con el correo y contraseña asignados.</p>
        <form onSubmit={submit}>
          <label className="wide">
            Correo
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="wide">
            Contraseña
            <PasswordInput autoComplete="current-password" required />
          </label>
          {error && <p className="form-error wide">{error}</p>}
          <button className="primary wide" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}
