import type { ChangeRequest, CollectionCenter, DocumentType, HelpRequest } from '../types'
import { dbToCategory, dbToPriority, dbToStatus } from '../config/constants'

export function mapPublic(row: Record<string, unknown>): HelpRequest {
  return {
    id: String(row.id),
    publicCode: String(row.public_code ?? row.id),
    fullName: 'Dato protegido',
    documentType: 'Cédula de ciudadanía',
    documentNumber: 'PROTEGIDO',
    phone: row.contact_phone ? String(row.contact_phone) : 'PROTEGIDO',
    neighborhood: String(row.neighborhood),
    address: row.contact_address ? String(row.contact_address) : 'Dirección protegida',
    description: String(row.description),
    category: dbToCategory[String(row.category)] ?? 'Otros',
    status: dbToStatus[String(row.status)] ?? 'Sin atender',
    priority: dbToPriority[String(row.priority)] ?? 'Media',
    createdAt: String(row.created_at),
    location:
      row.public_latitude == null
        ? undefined
        : { latitude: Number(row.public_latitude), longitude: Number(row.public_longitude) },
    requestPhotoName: row.request_photo_path ? String(row.request_photo_path) : undefined
  }
}

export function mapPrivate(row: Record<string, unknown>): HelpRequest {
  return {
    id: String(row.id),
    publicCode: String(row.public_code ?? row.id),
    fullName: String(row.full_name),
    documentType: String(row.document_type) as DocumentType,
    documentNumber: String(row.document_number),
    phone: String(row.phone),
    neighborhood: String(row.neighborhood),
    address: String(row.exact_address),
    description: String(row.description),
    category: dbToCategory[String(row.category)] ?? 'Otros',
    status: dbToStatus[String(row.status)] ?? 'Sin atender',
    priority: dbToPriority[String(row.verified_priority ?? row.declared_priority)] ?? 'Media',
    createdAt: String(row.created_at),
    location:
      row.exact_latitude == null
        ? undefined
        : { latitude: Number(row.exact_latitude), longitude: Number(row.exact_longitude) },
    requestPhotoName: row.request_photo_path ? String(row.request_photo_path) : undefined
  }
}

export function mapCollectionCenter(row: Record<string, unknown>): CollectionCenter {
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    description: String(row.description ?? ''),
    phone: row.phone ? String(row.phone) : undefined,
    openingHours: String(row.opening_hours ?? ''),
    acceptedItems: String(row.accepted_items ?? ''),
    location: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    active: Boolean(row.active)
  }
}

export function mapChange(row: Record<string, unknown>): ChangeRequest {
  const reviewer =
    row.reviewer && typeof row.reviewer === 'object'
      ? (row.reviewer as Record<string, unknown>)
      : undefined
  return {
    id: String(row.id),
    requestId: String(row.help_request_id),
    requestedStatus: String(row.target_status) === 'in_progress' ? 'En progreso' : 'Completada',
    requestedBy: String(row.responsible_name),
    responsiblePhone: String(row.responsible_phone ?? ''),
    notes: String(row.notes ?? ''),
    evidencePhotoName: String(row.evidence_photo_path ?? ''),
    signature: String(row.signature_data ?? ''),
    requestDetails:
      row.help_requests && typeof row.help_requests === 'object'
        ? mapPrivate(row.help_requests as Record<string, unknown>)
        : undefined,
    createdAt: String(row.created_at),
    state:
      String(row.state) === 'approved'
        ? 'Aprobado'
        : String(row.state) === 'rejected'
        ? 'Rechazado'
        : 'Pendiente',
    reviewedByName: reviewer?.full_name ? String(reviewer.full_name) : undefined,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined
  }
}
