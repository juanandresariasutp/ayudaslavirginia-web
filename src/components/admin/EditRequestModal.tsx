import { FormEvent, useEffect, useState } from 'react'
import type { Category, HelpRequest, Priority, Session, Status } from '../../types'
import { categories, categoryRequiresPhoto, categoryToDb, priorityToDb } from '../../config/constants'
import { updateRequest, uploadEvidence } from '../../lib/supabase'
import { NeighborhoodInput } from '../common/NeighborhoodInput'

interface EditRequestModalProps {
  request: HelpRequest
  session: Session
  close: () => void
  saved: (request: HelpRequest) => void
}

export function EditRequestModal({ request, session, close, saved }: EditRequestModalProps) {
  const [busy, setBusy] = useState(false)
  const [editCategory, setEditCategory] = useState<Category>(request.category)
  const editPhotoRequired = categoryRequiresPhoto(editCategory)

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('input[name="requestPhoto"]')
    if (!input) return
    const select = document.querySelector<HTMLSelectElement>('select[name="category"]')
    if (select) select.onchange = () => setEditCategory(select.value as Category)
    input.required = editPhotoRequired && !request.requestPhotoName
    const help = input.parentElement?.querySelector('small')
    if (help && !request.requestPhotoName) {
      help.textContent = editPhotoRequired
        ? `Obligatoria para ${editCategory}: esta solicitud no tiene fotografía`
        : `Opcional para ${editCategory}: puedes agregar una fotografía si está disponible`
    }
    return () => {
      if (select) select.onchange = null
    }
  }, [editCategory, editPhotoRequired, request.requestPhotoName])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const photo = form.get('requestPhoto') as File
    const nextCategory = String(form.get('category')) as Category

    if (
      categoryRequiresPhoto(nextCategory) &&
      !request.requestPhotoName &&
      (!(photo instanceof File) || !photo.size)
    ) {
      alert(`Debes agregar una fotografía para la categoría ${nextCategory}.`)
      return
    }

    const next: HelpRequest = {
      ...request,
      neighborhood: String(form.get('neighborhood')),
      description: String(form.get('description')),
      category: nextCategory,
      priority: String(form.get('priority')) as Priority,
      status: String(form.get('status')) as Status
    }

    setBusy(true)
    try {
      const photoPath =
        photo instanceof File && photo.size
          ? await uploadEvidence('requests', photo, session)
          : request.requestPhotoName

      await updateRequest(session, request.id, {
        neighborhood: next.neighborhood,
        description: next.description,
        category: categoryToDb[next.category],
        verified_priority: priorityToDb[next.priority],
        status:
          next.status === 'Sin atender'
            ? 'pending'
            : next.status === 'En progreso'
            ? 'in_progress'
            : 'completed',
        request_photo_path: photoPath
      })

      saved({ ...next, requestPhotoName: photoPath })
      close()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      alert(
        message.includes('help_requests_request_photo_required')
          ? 'Debes agregar una fotografía antes de guardar esta solicitud.'
          : message || 'No fue posible actualizar'
      )
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
        <span className="eyebrow">EDITAR SOLICITUD</span>
        <h2>{request.publicCode ?? request.id}</h2>
        <form onSubmit={submit}>
          <label>
            Barrio
            <NeighborhoodInput name="neighborhood" defaultValue={request.neighborhood} required />
          </label>
          <label>
            Categoría
            <select name="category" defaultValue={request.category}>
              {categories.slice(1).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select name="priority" defaultValue={request.priority}>
              <option>Crítica</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </label>
          <label>
            Estado
            <select name="status" defaultValue={request.status}>
              <option>Sin atender</option>
              <option>En progreso</option>
              <option>Completada</option>
            </select>
          </label>
          <label className="wide">
            Descripción
            <textarea name="description" defaultValue={request.description} rows={5} required />
          </label>
          <label
            className={`wide upload-box ${
              request.requestPhotoName ? '' : 'missing-request-photo'
            }`}
          >
            Fotografía inicial{' '}
            {request.requestPhotoName ? (
              <small>Opcional: selecciona otra imagen para reemplazarla</small>
            ) : (
              <small>Obligatoria: esta solicitud histórica no tiene fotografía</small>
            )}
            <input name="requestPhoto" type="file" accept="image/*" required={!request.requestPhotoName} />
          </label>
          <div className="form-actions wide">
            <button className="primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
