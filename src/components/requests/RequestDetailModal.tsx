import { useEffect, useState } from 'react'
import type { HelpRequest, ImagePreview, Session } from '../../types'
import { getEvidenceUrl, getPrivateRequest } from '../../lib/supabase'
import { requestDateTime, requestDirectionsUrl } from '../../utils/formatters'
import { mapPrivate } from '../../utils/mappers'

interface RequestDetailModalProps {
  publicRequest: HelpRequest
  session?: Session
  close: () => void
  onOpenImage: (image: ImagePreview) => void
}

export function RequestDetailModal({
  publicRequest,
  session,
  close,
  onOpenImage
}: RequestDetailModalProps) {
  const [request, setRequest] = useState<HelpRequest>(publicRequest)
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState('')
  const administrative = Boolean(session)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        let detailRequest = publicRequest
        if (session) {
          const rows = await getPrivateRequest(session, publicRequest.id)
          if (!rows[0]) throw new Error('No fue posible encontrar la solicitud.')
          detailRequest = mapPrivate(rows[0])
        }
        if (!active) return
        setRequest(detailRequest)
        setError('')
        if (detailRequest.requestPhotoName) {
          try {
            setPhotoUrl(await getEvidenceUrl(session, detailRequest.requestPhotoName))
          } catch {
            if (active) setPhotoUrl('')
          }
        } else {
          setPhotoUrl('')
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'No fue posible cargar los detalles.')
      }
    }
    load()
    return () => {
      active = false
    }
  }, [publicRequest, session])

  const photoAlt = `Fotografía de ${request.publicCode ?? 'la solicitud'}`

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal approval-detail request-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">
          {administrative ? 'DETALLE COMPLETO · ADMINISTRACIÓN' : 'DETALLE DE LA SOLICITUD'}
        </span>
        <h2 id="request-detail-title">
          {administrative ? request.publicCode ?? 'Solicitud' : 'Información de la ayuda'}
        </h2>
        {error && <p className="form-error">{error}</p>}
        {administrative && (
          <>
            <div className="detail-status">
              <span
                className={`request-status status-${request.status
                  .toLowerCase()
                  .replace(' ', '-')}`}
              >
                {request.status}
              </span>
              <b>{request.category}</b>
              <span>{request.priority}</span>
            </div>
            <section className="detail-grid">
              <div>
                <small>Nombre completo</small>
                <b>{request.fullName}</b>
              </div>
              <div>
                <small>Documento</small>
                <b>
                  {request.documentType} · {request.documentNumber}
                </b>
              </div>
              <div>
                <small>Teléfono</small>
                <a href={`tel:${request.phone}`}>{request.phone}</a>
              </div>
              <div>
                <small>Fecha y hora</small>
                <b>{requestDateTime(request.createdAt)}</b>
              </div>
              <div>
                <small>Barrio</small>
                <b>{request.neighborhood}</b>
              </div>
              <div>
                <small>Dirección exacta</small>
                <b>{request.address}</b>
              </div>
              <div className="wide">
                <small>Descripción de la ayuda</small>
                <p>{request.description}</p>
              </div>
            </section>
          </>
        )}
        {!administrative && (
          <section className="detail-grid public-request-detail">
            <div>
              <small>Barrio</small>
              <b>{request.neighborhood}</b>
            </div>
            <div>
              <small>Dirección exacta</small>
              <b>{request.address}</b>
            </div>
            <div className="wide">
              <small>Descripción de la ayuda</small>
              <p>{request.description}</p>
            </div>
          </section>
        )}
        {photoUrl && (
          <section className="detail-media single-media">
            <figure>
              <figcaption>Fotografía de la solicitud</figcaption>
              <button
                type="button"
                className="detail-photo-button"
                onClick={() => onOpenImage({ url: photoUrl, alt: photoAlt })}
              >
                <img src={photoUrl} alt={photoAlt} />
              </button>
            </figure>
          </section>
        )}
        <a
          className="map-directions detail-directions"
          href={requestDirectionsUrl(request)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Cómo llegar
        </a>
      </section>
    </div>
  )
}
