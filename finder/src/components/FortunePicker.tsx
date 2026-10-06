'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { MenuPreview } from '@/components/MenuPreview'
import {
  buildKakaoWalkingDirectionsUrl,
  openKakaoWalkingDirections,
} from '@/lib/kakao-directions'
import { formatStraightLineDistance } from '@/lib/distance'
import { getTodayKey } from '@/lib/browser-history'
import {
  FORTUNE_BIRTH_STORAGE_KEY,
  MINIMUM_FORTUNE_AGE,
  formatBirthDate,
  getFortuneAge,
  isAtLeastNineteen,
  isValidBirthDate,
  parseFortuneBirthDate,
  type StoredFortuneBirthDate,
} from '@/lib/fortune-profile'
import type { Location, Restaurant } from '@/types/restaurant'

const FORTUNE_FLOWS = [
  '익숙한 일상 속에서 뜻밖의 만족을 발견하는 날이에요.',
  '작은 선택 하나가 하루의 기분을 산뜻하게 바꿔줄 수 있어요.',
  '느긋하게 움직일수록 좋은 흐름이 자연스럽게 따라와요.',
  '새로운 취향을 만날 가능성이 평소보다 높은 날이에요.',
  '든든한 에너지가 필요한 순간에 반가운 선택지가 나타나요.',
  '좋은 대화와 맛있는 한 끼가 함께 찾아올 운이에요.',
  '첫 느낌을 믿으면 고민보다 만족이 커지는 날이에요.',
  '가까운 곳에 생각보다 잘 맞는 행운이 기다리고 있어요.',
  '평소 지나치던 선택지가 오늘은 특별하게 다가올 수 있어요.',
  '편안한 리듬을 지키면 작은 즐거움이 오래 남는 날이에요.',
  '마음이 끌리는 방향에 오늘의 좋은 기운이 모여 있어요.',
  '가볍게 시작한 선택이 의외의 만족으로 이어질 수 있어요.',
] as const

const FORTUNE_ACTIONS = [
  '메뉴판을 오래 보기보다 첫눈에 들어온 선택을 믿어보세요.',
  '평소 자주 고르지 않던 맛에 한 번 마음을 열어보세요.',
  '서두르지 말고 한입씩 천천히 즐기면 운이 더 좋아져요.',
  '누군가와 함께라면 서로의 메뉴를 조금씩 나눠보세요.',
  '익숙한 메뉴에 작은 변화를 더하면 기분 전환이 될 거예요.',
  '오늘만큼은 칼로리보다 마음이 원하는 쪽을 골라도 좋아요.',
  '따뜻한 메뉴부터 시작하면 하루의 리듬이 편안해져요.',
  '가장 가까운 곳보다 조금 더 끌리는 곳을 선택해 보세요.',
  '색감이 마음에 드는 메뉴가 좋은 기운을 불러올 수 있어요.',
  '식사 뒤 짧은 산책을 더하면 오늘의 행운이 오래 머물러요.',
] as const

const FOOD_COMPATIBILITIES = [
  '담백한 맛이 복잡한 생각을 가볍게 정리해 줄 거예요.',
  '따뜻한 온기가 긴장을 풀고 좋은 대화를 불러와요.',
  '바삭한 식감이 처진 기분에 경쾌한 자극을 더해줘요.',
  '매콤한 한입이 새로운 활력과 용기를 채워줄 수 있어요.',
  '풍성한 향이 오늘의 만족도를 한 단계 높여줄 거예요.',
  '익숙한 맛이 마음을 안정시키고 집중력을 되찾게 해줘요.',
  '새콤한 포인트가 답답한 흐름을 산뜻하게 환기해 줘요.',
  '든든한 양이 필요한 에너지를 차분히 채워줄 거예요.',
  '부드러운 식감이 서두르던 마음에 여유를 만들어줘요.',
  '다채로운 재료가 예상하지 못한 즐거움을 선물할 거예요.',
] as const

