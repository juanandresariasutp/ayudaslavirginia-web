import type { HelpRequest, Priority } from '../types'

export function requestDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(value))
}

export function requestCalendarDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function displayRequestCode(request: HelpRequest): string {
  return request.publicCode?.startsWith('solicitud_')
    ? request.publicCode
    : 'solicitud_pendiente'
}

export function requestCodeNumber(request: HelpRequest): string {
  const match = displayRequestCode(request).match(/(\d+)$/)
  return match ? String(Number(match[1])) : ''
}

export function requestDirectionsUrl(request: HelpRequest): string {
  const destination = request.location
    ? `${request.location.latitude},${request.location.longitude}`
    : `${request.address}, ${request.neighborhood}, La Virginia, Risaralda`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

export function escapeMapText(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]!
  )
}

export function priorityClass(priority: Priority): string {
  return priority.toLowerCase().replace('í', 'i')
}
