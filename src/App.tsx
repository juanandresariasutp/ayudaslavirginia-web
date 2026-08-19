import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { initialAdmins, initialChanges, initialRequests } from './data'
import type { AdminUser, Category, ChangeRequest, CollectionCenter, DocumentType, HelpRequest, Location, Priority, Status } from './types'
import { createAdmin, createCollectionCenter, deleteAdmin, deleteChange, deleteCollectionCenter, deleteRequest, getAdminProfile, getChanges, getCollectionCenters, getCompletedRequestMedia, getEvidenceUrl, getPrivateRequest, getPublicRequests, insertChange, insertRequest, listAdmins, login, logout, reviewChange, savedSession, supabaseConfigured, updateAdmin, updateCollectionCenter, updateRequest, uploadEvidence } from './lib/supabase'
import type { Session } from './lib/supabase'

type View = 'dashboard' | 'mapa' | 'acopios' | 'informacion' | 'admin'
type Sort = 'priority' | 'recent' | 'oldest'
const PAGE_SIZE = 25
const categories: Array<'Todas' | Category> = ['Todas', 'Alimentos', 'Escombros', 'Mudanza y acarreo', 'Implementos de aseo', 'Juguetes', 'Salud', 'Alojamiento', 'Ropa', 'Reconstrucción', 'Otros']
const photoRequiredCategories: Category[] = ['Escombros', 'Mudanza y acarreo', 'Reconstrucción']
const categoryRequiresPhoto = (category: Category) => photoRequiredCategories.includes(category)
const statuses: Array<'Activas' | Status> = ['Activas', 'Sin atender', 'En progreso', 'Completada']
const priorities: Array<'Todas' | Priority> = ['Todas', 'Crítica', 'Alta', 'Media', 'Baja']
const priorityWeight: Record<Priority, number> = { Crítica: 0, Alta: 1, Media: 2, Baja: 3 }
const categoryToDb: Record<Category, string> = { Alimentos: 'food', Escombros: 'debris', 'Mudanza y acarreo': 'moving', 'Implementos de aseo': 'cleaning_supplies', Juguetes: 'toys', Salud: 'health', Alojamiento: 'shelter', Ropa: 'clothing', Reconstrucción: 'reconstruction', Otros: 'other' }
const dbToCategory: Record<string, Category> = Object.fromEntries(Object.entries(categoryToDb).map(([key, value]) => [value, key])) as Record<string, Category>
const priorityToDb: Record<Priority, string> = { Crítica: 'critical', Alta: 'high', Media: 'medium', Baja: 'low' }
const dbToPriority: Record<string, Priority> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }
const dbToStatus: Record<string, Status> = { pending: 'Sin atender', in_progress: 'En progreso', completed: 'Completada' }
const MAP_DEFAULT_ZOOM = 15
const MAP_SELECTED_ZOOM = 17

function mapPublic(row: Record<string, unknown>): HelpRequest {
  return { id: String(row.id), publicCode: String(row.public_code ?? row.id), fullName: 'Dato protegido', documentType: 'Cédula de ciudadanía', documentNumber: 'PROTEGIDO', phone: row.contact_phone ? String(row.contact_phone) : 'PROTEGIDO', neighborhood: String(row.neighborhood), address: row.contact_address ? String(row.contact_address) : 'Dirección protegida', description: String(row.description), category: dbToCategory[String(row.category)] ?? 'Otros', status: dbToStatus[String(row.status)] ?? 'Sin atender', priority: dbToPriority[String(row.priority)] ?? 'Media', createdAt: String(row.created_at), location: row.public_latitude == null ? undefined : { latitude: Number(row.public_latitude), longitude: Number(row.public_longitude) }, requestPhotoName: row.request_photo_path ? String(row.request_photo_path) : undefined }
}

function mapPrivate(row: Record<string, unknown>): HelpRequest {
  return { id: String(row.id), publicCode: String(row.public_code ?? row.id), fullName: String(row.full_name), documentType: String(row.document_type) as DocumentType, documentNumber: String(row.document_number), phone: String(row.phone), neighborhood: String(row.neighborhood), address: String(row.exact_address), description: String(row.description), category: dbToCategory[String(row.category)] ?? 'Otros', status: dbToStatus[String(row.status)] ?? 'Sin atender', priority: dbToPriority[String(row.verified_priority ?? row.declared_priority)] ?? 'Media', createdAt: String(row.created_at), location: row.exact_latitude == null ? undefined : { latitude: Number(row.exact_latitude), longitude: Number(row.exact_longitude) }, requestPhotoName: row.request_photo_path ? String(row.request_photo_path) : undefined }
}

function mapCollectionCenter(row: Record<string, unknown>): CollectionCenter {
  return { id: String(row.id), name: String(row.name), address: String(row.address), description: String(row.description ?? ''), phone: row.phone ? String(row.phone) : undefined, openingHours: String(row.opening_hours ?? ''), acceptedItems: String(row.accepted_items ?? ''), location: { latitude: Number(row.latitude), longitude: Number(row.longitude) }, active: Boolean(row.active) }
}

function mapChange(row: Record<string, unknown>): ChangeRequest {
  const reviewer = row.reviewer && typeof row.reviewer === 'object' ? row.reviewer as Record<string, unknown> : undefined
  return { id: String(row.id), requestId: String(row.help_request_id), requestedStatus: String(row.target_status) === 'in_progress' ? 'En progreso' : 'Completada', requestedBy: String(row.responsible_name), responsiblePhone: String(row.responsible_phone ?? ''), notes: String(row.notes ?? ''), evidencePhotoName: String(row.evidence_photo_path ?? ''), signature: String(row.signature_data ?? ''), requestDetails: row.help_requests && typeof row.help_requests === 'object' ? mapPrivate(row.help_requests as Record<string, unknown>) : undefined, createdAt: String(row.created_at), state: String(row.state) === 'approved' ? 'Aprobado' : String(row.state) === 'rejected' ? 'Rechazado' : 'Pendiente', reviewedByName: reviewer?.full_name ? String(reviewer.full_name) : undefined, reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined }
}

declare global {
  interface Window { L?: { map: (element: HTMLElement) => LeafletMap; tileLayer: (url: string, options: object) => { addTo: (map: LeafletMap) => void }; marker: (point: [number, number], options?: { bubblingMouseEvents?: boolean }) => LeafletMarker } }
}
interface LeafletMap { setView: (point: [number, number], zoom: number) => LeafletMap; panBy: (offset: [number, number], options?: { animate?: boolean }) => LeafletMap; on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => LeafletMap; remove: () => void }
interface LeafletMarker { addTo: (map: LeafletMap) => LeafletMarker; bindPopup: (content: string, options?: { autoPan?: boolean }) => LeafletMarker; on: (event: string, handler: () => void) => LeafletMarker }

function LogoMark({ className = '' }: { className?: string }) {
  return <span className={`brand-mark ${className}`.trim()} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.02 6.02 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.51L12 21.35Z" /></svg></span>
}

function Header({ menuOpen, toggleMenu }: { menuOpen: boolean; toggleMenu: () => void }) {
  return <header className="page-header"><div className="brand-line"><LogoMark /><div><h1>Ayudas La Virginia</h1><p>Juntos nos levantamos</p></div></div><button className="menu-toggle" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="main-sidebar" onClick={toggleMenu}><span></span><span></span><span></span></button></header>
}

function requestDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(value))
}

function requestCalendarDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function displayRequestCode(request: HelpRequest) {
  return request.publicCode?.startsWith('solicitud_') ? request.publicCode : 'solicitud_pendiente'
}

function requestCodeNumber(request: HelpRequest) {
  const match = displayRequestCode(request).match(/(\d+)$/)
  return match ? String(Number(match[1])) : ''
}

function requestDirectionsUrl(request: HelpRequest) {
  const destination = request.location
    ? `${request.location.latitude},${request.location.longitude}`
    : `${request.address}, ${request.neighborhood}, La Virginia, Risaralda`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function requestSubmissionError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('help_requests_description_check')) return 'La descripción debe tener entre 10 y 2000 caracteres.'
  if (message.includes('help_requests_new_consent_proof_required')) return 'Debes aceptar el tratamiento de datos y confirmar que eres una persona.'
  if (message.includes('help_requests_public_contact_consent_required')) return 'Debes autorizar la publicación del teléfono y la dirección exacta.'
  if (message.includes('help_requests_request_photo_required')) return 'Debes adjuntar una fotografía de la solicitud.'
  if (message.includes('help_requests_full_name_check')) return 'El nombre completo debe tener entre 3 y 120 caracteres.'
  return 'No fue posible enviar la solicitud. Revisa los campos e inténtalo nuevamente.'
}

