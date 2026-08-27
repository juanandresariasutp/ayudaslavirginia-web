import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import type { AdminUser, ChangeRequest, CollectionCenter, HelpRequest, Session } from '../../types'
import {
  createAdmin,
  deleteAdmin,
  deleteChange,
  deleteCollectionCenter,
  deleteRequest,
  getChanges,
  getCollectionCenters,
  insertChange,
  listAdmins,
  reviewChange,
  uploadEvidence
} from '../../lib/supabase'
import { mapChange, mapCollectionCenter } from '../../utils/mappers'
import { formatName, digitsOnly } from '../../utils/validators'
import { PasswordInput } from '../common/PasswordInput'
import { SignaturePad } from '../common/SignaturePad'
import { ApprovalDetailModal } from './ApprovalDetailModal'
import { EditAdminModal } from './EditAdminModal'
import { EditRequestModal } from './EditRequestModal'
import { ReviewStatistics } from './ReviewStatistics'
import { CollectionCenterFormModal } from '../collectionCenters/CollectionCenterFormModal'

interface AdminPanelProps {
  requests: HelpRequest[]
  admins: AdminUser[]
  changes: ChangeRequest[]
  centers: CollectionCenter[]
  setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>
  setChanges: React.Dispatch<React.SetStateAction<ChangeRequest[]>>
  setRequests: React.Dispatch<React.SetStateAction<HelpRequest[]>>
  setCenters: React.Dispatch<React.SetStateAction<CollectionCenter[]>>
  session: Session
  role: 'admin' | 'superadmin'
  onNewRequest: () => void
}

