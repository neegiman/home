export type CafeSelectionCounts = Record<string, number>

export const CAFE_SELECTION_STORAGE_KEY = 'nearby-table:cafe-selections:v1'

export function parseCafeSelectionCounts(value: string | null): CafeSelectionCounts {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
      !('version' in parsed) || parsed.version !== 1 || !('counts' in parsed) ||
      typeof parsed.counts !== 'object' || parsed.counts === null || Array.isArray(parsed.counts)
    ) {
      return {}
    }

    const counts: CafeSelectionCounts = {}
    for (const [id, count] of Object.entries(parsed.counts)) {
      if (
        /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0 &&
        typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
      ) {
        counts[id] = count
      }
    }
    return counts
  } catch {
    return {}
  }
}