function normalizePersonName(value: string) {
  return value.toLocaleLowerCase('es-CO').replace(/(^|[\s'-])\p{L}/gu, letter => letter.toLocaleUpperCase('es-CO'))
}

function formatName(event: React.FormEvent<HTMLInputElement>) {
  event.currentTarget.value = normalizePersonName(event.currentTarget.value.replace(/[^\p{L}\p{M}\s'-]/gu, ''))
}

function digitsOnly(event: React.FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '')
}

function PasswordInput({ name = 'password', autoComplete, placeholder, required = false, minLength }: { name?: string; autoComplete?: string; placeholder?: string; required?: boolean; minLength?: number }) {
  const [visible, setVisible] = useState(false)
  return <div className="password-field"><input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} required={required} minLength={minLength} /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? '◉' : '◉̸'}</button></div>
}

function RequestCard({ request, onChange, onDetails, completedMedia, onOpenImage }: { request: HelpRequest; onChange: (request: HelpRequest) => void; onDetails?: (request: HelpRequest) => void; completedMedia?: { requestUrl?: string; solutionUrl?: string }; onOpenImage: (image: { url: string; alt: string }) => void }) {
  return <article className="ticket-card"><div className="ticket-top"><span className={`tag urgency-${request.priority.toLowerCase().replace('í', 'i')}`}>{request.priority}</span><span className="ticket-id">{displayRequestCode(request)}</span></div><div className="card-category">{request.category}</div><h3>{request.neighborhood}</h3><p>{request.description}</p>{request.status !== 'Completada' && request.phone !== 'PROTEGIDO' && request.address !== 'Dirección protegida' && <div className="ticket-contact"><span>⌖ {request.address}</span><a href={`tel:${request.phone}`}>☎ {request.phone}</a></div>}{request.status === 'Completada' && <div className="completion-photos" aria-label="Evidencias de solicitud completada"><figure><figcaption>Solicitud</figcaption>{completedMedia?.requestUrl ? <button type="button" onClick={() => onOpenImage({ url: completedMedia.requestUrl!, alt: `Estado inicial de ${displayRequestCode(request)}` })} aria-label="Ampliar fotografía de la solicitud"><img src={completedMedia.requestUrl} alt={`Estado inicial de ${displayRequestCode(request)}`} loading="lazy" /></button> : <span>Sin foto inicial</span>}</figure><figure><figcaption>Solución</figcaption>{completedMedia?.solutionUrl ? <button type="button" onClick={() => onOpenImage({ url: completedMedia.solutionUrl!, alt: `Solución de ${displayRequestCode(request)}` })} aria-label="Ampliar fotografía de la solución"><img src={completedMedia.solutionUrl} alt={`Solución de ${displayRequestCode(request)}`} loading="lazy" /></button> : <span>Sin foto disponible</span>}</figure></div>}<div className="ticket-bottom"><time dateTime={request.createdAt}>{requestDateTime(request.createdAt)}</time><span className={`request-status status-${request.status.toLowerCase().replace(' ', '-')}`}>{request.status}</span></div>{onDetails && <button className="card-details" onClick={() => onDetails(request)} aria-label={`Ver todos los detalles de ${displayRequestCode(request)}`}>◉ Ver detalles</button>}{request.status !== 'Completada' && <button className="card-action" onClick={() => onChange(request)}>Reportar solución</button>}</article>
}

function ImageModal({ image, close }: { image: { url: string; alt: string }; close: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [close])
  return <div className="image-modal-backdrop" role="presentation" onMouseDown={close}><section className="image-modal" role="dialog" aria-modal="true" aria-label="Vista ampliada de fotografía" onMouseDown={event => event.stopPropagation()}><button className="image-modal-close" aria-label="Cerrar imagen" onClick={close}>×</button><img src={image.url} alt={image.alt} /><p>{image.alt}</p></section></div>
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

function priorityClass(priority: Priority) {
  return priority.toLowerCase().replace('í', 'i')
}

function focusMarkerNearBottom(map: LeafletMap, mapElement: HTMLElement, location: Location) {
  const bottomMargin = Math.min(80, Math.max(48, Math.round(mapElement.clientHeight * 0.08)))
  const verticalOffset = Math.max(0, Math.round(mapElement.clientHeight / 2) - bottomMargin)
  map.setView([location.latitude, location.longitude], MAP_SELECTED_ZOOM)
  map.panBy([0, -verticalOffset], { animate: false })
}

function LeafletMap({ requests, onPick, onReport }: { requests: HelpRequest[]; onPick?: (location: Location) => void; onReport?: (request: HelpRequest) => void }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!element.current || !window.L) return
    const mapElement = element.current
    const fallbackCenter = { latitude: 4.895, longitude: -75.883 }
    const selectedLocation = requests.find(r => r.location)?.location
    const center = selectedLocation ?? fallbackCenter
    const initialZoom = onPick && selectedLocation ? MAP_SELECTED_ZOOM : MAP_DEFAULT_ZOOM
    const map = window.L.map(element.current).setView([center.latitude, center.longitude], initialZoom)
    if (onPick && selectedLocation) focusMarkerNearBottom(map, mapElement, selectedLocation)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
    map.on('click', event => {
      if (onPick) {
        const picked = { latitude: event.latlng.lat, longitude: event.latlng.lng }
        focusMarkerNearBottom(map, mapElement, picked)
        onPick(picked)
      } else {
        map.setView([center.latitude, center.longitude], MAP_DEFAULT_ZOOM)
      }
    })
    const mapRequests = onPick ? requests : requests.filter(request => request.status !== 'Completada')
    const grouped = new Map<string, HelpRequest[]>(); mapRequests.filter(r => r.location).forEach(request => { const key = `${request.location!.latitude.toFixed(3)},${request.location!.longitude.toFixed(3)}`; grouped.set(key, [...(grouped.get(key) ?? []), request]) })
    grouped.forEach(unsortedGroup => {
      const group = [...unsortedGroup].sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || +new Date(b.createdAt) - +new Date(a.createdAt))
      const location = group[0].location!
      const items = group.map(request => {
        const phone = request.phone && request.phone !== 'PROTEGIDO' ? `<a class="map-popup-phone" href="tel:${escapeMapText(request.phone.replace(/\D/g, ''))}">☎ ${escapeMapText(request.phone)}</a>` : ''
        const address = request.address && request.address !== 'Dirección protegida' ? `<span class="map-popup-address">⌖ ${escapeMapText(request.address)}</span>` : ''
        const report = onReport ? `<button type="button" class="map-report-action" data-report-request="${escapeMapText(request.id)}">Reportar solución</button>` : ''
        return `<li><div class="map-popup-request-heading"><strong>${escapeMapText(request.category)}</strong><span class="map-priority map-priority-${priorityClass(request.priority)}">${escapeMapText(request.priority)}</span></div><span class="map-popup-status">${escapeMapText(request.status)}</span><p>${escapeMapText(request.description)}</p><div class="map-popup-contact">${address}${phone}</div>${report}</li>`
      }).join('')
      const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`
      window.L!.marker([location.latitude, location.longitude], { bubblingMouseEvents: false }).addTo(map).bindPopup(`<strong>${escapeMapText(group[0].neighborhood)}</strong><br>${group.length} solicitud(es)<ul class="map-popup-list">${items}</ul><a class="map-directions" href="${directions}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>`, { autoPan: false }).on('click', () => focusMarkerNearBottom(map, mapElement, location))
    })
    const handleReport = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-report-request]') : null
      if (!target || !onReport) return
      const request = requests.find(item => item.id === target.dataset.reportRequest)
      if (request) onReport(request)
    }
    mapElement.addEventListener('click', handleReport)
    return () => { mapElement.removeEventListener('click', handleReport); map.remove() }
  }, [requests, onPick, onReport])
  return <div ref={element} className={`leaflet-map ${onPick ? 'location-picker-map' : ''}`}><div className="map-fallback">Cargando mapa Leaflet…</div></div>
}

function CollectionCentersMap({ centers }: { centers: CollectionCenter[] }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!element.current || !window.L) return
    const mapElement = element.current
    const center = centers[0]?.location ?? { latitude: 4.895, longitude: -75.883 }
    const defaultZoom = centers.length ? MAP_DEFAULT_ZOOM : 14
    const map = window.L.map(element.current).setView([center.latitude, center.longitude], defaultZoom)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
    map.on('click', () => map.setView([center.latitude, center.longitude], defaultZoom))
    centers.forEach(collectionCenter => {
      const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${collectionCenter.location.latitude},${collectionCenter.location.longitude}`)}`
      const phone = collectionCenter.phone ? `<a href="tel:${escapeMapText(collectionCenter.phone)}">☎ ${escapeMapText(collectionCenter.phone)}</a><br>` : ''
      const hours = collectionCenter.openingHours ? `<span>Horario: ${escapeMapText(collectionCenter.openingHours)}</span><br>` : ''
      const accepted = collectionCenter.acceptedItems ? `<p><strong>Recibe:</strong> ${escapeMapText(collectionCenter.acceptedItems)}</p>` : ''
      const address = collectionCenter.address ? `<p>⌖ ${escapeMapText(collectionCenter.address)}</p>` : ''
      window.L!.marker([collectionCenter.location.latitude, collectionCenter.location.longitude], { bubblingMouseEvents: false }).addTo(map).bindPopup(`<div class="collection-popup"><strong>${escapeMapText(collectionCenter.name)}</strong>${address}${phone}${hours}${accepted}<a class="map-directions" href="${directions}" target="_blank" rel="noopener noreferrer">Cómo llegar</a></div>`, { autoPan: false }).on('click', () => focusMarkerNearBottom(map, mapElement, collectionCenter.location))
    })
    return () => map.remove()
  }, [centers])
  return <div ref={element} className="leaflet-map collection-centers-map"><div className="map-fallback">Cargando centros de acopio…</div></div>
}

