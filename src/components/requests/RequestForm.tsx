import { FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Category, DocumentType, HelpRequest, Location, Priority } from '../../types'
import { categories, categoryRequiresPhoto } from '../../config/constants'
import { digitsOnly, formatName } from '../../utils/validators'
import { initialRequests } from '../../data'
import { LeafletMap } from '../maps/LeafletMap'
import { PrivacyConsentModal } from './PrivacyConsentModal'
import { NeighborhoodInput } from '../common/NeighborhoodInput'

interface RequestFormProps {
  close: () => void
  create: (request: HelpRequest, photo?: File) => Promise<void>
}

export function RequestForm({ close, create }: RequestFormProps) {
  const [category, setCategory] = useState<Category | ''>('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [showPriorityHelp, setShowPriorityHelp] = useState(false)
  const [location, setLocation] = useState<Location>()
  const [locationState, setLocationState] = useState(
    'Debes obtener o seleccionar una ubicación en el mapa para continuar.'
  )
  const [pending, setPending] = useState<{ request: HelpRequest; photo?: File }>()

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('.request-modal input[name="photo"]')
    if (!input) return
    input.required = Boolean(category && categoryRequiresPhoto(category))
    const help = input.parentElement?.querySelector('small')
    if (help) {
      help.textContent = category
        ? `${categoryRequiresPhoto(category) ? 'Obligatoria' : 'Opcional'} para ${category}. Máximo 10 MB; se optimizará antes de enviarla. Puedes tomar una foto o escogerla de la galería.`
        : 'Selecciona primero una categoría para conocer si la fotografía es obligatoria. Tamaño máximo: 10 MB.'
    }
  }, [category])

  function locate() {
    if (!navigator.geolocation) return setLocationState('Este dispositivo no admite ubicación')
    setLocationState('Solicitando permiso…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationState('📍 Ubicación de GPS guardada para enviar')
      },
      () => setLocationState('No fue posible obtener la ubicación del GPS'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function pickLocation(nextLocation: Location) {
    setLocation(nextLocation)
    setLocationState(
      `📍 Ubicación manual guardada: ${nextLocation.latitude.toFixed(6)}, ${nextLocation.longitude.toFixed(6)}`
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const photo = form.get('photo') as File
    const description = String(form.get('description')).trim()

    if (!category) {
      alert('Selecciona una categoría para continuar.')
      return
    }
    if (!priority) {
      alert('Selecciona una prioridad para continuar.')
      return
    }
    if (description.length < 10) {
      alert('La descripción debe tener al menos 10 caracteres.')
      return
    }

    const selectedPhoto = photo instanceof File && photo.size ? photo : undefined
    if (categoryRequiresPhoto(category) && !selectedPhoto) {
      alert(`Debes adjuntar una fotografía para la categoría ${category}.`)
      return
    }
    if (!location) {
      setLocationState(
        'La ubicación es obligatoria. Usa tu dispositivo o selecciona un punto en el mapa.'
      )
      return
    }

    setPending({
      request: {
        id: `LVR-2026-${String(Date.now()).slice(-6)}`,
        fullName: String(form.get('fullName')),
        documentType: String(form.get('documentType')) as DocumentType,
        documentNumber: String(form.get('documentNumber')),
        phone: String(form.get('phone')),
        neighborhood: String(form.get('neighborhood')),
        address: String(form.get('address')),
        description,
        category,
        status: 'Sin atender',
        priority,
        createdAt: new Date().toISOString(),
        location,
        requestPhotoName: selectedPhoto?.name
      },
      photo: selectedPhoto
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal request-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={e => e.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">SOLICITUD SIN CUENTA</span>
        <h2>Solicitar ayuda</h2>
        <p>Tus datos personales serán privados. En el tablero solo aparecerán el barrio, categoría y estado.</p>
        <form onSubmit={submit}>
          <label className="validated-field">
            Nombre completo
            <input
              name="fullName"
              autoComplete="name"
              onInput={formatName}
              minLength={3}
              maxLength={120}
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}"
              title="Usa solo letras. Cada palabra se formatea automáticamente."
              required
            />
            <small>Solo letras; cada palabra inicia en mayúscula.</small>
          </label>
          <label>
            Tipo de documento
            <select name="documentType" required>
              <option>Cédula de ciudadanía</option>
              <option>Cédula de extranjería</option>
              <option>Pasaporte</option>
              <option>Permiso por protección temporal</option>
            </select>
          </label>
          <label className="validated-field">
            Número de documento
            <input
              name="documentNumber"
              inputMode="numeric"
              onInput={digitsOnly}
              minLength={5}
              maxLength={20}
              pattern="[0-9]{5,20}"
              title="Ingresa entre 5 y 20 números, sin puntos ni espacios."
              required
            />
            <small>Entre 5 y 20 números, sin puntos ni espacios.</small>
          </label>
          <label className="validated-field">
            Teléfono
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
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
            Barrio
            <NeighborhoodInput name="neighborhood" required />
          </label>
          <label>
            Dirección exacta
            <input name="address" autoComplete="street-address" required />
          </label>
          <label htmlFor="request-category">
            Categoría
            <select
              id="request-category"
              name="category"
              value={category}
              onChange={e => setCategory(e.target.value as Category | '')}
              required
            >
              <option value="" disabled>
                Seleccione una categoría
              </option>
              {categories.slice(1).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="priority-field">
            <span className="priority-label">
              Prioridad declarada{' '}
              <button
                type="button"
                className="priority-help-button"
                aria-label="Explicación de los niveles de prioridad"
                aria-expanded={showPriorityHelp}
                aria-controls="priority-help"
                onClick={() => setShowPriorityHelp(current => !current)}
              >
                ?
              </button>
            </span>
            <select
              name="priority"
              value={priority}
              onChange={event => setPriority(event.target.value as Priority | '')}
              required
            >
              <option value="" disabled>
                Seleccione una prioridad
              </option>
              <option>Crítica</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            {showPriorityHelp &&
              createPortal(
                <div
                  className="priority-help-backdrop"
                  onMouseDown={() => setShowPriorityHelp(false)}
                >
                  <section
                    id="priority-help"
                    className="priority-help"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="priority-help-title"
                    onMouseDown={event => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="priority-help-close"
                      aria-label="Cerrar explicación de prioridades"
                      onClick={() => setShowPriorityHelp(false)}
                    >
                      ×
                    </button>
                    <h3 id="priority-help-title">¿Cómo elegir la prioridad?</h3>
                    <p>
                      <b>Baja:</b> puede esperar; no existe riesgo inmediato.
                    </p>
                    <p>
                      <b>Media:</b> necesidad importante que debe atenderse pronto.
                    </p>
                    <p>
                      <b>Alta:</b> afecta seriamente la seguridad, salud o condiciones básicas.
                    </p>
                    <p>
                      <b>Crítica:</b> existe peligro inmediato para la vida, integridad o vivienda.
                    </p>
                  </section>
                </div>,
                document.body
              )}
          </label>
          <label className="wide">
            Descripción de la ayuda
            <textarea name="description" rows={4} minLength={10} maxLength={2000} required />
            <small>Describe la necesidad con al menos 10 caracteres.</small>
          </label>
          <label className="wide upload-box">
            Fotografía de la solicitud
            <input name="photo" type="file" accept="image/*" required />
            <small>
              Obligatoria para todas las categorías. Puedes tomar una foto o escogerla de la
              galería. Evita incluir documentos o información innecesaria.
            </small>
          </label>
          <div className="wide location-box">
            <button type="button" className="secondary" onClick={locate}>
              ⌖ Usar ubicación del dispositivo
            </button>
            <span>{locationState}</span>
          </div>
          <div className="wide map-picker-help">
            <b>También puedes elegirla manualmente</b>
            <span>Toca o haz clic en el punto exacto del mapa. Puedes tocar nuevamente para corregirlo.</span>
          </div>
          <div className="wide form-map">
            <LeafletMap
              requests={location ? [{ ...initialRequests[0], location }] : []}
              onPick={pickLocation}
            />
          </div>
          <div className="form-actions wide">
            <button type="button" className="secondary" onClick={close}>
              Cancelar
            </button>
            <button className="primary">Continuar</button>
          </div>
        </form>
      </section>
      {pending && (
        <PrivacyConsentModal
          close={() => setPending(undefined)}
          confirm={() => create(pending.request, pending.photo)}
        />
      )}
    </div>
  )
}
