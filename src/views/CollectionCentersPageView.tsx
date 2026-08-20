import type { CollectionCenter } from '../types'
import { CollectionCentersMap } from '../components/maps/CollectionCentersMap'

interface CollectionCentersPageViewProps {
  centers: CollectionCenter[]
}

export function CollectionCentersPageView({ centers }: CollectionCentersPageViewProps) {
  const activeCenters = centers.filter(center => center.active)
  return (
    <section className="collection-centers-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PUNTOS DE RECEPCIÓN</span>
          <h2>Centros de Acopio</h2>
          <p className="muted">Consulta dónde puedes entregar ayudas en La Virginia.</p>
        </div>
      </div>
      <CollectionCentersMap centers={activeCenters} />
      <div className="collection-center-grid">
        {activeCenters.map(center => (
          <article key={center.id}>
            <div className="collection-center-heading">
              <span>⌖</span>
              <div>
                <h3>{center.name}</h3>
                {center.address && <p>{center.address}</p>}
              </div>
            </div>
            {center.description && <p>{center.description}</p>}
            <dl>
              {center.openingHours && (
                <>
                  <dt>Horario</dt>
                  <dd>{center.openingHours}</dd>
                </>
              )}
              {center.acceptedItems && (
                <>
                  <dt>Elementos recibidos</dt>
                  <dd>{center.acceptedItems}</dd>
                </>
              )}
              {center.phone && (
                <>
                  <dt>Contacto</dt>
                  <dd>
                    <a href={`tel:${center.phone}`}>{center.phone}</a>
                  </dd>
                </>
              )}
            </dl>
            <a
              className="center-directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${center.location.latitude},${center.location.longitude}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar
            </a>
          </article>
        ))}
        {!activeCenters.length && (
          <div className="empty">Todavía no hay centros de acopio publicados.</div>
        )}
      </div>
    </section>
  )
}
