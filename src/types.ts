export type Status = 'Sin atender' | 'En progreso' | 'Completada'
export type Priority = 'Crítica' | 'Alta' | 'Media' | 'Baja'
export type Category = 'Alimentos' | 'Escombros' | 'Mudanza y acarreo' | 'Implementos de aseo' | 'Juguetes' | 'Salud' | 'Alojamiento' | 'Ropa' | 'Reconstrucción' | 'Otros'
export type DocumentType = 'Cédula de ciudadanía' | 'Cédula de extranjería' | 'Pasaporte' | 'Permiso por protección temporal'

export interface Location { latitude: number; longitude: number }

export interface CollectionCenter {
  id: string
  name: string
  address: string
  description: string
  phone?: string
  openingHours: string
  acceptedItems: string
  location: Location
  active: boolean
}

export interface HelpRequest {
  id: string
  publicCode?: string
  fullName: string
  documentType: DocumentType
  documentNumber: string
  phone: string
  neighborhood: string
  address: string
  description: string
  category: Category
  status: Status
  priority: Priority
  createdAt: string
  location?: Location
  requestPhotoName?: string
  evidencePhotoName?: string
  signature?: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  active: boolean
  role?: 'admin' | 'superadmin'
}

export interface ChangeRequest {
  id: string
  requestId: string
  requestedStatus: Exclude<Status, 'Sin atender'>
  requestedBy: string
  responsiblePhone?: string
  notes?: string
  evidencePhotoName: string
  signature: string
  requestDetails?: HelpRequest
  createdAt: string
  state: 'Pendiente' | 'Aprobado' | 'Rechazado'
  reviewedByName?: string
  reviewedAt?: string
}
