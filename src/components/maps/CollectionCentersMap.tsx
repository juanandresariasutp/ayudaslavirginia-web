import { useEffect, useRef } from 'react'
import type { CollectionCenter, Location } from '../../types'
import { MAP_DEFAULT_ZOOM, MAP_SELECTED_ZOOM } from '../../config/constants'
import { escapeMapText } from '../../utils/formatters'
import type { LeafletMapInstance } from './LeafletMap'

interface CollectionCentersMapProps {
  centers: CollectionCenter[]
}

function focusMarkerNearBottom(
  map: LeafletMapInstance,
  mapElement: HTMLElement,
  location: Location
) {
  const bottomMargin = Math.min(
    80,
    Math.max(48, Math.round(mapElement.clientHeight * 0.08))
  )
  const verticalOffset = Math.max(
    0,
    Math.round(mapElement.clientHeight / 2) - bottomMargin
  )
  map.setView([location.latitude, location.longitude], MAP_SELECTED_ZOOM)
  map.panBy([0, -verticalOffset], { animate: false })
}

export function CollectionCentersMap({ centers }: CollectionCentersMapProps) {
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!element.current || !window.L) return
    const mapElement = element.current
    const center = centers[0]?.location ?? { latitude: 4.895, longitude: -75.883 }
    const defaultZoom = centers.length ? MAP_DEFAULT_ZOOM : 14
    const map = window.L.map(element.current).setView(
      [center.latitude, center.longitude],
      defaultZoom
    )

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    map.on('click', () => map.setView([center.latitude, center.longitude], defaultZoom))

    centers.forEach(collectionCenter => {
      const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${collectionCenter.location.latitude},${collectionCenter.location.longitude}`
      )}`
      const phone = collectionCenter.phone
        ? `<a href="tel:${escapeMapText(collectionCenter.phone)}">☎ ${escapeMapText(
            collectionCenter.phone
          )}</a><br>`
        : ''
      const hours = collectionCenter.openingHours
        ? `<span>Horario: ${escapeMapText(collectionCenter.openingHours)}</span><br>`
        : ''
      const accepted = collectionCenter.acceptedItems
        ? `<p><strong>Recibe:</strong> ${escapeMapText(collectionCenter.acceptedItems)}</p>`
        : ''
      const address = collectionCenter.address
        ? `<p>⌖ ${escapeMapText(collectionCenter.address)}</p>`
        : ''

      window.L!
        .marker([collectionCenter.location.latitude, collectionCenter.location.longitude], {
          bubblingMouseEvents: false
        })
        .addTo(map)
        .bindPopup(
          `<div class="collection-popup"><strong>${escapeMapText(
            collectionCenter.name
          )}</strong>${address}${phone}${hours}${accepted}<a class="map-directions" href="${directions}" target="_blank" rel="noopener noreferrer">Cómo llegar</a></div>`,
          { autoPan: false }
        )
        .on('click', () => focusMarkerNearBottom(map, mapElement, collectionCenter.location))
    })

    return () => {
      map.remove()
    }
  }, [centers])

  return (
    <div ref={element} className="leaflet-map collection-centers-map">
      <div className="map-fallback">Cargando centros de acopio…</div>
    </div>
  )
}
