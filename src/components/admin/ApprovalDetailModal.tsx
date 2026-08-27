import { useEffect, useState } from 'react'
import type { ChangeRequest, HelpRequest, Session } from '../../types'
import { getEvidenceUrl, getPrivateRequest } from '../../lib/supabase'
import { mapPrivate } from '../../utils/mappers'

interface ApprovalDetailModalProps {
  change: ChangeRequest
  session: Session
  role?: 'admin' | 'superadmin'
  close: () => void
  review: (change: ChangeRequest, state: 'Aprobado' | 'Rechazado', donatedBy?: string) => Promise<void>
}

export function ApprovalDetailModal({
  change,
  session,
  role = 'admin',
  close,
  review
}: ApprovalDetailModalProps) {
  const [request, setRequest] = useState<HelpRequest>()
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [requestPhotoUrl, setRequestPhotoUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [donatedByInput, setDonatedByInput] = useState(change.donatedBy ?? '')

  useEffect(() => {
    let active = true
    setError('')
    Promise.all([
      getPrivateRequest(session, change.requestId),
      change.evidencePhotoName
        ? getEvidenceUrl(session, change.evidencePhotoName)
        : Promise.resolve('')
    ])
      .then(async ([rows, evidence]) => {
        if (!active) return
        if (!rows[0]) {
          setRequest(undefined)
          setError('No fue posible encontrar la solicitud relacionada.')
          return
        }
        const privateRequest = mapPrivate(rows[0])
        setRequest(privateRequest)
        setEvidenceUrl(evidence)
        setDonatedByInput(change.donatedBy ?? privateRequest.donatedBy ?? '')
        setError('')
        if (privateRequest.requestPhotoName) {
          try {
            setRequestPhotoUrl(await getEvidenceUrl(session, privateRequest.requestPhotoName))
          } catch {
            setRequestPhotoUrl('')
          }
        }
      })
      .catch(
        reason =>
          active && setError(reason instanceof Error ? reason.message : 'No fue posible cargar los detalles.')
      )
    return () => {
      active = false
    }
  }, [change, session])

  async function decide(state: 'Aprobado' | 'Rechazado') {
    setBusy(true)
    try {
      await review(change, state, donatedByInput.trim() || undefined)
      close()
    } finally {
      setBusy(false)
    }
  }

  async function updateDonatedByOnly() {
    setBusy(true)
    try {
      await review(change, change.state === 'Aprobado' ? 'Aprobado' : 'Rechazado', donatedByInput.trim() || undefined)
      close()
    } finally {
      setBusy(false)
    }
  }

  const signatureUrl = change.signature?.startsWith('<svg')
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(change.signature)}`
    : ''

  const isLockedForAdmin = change.state !== 'Pendiente' && role !== 'superadmin'

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal approval-detail"
        role="dialog"
        aria-modal="true"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">DETALLE DE APROBACIÓN</span>
        <h2>
          {request?.publicCode ?? change.requestDetails?.publicCode ?? 'Detalle de solicitud'}
        </h2>
        {error && !request && <p className="form-error">{error}</p>}
        {!request && !error && <p>Cargando información…</p>}
        {request && (
          <>
            <div className="detail-status">
              <span
                className={`request-status status-${request.status
                  .toLowerCase()
                  .replace(' ', '-')}`}
              >
                {request.status}
              </span>
              <b>→ {change.requestedStatus}</b>
              <span>{change.state}</span>
            </div>
            <section className="detail-grid">
              <div>
                <small>Solicitante</small>
                <b>{request.fullName}</b>
              </div>
              <div>
                <small>Documento</small>
                <b>
                  {request.documentType} · {request.documentNumber}
                </b>
              </div>
              <div>
                <small>Teléfono del solicitante</small>
                <b>{request.phone}</b>
              </div>
              <div>
                <small>Categoría y prioridad</small>
                <b>
                  {request.category} · {request.priority}
                </b>
              </div>
              <div>
                <small>Barrio</small>
                <b>{request.neighborhood}</b>
              </div>
              <div>
                <small>Dirección</small>
                <b>{request.address}</b>
              </div>
              <div className="wide">
                <small>Descripción de la solicitud</small>
                <p>{request.description}</p>
              </div>
              <div>
                <small>Persona responsable</small>
                <b>{change.requestedBy}</b>
              </div>
              <div>
                <small>Teléfono responsable</small>
                <b>{change.responsiblePhone || 'No registrado'}</b>
              </div>
              <div className="wide">
                <small>Observaciones del cambio</small>
                <p>{change.notes || 'Sin observaciones'}</p>
              </div>
              <div className="wide donated-by-container">
                <label htmlFor="donated-by-input">
                  <small>Donado por (Opcional)</small>
                </label>
                <input
                  id="donated-by-input"
                  type="text"
                  className="donated-by-input"
                  value={donatedByInput}
                  onChange={e => setDonatedByInput(e.target.value)}
                  placeholder="Ej. Fundación Antioquia"
                  disabled={isLockedForAdmin || busy}
                />
                {isLockedForAdmin && (
                  <small className="field-locked-hint">
                    🔒 Solicitud respondida. Solo un Superadmin puede modificar este campo.
                  </small>
                )}
              </div>
            </section>
            <section className="detail-media">
              {requestPhotoUrl && (
                <figure>
                  <figcaption>Fotografía de la solicitud</figcaption>
                  <img src={requestPhotoUrl} alt="Fotografía original de la solicitud" />
                </figure>
              )}
              {evidenceUrl && (
                <figure>
                  <figcaption>Fotografía de evidencia</figcaption>
                  <img src={evidenceUrl} alt="Evidencia presentada para el cambio" />
                </figure>
              )}
              {signatureUrl && (
                <figure className="signature-preview">
                  <figcaption>Firma de quien atendió</figcaption>
                  <img src={signatureUrl} alt="Firma digital asociada al cambio" />
                </figure>
              )}
            </section>
            {change.state === 'Pendiente' && (
              <div className="detail-actions">
                <button className="secondary" disabled={busy} onClick={() => decide('Rechazado')}>
                  Rechazar
                </button>
                <button className="primary" disabled={busy} onClick={() => decide('Aprobado')}>
                  Aprobar cambio
                </button>
              </div>
            )}
            {change.state !== 'Pendiente' && role === 'superadmin' && (
              <div className="detail-actions">
                <button className="primary" disabled={busy} onClick={updateDonatedByOnly}>
                  {busy ? 'Guardando…' : 'Actualizar Donado Por (Superadmin)'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