function CollectionCentersView({ centers }: { centers: CollectionCenter[] }) {
  const activeCenters = centers.filter(center => center.active)
  return <section className="collection-centers-page"><div className="section-heading"><div><span className="eyebrow">PUNTOS DE RECEPCIÓN</span><h2>Centros de Acopio</h2><p className="muted">Consulta dónde puedes entregar ayudas en La Virginia.</p></div></div><CollectionCentersMap centers={activeCenters} /><div className="collection-center-grid">{activeCenters.map(center => <article key={center.id}><div className="collection-center-heading"><span>⌖</span><div><h3>{center.name}</h3>{center.address && <p>{center.address}</p>}</div></div>{center.description && <p>{center.description}</p>}<dl>{center.openingHours && <><dt>Horario</dt><dd>{center.openingHours}</dd></>}{center.acceptedItems && <><dt>Elementos recibidos</dt><dd>{center.acceptedItems}</dd></>}{center.phone && <><dt>Contacto</dt><dd><a href={`tel:${center.phone}`}>{center.phone}</a></dd></>}</dl><a className="center-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${center.location.latitude},${center.location.longitude}`)}`} target="_blank" rel="noopener noreferrer">Cómo llegar</a></article>)}{!activeCenters.length && <div className="empty">Todavía no hay centros de acopio publicados.</div>}</div></section>
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  type SignaturePoint = { x: number; y: number }
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<SignaturePoint[][]>([])
  const activeStroke = useRef<SignaturePoint[] | null>(null)

  function coordinates(event: React.PointerEvent<HTMLCanvasElement>): SignaturePoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.round((event.clientX - rect.left) * 560 / rect.width), y: Math.round((event.clientY - rect.top) * 180 / rect.height) }
  }
  function context() {
    const drawingContext = canvas.current?.getContext('2d')
    if (drawingContext) { drawingContext.strokeStyle = '#17352b'; drawingContext.fillStyle = '#17352b'; drawingContext.lineWidth = 3; drawingContext.lineCap = 'round'; drawingContext.lineJoin = 'round' }
    return drawingContext
  }
  function compactSvg() {
    const lines = strokes.current.filter(stroke => stroke.length).map(stroke => {
      const points = stroke.length === 1 ? `${stroke[0].x},${stroke[0].y} ${stroke[0].x + 1},${stroke[0].y}` : stroke.map(point => `${point.x},${point.y}`).join(' ')
      return `<polyline points="${points}"/>`
    }).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 180"><g fill="none" stroke="#17352b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${lines}</g></svg>`
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    const point = coordinates(event)
    const stroke = [point]
    strokes.current.push(stroke)
    activeStroke.current = stroke
    const drawingContext = context()
    drawingContext?.beginPath(); drawingContext?.arc(point.x, point.y, 1.5, 0, Math.PI * 2); drawingContext?.fill()
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Safari puede no admitirlo; el trazo sigue siendo válido. */ }
    onChange(compactSvg())
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current
    if (!stroke) return
    event.preventDefault()
    const next = coordinates(event); const previous = stroke[stroke.length - 1]
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 3) return
    stroke.push(next)
    const drawingContext = context()
    if (drawingContext) { drawingContext.beginPath(); drawingContext.moveTo(previous.x, previous.y); drawingContext.lineTo(next.x, next.y); drawingContext.stroke() }
    onChange(compactSvg())
  }
  function end(event: React.PointerEvent<HTMLCanvasElement>) { if (!activeStroke.current) return; event.preventDefault(); activeStroke.current = null; onChange(compactSvg()) }
  function clear() { strokes.current = []; activeStroke.current = null; context()?.clearRect(0, 0, 560, 180); onChange('') }

  return <div className="signature"><canvas ref={canvas} width="560" height="180" aria-label="Área para firma digital" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} /><div className="signature-help"><button type="button" className="text-button" onClick={clear}>Limpiar firma</button></div></div>
}

function PrivacyConsentModal({ close, confirm }: { close: () => void; confirm: () => Promise<void> }) {
  const [dataConsent, setDataConsent] = useState(false)
  const [humanConfirmed, setHumanConfirmed] = useState(false)
  const [publicContactConsent, setPublicContactConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  async function accept() { setBusy(true); try { await confirm() } finally { setBusy(false) } }
  return <div className="modal-backdrop privacy-consent-backdrop" onMouseDown={close}><section className="modal privacy-consent-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">AUTORIZACIÓN PREVIA, EXPRESA E INFORMADA</span><h2 id="privacy-title">Tratamiento de datos personales</h2><div className="privacy-copy"><p>En cumplimiento de la Ley 1581 de 2012 y sus normas reglamentarias, autorizo de manera libre, previa, expresa e informada a <b>Ayudas La Virginia</b>, como responsable del tratamiento, para recolectar, almacenar, consultar, actualizar, usar, circular de forma restringida y suprimir mis datos personales con las condiciones indicadas en este aviso.</p><section><h3>Datos tratados</h3><p>Nombre, tipo y número de documento, teléfono, barrio, dirección, descripción de la necesidad, categoría, prioridad, ubicación exacta cuando sea compartida, fotografías, evidencias y firmas vinculadas con la solicitud.</p></section><section><h3>Finalidades</h3><ul><li>Registrar, clasificar, priorizar y gestionar la solicitud de ayuda.</li><li>Contactar al solicitante y coordinar la atención.</li><li>Ubicar el lugar de atención y relacionar solicitudes cercanas.</li><li>Verificar evidencias, firmas y cambios de estado.</li><li>Prevenir fraude, automatizaciones y uso indebido.</li><li>Conservar trazabilidad, seguridad y auditoría del servicio.</li><li>Cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li></ul></section><section><h3>Acceso y circulación</h3><p>El número de documento y la firma seguirán restringidos a administradores autorizados y proveedores indispensables. Para facilitar la coordinación y demostrar la necesidad, el teléfono, la dirección exacta y la fotografía inicial se mostrarán públicamente en los detalles de la solicitud después de otorgar la autorización específica que aparece al final. Cuando la ayuda se complete, también podrá publicarse la fotografía de la solución como evidencia del resultado. No deben adjuntarse imágenes de documentos de identidad, menores de edad ni información ajena a la necesidad reportada.</p></section><section><h3>Conservación</h3><p>La información se conservará durante el tiempo necesario para gestionar la ayuda, atender obligaciones legales, resolver reclamaciones y mantener la trazabilidad. Después deberá eliminarse o anonimizarse cuando ya no sea necesaria y no exista un deber legal o contractual de conservación.</p></section><section><h3>Derechos del titular</h3><p>Puedo conocer, actualizar y rectificar mis datos; solicitar prueba de esta autorización; ser informado sobre su uso; presentar consultas o reclamos; revocar la autorización o solicitar la supresión cuando proceda; y acudir ante la Superintendencia de Industria y Comercio después de agotar el trámite ante el responsable. Para ejercer estos derechos puedo escribir a <a href="mailto:ayudaslavirginia@gmail.com">ayudaslavirginia@gmail.com</a>, identificando la solicitud y el derecho que deseo ejercer.</p></section><p className="privacy-note">La fotografía y la ubicación deben limitarse a lo necesario para gestionar la ayuda. La autorización puede consultarse posteriormente como evidencia del consentimiento otorgado.</p></div><div className="privacy-checks"><label className="consent"><input type="checkbox" required checked={dataConsent} onChange={event => setDataConsent(event.target.checked)} /> <span>He leído este aviso y autorizo expresamente el tratamiento de mis datos personales para las finalidades descritas.</span></label><label className="consent bot-check"><input type="checkbox" required checked={humanConfirmed} onChange={event => setHumanConfirmed(event.target.checked)} /> <span>Confirmo que soy una persona y que la información suministrada es auténtica.</span></label><label className="consent public-contact-check"><input type="checkbox" required checked={publicContactConsent} onChange={event => setPublicContactConsent(event.target.checked)} /> <span>Autorizo expresamente que mi número de contacto, dirección exacta y fotografía de la solicitud se publiquen para que cualquier visitante pueda comprender la necesidad, comunicarse conmigo o llegar al lugar.</span></label></div><div className="detail-actions"><button className="secondary" disabled={busy} onClick={close}>Volver</button><button className="primary" disabled={!dataConsent || !humanConfirmed || !publicContactConsent || busy} onClick={accept}>{busy ? 'Enviando…' : 'Autorizar y enviar solicitud'}</button></div></section></div>
}

function RequestForm({ close, create }: { close: () => void; create: (request: HelpRequest, photo?: File) => Promise<void> }) {
  const [category, setCategory] = useState<Category | ''>('')
  const [location, setLocation] = useState<Location>()
  const [locationState, setLocationState] = useState('Debes obtener o seleccionar una ubicación para continuar.')
  const [pending, setPending] = useState<{ request: HelpRequest; photo?: File }>()
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('.request-modal input[name="photo"]')
    if (!input) return
    input.required = Boolean(category && categoryRequiresPhoto(category))
    const help = input.parentElement?.querySelector('small')
    if (help) help.textContent = category ? `${categoryRequiresPhoto(category) ? 'Obligatoria' : 'Opcional'} para ${category}. Puedes tomar una foto o escogerla de la galería. Evita incluir documentos o información innecesaria.` : 'Selecciona primero una categoría para conocer si la fotografía es obligatoria.'
  }, [category])
  function locate() {
    if (!navigator.geolocation) return setLocationState('Este dispositivo no admite ubicación')
    setLocationState('Solicitando permiso…')
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocation({ latitude: coords.latitude, longitude: coords.longitude }); setLocationState('Ubicación guardada para enviar') }, () => setLocationState('No fue posible obtener la ubicación'), { enableHighAccuracy: true, timeout: 10000 })
  }
  function pickLocation(nextLocation: Location) {
    setLocation(nextLocation)
    setLocationState(`Ubicación manual guardada: ${nextLocation.latitude.toFixed(6)}, ${nextLocation.longitude.toFixed(6)}`)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const photo = form.get('photo') as File
    const description = String(form.get('description')).trim()
    if (!category) { alert('Selecciona una categoría para continuar.'); return }
    if (description.length < 10) { alert('La descripción debe tener al menos 10 caracteres.'); return }
    const selectedPhoto = photo instanceof File && photo.size ? photo : undefined
    if (categoryRequiresPhoto(category) && !selectedPhoto) { alert(`Debes adjuntar una fotografía para la categoría ${category}.`); return }
    if (!location) { setLocationState('La ubicación es obligatoria. Usa tu dispositivo o selecciona un punto en el mapa.'); return }
    setPending({ request: { id: `LVR-2026-${String(Date.now()).slice(-6)}`, fullName: String(form.get('fullName')), documentType: String(form.get('documentType')) as DocumentType, documentNumber: String(form.get('documentNumber')), phone: String(form.get('phone')), neighborhood: String(form.get('neighborhood')), address: String(form.get('address')), description, category, status: 'Sin atender', priority: String(form.get('priority')) as Priority, createdAt: new Date().toISOString(), location, requestPhotoName: selectedPhoto?.name }, photo: selectedPhoto })
  }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal request-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">SOLICITUD SIN CUENTA</span><h2>Solicitar ayuda</h2><p>Tus datos personales serán privados. En el tablero solo aparecerán el barrio, categoría y estado.</p><form onSubmit={submit}><label className="validated-field">Nombre completo<input name="fullName" autoComplete="name" onInput={formatName} minLength={3} maxLength={120} pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}" title="Usa solo letras. Cada palabra se formatea automáticamente." required /><small>Solo letras; cada palabra inicia en mayúscula.</small></label><label>Tipo de documento<select name="documentType" required><option>Cédula de ciudadanía</option><option>Cédula de extranjería</option><option>Pasaporte</option><option>Permiso por protección temporal</option></select></label><label className="validated-field">Número de documento<input name="documentNumber" inputMode="numeric" onInput={digitsOnly} minLength={5} maxLength={20} pattern="[0-9]{5,20}" title="Ingresa entre 5 y 20 números, sin puntos ni espacios." required /><small>Entre 5 y 20 números, sin puntos ni espacios.</small></label><label className="validated-field">Teléfono<input name="phone" type="tel" autoComplete="tel" inputMode="numeric" onInput={digitsOnly} minLength={10} maxLength={10} pattern="3[0-9]{9}" title="Debe comenzar por 3 y contener exactamente 10 números." required /><small>10 números y debe comenzar por 3.</small></label><label>Barrio<input name="neighborhood" required /></label><label>Dirección exacta<input name="address" autoComplete="street-address" required /></label><label htmlFor="request-category">Categoría<select id="request-category" name="category" value={category} onChange={e => setCategory(e.target.value as Category | '')} required><option value="" disabled>Seleccione una categoría</option>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label><label>Prioridad declarada<select name="priority" defaultValue="Media"><option>Crítica</option><option>Alta</option><option>Media</option><option>Baja</option></select></label><label className="wide">Descripción de la ayuda<textarea name="description" rows={4} minLength={10} maxLength={2000} required /><small>Describe la necesidad con al menos 10 caracteres.</small></label><label className="wide upload-box">Fotografía de la solicitud<input name="photo" type="file" accept="image/*" required /><small>Obligatoria para todas las categorías. Puedes tomar una foto o escogerla de la galería. Evita incluir documentos o información innecesaria.</small></label><div className="wide location-box"><button type="button" className="secondary" onClick={locate}>⌖ Usar ubicación del dispositivo</button><span>{locationState}</span></div><div className="wide map-picker-help"><b>También puedes elegirla manualmente</b><span>Toca o haz clic en el punto exacto del mapa. Puedes tocar nuevamente para corregirlo.</span></div><div className="wide form-map"><LeafletMap requests={location ? [{ ...initialRequests[0], location }] : []} onPick={pickLocation} /></div><div className="form-actions wide"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary">Continuar</button></div></form></section>{pending && <PrivacyConsentModal close={() => setPending(undefined)} confirm={() => create(pending.request, pending.photo)} />}</div>
}

