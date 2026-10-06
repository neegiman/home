import type { Location, Restaurant } from '@/types/restaurant'

type RouteDestination = Pick<Restaurant, 'name' | 'lat' | 'lng'>

function buildPlaceSegment(name: string, lat: number, lng: number) {
  return `${encodeURIComponent(name)},${lat},${lng}`
}

export function buildKakaoWalkingDirectionsUrl(
  location: Location,
  destination: RouteDestination,
) {
  const origin = buildPlaceSegment(location.label ?? '출발지', location.lat, location.lng)
  const endpoint = buildPlaceSegment(destination.name, destination.lat, destination.lng)

  // Official link supports both desktop and mobile web without a map SDK/API key.
  return `https://map.kakao.com/link/by/walk/${origin}/${endpoint}`
}

export function openKakaoWalkingDirections(
  location: Location,
  destination: RouteDestination,
) {
  const directionsTab = window.open(
    buildKakaoWalkingDirectionsUrl(location, destination),
    '_blank',
  )

  if (directionsTab) {
    directionsTab.opener = null
    return true
  }

  return false
}
