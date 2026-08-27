import type { HelpRequest, ImagePreview } from '../../types'
import { displayRequestCode, requestDateTime } from '../../utils/formatters'

interface RequestCardProps {
  request: HelpRequest
  onChange: (request: HelpRequest) => void
  onDetails?: (request: HelpRequest) => void
  completedMedia?: { requestUrl?: string; solutionUrl?: string }
  onOpenImage: (image: ImagePreview) => void
}

export function RequestCard({
  request,
  onChange,
  onDetails,
  completedMedia,
  onOpenImage
}: RequestCardProps) {
  return (
    <article className="ticket-card">
      <div className="ticket-top">
        <span className={`tag urgency-${request.priority.toLowerCase().replace('í', 'i')}`}>
          {request.priority}
        </span>
        <span className="ticket-id">{displayRequestCode(request)}</span>
      </div>
      <div className="card-category">{request.category}</div>
      <h3>{request.neighborhood}</h3>
      <p>{request.description}</p>
      {request.status !== 'Completada' &&
        request.phone !== 'PROTEGIDO' &&
        request.address !== 'Dirección protegida' && (
          <div className="ticket-contact">
            <span>⌖ {request.address}</span>
            <a href={`tel:${request.phone}`}>☎ {request.phone}</a>
          </div>
        )}
      {request.donatedBy && (
        <div className="donated-by-badge" title={`Ayuda donada por: ${request.donatedBy}`}>
          🎁 Donado por: <strong>{request.donatedBy}</strong>
        </div>
      )}
      {request.status === 'Completada' && (
        <div className="completion-photos" aria-label="Evidencias de solicitud completada">
          <figure>
            <figcaption>Solicitud</figcaption>
            {completedMedia?.requestUrl ? (
              <button
                type="button"
                onClick={() =>
                  onOpenImage({
                    url: completedMedia.requestUrl!,
                    alt: `Estado inicial de ${displayRequestCode(request)}`
                  })
                }
                aria-label="Ampliar fotografía de la solicitud"
              >
                <img
                  src={completedMedia.requestUrl}
                  alt={`Estado inicial de ${displayRequestCode(request)}`}
                  loading="lazy"
                />
              </button>
            ) : (
              <span>Sin foto inicial</span>
            )}
          </figure>
          <figure>
            <figcaption>Solución</figcaption>
            {completedMedia?.solutionUrl ? (
              <button
                type="button"
                onClick={() =>
                  onOpenImage({
                    url: completedMedia.solutionUrl!,
                    alt: `Solución de ${displayRequestCode(request)}`
                  })
                }
                aria-label="Ampliar fotografía de la solución"
              >
                <img
                  src={completedMedia.solutionUrl}
                  alt={`Solución de ${displayRequestCode(request)}`}
                  loading="lazy"
                />
              </button>
            ) : (
              <span>Sin foto disponible</span>
            )}
          </figure>
        </div>
      )}
      <div className="ticket-bottom">
        <time dateTime={request.createdAt}>{requestDateTime(request.createdAt)}</time>
        <span
          className={`request-status status-${request.status
            .toLowerCase()
            .replace(' ', '-')}`}
        >
          {request.status}
        </span>
      </div>
      {onDetails && (
        <button
          className="card-details"
          onClick={() => onDetails(request)}
          aria-label={`Ver todos los detalles de ${displayRequestCode(request)}`}
        >
          ◉ Ver detalles
        </button>
      )}
      {request.status !== 'Completada' && (
        <button className="card-action" onClick={() => onChange(request)}>
          Reportar solución
        </button>
      )}
    </article>
  )
}
