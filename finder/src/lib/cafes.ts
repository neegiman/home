import officeBusinessSnapshot from '@/data/office-businesses.generated.json'
import type { Cafe } from '@/types/cafe'

const EARTH_RADIUS_METERS = 6_371_000
const CAFE_RECOMMENDATION_RADIUS_METERS = 500
const CAFE_RECOMMENDATION_LIMIT = 3

interface CafeLocation {
  lat: number
  lng: number
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function getDistanceInMeters(start: CafeLocation, end: CafeLocation) {
  const latitudeDelta = toRadians(end.lat - start.lat)
  const longitudeDelta = toRadians(end.lng - start.lng)
  const startLatitude = toRadians(start.lat)
  const endLatitude = toRadians(end.lat)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

export function getNearbyCafes(location: CafeLocation): Cafe[] {
  return officeBusinessSnapshot.cafes
    .flatMap((cafe) => {
      const distance = Math.round(getDistanceInMeters(location, cafe))

      if (distance > CAFE_RECOMMENDATION_RADIUS_METERS) {
        return []
      }

      return [
        {
          id: cafe.id,
          name: cafe.name,
          roadAddress: cafe.roadAddress,
          lat: cafe.lat,
          lng: cafe.lng,
          distance,
        },
      ]
    })
    .toSorted((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, 'ko'))
    .slice(0, CAFE_RECOMMENDATION_LIMIT)
}
