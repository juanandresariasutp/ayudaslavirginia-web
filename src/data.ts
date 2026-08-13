import type { AdminUser, ChangeRequest, HelpRequest } from './types'

export const initialRequests: HelpRequest[] = [
  { id: 'LVR-2026-000123', fullName: 'Dato protegido', documentType: 'Cédula de ciudadanía', documentNumber: 'PROTEGIDO', phone: 'PROTEGIDO', neighborhood: 'Barrio San Carlos', address: 'Dirección protegida', description: 'Familia afectada por daños en la vivienda. Requiere alimentos y apoyo prioritario.', category: 'Alimentos', status: 'Sin atender', priority: 'Crítica', createdAt: '2026-08-13T09:15:00-05:00', location: { latitude: 4.8941, longitude: -75.8841 } },
  { id: 'LVR-2026-000124', fullName: 'Dato protegido', documentType: 'Cédula de ciudadanía', documentNumber: 'PROTEGIDO', phone: 'PROTEGIDO', neighborhood: 'El Progreso', address: 'Dirección protegida', description: 'Se necesita retirar escombros que bloquean la entrada de una vivienda.', category: 'Escombros', status: 'En progreso', priority: 'Alta', createdAt: '2026-08-12T16:30:00-05:00', location: { latitude: 4.897, longitude: -75.881 }, requestPhotoName: 'escombros-vivienda.jpg' },
  { id: 'LVR-2026-000125', fullName: 'Dato protegido', documentType: 'Cédula de extranjería', documentNumber: 'PROTEGIDO', phone: 'PROTEGIDO', neighborhood: 'La Playa', address: 'Dirección protegida', description: 'Adultos mayores requieren kits de aseo y elementos de limpieza.', category: 'Implementos de aseo', status: 'Sin atender', priority: 'Media', createdAt: '2026-08-11T11:00:00-05:00', location: { latitude: 4.891, longitude: -75.879 } },
  { id: 'LVR-2026-000126', fullName: 'Dato protegido', documentType: 'Cédula de ciudadanía', documentNumber: 'PROTEGIDO', phone: 'PROTEGIDO', neighborhood: 'Alfonso López', address: 'Dirección protegida', description: 'Entrega de juguetes para niñas y niños de familias afectadas.', category: 'Juguetes', status: 'Completada', priority: 'Baja', createdAt: '2026-08-10T08:20:00-05:00', location: { latitude: 4.899, longitude: -75.886 } },
]

export const initialAdmins: AdminUser[] = [
  { id: 'ADM-001', name: 'Administrador principal', email: 'admin@ayudaslavirginia.co', active: true },
]

export const initialChanges: ChangeRequest[] = [
  { id: 'CAM-001', requestId: 'LVR-2026-000124', requestedStatus: 'En progreso', requestedBy: 'Brigada comunitaria', evidencePhotoName: 'evidencia-escombros.jpg', signature: 'Firma registrada', createdAt: '2026-08-13T10:20:00-05:00', state: 'Pendiente' },
]