function StatusChangeForm({ request, close, sent }: { request: HelpRequest; close: () => void; sent: () => void }) {
  const longTask = request.category === 'Escombros' || request.category === 'Mudanza y acarreo' || request.category === 'Reconstrucción'
  const [target, setTarget] = useState<'En progreso' | 'Completada'>(longTask ? 'En progreso' : 'Completada')
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    try {
      const form = new FormData(event.currentTarget); const evidence = form.get('evidence') as File
      const evidencePath = evidence?.size ? await uploadEvidence('changes', evidence) : null
      await insertChange({ help_request_id: request.id, target_status: target === 'En progreso' ? 'in_progress' : 'completed', responsible_name: String(form.get('name')), responsible_phone: String(form.get('phone')), notes: String(form.get('notes') ?? ''), evidence_photo_path: evidencePath, signature_data: signature })
      sent(); close()
    } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible enviar el cambio') } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">CAMBIO SUJETO A APROBACIÓN</span><h2>{displayRequestCode(request)}</h2><p>Un administrador revisará la evidencia antes de modificar el estado.</p><form onSubmit={submit}><label className="validated-field">Tu nombre<input name="name" onInput={formatName} minLength={3} maxLength={120} pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}" title="Usa solo letras. Cada palabra se formatea automáticamente." required /><small>Solo letras; cada palabra inicia en mayúscula.</small></label><label className="validated-field">Teléfono<input name="phone" type="tel" inputMode="numeric" onInput={digitsOnly} minLength={10} maxLength={10} pattern="3[0-9]{9}" title="Debe comenzar por 3 y contener exactamente 10 números." required /><small>10 números y debe comenzar por 3.</small></label><label>Estado propuesto<select value={target} onChange={e => setTarget(e.target.value as typeof target)}>{longTask && <option>En progreso</option>}<option>Completada</option></select></label><label className="wide upload-box">Fotografía de evidencia<input name="evidence" type="file" accept="image/*" required /></label><label className="wide">Observaciones<textarea name="notes" rows={3} /></label>{<div className="wide signature-field required-field"><span className="field-label">Firma de quien atiende</span><SignaturePad value={signature} onChange={setSignature} /><small>Firma con el dedo dentro del recuadro.</small></div>}<div className="form-actions wide"><button className="primary" disabled={busy || !signature}>{busy ? 'Enviando…' : 'Enviar para aprobación'}</button></div></form></section></div>
}

function AdminLogin({ close, success }: { close: () => void; success: (session: Session, profile: { full_name: string; role: 'admin' | 'superadmin' }) => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { const session = await login(String(form.get('email')), String(form.get('password'))); const profile = await getAdminProfile(session); success(session, profile) } catch (e) { logout(); setError(e instanceof Error ? e.message : 'Acceso rechazado') } finally { setBusy(false) } }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal login-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">ÁREA RESTRINGIDA</span><h2>Ingreso administrativo</h2><p>Accede con el correo y contraseña asignados.</p><form onSubmit={submit}><label className="wide">Correo<input name="email" type="email" autoComplete="username" required /></label><label className="wide">Contraseña<PasswordInput autoComplete="current-password" required /></label>{error && <p className="form-error wide">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button></form></section></div>
}

