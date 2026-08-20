import { FormEvent, useState } from 'react'
import type { HelpRequest } from '../../types'
import { insertChange, uploadEvidence } from '../../lib/supabase'
import { displayRequestCode } from '../../utils/formatters'
import { digitsOnly, formatName } from '../../utils/validators'
import { SignaturePad } from '../common/SignaturePad'

interface StatusChangeFormModalProps {
  request: HelpRequest
  close: () => void
  sent: () => void
}

export function StatusChangeFormModal({ request, close, sent }: StatusChangeFormModalProps) {
  const longTask =
    request.category === 'Escombros' ||
    request.category === 'Mudanza y acarreo' ||
    request.category === 'Reconstrucción'

  const [target, setTarget] = useState<'En progreso' | 'Completada'>(
    longTask ? 'En progreso' : 'Completada'
  )
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const form = new FormData(event.currentTarget)
      const evidence = form.get('evidence') as File
      const evidencePath = evidence?.size ? await uploadEvidence('changes', evidence) : null
      await insertChange({
        help_request_id: request.id,
        target_status: target === 'En progreso' ? 'in_progress' : 'completed',
        responsible_name: String(form.get('name')),
        responsible_phone: String(form.get('phone')),
        notes: String(form.get('notes') ?? ''),
        evidence_photo_path: evidencePath,
        signature_data: signature
      })
      sent()
      close()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible enviar el cambio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">CAMBIO SUJETO A APROBACIÓN</span>
        <h2>{displayRequestCode(request)}</h2>
        <p>Un administrador revisará la evidencia antes de modificar el estado.</p>
        <form onSubmit={submit}>
          <label className="validated-field">
            Tu nombre
            <input
              name="name"
              onInput={formatName}
              minLength={3}
              maxLength={120}
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}"
              title="Usa solo letras. Cada palabra se formatea automáticamente."
              required
            />
            <small>Solo letras; cada palabra inicia en mayúscula.</small>
          </label>
          <label className="validated-field">
            Teléfono
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              onInput={digitsOnly}
              minLength={10}
              maxLength={10}
              pattern="3[0-9]{9}"
              title="Debe comenzar por 3 y contener exactamente 10 números."
              required
            />
            <small>10 números y debe comenzar por 3.</small>
          </label>
          <label>
            Estado propuesto
            <select
              value={target}
              onChange={e => setTarget(e.target.value as 'En progreso' | 'Completada')}
            >
              {longTask && <option>En progreso</option>}
              <option>Completada</option>
            </select>
          </label>
          <label className="wide upload-box">
            Fotografía de evidencia
            <input name="evidence" type="file" accept="image/*" required />
          </label>
          <label className="wide">
            Observaciones
            <textarea name="notes" rows={3} />
          </label>
          <div className="wide signature-field required-field">
            <span className="field-label">Firma de quien atiende</span>
            <SignaturePad value={signature} onChange={setSignature} />
            <small>Firma con el dedo dentro del recuadro.</small>
          </div>
          <div className="form-actions wide">
            <button className="primary" disabled={busy || !signature}>
              {busy ? 'Enviando…' : 'Enviar para aprobación'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
