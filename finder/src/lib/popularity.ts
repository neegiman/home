const POPULARITY_THRESHOLDS = [1, 3, 6, 11, 21] as const

export function getPopularityStars(selectionCount: number) {
  return POPULARITY_THRESHOLDS.filter(
    (threshold) => selectionCount >= threshold,
  ).length
}
