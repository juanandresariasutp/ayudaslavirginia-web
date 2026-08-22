import { useEffect, useRef } from 'react'
import type { HelpRequest, Location } from '../../types'
import { LA_VIRGINIA_CENTER, MAP_DEFAULT_ZOOM, MAP_SELECTED_ZOOM, priorityWeight } from '../../config/constants'
import { escapeMapText, priorityClass } from '../../utils/formatters'

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement) => LeafletMapInstance
      tileLayer: (
        url: string,
        options: object
      ) => { addTo: (map: LeafletMapInstance) => void }
      marker: (
        point: [number, number],
        options?: { bubblingMouseEvents?: boolean }
      ) => LeafletMarkerInstance
    }
  }
}

export interface LeafletMapInstance {
  setView: (point: [number, number], zoom: number) => LeafletMapInstance
  panBy: (offset: [number, number], options?: { animate?: boolean }) => LeafletMapInstance
  on: (
    event: string,
    handler: (event: { latlng: { lat: number; lng: number } }) => void
  ) => LeafletMapInstance
  remove: () => void
}

export interface LeafletMarkerInstance {
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance
  bindPopup: (
    content: string,
    options?: { autoPan?: boolean }
  ) => LeafletMarkerInstance
  on: (event: string, handler: () => void) => LeafletMarkerInstance
}

interface LeafletMapProps {
  requests: HelpRequest[]
  onPick?: (location: Location) => void
  onReport?: (request: HelpRequest) => void
  onDetails?: (request: HelpRequest) => void
}

function focusMarkerNearBottom(
  map: LeafletMapInstance,
  mapElement: HTMLElement,
  location: Location,
  zoomLevel: number = MAP_SELECTED_ZOOM
) {
  const mapHeight = mapElement.clientHeight || 600
  const verticalOffset = Math.min(150, Math.max(40, Math.round(mapHeight * 0.22)))
  map.setView([location.latitude, location.longitude], zoomLevel)
  map.panBy([0, -verticalOffset], { animate: false })
}

export function LeafletMap({ requests, onPick, onReport, onDetails }: LeafletMapProps) {
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!element.current || !window.L) return
    const mapElement = element.current
    const selectedLocation = requests.find(r => r.location)?.location
    const center = onPick && selectedLocation ? selectedLocation : LA_VIRGINIA_CENTER
    const initialZoom = onPick && selectedLocation ? MAP_SELECTED_ZOOM : MAP_DEFAULT_ZOOM

    const map = window.L.map(element.current).setView(
      [center.latitude, center.longitude],
      initialZoom
    )

    if (onPick && selectedLocation) focusMarkerNearBottom(map, mapElement, selectedLocation)

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    map.on('click', event => {
      if (onPick) {
        const picked = { latitude: event.latlng.lat, longitude: event.latlng.lng }
        focusMarkerNearBottom(map, mapElement, picked)
        onPick(picked)
      } else {
        map.setView([center.latitude, center.longitude], MAP_DEFAULT_ZOOM)
      }
    })

    const mapRequests = onPick
      ? requests
      : requests.filter(request => request.status !== 'Completada')

    const grouped = new Map<string, HelpRequest[]>()
    mapRequests
      .filter(r => r.location)
      .forEach(request => {
        const key = `${request.location!.latitude.toFixed(3)},${request.location!.longitude.toFixed(3)}`
        grouped.set(key, [...(grouped.get(key) ?? []), request])
      })

    grouped.forEach(unsortedGroup => {
      const group = [...unsortedGroup].sort(
        (a, b) =>
          priorityWeight[a.priority] - priorityWeight[b.priority] ||
          +new Date(b.createdAt) - +new Date(a.createdAt)
      )
      const location = group[0].location!
      const items = group
        .map(request => {
          const phone =
            request.phone && request.phone !== 'PROTEGIDO'
              ? `<a class="map-popup-phone" href="tel:${escapeMapText(
                  request.phone.replace(/\D/g, '')
                )}">☎ ${escapeMapText(request.phone)}</a>`
              : ''
          const address =
            request.address && request.address !== 'Dirección protegida'
              ? `<span class="map-popup-address">⌖ ${escapeMapText(
                  request.address
                )}</span>`
              : ''
          const report = onReport
            ? `<button type="button" class="map-report-action" data-report-request="${escapeMapText(
                request.id
              )}">Reportar solución</button>`
            : ''
          const details = onDetails
            ? `<button type="button" class="map-detail-action" data-detail-request="${escapeMapText(
                request.id
              )}">Ver detalles</button>`
            : ''
          return `<li><div class="map-popup-request-heading"><strong>${escapeMapText(
            request.category
          )}</strong><span class="map-priority map-priority-${priorityClass(
            request.priority
          )}">${escapeMapText(
            request.priority
          )}</span></div><span class="map-popup-status">${escapeMapText(
            request.status
          )}</span><p>${escapeMapText(
            request.description
          )}</p><div class="map-popup-contact">${address}${phone}</div><div class="map-popup-actions">${details}${report}</div></li>`
        })
        .join('')

      const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${location.latitude},${location.longitude}`
      )}`

      window.L!
        .marker([location.latitude, location.longitude], { bubblingMouseEvents: false })
        .addTo(map)
        .bindPopup(
          `<strong>${escapeMapText(group[0].neighborhood)}</strong><br>${
            group.length
          } solicitud(es)<ul class="map-popup-list">${items}</ul><a class="map-directions" href="${directions}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>`,
          { autoPan: false }
        )
        .on('click', () => focusMarkerNearBottom(map, mapElement, location))
    })

    const handleReport = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('[data-report-request]')
          : null
      if (!target || !onReport) return
      const request = requests.find(item => item.id === target.dataset.reportRequest)
      if (request) onReport(request)
    }

    const handleDetails = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('[data-detail-request]')
          : null
      if (!target || !onDetails) return
      const request = requests.find(item => item.id === target.dataset.detailRequest)
      if (request) onDetails(request)
    }

    mapElement.addEventListener('click', handleReport)
    mapElement.addEventListener('click', handleDetails)
    return () => {
      mapElement.removeEventListener('click', handleReport)
      mapElement.removeEventListener('click', handleDetails)
      map.remove()
    }
  }, [requests, onPick, onReport, onDetails])

  return (
    <div ref={element} className={`leaflet-map ${onPick ? 'location-picker-map' : ''}`}>
      <div className="map-fallback">Cargando mapa Leaflet…</div>
    </div>
  )
}
