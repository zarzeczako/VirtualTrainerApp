export type NotificationType = 'info' | 'error'

export interface NotificationMessage {
  type: NotificationType
  message: string
}

export interface GymMarker {
  id: string
  name: string
  position: google.maps.LatLngLiteral
  address?: string
  rating?: number
  totalRatings?: number
  mapsUrl?: string
  distanceMeters?: number
}

export interface PoiSelection {
  id: string
  name: string
  position: google.maps.LatLngLiteral
  address?: string
  rating?: number
  totalRatings?: number
  mapsUrl?: string
  photoUrl?: string
  priceLevelText?: string
  isOpenText?: string
  category?: string
}

export interface ResultsMeta {
  center: google.maps.LatLngLiteral
  radius: number
}