const LUCKY_KEYWORDS = [
  '첫 느낌',
  '따뜻한 온기',
  '바삭한 한입',
  '새로운 발견',
  '느긋한 식사',
  '좋은 대화',
  '가까운 골목',
  '작은 도전',
  '선명한 색감',
  '든든한 포만감',
  '기분 좋은 향',
  '식후 산책',
] as const

const ZODIAC_SIGNS = [
  '염소자리',
  '물병자리',
  '물고기자리',
  '양자리',
  '황소자리',
  '쌍둥이자리',
  '게자리',
  '사자자리',
  '처녀자리',
  '천칭자리',
  '전갈자리',
  '사수자리',
] as const

const ZODIAC_CUTOFF_DAYS = [20, 19, 20, 20, 21, 21, 22, 22, 22, 23, 22, 22]
const BIRTH_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const BIRTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

interface FortuneResult {
  actionIndex: number
  birthDate: string
  compatibilityIndex: number
  flowIndex: number
  keywordIndex: number
  poolKey: string
  restaurantId: number
}

interface FortunePickerProps {
  isLoading: boolean
  location: Location
  restaurants: Restaurant[]
  todayKey: string
}

function hashSeed(value: string) {
  let hash = 2_166_136_261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return hash >>> 0
}

function getSeedIndex(seed: number, key: string, length: number) {
  return hashSeed(`${seed}|${key}`) % length
}

function getZodiacSign(birthDate: string) {
  const [, month, day] = birthDate.split('-').map(Number)
  const signIndex = day < ZODIAC_CUTOFF_DAYS[month - 1] ? month - 1 : month

  return ZODIAC_SIGNS[signIndex % ZODIAC_SIGNS.length]
}