function EditRequestForm({ request, session, close, saved }: { request: HelpRequest; session: Session; close: () => void; saved: (request: HelpRequest) => void }) {
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
    if (help && !request.requestPhotoName) help.textContent = editPhotoRequired ? `Obligatoria para ${editCategory}: esta solicitud no tiene fotografía` : `Opcional para ${editCategory}: puedes agregar una fotografía si está disponible`
    return () => { if (select) select.onchange = null }
  }, [editCategory, editPhotoRequired, request.requestPhotoName])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const photo = form.get('requestPhoto') as File
    const nextCategory = String(form.get('category')) as Category
    if (categoryRequiresPhoto(nextCategory) && !request.requestPhotoName && (!(photo instanceof File) || !photo.size)) { alert(`Debes agregar una fotografía para la categoría ${nextCategory}.`); return }
    const next = { ...request, neighborhood: String(form.get('neighborhood')), description: String(form.get('description')), category: nextCategory, priority: String(form.get('priority')) as Priority, status: String(form.get('status')) as Status }
    setBusy(true)
    try {
      const photoPath = photo instanceof File && photo.size ? await uploadEvidence('requests', photo, session) : request.requestPhotoName
      await updateRequest(session, request.id, { neighborhood: next.neighborhood, description: next.description, category: categoryToDb[next.category], verified_priority: priorityToDb[next.priority], status: next.status === 'Sin atender' ? 'pending' : next.status === 'En progreso' ? 'in_progress' : 'completed', request_photo_path: photoPath })
      saved({ ...next, requestPhotoName: photoPath })
      close()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      alert(message.includes('help_requests_request_photo_required') ? 'Debes agregar una fotografía antes de guardar esta solicitud.' : message || 'No fue posible actualizar')
    } finally {
      setBusy(false)
    }
  }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">EDITAR SOLICITUD</span><h2>{request.publicCode ?? request.id}</h2><form onSubmit={submit}><label>Barrio<input name="neighborhood" defaultValue={request.neighborhood} required /></label><label>Categoría<select name="category" defaultValue={request.category}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label><label>Prioridad<select name="priority" defaultValue={request.priority}><option>Crítica</option><option>Alta</option><option>Media</option><option>Baja</option></select></label><label>Estado<select name="status" defaultValue={request.status}><option>Sin atender</option><option>En progreso</option><option>Completada</option></select></label><label className="wide">Descripción<textarea name="description" defaultValue={request.description} rows={5} required /></label><label className={`wide upload-box ${request.requestPhotoName ? '' : 'missing-request-photo'}`}>Fotografía inicial {request.requestPhotoName ? <small>Opcional: selecciona otra imagen para reemplazarla</small> : <small>Obligatoria: esta solicitud histórica no tiene fotografía</small>}<input name="requestPhoto" type="file" accept="image/*" required={!request.requestPhotoName} /></label><div className="form-actions wide"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></form></section></div>
}

function EditAdminForm({ admin, session, close, saved }: { admin: AdminUser; session: Session; close: () => void; saved: (admin: AdminUser) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = { ...admin, name: String(form.get('name')), email: String(form.get('email')), role: String(form.get('role')) as 'admin' | 'superadmin', active: form.get('active') === 'on' }; try { await updateAdmin(session, { userId: admin.id, email: next.email, fullName: next.name, role: next.role, active: next.active, password: String(form.get('password')) || undefined }); saved(next); close() } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible actualizar el usuario') } }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal login-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">EDITAR USUARIO</span><h2>{admin.name}</h2><form onSubmit={submit}><label className="wide validated-field">Nombre<input name="name" defaultValue={admin.name} onInput={formatName} minLength={3} maxLength={120} pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}" title="Usa solo letras. Cada palabra se formatea automáticamente." required /><small>Solo letras; cada palabra inicia en mayúscula.</small></label><label className="wide">Correo<input name="email" type="email" defaultValue={admin.email} required /></label><label className="wide">Rol<select name="role" defaultValue={admin.role ?? 'admin'}><option value="admin">Administrador</option><option value="superadmin">Superadministrador</option></select></label><label className="wide">Nueva contraseña <small>Déjala vacía para conservarla</small><PasswordInput minLength={10} /></label><label className="consent wide"><input name="active" type="checkbox" defaultChecked={admin.active} /> Usuario activo</label><button className="primary wide">Guardar usuario</button></form></section></div>
}

function ApprovalDetail({ change, session, close, review }: { change: ChangeRequest; session: Session; close: () => void; review: (change: ChangeRequest, state: 'Aprobado' | 'Rechazado') => Promise<void> }) {
  const [request, setRequest] = useState<HelpRequest>()
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [requestPhotoUrl, setRequestPhotoUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setError('')
    Promise.all([getPrivateRequest(session, change.requestId), change.evidencePhotoName ? getEvidenceUrl(session, change.evidencePhotoName) : Promise.resolve('')])
      .then(async ([rows, evidence]) => {
        if (!active) return
        if (!rows[0]) { setRequest(undefined); setError('No fue posible encontrar la solicitud relacionada.'); return }
        const privateRequest = mapPrivate(rows[0])
        setRequest(privateRequest); setEvidenceUrl(evidence); setError('')
        if (privateRequest.requestPhotoName) {
          try { setRequestPhotoUrl(await getEvidenceUrl(session, privateRequest.requestPhotoName)) } catch { setRequestPhotoUrl('') }
        }
      }).catch(reason => active && setError(reason instanceof Error ? reason.message : 'No fue posible cargar los detalles.'))
    return () => { active = false }
  }, [change, session])
  async function decide(state: 'Aprobado' | 'Rechazado') { setBusy(true); try { await review(change, state); close() } finally { setBusy(false) } }
  const signatureUrl = change.signature?.startsWith('<svg') ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(change.signature)}` : ''
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal approval-detail" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">DETALLE DE APROBACIÓN</span><h2>{request?.publicCode ?? change.requestDetails?.publicCode ?? 'Detalle de solicitud'}</h2>{error && !request && <p className="form-error">{error}</p>}{!request && !error && <p>Cargando información…</p>}{request && <><div className="detail-status"><span className={`request-status status-${request.status.toLowerCase().replace(' ', '-')}`}>{request.status}</span><b>→ {change.requestedStatus}</b><span>{change.state}</span></div><section className="detail-grid"><div><small>Solicitante</small><b>{request.fullName}</b></div><div><small>Documento</small><b>{request.documentType} · {request.documentNumber}</b></div><div><small>Teléfono del solicitante</small><b>{request.phone}</b></div><div><small>Categoría y prioridad</small><b>{request.category} · {request.priority}</b></div><div><small>Barrio</small><b>{request.neighborhood}</b></div><div><small>Dirección</small><b>{request.address}</b></div><div className="wide"><small>Descripción de la solicitud</small><p>{request.description}</p></div><div><small>Persona responsable</small><b>{change.requestedBy}</b></div><div><small>Teléfono responsable</small><b>{change.responsiblePhone || 'No registrado'}</b></div><div className="wide"><small>Observaciones del cambio</small><p>{change.notes || 'Sin observaciones'}</p></div></section><section className="detail-media">{requestPhotoUrl && <figure><figcaption>Fotografía de la solicitud</figcaption><img src={requestPhotoUrl} alt="Fotografía original de la solicitud" /></figure>}{evidenceUrl && <figure><figcaption>Fotografía de evidencia</figcaption><img src={evidenceUrl} alt="Evidencia presentada para el cambio" /></figure>}{signatureUrl && <figure className="signature-preview"><figcaption>Firma de quien atendió</figcaption><img src={signatureUrl} alt="Firma digital asociada al cambio" /></figure>}</section>{change.state === 'Pendiente' && <div className="detail-actions"><button className="secondary" disabled={busy} onClick={() => decide('Rechazado')}>Rechazar</button><button className="primary" disabled={busy} onClick={() => decide('Aprobado')}>Aprobar cambio</button></div>}</>}</section></div>
}

function RequestDetail({ publicRequest, session, close, onOpenImage }: { publicRequest: HelpRequest; session?: Session; close: () => void; onOpenImage: (image: { url: string; alt: string }) => void }) {
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
          try { setPhotoUrl(await getEvidenceUrl(session, detailRequest.requestPhotoName)) } catch { if (active) setPhotoUrl('') }
        } else {
          setPhotoUrl('')
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'No fue posible cargar los detalles.')
      }
    }
    load()
    return () => { active = false }
  }, [publicRequest, session])
  const photoAlt = `Fotografía de ${request.publicCode ?? 'la solicitud'}`
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal approval-detail request-detail" role="dialog" aria-modal="true" aria-labelledby="request-detail-title" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">{administrative ? 'DETALLE COMPLETO · ADMINISTRACIÓN' : 'DETALLE DE LA SOLICITUD'}</span><h2 id="request-detail-title">{administrative ? request.publicCode ?? 'Solicitud' : 'Información de la ayuda'}</h2>{error && <p className="form-error">{error}</p>}{administrative && <><div className="detail-status"><span className={`request-status status-${request.status.toLowerCase().replace(' ', '-')}`}>{request.status}</span><b>{request.category}</b><span>{request.priority}</span></div><section className="detail-grid"><div><small>Nombre completo</small><b>{request.fullName}</b></div><div><small>Documento</small><b>{request.documentType} · {request.documentNumber}</b></div><div><small>Teléfono</small><a href={`tel:${request.phone}`}>{request.phone}</a></div><div><small>Fecha y hora</small><b>{requestDateTime(request.createdAt)}</b></div><div><small>Barrio</small><b>{request.neighborhood}</b></div><div><small>Dirección exacta</small><b>{request.address}</b></div><div className="wide"><small>Descripción de la ayuda</small><p>{request.description}</p></div></section></>}{!administrative && <section className="detail-grid public-request-detail"><div><small>Barrio</small><b>{request.neighborhood}</b></div><div><small>Dirección exacta</small><b>{request.address}</b></div><div className="wide"><small>Descripción de la ayuda</small><p>{request.description}</p></div></section>}{photoUrl && <section className="detail-media single-media"><figure><figcaption>Fotografía de la solicitud</figcaption><button type="button" className="detail-photo-button" onClick={() => onOpenImage({ url: photoUrl, alt: photoAlt })}><img src={photoUrl} alt={photoAlt} /></button></figure></section>}<a className="map-directions detail-directions" href={requestDirectionsUrl(request)} target="_blank" rel="noopener noreferrer">Cómo llegar</a></section></div>
}

function CollectionCenterForm({ center, session, close, saved }: { center?: CollectionCenter; session: Session; close: () => void; saved: () => Promise<void> }) {
  const [location, setLocation] = useState<Location | undefined>(center?.location)
  const [busy, setBusy] = useState(false)
  const markerRequest: HelpRequest[] = location ? [{ id: 'collection-center-location', fullName: '', documentType: 'Cédula de ciudadanía', documentNumber: '', phone: '', neighborhood: center?.name ?? 'Centro de acopio', address: '', description: 'Ubicación seleccionada', category: 'Otros', status: 'Sin atender', priority: 'Media', createdAt: new Date().toISOString(), location }] : []
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!location) return
    const form = new FormData(event.currentTarget)
    const payload = { name: String(form.get('name')).trim(), address: String(form.get('address')).trim(), description: String(form.get('description')).trim(), phone: String(form.get('phone')).trim() || null, opening_hours: String(form.get('openingHours')).trim(), accepted_items: String(form.get('acceptedItems')).trim(), latitude: location.latitude, longitude: location.longitude, active: form.get('active') === 'on' }
    setBusy(true)
    try { if (center) await updateCollectionCenter(session, center.id, payload); else await createCollectionCenter(session, payload); await saved(); close() } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible guardar el centro de acopio.') } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal collection-center-modal" role="dialog" aria-modal="true" aria-labelledby="center-form-title" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={close}>×</button><span className="eyebrow">GESTIÓN DE CENTROS DE ACOPIO</span><h2 id="center-form-title">{center ? 'Editar centro' : 'Nuevo centro de acopio'}</h2><form onSubmit={submit}><label>Nombre<input name="name" defaultValue={center?.name} minLength={3} maxLength={120} required /></label><label>Teléfono <small>Opcional</small><input name="phone" type="tel" inputMode="numeric" defaultValue={center?.phone} onInput={digitsOnly} pattern="3[0-9]{9}" maxLength={10} title="Debe comenzar por 3 y tener 10 números." /></label><label className="wide">Dirección <small>Opcional</small><input name="address" defaultValue={center?.address} minLength={5} maxLength={240} /></label><label>Horario <small>Opcional</small><input name="openingHours" defaultValue={center?.openingHours} maxLength={240} placeholder="Ej. Lunes a sábado, 8:00 a. m. – 5:00 p. m." /></label><label>Elementos que recibe <small>Opcional</small><input name="acceptedItems" defaultValue={center?.acceptedItems} maxLength={500} placeholder="Ej. Ropa, alimentos y aseo" /></label><label className="wide">Descripción <small>Opcional</small><textarea name="description" defaultValue={center?.description} maxLength={1000} rows={4} /></label><div className="wide center-location-field required-field"><span className="field-label">Ubicación exacta</span><p>Selecciona el punto exacto haciendo clic o tocando el mapa.</p><LeafletMap requests={markerRequest} onPick={setLocation} />{location ? <small>Latitud {location.latitude.toFixed(6)} · Longitud {location.longitude.toFixed(6)}</small> : <small className="form-error">Debes seleccionar una ubicación.</small>}</div><label className="consent wide"><input name="active" type="checkbox" defaultChecked={center?.active ?? true} /> Publicar este centro para la comunidad</label><div className="form-actions wide"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary" disabled={!location || busy}>{busy ? 'Guardando…' : 'Guardar centro'}</button></div></form></section></div>
}

function ReviewStatistics({ changes }: { changes: ChangeRequest[] }) {
  const reviewed = changes.filter(change => change.state !== 'Pendiente')
  const approved = reviewed.filter(change => change.state === 'Aprobado').length
  const rejected = reviewed.filter(change => change.state === 'Rechazado').length
  const reviewers = Array.from(reviewed.reduce((summary, change) => {
    const name = change.reviewedByName ?? 'Administrador no identificado'
    const current = summary.get(name) ?? { name, approved: 0, rejected: 0, lastReview: '' }
    if (change.state === 'Aprobado') current.approved += 1
    if (change.state === 'Rechazado') current.rejected += 1
    if (change.reviewedAt && (!current.lastReview || +new Date(change.reviewedAt) > +new Date(current.lastReview))) current.lastReview = change.reviewedAt
    summary.set(name, current)
    return summary
  }, new Map<string, { name: string; approved: number; rejected: number; lastReview: string }>()).values()).sort((a, b) => b.approved + b.rejected - a.approved - a.rejected)
  return <section className="review-statistics" aria-labelledby="review-statistics-title"><div className="review-statistics-heading"><div><span className="eyebrow">CONTROL DE REVISIONES</span><h3 id="review-statistics-title">Actividad administrativa</h3></div><span>{reviewed.length} decisiones registradas</span></div><div className="review-summary"><article><strong>{approved}</strong><span>Aprobadas</span></article><article><strong>{rejected}</strong><span>Rechazadas</span></article><article><strong>{reviewers.length}</strong><span>Revisores</span></article></div><div className="reviewer-grid">{reviewers.map(reviewer => <article key={reviewer.name}><div className="reviewer-avatar">{reviewer.name.charAt(0).toLocaleUpperCase('es-CO')}</div><div><b>{reviewer.name}</b><span>{reviewer.approved + reviewer.rejected} revisiones{reviewer.lastReview ? ` · Última: ${new Date(reviewer.lastReview).toLocaleString('es-CO')}` : ''}</span></div><div className="reviewer-counts"><span className="approved-count">✓ {reviewer.approved}</span><span className="rejected-count">× {reviewer.rejected}</span></div></article>)}{!reviewers.length && <p className="muted">Todavía no hay aprobaciones o rechazos registrados.</p>}</div></section>
}

function AdminPanel({ requests, admins, changes, centers, setAdmins, setChanges, setRequests, setCenters, session, role, onNewRequest }: { requests: HelpRequest[]; admins: AdminUser[]; changes: ChangeRequest[]; centers: CollectionCenter[]; setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>; setChanges: React.Dispatch<React.SetStateAction<ChangeRequest[]>>; setRequests: React.Dispatch<React.SetStateAction<HelpRequest[]>>; setCenters: React.Dispatch<React.SetStateAction<CollectionCenter[]>>; session: Session; role: 'admin' | 'superadmin'; onNewRequest: () => void }) {
  const [tab, setTab] = useState<'solicitudes' | 'aprobaciones' | 'usuarios' | 'acopios'>('aprobaciones'); const [changeFor, setChangeFor] = useState<HelpRequest>(); const [selectedChange, setSelectedChange] = useState<ChangeRequest>(); const [signature, setSignature] = useState(''); const [editingRequest, setEditingRequest] = useState<HelpRequest>(); const [editingAdmin, setEditingAdmin] = useState<AdminUser>(); const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>()
  useEffect(() => { getChanges(session).then(rows => setChanges(rows.map(mapChange))).catch(() => undefined); if (role === 'superadmin') listAdmins(session).then(rows => setAdmins(rows.map(a => ({ id: a.id, name: a.name, email: a.email, active: a.active, role: a.role })))).catch(() => undefined) }, [session, role, setAdmins, setChanges])
  async function addAdmin(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await createAdmin(session, { email: String(form.get('email')), password: String(form.get('password')), fullName: String(form.get('name')), role: String(form.get('role')) as 'admin' | 'superadmin' }); const rows = await listAdmins(session); setAdmins(rows.map(a => ({ id: a.id, name: a.name, email: a.email, active: a.active, role: a.role }))); event.currentTarget.reset() } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible crear el administrador') } }
  async function propose(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!changeFor || !signature) return; const form = new FormData(event.currentTarget); const photo = form.get('evidence') as File; try { const path = await uploadEvidence('changes', photo, session); const target = String(form.get('status')) as 'En progreso' | 'Completada'; await insertChange({ help_request_id: changeFor.id, target_status: target === 'En progreso' ? 'in_progress' : 'completed', responsible_name: String(form.get('responsible')), responsible_phone: String(form.get('phone')), evidence_photo_path: path, signature_data: signature }); setChanges(c => [{ id: crypto.randomUUID(), requestId: changeFor.id, requestedStatus: target, requestedBy: String(form.get('responsible')), evidencePhotoName: path, signature, createdAt: new Date().toISOString(), state: 'Pendiente' }, ...c]); setChangeFor(undefined) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible crear la aprobación') } }
  async function review(change: ChangeRequest, state: 'Aprobado' | 'Rechazado') { try { await reviewChange(session, change.id, state === 'Aprobado', state === 'Rechazado' ? 'Rechazado por administración' : undefined); const rows = await getChanges(session); setChanges(rows.map(mapChange)); if (state === 'Aprobado') setRequests(list => list.map(r => r.id === change.requestId ? { ...r, status: change.requestedStatus, evidencePhotoName: change.evidencePhotoName, signature: change.signature } : r)) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible revisar el cambio') } }
  async function removeRequest(request: HelpRequest) { if (!confirm(`¿Eliminar definitivamente ${request.id}?`)) return; try { await deleteRequest(session, request.id); setRequests(list => list.filter(r => r.id !== request.id)) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible eliminar') } }
  async function removeChange(change: ChangeRequest) { if (!confirm('¿Eliminar esta aprobación?')) return; try { await deleteChange(session, change.id); setChanges(list => list.filter(c => c.id !== change.id)) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible eliminar la aprobación') } }
  async function removeAdmin(admin: AdminUser) { if (!confirm(`¿Eliminar el usuario ${admin.email}?`)) return; try { await deleteAdmin(session, admin.id); setAdmins(list => list.filter(a => a.id !== admin.id)) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible eliminar el usuario') } }
  async function refreshCenters() { const rows = await getCollectionCenters(session); setCenters(rows.map(mapCollectionCenter)) }
  async function removeCenter(center: CollectionCenter) { if (!confirm(`¿Eliminar el centro de acopio ${center.name}?`)) return; try { await deleteCollectionCenter(session, center.id); await refreshCenters() } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible eliminar el centro de acopio.') } }
  return <><div className="section-heading"><div><span className="eyebrow">ÁREA RESTRINGIDA · {role}</span><h2>Administración</h2></div></div><div className="admin-tabs">{role === 'superadmin' && <button className={tab === 'solicitudes' ? 'selected' : ''} onClick={() => setTab('solicitudes')}>Solicitudes</button>}<button className={tab === 'aprobaciones' ? 'selected' : ''} onClick={() => setTab('aprobaciones')}>Aprobaciones ({changes.filter(c => c.state === 'Pendiente').length})</button>{role === 'superadmin' && <button className={tab === 'acopios' ? 'selected' : ''} onClick={() => setTab('acopios')}>Centros de acopio</button>}{role === 'superadmin' && <button className={tab === 'usuarios' ? 'selected' : ''} onClick={() => setTab('usuarios')}>Usuarios admin</button>}</div>
    {tab === 'solicitudes' && role === 'superadmin' && <><div className="crud-toolbar"><button className="primary" onClick={onNewRequest}>＋ Crear solicitud</button></div><div className="admin-list">{requests.map(r => <article key={r.id}><div><b>{r.publicCode ?? r.id} · {r.category}</b><span>{r.neighborhood} · {r.status}</span></div><div><button className="secondary" onClick={() => setEditingRequest(r)}>Editar</button> <button className="primary" disabled={r.status === 'Completada'} onClick={() => setChangeFor(r)}>Crear aprobación</button> <button className="danger" onClick={() => removeRequest(r)}>Eliminar</button></div></article>)}</div></>}
    {tab === 'aprobaciones' && <>{role === 'superadmin' && <ReviewStatistics changes={changes} />}<div className="admin-list">{changes.map(c => <article key={c.id}><div><b>{c.requestDetails?.publicCode ?? c.requestId} → {c.requestedStatus}</b><span>{c.requestedBy} · {new Date(c.createdAt).toLocaleString('es-CO')} · {c.state === 'Pendiente' ? 'Pendiente de revisión' : `${c.state} por ${c.reviewedByName ?? 'Administrador no identificado'}${c.reviewedAt ? ` · ${new Date(c.reviewedAt).toLocaleString('es-CO')}` : ''}`}</span></div><div><button className="secondary" onClick={() => setSelectedChange(c)}>Ver detalles</button> {c.state === 'Pendiente' && <><button className="secondary" onClick={() => review(c, 'Rechazado')}>Rechazar</button> <button className="primary" onClick={() => review(c, 'Aprobado')}>Aprobar</button></>}{role === 'superadmin' && <button className="danger" onClick={() => removeChange(c)}>Eliminar</button>}</div></article>)}</div></>}
    {tab === 'usuarios' && role === 'superadmin' && <><form className="inline-form admin-create" onSubmit={addAdmin}><input name="name" placeholder="Nombre *" onInput={formatName} minLength={3} maxLength={120} pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}" title="Usa solo letras. Cada palabra se formatea automáticamente." required /><input name="email" type="email" placeholder="Correo *" required /><PasswordInput minLength={10} placeholder="Contraseña temporal *" required /><select name="role"><option value="admin">Administrador *</option><option value="superadmin">Superadministrador</option></select><button className="primary">Crear usuario</button></form><div className="admin-list">{admins.map(a => <article key={a.id}><div><b>{a.name}</b><span>{a.email} · {a.role} · {a.active ? 'Activo' : 'Inactivo'}</span></div><div><button className="secondary" onClick={() => setEditingAdmin(a)}>Editar</button> <button className="danger" onClick={() => removeAdmin(a)}>Eliminar</button></div></article>)}</div></>}
    {tab === 'acopios' && role === 'superadmin' && <><div className="crud-toolbar"><button className="primary" onClick={() => setEditingCenter(null)}>＋ Agregar centro</button></div><div className="admin-list collection-admin-list">{centers.map(center => <article key={center.id}><div><b>{center.name}</b><span>{center.address} · {center.active ? 'Publicado' : 'Oculto'}</span></div><div><button className="secondary" onClick={() => setEditingCenter(center)}>Editar</button> <button className="danger" onClick={() => removeCenter(center)}>Eliminar</button></div></article>)}{!centers.length && <div className="empty">No hay centros de acopio registrados.</div>}</div></>}
    {changeFor && <div className="modal-backdrop" onMouseDown={() => setChangeFor(undefined)}><section className="modal" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setChangeFor(undefined)}>×</button><span className="eyebrow">CREAR APROBACIÓN</span><h2>{changeFor.publicCode ?? changeFor.id}</h2><form onSubmit={propose}><label>Nuevo estado<select name="status"><option>En progreso</option><option>Completada</option></select></label><label className="validated-field">Responsable<input name="responsible" onInput={formatName} minLength={3} maxLength={120} pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]{2,119}" title="Usa solo letras. Cada palabra se formatea automáticamente." required /><small>Solo letras; cada palabra inicia en mayúscula.</small></label><label className="validated-field">Teléfono<input name="phone" type="tel" inputMode="numeric" onInput={digitsOnly} minLength={10} maxLength={10} pattern="3[0-9]{9}" title="Debe comenzar por 3 y contener exactamente 10 números." required /><small>10 números y debe comenzar por 3.</small></label><label className="wide upload-box">Fotografía de evidencia<input name="evidence" type="file" accept="image/*" required /></label><div className="wide signature-field required-field"><span className="field-label">Firma digital</span><SignaturePad value={signature} onChange={setSignature} />{!signature && <small>La firma es obligatoria.</small>}</div><div className="form-actions wide"><button className="primary" disabled={!signature}>Crear aprobación</button></div></form></section></div>}
    {editingRequest && <EditRequestForm request={editingRequest} session={session} close={() => setEditingRequest(undefined)} saved={next => setRequests(list => list.map(r => r.id === next.id ? next : r))} />}
    {editingAdmin && <EditAdminForm admin={editingAdmin} session={session} close={() => setEditingAdmin(undefined)} saved={next => setAdmins(list => list.map(a => a.id === next.id ? next : a))} />}
    {editingCenter !== undefined && <CollectionCenterForm center={editingCenter ?? undefined} session={session} close={() => setEditingCenter(undefined)} saved={refreshCenters} />}
    {selectedChange && <ApprovalDetail change={selectedChange} session={session} close={() => setSelectedChange(undefined)} review={review} />}
  </>
}

function InformationView({ requestHelp }: { requestHelp: () => void }) {
  const [videoUnavailable, setVideoUnavailable] = useState(false)
  return <section className="information-page"><div className="section-heading"><div><span className="eyebrow">GUÍA PARA LA COMUNIDAD</span><h2>Información</h2><p className="muted">Aprende a consultar, solicitar y reportar una ayuda.</p></div></div><div className="information-layout"><div className="tutorial-video-card"><div className="vertical-video">{videoUnavailable ? <div className="video-placeholder" role="status"><span>▶</span><b>Video explicativo</b><p>El video estará disponible próximamente.</p></div> : <video controls playsInline preload="metadata" onError={() => setVideoUnavailable(true)} aria-label="Video: cómo usar Ayudas La Virginia"><source src="/videos/manual-usuario.mp4" type="video/mp4" />Tu navegador no puede reproducir este video.</video>}</div><div><h3>Cómo usar Ayudas La Virginia</h3><p>Mira esta guía breve antes de enviar tu primera solicitud.</p></div></div><div className="user-manual"><span className="eyebrow">MANUAL DE USUARIO</span><h3>Pasos para solicitar ayuda</h3><ol><li><span>1</span><div><b>Consulta las solicitudes</b><p>Revisa las ayudas existentes y usa los filtros para encontrarlas por categoría, estado o prioridad.</p></div></li><li><span>2</span><div><b>Selecciona “Solicitar ayuda”</b><p>No necesitas crear una cuenta. Completa tus datos de contacto y describe claramente lo que necesitas.</p></div></li><li><span>3</span><div><b>Guarda la ubicación</b><p>Usa la ubicación del dispositivo o toca manualmente el punto exacto en el mapa.</p></div></li><li><span>4</span><div><b>Adjunta una fotografía</b><p>Puedes tomar una foto o escogerla de la galería. Para escombros y mudanzas es obligatoria.</p></div></li><li><span>5</span><div><b>Autoriza y envía</b><p>Lee el aviso de tratamiento de datos, confirma que eres una persona y envía la solicitud.</p></div></li><li><span>6</span><div><b>Reporta un avance</b><p>Cuando una ayuda sea atendida, selecciona “Reportar avance” y adjunta evidencia y firma. La administración revisará el cambio.</p></div></li></ol><button className="primary manual-action" onClick={requestHelp}>＋ Solicitar ayuda</button></div></div><aside className="information-tip"><b>¿Necesitas encontrar una solicitud?</b><p>En la sección Mapa puedes ver las ubicaciones aproximadas y abrir la ruta en Google Maps. Esta plataforma no reemplaza las líneas oficiales de emergencia.</p></aside></section>
}

export default function App() {
  const [view, setView] = useState<View>('dashboard'); const [requests, setRequests] = useState<HelpRequest[]>([]); const [completedMedia, setCompletedMedia] = useState<Record<string, { requestUrl?: string; solutionUrl?: string }>>({}); const [imagePreview, setImagePreview] = useState<{ url: string; alt: string }>(); const [centers, setCenters] = useState<CollectionCenter[]>([]); const [admins, setAdmins] = useState(initialAdmins); const [changes, setChanges] = useState(initialChanges); const [category, setCategory] = useState<'Todas' | Category>('Todas'); const [status, setStatus] = useState<'Activas' | Status>('Activas'); const [sort, setSort] = useState<Sort>('priority'); const [requestSearch, setRequestSearch] = useState(''); const [requestDate, setRequestDate] = useState(''); const [mapCategory, setMapCategory] = useState<'Todas' | Category>('Todas'); const [mapPriority, setMapPriority] = useState<'Todas' | Priority>('Todas'); const [page, setPage] = useState(1); const [showForm, setShowForm] = useState(false); const [changeFor, setChangeFor] = useState<HelpRequest>(); const [detailFor, setDetailFor] = useState<HelpRequest>(); const [showLogin, setShowLogin] = useState(false); const [mobileMenu, setMobileMenu] = useState(false); const [session, setSession] = useState<Session | null>(savedSession()); const [adminProfile, setAdminProfile] = useState<{ full_name: string; role: 'admin' | 'superadmin' } | null>(null); const [notice, setNotice] = useState('')
  const ordered = useMemo(() => requests.filter(r => (!requestDate || requestCalendarDate(r.createdAt) === requestDate) && (requestSearch ? requestCodeNumber(r) === String(Number(requestSearch)) : (category === 'Todas' || r.category === category) && (status === 'Activas' ? r.status !== 'Completada' : r.status === status))).sort((a, b) => { if (a.status === 'Completada' && b.status !== 'Completada') return 1; if (b.status === 'Completada' && a.status !== 'Completada') return -1; if (sort === 'priority') return priorityWeight[a.priority] - priorityWeight[b.priority] || +new Date(b.createdAt) - +new Date(a.createdAt); return sort === 'oldest' ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt) }), [requests, category, status, sort, requestSearch, requestDate])
  const mapRequests = useMemo(() => requests.filter(request => (mapCategory === 'Todas' || request.category === mapCategory) && (mapPriority === 'Todas' || request.priority === mapPriority)), [requests, mapCategory, mapPriority])
  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE)); const visible = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => setPage(1), [category, status, sort, requestSearch, requestDate])
  useEffect(() => { if (!supabaseConfigured) { setRequests(initialRequests); return } getPublicRequests().then(rows => setRequests(rows.map(mapPublic))).catch(() => setNotice('No fue posible cargar Supabase.')) }, [])
  useEffect(() => { if (!supabaseConfigured) return; getCompletedRequestMedia().then(async rows => { const entries = await Promise.all(rows.map(async row => { const [requestUrl, solutionUrl] = await Promise.all([row.request_photo_path ? getEvidenceUrl(undefined, row.request_photo_path).catch(() => '') : '', row.solution_photo_path ? getEvidenceUrl(undefined, row.solution_photo_path).catch(() => '') : '']); return [row.request_id, { requestUrl: requestUrl || undefined, solutionUrl: solutionUrl || undefined }] as const })); setCompletedMedia(Object.fromEntries(entries)) }).catch(() => undefined) }, [requests])
  useEffect(() => { if (!supabaseConfigured) return; getCollectionCenters(session ?? undefined).then(rows => setCenters(rows.map(mapCollectionCenter))).catch(() => setNotice('No fue posible cargar los centros de acopio.')) }, [session])
  useEffect(() => { if (!session) return; getAdminProfile(session).then(setAdminProfile).catch(() => { logout(); setSession(null) }) }, [session])
  async function refresh() { const rows = await getPublicRequests(); setRequests(rows.map(mapPublic)) }
  async function create(request: HelpRequest, photo?: File) { try { const photoPath = photo ? await uploadEvidence('requests', photo) : null; const consentAt = new Date().toISOString(); await insertRequest({ full_name: request.fullName, document_type: request.documentType, document_number: request.documentNumber, phone: request.phone, neighborhood: request.neighborhood, exact_address: request.address, description: request.description.trim(), category: categoryToDb[request.category], declared_priority: priorityToDb[request.priority], exact_latitude: request.location?.latitude ?? null, exact_longitude: request.location?.longitude ?? null, request_photo_path: photoPath, privacy_consent_at: consentAt, privacy_notice_version: '2026-08-16-v3', human_confirmation_at: consentAt, public_contact_phone: request.phone, public_contact_address: request.address, public_contact_consent_at: consentAt, public_contact_notice_version: '2026-08-16-v3' }); await refresh(); setShowForm(false); setNotice('Solicitud enviada correctamente.') } catch (error) { alert(requestSubmissionError(error)) } }
  function navigate(next: View) { setView(next); setMobileMenu(false) }
  function openAdmin() { setMobileMenu(false); if (session && adminProfile) setView('admin'); else setShowLogin(true) }
  function closeSession() { logout(); setSession(null); setAdminProfile(null); setView('dashboard'); setMobileMenu(false) }
  return <div className="app-shell">{mobileMenu && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)} />}<aside id="main-sidebar" className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}><button className="sidebar-close" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}>×</button><a className="logo" href="#dashboard" onClick={() => navigate('dashboard')}><LogoMark /><b>Ayudas<br />La Virginia</b></a><nav><button className={view === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}><span>▤</span>Solicitudes</button><button className={view === 'mapa' ? 'active' : ''} onClick={() => navigate('mapa')}><span>⌖</span>Mapa</button><button className={view === 'acopios' ? 'active' : ''} onClick={() => navigate('acopios')}><span>▣</span>Centros de Acopio</button><button className={view === 'informacion' ? 'active' : ''} onClick={() => navigate('informacion')}><span>ⓘ</span>Información</button></nav><div className="sidebar-bottom">{session && adminProfile ? <><button className={view === 'admin' ? 'active' : ''} onClick={() => navigate('admin')}><span>⚙</span>Administración</button><button onClick={closeSession}><span>↪</span>Cerrar sesión</button><small>{adminProfile.full_name} · {adminProfile.role}</small></> : <button onClick={openAdmin}><span>⚙</span>Acceso administrativo</button>}</div></aside><main><Header menuOpen={mobileMenu} toggleMenu={() => setMobileMenu(open => !open)} />{notice && <div className="notice">{notice}</div>}
    {view === 'dashboard' && <><section className="help-cta"><LogoMark className="help-cta-logo" /><div><span>ESTAMOS PARA AYUDARTE</span><h2>¿Necesitas ayuda?</h2><p>Cuéntanos qué necesitas y registra tu solicitud en pocos minutos.</p></div><button onClick={() => setShowForm(true)}>Solicitar ayuda <b>→</b></button></section><div className="section-heading"><div><span className="eyebrow">SOLICITUDES PÚBLICAS</span><h2>Ayudas solicitadas</h2><p className="muted">Consulta la información y ubicación autorizadas para coordinar la ayuda.</p></div></div><section className="stats"><article><span className="stat-icon orange">○</span><div><strong>{requests.filter(r => r.status === 'Sin atender').length}</strong><p>Sin atender</p></div></article><article><span className="stat-icon blue">↻</span><div><strong>{requests.filter(r => r.status === 'En progreso').length}</strong><p>En progreso</p></div></article><article><span className="stat-icon green">✓</span><div><strong>{requests.filter(r => r.status === 'Completada').length}</strong><p>Completadas</p></div></article></section><section className="dashboard-filters"><label>Categoría<select value={category} onChange={e => setCategory(e.target.value as typeof category)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Estado<select value={status} onChange={e => setStatus(e.target.value as typeof status)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Fecha de creación<input type="date" value={requestDate} onChange={event => setRequestDate(event.target.value)} aria-label="Filtrar por fecha de creación" /></label><label>Ordenar por<select value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="priority">Prioridad</option><option value="recent">Más recientes</option><option value="oldest">Más antiguas</option></select></label></section><section className="request-search-panel"><label><span>Buscar solicitud por número</span><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} value={requestSearch} onChange={event => setRequestSearch(event.target.value.replace(/\D/g, ''))} placeholder="Ej. 70 para encontrar solicitud_0070" aria-label="Buscar por número de solicitud" /></label></section><div className="result-count">{ordered.length} solicitudes · Página {page} de {pages} · 25 por página</div><section className="ticket-grid">{visible.map(r => <RequestCard key={r.id} request={r} onChange={setChangeFor} onDetails={setDetailFor} completedMedia={completedMedia[r.id]} onOpenImage={setImagePreview} />)}</section><div className="pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button><button disabled={page === pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button></div></>}
    {view === 'mapa' && <><div className="section-heading"><div><span className="eyebrow">UBICACIONES APROXIMADAS</span><h2>Mapa de solicitudes</h2></div></div><section className="dashboard-filters map-filters" aria-label="Filtros del mapa"><label>Categoría<select value={mapCategory} onChange={event => setMapCategory(event.target.value as typeof mapCategory)}>{categories.map(option => <option key={option}>{option}</option>)}</select></label><label>Prioridad<select value={mapPriority} onChange={event => setMapPriority(event.target.value as typeof mapPriority)}>{priorities.map(option => <option key={option}>{option}</option>)}</select></label></section><div className="result-count">{mapRequests.filter(request => request.status !== 'Completada' && request.location).length} solicitudes visibles en el mapa</div><LeafletMap requests={mapRequests} onReport={setChangeFor} /></>}
    {view === 'acopios' && <CollectionCentersView centers={centers} />}
    {view === 'informacion' && <InformationView requestHelp={() => setShowForm(true)} />}
    {view === 'admin' && session && adminProfile && <AdminPanel requests={requests} admins={admins} changes={changes} centers={centers} setAdmins={setAdmins} setChanges={setChanges} setRequests={setRequests} setCenters={setCenters} session={session} role={adminProfile.role} onNewRequest={() => setShowForm(true)} />}
  </main>{view !== 'admin' && <button className="floating-help" onClick={() => setShowForm(true)}>＋ <span>Solicitar ayuda</span></button>}{showForm && <RequestForm close={() => setShowForm(false)} create={create} />}{changeFor && <StatusChangeForm request={changeFor} close={() => setChangeFor(undefined)} sent={() => setNotice('Cambio enviado para revisión administrativa.')} />}{detailFor && <RequestDetail publicRequest={detailFor} session={session && adminProfile ? session : undefined} close={() => setDetailFor(undefined)} onOpenImage={setImagePreview} />}{imagePreview && <ImageModal image={imagePreview} close={() => setImagePreview(undefined)} />}{showLogin && <AdminLogin close={() => setShowLogin(false)} success={(nextSession, profile) => { setSession(nextSession); setAdminProfile(profile); setShowLogin(false); setView('admin') }} />}</div>
}
