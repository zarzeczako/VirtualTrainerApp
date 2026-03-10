export const EARTH_RADIUS_METERS = 6371000
export const CENTER_EPSILON = 0.00001

const toRadians = (value: number) => (value * Math.PI) / 180

export const centersMatch = (
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
) =>
  Math.abs(a.lat - b.lat) < CENTER_EPSILON && Math.abs(a.lng - b.lng) < CENTER_EPSILON

export const calculateDistanceMeters = (
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
) => {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}