export function FortunePicker({
  isLoading,
  location,
  restaurants,
  todayKey,
}: FortunePickerProps) {
  const latestBirthYear = Number(todayKey.slice(0, 4)) - MINIMUM_FORTUNE_AGE
  const birthYears = Array.from(
    { length: latestBirthYear - 1900 + 1 },
    (_, index) => latestBirthYear - index,
  )
  const [blockedDirectionsId, setBlockedDirectionsId] = useState<number | null>(null)
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FortuneResult | null>(null)
  const [rememberedBirthDate, setRememberedBirthDate] = useState<string | null>(null)
  const [storageNotice, setStorageNotice] = useState<string | null>(null)
  const birthDate = formatBirthDate(birthYear, birthMonth, birthDay)
  const rememberedAge = rememberedBirthDate
    ? getFortuneAge(rememberedBirthDate, todayKey)
    : null
  const daysInSelectedMonth =
    birthYear && birthMonth
      ? new Date(Number(birthYear), Number(birthMonth), 0).getDate()
      : 31
  const poolKey = `${todayKey}:${location.lat}:${location.lng}:${restaurants
    .map((restaurant) => restaurant.id)
    .join(',')}`
  const recommendedRestaurant =
    result?.poolKey === poolKey && result.birthDate === birthDate
      ? (restaurants.find((restaurant) => restaurant.id === result.restaurantId) ??
        null)
      : null

  useEffect(() => {
    try {
      // Read only after hydration; the exported page has no browser storage.
      const saved = parseFortuneBirthDate(
        window.localStorage.getItem(FORTUNE_BIRTH_STORAGE_KEY),
        getTodayKey(),
      )
      if (!saved) return
      const [year, month, day] = saved.birthDate.split('-')
      setBirthYear(year)
      setBirthMonth(String(Number(month)))
      setBirthDay(String(Number(day)))
      setRememberedBirthDate(saved.birthDate)
    } catch {
      setStorageNotice('브라우저 저장소를 사용할 수 없어 이번 화면에서만 입력할 수 있어요.')
    }
  }, [])

  function rememberBirthDate(value: string) {
    if (!isAtLeastNineteen(value, todayKey)) return
    const payload: StoredFortuneBirthDate = { version: 1, birthDate: value }
    try {
      window.localStorage.setItem(FORTUNE_BIRTH_STORAGE_KEY, JSON.stringify(payload))
      setRememberedBirthDate(value)
      setStorageNotice(null)
    } catch {
      setStorageNotice('생년월일을 저장하지 못했어요. 운세는 이번 화면에서 그대로 볼 수 있어요.')
    }
  }

  function updateBirthDate(year: string, month: string, day: string) {
    const validDay = year && month && day &&
      Number(day) > new Date(Number(year), Number(month), 0).getDate() ? '' : day
    setBirthYear(year)
    setBirthMonth(month)
    setBirthDay(validDay)
    setError(null)
    rememberBirthDate(formatBirthDate(year, month, validDay))
  }

  function forgetBirthDate() {
    try {
      window.localStorage.removeItem(FORTUNE_BIRTH_STORAGE_KEY)
    } catch {
      setStorageNotice('저장된 생년월일을 삭제하지 못했어요. 브라우저의 저장소 설정을 확인해 주세요.')
      return
    }
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setRememberedBirthDate(null)
    setResult(null)
    setError(null)
    setBlockedDirectionsId(null)
    setStorageNotice('저장된 생년월일을 삭제했어요.')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isValidBirthDate(birthDate, todayKey)) {
      setError(
        birthDate
          ? '오늘 이전의 올바른 생년월일을 선택해 주세요.'
          : '태어난 연도, 월, 일을 모두 선택해 주세요.',
      )
      setResult(null)
      return
    }

    if (!isAtLeastNineteen(birthDate, todayKey)) {
      setError('운세 추천은 만 19세 이상만 이용할 수 있어요.')
      setResult(null)
      return
    }

    rememberBirthDate(birthDate)

    if (restaurants.length === 0) {
      setError('현재 조건에서 추천할 음식점이 없어요.')
      setResult(null)
      return
    }

    const seed = hashSeed(`${birthDate}|${todayKey}|${poolKey}`)
    const restaurant =
      restaurants[getSeedIndex(seed, 'restaurant', restaurants.length)]

    setError(null)
    setResult({
      actionIndex: getSeedIndex(seed, 'action', FORTUNE_ACTIONS.length),
      birthDate,
      compatibilityIndex: getSeedIndex(
        seed,
        'compatibility',
        FOOD_COMPATIBILITIES.length,
      ),
      flowIndex: getSeedIndex(seed, 'flow', FORTUNE_FLOWS.length),
      keywordIndex: getSeedIndex(seed, 'keyword', LUCKY_KEYWORDS.length),
      poolKey,
      restaurantId: restaurant.id,
    })
  }

  return (
    <section className="fortune-picker" aria-labelledby="fortune-picker-title">
      <div className="fortune-heading">
        <span className="fortune-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m12 2 1.55 5.05L18.5 8.5l-4.95 1.45L12 15l-1.55-5.05L5.5 8.5l4.95-1.45L12 2Z" />
            <path d="m18.5 14 .85 2.65L22 17.5l-2.65.85L18.5 21l-.85-2.65L15 17.5l2.65-.85L18.5 14Z" />
          </svg>
        </span>
        <span>
          <strong id="fortune-picker-title">오늘의 음식 운세</strong>
          <small>
            만 19세 이상 생년월일로 재미 삼아 오늘의 한 끼를 추천해 드려요.
          </small>
        </span>
      </div>

      <form className="fortune-form" onSubmit={handleSubmit}>
        <fieldset className="fortune-birth-fields">
          <legend>생년월일</legend>
          <div className="fortune-birth-selects">
            <label>
              <span className="sr-only">태어난 연도</span>
              <select
                aria-describedby="fortune-age-note fortune-privacy"
                autoComplete="bday-year"
                onChange={(event) => updateBirthDate(event.target.value, birthMonth, birthDay)}
                value={birthYear}
              >
                <option value="">연도</option>
                {birthYears.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">태어난 월</span>
              <select
                aria-describedby="fortune-age-note fortune-privacy"
                autoComplete="bday-month"
                disabled={!birthYear}
                onChange={(event) => updateBirthDate(birthYear, event.target.value, birthDay)}
                value={birthMonth}
              >
                <option value="">월</option>
                {BIRTH_MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">태어난 일</span>
              <select
                aria-describedby="fortune-age-note fortune-privacy"
                autoComplete="bday-day"
                disabled={!birthMonth}
                onChange={(event) => updateBirthDate(birthYear, birthMonth, event.target.value)}
                value={birthDay}
              >
                <option value="">일</option>
                {BIRTH_DAYS.slice(0, daysInSelectedMonth).map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <div className="fortune-form-row">
          <button disabled={isLoading || restaurants.length === 0} type="submit">
            {isLoading ? '음식점 찾는 중…' : '운세 맛집 보기'}
          </button>
        </div>
      </form>

      {rememberedBirthDate ? (
        <div className="fortune-memory">
          <span>
            <span aria-hidden="true">✓ </span>
            {birthDate === rememberedBirthDate
              ? `만 ${rememberedAge}세 · 이 브라우저에 기억했어요`
              : '이전에 입력한 생년월일을 기억하고 있어요'}
          </span>
          <button aria-label="저장된 생년월일 삭제" onClick={forgetBirthDate} type="button">
            저장 정보 삭제
          </button>
        </div>
      ) : null}
      {storageNotice ? <p className="fortune-storage-notice" role="status">{storageNotice}</p> : null}

      <div className="fortune-content" aria-live="polite">
        {recommendedRestaurant && result ? (
          <article className="fortune-result">
            <span className="fortune-kicker">
              오늘의 {getZodiacSign(result.birthDate)} 미식 운세
            </span>
            <p className="fortune-reading">
              {FORTUNE_FLOWS[result.flowIndex]}{' '}
              {FORTUNE_ACTIONS[result.actionIndex]}
            </p>
            <div className="fortune-signals">
              <span>
                <small>오늘의 음식 궁합</small>
                <span>
                  <strong>{recommendedRestaurant.categoryName}</strong> 메뉴의{' '}
                  {FOOD_COMPATIBILITIES[result.compatibilityIndex]}
                </span>
              </span>
              <span>
                <small>행운 키워드</small>
                <strong>#{LUCKY_KEYWORDS[result.keywordIndex]}</strong>
              </span>
            </div>
            <div className="fortune-restaurant">
                <span className="fortune-restaurant-copy">
                  <small>오늘의 운세픽</small>
                  <strong>{recommendedRestaurant.name}</strong>
                  <span className="fortune-restaurant-meta">
                    {formatStraightLineDistance(recommendedRestaurant.distance)} ·{' '}
                    {recommendedRestaurant.roadAddress}
                  </span>
                  <MenuPreview
                    menus={recommendedRestaurant.menus}
                    tone="fortune"
                  />
                </span>
              <button
                onClick={() => {
                  const opened = openKakaoWalkingDirections(location, recommendedRestaurant)
                  setBlockedDirectionsId(opened ? null : recommendedRestaurant.id)
                }}
                type="button"
              >
                카카오맵 도보 길찾기
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            {blockedDirectionsId === recommendedRestaurant.id ? (
              <a
                className="fortune-directions-fallback"
                href={buildKakaoWalkingDirectionsUrl(location, recommendedRestaurant)}
                rel="noopener noreferrer"
                target="_blank"
              >
                새 탭이 차단됐어요. 카카오맵에서 도보 길찾기 열기
              </a>
            ) : null}
          </article>
        ) : (
          <p className="fortune-placeholder">
            만 19세 이상 생년월일을 선택하면 현재 선택 반경에서 한 곳을
            골라드려요.
          </p>
        )}
      </div>

      {error ? (
        <p className="fortune-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="fortune-privacy" id="fortune-age-note">
        운세 추천은 만 19세 이상만 이용할 수 있어요.
      </p>
      <p className="fortune-privacy" id="fortune-privacy">
        생년월일을 모두 선택하면 이 브라우저에만 자동 저장돼요. 서버로 전송하지 않으며,
        저장 정보 삭제로 지울 수 있어요. 운세는 재미로만 확인해 주세요.
      </p>
    </section>
  )
}
