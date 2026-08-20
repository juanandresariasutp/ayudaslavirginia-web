import type { Category, Priority, Status } from '../types'

export const PAGE_SIZE = 25
export const MAP_DEFAULT_ZOOM = 15
export const MAP_SELECTED_ZOOM = 17

export const categories: Array<'Todas' | Category> = [
  'Todas',
  'Alimentos',
  'Escombros',
  'Mudanza y acarreo',
  'Implementos de aseo',
  'Juguetes',
  'Salud',
  'Alojamiento',
  'Ropa',
  'Reconstrucción',
  'Otros'
]

export const photoRequiredCategories: Category[] = [
  'Escombros',
  'Mudanza y acarreo',
  'Reconstrucción'
]

export const categoryRequiresPhoto = (category: Category): boolean =>
  photoRequiredCategories.includes(category)

export const statuses: Array<'Activas' | Status> = [
  'Activas',
  'Sin atender',
  'En progreso',
  'Completada'
]

export const priorities: Array<'Todas' | Priority> = [
  'Todas',
  'Crítica',
  'Alta',
  'Media',
  'Baja'
]

export const priorityWeight: Record<Priority, number> = {
  Crítica: 0,
  Alta: 1,
  Media: 2,
  Baja: 3
}

export const categoryToDb: Record<Category, string> = {
  Alimentos: 'food',
  Escombros: 'debris',
  'Mudanza y acarreo': 'moving',
  'Implementos de aseo': 'cleaning_supplies',
  Juguetes: 'toys',
  Salud: 'health',
  Alojamiento: 'shelter',
  Ropa: 'clothing',
  Reconstrucción: 'reconstruction',
  Otros: 'other'
}

export const dbToCategory: Record<string, Category> = Object.fromEntries(
  Object.entries(categoryToDb).map(([key, value]) => [value, key])
) as Record<string, Category>

export const priorityToDb: Record<Priority, string> = {
  Crítica: 'critical',
  Alta: 'high',
  Media: 'medium',
  Baja: 'low'
}

export const dbToPriority: Record<string, Priority> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
}

export const dbToStatus: Record<string, Status> = {
  pending: 'Sin atender',
  in_progress: 'En progreso',
  completed: 'Completada'
}

export const LA_VIRGINIA_NEIGHBORHOODS: string[] = [
  'Alfonso López',
  'Bairon Gaviria',
  'Balsillas',
  'Bavaria',
  'Buenos Aires',
  'El Ciprés',
  'El Edén',
  'El Prado',
  'El Progreso',
  'Expansión Norte',
  'Los Gavilanes',
  'La Magdalena',
  'La Playa',
  'Las Américas',
  'Los Libertadores',
  'Los Almendros',
  'Luis Carlos Galán',
  'Obrero',
  'Pedro Pablo Bello',
  'Pío XII',
  'Portobelo',
  'Restrepo',
  'San Antonio',
  'San Carlos',
  'San Cayetano',
  'San Fernando',
  'Santa Fe',
  'Siete de Enero',
  'Sigifredo Zuleta',
  'Tangarife I',
  'Tangarife II',
  'Zona Centro',
  'La Milagrosa',
  'Portal de La Virginia'
]

export const NEIGHBORHOOD_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Alfonso López': { latitude: 4.897, longitude: -75.8845 },
  'Bairon Gaviria': { latitude: 4.903, longitude: -75.881 },
  Balsillas: { latitude: 4.892, longitude: -75.885 },
  Bavaria: { latitude: 4.8985, longitude: -75.8815 },
  'Buenos Aires': { latitude: 4.901, longitude: -75.883 },
  'El Ciprés': { latitude: 4.896, longitude: -75.88 },
  'El Edén': { latitude: 4.9025, longitude: -75.8805 },
  'El Prado': { latitude: 4.8975, longitude: -75.8855 },
  'El Progreso': { latitude: 4.904, longitude: -75.882 },
  'Expansión Norte': { latitude: 4.908, longitude: -75.88 },
  'Los Gavilanes': { latitude: 4.9, longitude: -75.886 },
  'La Magdalena': { latitude: 4.895, longitude: -75.8835 },
  'La Playa': { latitude: 4.8965, longitude: -75.8865 },
  'Las Américas': { latitude: 4.9015, longitude: -75.879 },
  'Los Libertadores': { latitude: 4.894, longitude: -75.881 },
  'Los Almendros': { latitude: 4.899, longitude: -75.8795 },
  'Luis Carlos Galán': { latitude: 4.9035, longitude: -75.8785 },
  Obrero: { latitude: 4.898, longitude: -75.883 },
  'Pedro Pablo Bello': { latitude: 4.9005, longitude: -75.8845 },
  'Pío XII': { latitude: 4.8955, longitude: -75.8825 },
  Portobelo: { latitude: 4.905, longitude: -75.881 },
  Restrepo: { latitude: 4.8995, longitude: -75.885 },
  'San Antonio': { latitude: 4.8935, longitude: -75.884 },
  'San Carlos': { latitude: 4.8978, longitude: -75.882 },
  'San Cayetano': { latitude: 4.902, longitude: -75.884 },
  'San Fernando': { latitude: 4.8982, longitude: -75.886 },
  'Santa Fe': { latitude: 4.8945, longitude: -75.8855 },
  'Siete de Enero': { latitude: 4.906, longitude: -75.883 },
  'Sigifredo Zuleta': { latitude: 4.9045, longitude: -75.8795 },
  'Tangarife I': { latitude: 4.896, longitude: -75.878 },
  'Tangarife II': { latitude: 4.897, longitude: -75.8775 },
  'Zona Centro': { latitude: 4.8998, longitude: -75.8824 },
  'La Milagrosa': { latitude: 4.9012, longitude: -75.8865 },
  'Portal de La Virginia': { latitude: 4.907, longitude: -75.8815 }
}

export function getNeighborhoodLocation(
  neighborhoodName: string
): { latitude: number; longitude: number } | null {
  const norm = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const key = norm(neighborhoodName)
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDINATES)) {
    if (norm(name) === key) return coords
  }
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDINATES)) {
    if (norm(name).includes(key) || key.includes(norm(name))) return coords
  }
  return null
}


