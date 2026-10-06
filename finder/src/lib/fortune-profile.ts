export const FORTUNE_BIRTH_STORAGE_KEY = 'nearby-table:fortune-birth-date:v1'
export const MINIMUM_FORTUNE_AGE = 19

export interface StoredFortuneBirthDate {
  birthDate: string
  version: 1
}

export function formatBirthDate(year: string, month: string, day: string) {
  return year && month && day
    ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    : ''
}

export function isValidBirthDate(value: string, todayKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    value <= todayKey
  )
}

export function getFortuneAge(value: string, todayKey: string): number | null {
  if (!isValidBirthDate(value, todayKey)) return null
  const [birthYear, birthMonth, birthDay] = value.split('-').map(Number)
  const [currentYear, currentMonth, currentDay] = todayKey.split('-').map(Number)
  const birthdayHasPassed =
    currentMonth > birthMonth ||
    (currentMonth === birthMonth && currentDay >= birthDay)
  return currentYear - birthYear - (birthdayHasPassed ? 0 : 1)
}

export function isAtLeastNineteen(value: string, todayKey: string) {
  const age = getFortuneAge(value, todayKey)
  return age !== null && age >= MINIMUM_FORTUNE_AGE
}

export function parseFortuneBirthDate(
  value: string | null,
  todayKey: string,
): StoredFortuneBirthDate | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
      !('version' in parsed) || parsed.version !== 1 ||
      !('birthDate' in parsed) || typeof parsed.birthDate !== 'string' ||
      !isAtLeastNineteen(parsed.birthDate, todayKey)
    ) return null
    return { version: 1, birthDate: parsed.birthDate }
  } catch {
    return null
  }
}
