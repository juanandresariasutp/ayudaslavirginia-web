import React, { FormEvent, useState } from 'react'
import type { CollectionCenter, HelpRequest, Location, Session } from '../../types'
import { createCollectionCenter, updateCollectionCenter } from '../../lib/supabase'
import { digitsOnly } from '../../utils/validators'
import { LeafletMap } from '../maps/LeafletMap'

interface CollectionCenterFormModalProps {
  center?: CollectionCenter
  session: Session
  close: () => void
  saved: () => Promise<void>
}

export function CollectionCenterFormModal({
  center,
  session,
  close,
  saved
}: CollectionCenterFormModalProps) {
  const [location, setLocation] = useState<Location | undefined>(center?.location)
  const [busy, setBusy] = useState(false)

  const markerRequest: HelpRequest[] = location
    ? [
        {
          id: 'collection-center-location',
          fullName: '',
          documentType: 'Cédula de ciudadanía',
          documentNumber: '',
          phone: '',
          neighborhood: center?.name ?? 'Centro de acopio',
          address: '',
          description: 'Ubicación seleccionada',
          category: 'Otros',
          status: 'Sin atender',
          priority: 'Media',
          createdAt: new Date().toISOString(),
          location
        }
      ]
    : []

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!location) return
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name')).trim(),
      address: String(form.get('address')).trim(),
      description: String(form.get('description')).trim(),
      phone: String(form.get('phone')).trim() || null,
      opening_hours: String(form.get('openingHours')).trim(),
      accepted_items: String(form.get('acceptedItems')).trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      active: form.get('active') === 'on'
    }
    setBusy(true)
    try {
      if (center) await updateCollectionCenter(session, center.id, payload)
      else await createCollectionCenter(session, payload)
      await saved()
      close()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible guardar el centro de acopio.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal collection-center-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="center-form-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">GESTIÓN DE CENTROS DE ACOPIO</span>
        <h2 id="center-form-title">{center ? 'Editar centro' : 'Nuevo centro de acopio'}</h2>
        <form onSubmit={submit}>
          <label>
            Nombre
            <input name="name" defaultValue={center?.name} minLength={3} maxLength={120} required />
          </label>
          <label>
            Teléfono <small>Opcional</small>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              defaultValue={center?.phone}
              onInput={digitsOnly}
              pattern="3[0-9]{9}"
              maxLength={10}
              title="Debe comenzar por 3 y tener 10 números."
            />
          </label>
          <label className="wide">
            Dirección <small>Opcional</small>
            <input name="address" defaultValue={center?.address} minLength={5} maxLength={240} />
          </label>
          <label>
            Horario <small>Opcional</small>
            <input
              name="openingHours"
              defaultValue={center?.openingHours}
              maxLength={240}
              placeholder="Ej. Lunes a sábado, 8:00 a. m. – 5:00 p. m."
            />
          </label>
          <label>
            Elementos que recibe <small>Opcional</small>
            <input
              name="acceptedItems"
              defaultValue={center?.acceptedItems}
              maxLength={500}
              placeholder="Ej. Ropa, alimentos y aseo"
            />
          </label>
          <label className="wide">
            Descripción <small>Opcional</small>
            <textarea name="description" defaultValue={center?.description} maxLength={1000} rows={4} />
          </label>
          <div className="wide center-location-field required-field">
            <span className="field-label">Ubicación exacta</span>
            <p>Selecciona el punto exacto haciendo clic o tocando el mapa.</p>
            <LeafletMap requests={markerRequest} onPick={setLocation} />
            {location ? (
              <small>
                Latitud {location.latitude.toFixed(6)} · Longitud {location.longitude.toFixed(6)}
              </small>
            ) : (
              <small className="form-error">Debes seleccionar una ubicación.</small>
            )}
          </div>
          <label className="consent wide">
            <input name="active" type="checkbox" defaultChecked={center?.active ?? true} /> Publicar
            este centro para la comunidad
          </label>
          <div className="form-actions wide">
            <button type="button" className="secondary" onClick={close}>
              Cancelar
            </button>
            <button className="primary" disabled={!location || busy}>
              {busy ? 'Guardando…' : 'Guardar centro'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
