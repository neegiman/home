export interface StoredSelection {
  date: string
  today: number
  total: number
}

export type SelectionStats = Record<string, StoredSelection>

export interface StoredLunchExclusionPayload {
  date: string
  restaurantIds: number[]
  version: 1
}

export function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

export function parseSelectionStats(value: string | null): SelectionStats {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.selections)) {
      return {}
    }

    const selections: SelectionStats = {}
    for (const [id, record] of Object.entries(parsed.selections)) {
      if (
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0 &&
        isRecord(record) &&
        typeof record.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
        isCount(record.today) &&
        isCount(record.total) &&
        record.today <= record.total
      ) {
        selections[id] = {
          date: record.date,
          today: record.today,
          total: record.total,
        }
      }
    }
    return selections
  } catch {
    return {}
  }
}

export function parseLunchExclusions(
  value: string | null,
  today = getTodayKey(),
): StoredLunchExclusionPayload {
  const empty: StoredLunchExclusionPayload = {
    date: today,
    restaurantIds: [],
    version: 1,
  }
  if (!value) return empty

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      parsed.date !== today ||
      !Array.isArray(parsed.restaurantIds)
    ) {
      return empty
    }

    return {
      ...empty,
      restaurantIds: [...new Set(parsed.restaurantIds.filter(
        (id): id is number => Number.isSafeInteger(id) && id > 0,
      ))],
    }
  } catch {
    return empty
  }
}
