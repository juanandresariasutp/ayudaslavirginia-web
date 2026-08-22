import type { Category, HelpRequest, Priority } from '../types'
import { categories, priorities } from '../config/constants'
import { LeafletMap } from '../components/maps/LeafletMap'

interface MapViewProps {
  mapRequests: HelpRequest[]
  mapCategory: 'Todas' | Category
  mapPriority: 'Todas' | Priority
  setMapCategory: (val: 'Todas' | Category) => void
  setMapPriority: (val: 'Todas' | Priority) => void
  setChangeFor: (req: HelpRequest) => void
  setDetailFor: (req: HelpRequest) => void
}

export function MapView({
  mapRequests,
  mapCategory,
  mapPriority,
  setMapCategory,
  setMapPriority,
  setChangeFor,
  setDetailFor
}: MapViewProps) {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">UBICACIONES APROXIMADAS</span>
          <h2>Mapa de solicitudes</h2>
        </div>
      </div>

      <section className="dashboard-filters map-filters" aria-label="Filtros del mapa">
        <label>
          Categoría
          <select
            value={mapCategory}
            onChange={event => setMapCategory(event.target.value as typeof mapCategory)}
          >
            {categories.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select
            value={mapPriority}
            onChange={event => setMapPriority(event.target.value as typeof mapPriority)}
          >
            {priorities.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="result-count">
        {mapRequests.filter(request => request.status !== 'Completada' && request.location).length}{' '}
        solicitudes visibles en el mapa
      </div>

      <LeafletMap requests={mapRequests} onReport={setChangeFor} onDetails={setDetailFor} />
    </>
  )
}