export function AdminPanel({
  requests,
  admins,
  changes,
  centers,
  setAdmins,
  setChanges,
  setRequests,
  setCenters,
  session,
  role,
  onNewRequest
}: AdminPanelProps) {
  const [tab, setTab] = useState<'solicitudes' | 'aprobaciones' | 'usuarios' | 'acopios'>(
    'aprobaciones'
  )
  const [changeFor, setChangeFor] = useState<HelpRequest>()
  const [selectedChange, setSelectedChange] = useState<ChangeRequest>()
  const [signature, setSignature] = useState('')
  const [editingRequest, setEditingRequest] = useState<HelpRequest>()
  const [editingAdmin, setEditingAdmin] = useState<AdminUser>()
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>()
  const [approvalSearch, setApprovalSearch] = useState('')

  const filteredChanges = useMemo(() => {
    if (!approvalSearch) return changes
    const searchedNumber = String(Number(approvalSearch))
    return changes.filter(change => {
      const requestCode = change.requestDetails?.publicCode ?? change.requestId
      const number = requestCode.match(/(\d+)$/)?.[1]
      return number ? String(Number(number)) === searchedNumber : false
    })
  }, [approvalSearch, changes])

  useEffect(() => {
    getChanges(session)
      .then(rows => setChanges(rows.map(mapChange)))
      .catch(() => undefined)

    if (role === 'superadmin') {
      listAdmins(session)
        .then(rows =>
          setAdmins(
            rows.map(a => ({
              id: a.id,
              name: a.name,
              email: a.email,
              active: a.active,
              role: a.role
            }))
          )
        )
        .catch(() => undefined)
    }
  }, [session, role, setAdmins, setChanges])

  async function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createAdmin(session, {
        email: String(form.get('email')),
        password: String(form.get('password')),
        fullName: String(form.get('name')),
        role: String(form.get('role')) as 'admin' | 'superadmin'
      })
      const rows = await listAdmins(session)
      setAdmins(
        rows.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          active: a.active,
          role: a.role
        }))
      )
      event.currentTarget.reset()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible crear el administrador')
    }
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changeFor || !signature) return
    const form = new FormData(event.currentTarget)
    const photo = form.get('evidence') as File
    try {
      const path = await uploadEvidence('changes', photo, session)
      const target = String(form.get('status')) as 'En progreso' | 'Completada'
      await insertChange({
        help_request_id: changeFor.id,
        target_status: target === 'En progreso' ? 'in_progress' : 'completed',
        responsible_name: String(form.get('responsible')),
        responsible_phone: String(form.get('phone')),
        evidence_photo_path: path,
        signature_data: signature
      })
      setChanges(c => [
        {
          id: crypto.randomUUID(),
          requestId: changeFor.id,
          requestedStatus: target,
          requestedBy: String(form.get('responsible')),
          evidencePhotoName: path,
          signature,
          createdAt: new Date().toISOString(),
          state: 'Pendiente'
        },
        ...c
      ])
      setChangeFor(undefined)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible crear la aprobación')
    }
  }

  async function review(change: ChangeRequest, state: 'Aprobado' | 'Rechazado', donatedBy?: string) {
    try {
      await reviewChange(
        session,
        change.id,
        state === 'Aprobado',
        state === 'Rechazado' ? 'Rechazado por administración' : undefined,
        donatedBy
      )
      const rows = await getChanges(session)
      setChanges(rows.map(mapChange))
      setRequests(list =>
        list.map(r =>
          r.id === change.requestId
            ? {
                ...r,
                ...(state === 'Aprobado'
                  ? {
                      status: change.requestedStatus,
                      evidencePhotoName: change.evidencePhotoName,
                      signature: change.signature
                    }
                  : {}),
                donatedBy: donatedBy ?? r.donatedBy
              }
            : r
        )
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible revisar el cambio')
    }
  }

  async function removeRequest(request: HelpRequest) {
    if (!confirm(`¿Eliminar definitivamente ${request.id}?`)) return
    try {
      await deleteRequest(session, request.id)
      setRequests(list => list.filter(r => r.id !== request.id))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible eliminar')
    }
  }

  async function removeChange(change: ChangeRequest) {
    if (!confirm('¿Eliminar esta aprobación?')) return
    try {
      await deleteChange(session, change.id)
      setChanges(list => list.filter(c => c.id !== change.id))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible eliminar la aprobación')
    }
  }

  async function removeAdmin(admin: AdminUser) {
    if (!confirm(`¿Eliminar el usuario ${admin.email}?`)) return
    try {
      await deleteAdmin(session, admin.id)
      setAdmins(list => list.filter(a => a.id !== admin.id))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible eliminar el usuario')
    }
  }

  async function refreshCenters() {
    const rows = await getCollectionCenters(session)
    setCenters(rows.map(mapCollectionCenter))
  }

  async function removeCenter(center: CollectionCenter) {
    if (!confirm(`¿Eliminar el centro de acopio ${center.name}?`)) return
    try {
      await deleteCollectionCenter(session, center.id)
      await refreshCenters()
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'No fue posible eliminar el centro de acopio.'
      )
    }
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ÁREA RESTRINGIDA · {role}</span>
          <h2>Administración</h2>
        </div>
      </div>
      <div className="admin-tabs">
        {role === 'superadmin' && (
          <button
            className={tab === 'solicitudes' ? 'selected' : ''}
            onClick={() => setTab('solicitudes')}
          >
            Solicitudes
          </button>
        )}
        <button
          className={tab === 'aprobaciones' ? 'selected' : ''}
          onClick={() => setTab('aprobaciones')}
        >
          Aprobaciones ({changes.filter(c => c.state === 'Pendiente').length})
        </button>
        {role === 'superadmin' && (
          <button
            className={tab === 'acopios' ? 'selected' : ''}
            onClick={() => setTab('acopios')}
          >
            Centros de acopio
          </button>
        )}
        {role === 'superadmin' && (
          <button
            className={tab === 'usuarios' ? 'selected' : ''}
            onClick={() => setTab('usuarios')}
          >
            Usuarios admin
          </button>
        )}
      </div>

      {tab === 'solicitudes' && role === 'superadmin' && (
        <>
          <div className="crud-toolbar">
            <button className="primary" onClick={onNewRequest}>
              ＋ Crear solicitud
            </button>
          </div>
          <div className="admin-list">
            {requests.map(r => (
              <article key={r.id}>
                <div>
                  <b>
                    {r.publicCode ?? r.id} · {r.category}
                  </b>
                  <span>
                    {r.neighborhood} · {r.status}
                  </span>
                </div>
                <div>
                  <button className="secondary" onClick={() => setEditingRequest(r)}>
                    Editar
                  </button>{' '}
                  <button
                    className="primary"
                    disabled={r.status === 'Completada'}
                    onClick={() => setChangeFor(r)}
                  >
                    Crear aprobación
                  </button>{' '}
                  <button className="danger" onClick={() => removeRequest(r)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'aprobaciones' && (
        <>
          {role === 'superadmin' && <ReviewStatistics changes={changes} />}
          <section className="admin-approval-search" aria-label="Buscar aprobación por solicitud">
            <label>
              Buscar por número de solicitud
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={approvalSearch}
                onChange={event => setApprovalSearch(event.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 329 para encontrar solicitud_0329"
                aria-label="Buscar aprobación por número de solicitud"
              />
            </label>
          </section>
          <div className="admin-list">
            {filteredChanges.map(c => (
              <article key={c.id}>
                <div>
                  <b>
                    {c.requestDetails?.publicCode ?? c.requestId} → {c.requestedStatus}
                  </b>
                  <span>
                    {c.requestedBy} · {new Date(c.createdAt).toLocaleString('es-CO')} ·{' '}
                    {c.state === 'Pendiente'
                      ? 'Pendiente de revisión'
                      : `${c.state} por ${
                          c.reviewedByName ?? 'Administrador no identificado'
                        }${
                          c.reviewedAt
                            ? ` · ${new Date(c.reviewedAt).toLocaleString('es-CO')}`
                            : ''
                        }`}
                  </span>
                </div>
                <div>
                  <button className="secondary" onClick={() => setSelectedChange(c)}>
                    Ver detalles
                  </button>{' '}
                  {c.state === 'Pendiente' && (
                    <>
                      <button className="secondary" onClick={() => review(c, 'Rechazado')}>
                        Rechazar
                      </button>{' '}
                      <button className="primary" onClick={() => review(c, 'Aprobado')}>
                        Aprobar
                      </button>
                    </>
                  )}
                  {role === 'superadmin' && (
                    <button className="danger" onClick={() => removeChange(c)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filteredChanges.length && (
              <div className="empty">
                {approvalSearch
                  ? `No se encontraron aprobaciones para solicitud_${approvalSearch.padStart(4, '0')}.`
                  : 'No hay aprobaciones registradas.'}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'usuarios' && role === 'superadmin' && (
        <>
          <form className="inline-form admin-create" onSubmit={addAdmin}>
            <input
              name="name"
              placeholder="Nombre *"
              onInput={formatName}
              minLength={3}
              maxLength={120}
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}"
              title="Usa solo letras. Cada palabra se formatea automáticamente."
              required
            />
            <input name="email" type="email" placeholder="Correo *" required />
            <PasswordInput minLength={10} placeholder="Contraseña temporal *" required />
            <select name="role">
              <option value="admin">Administrador *</option>
              <option value="superadmin">Superadministrador</option>
            </select>
            <button className="primary">Crear usuario</button>
          </form>
          <div className="admin-list">
            {admins.map(a => (
              <article key={a.id}>
                <div>
                  <b>{a.name}</b>
                  <span>
                    {a.email} · {a.role} · {a.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  <button className="secondary" onClick={() => setEditingAdmin(a)}>
                    Editar
                  </button>{' '}
                  <button className="danger" onClick={() => removeAdmin(a)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'acopios' && role === 'superadmin' && (
        <>
          <div className="crud-toolbar">
            <button className="primary" onClick={() => setEditingCenter(null)}>
              ＋ Agregar centro
            </button>
          </div>
          <div className="admin-list collection-admin-list">
            {centers.map(center => (
              <article key={center.id}>
                <div>
                  <b>{center.name}</b>
                  <span>
                    {center.address} · {center.active ? 'Publicado' : 'Oculto'}
                  </span>
                </div>
                <div>
                  <button className="secondary" onClick={() => setEditingCenter(center)}>
                    Editar
                  </button>{' '}
                  <button className="danger" onClick={() => removeCenter(center)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
            {!centers.length && <div className="empty">No hay centros de acopio registrados.</div>}
          </div>
        </>
      )}

      {changeFor && (
        <div className="modal-backdrop" onMouseDown={() => setChangeFor(undefined)}>
          <section className="modal" onMouseDown={e => e.stopPropagation()}>
            <button className="close" onClick={() => setChangeFor(undefined)}>
              ×
            </button>
            <span className="eyebrow">CREAR APROBACIÓN</span>
            <h2>{changeFor.publicCode ?? changeFor.id}</h2>
            <form onSubmit={propose}>
              <label>
                Nuevo estado
                <select name="status">
                  <option>En progreso</option>
                  <option>Completada</option>
                </select>
              </label>
              <label className="validated-field">
                Responsable
                <input
                  name="responsible"
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
              <label className="wide upload-box">
                Fotografía de evidencia
                <input name="evidence" type="file" accept="image/*" required />
              </label>
              <div className="wide signature-field required-field">
                <span className="field-label">Firma digital</span>
                <SignaturePad value={signature} onChange={setSignature} />
                {!signature && <small>La firma es obligatoria.</small>}
              </div>
              <div className="form-actions wide">
                <button className="primary" disabled={!signature}>
                  Crear aprobación
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          session={session}
          role={role}
          close={() => setEditingRequest(undefined)}
          saved={next =>
            setRequests(list => list.map(r => (r.id === next.id ? next : r)))
          }
        />
      )}

      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          session={session}
          close={() => setEditingAdmin(undefined)}
          saved={next =>
            setAdmins(list => list.map(a => (a.id === next.id ? next : a)))
          }
        />
      )}

      {editingCenter !== undefined && (
        <CollectionCenterFormModal
          center={editingCenter ?? undefined}
          session={session}
          close={() => setEditingCenter(undefined)}
          saved={refreshCenters}
        />
      )}

      {selectedChange && (
        <ApprovalDetailModal
          change={selectedChange}
          session={session}
          role={role}
          close={() => setSelectedChange(undefined)}
          review={review}
        />
      )}
    </>
  )
}
