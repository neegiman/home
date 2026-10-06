export function formatStraightLineDistance(distanceInMeters: number) {
  if (distanceInMeters < 1_000) {
    return `직선거리 ${distanceInMeters}m`
  }

  const distanceInKilometers = Number((distanceInMeters / 1_000).toFixed(1))
  return `직선거리 ${distanceInKilometers}km`
}
