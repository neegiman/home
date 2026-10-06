import {
  OFFICE_DATA_CHECKED_AT,
  OFFICE_RESTAURANTS,
} from '@/data/office-restaurants'
import type { Category, Radius, Restaurant } from '@/types/restaurant'

const EARTH_RADIUS_METERS = 6_371_000

interface SearchRestaurantsInput {
  lat: number
  lng: number
  radius: Radius
  category: Category
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function getDistanceInMeters(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
) {
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

export function searchRestaurants({
  lat,
  lng,
  radius,
  category,
}: SearchRestaurantsInput): Restaurant[] {
  return OFFICE_RESTAURANTS.flatMap((restaurant) => {
    const distance = Math.round(
      getDistanceInMeters(
        { lat, lng },
        { lat: restaurant.lat, lng: restaurant.lng },
      ),
    )

    if (
      distance > radius ||
      (category !== 'ALL' && restaurant.categoryCode !== category)
    ) {
      return []
    }

    return [
      {
        ...restaurant,
        distance,
        selectionCount: 0,
        todaySelectionCount: 0,
        popularityStars: 0,
        menus: restaurant.menus.map((item, index) => ({
          ...item,
          id: restaurant.id * 10 + index + 1,
        })),
      },
    ]
  }).toSorted((a, b) => a.distance - b.distance || a.id - b.id)
}

export { OFFICE_DATA_CHECKED_AT }
