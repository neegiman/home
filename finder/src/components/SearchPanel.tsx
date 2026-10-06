'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CategorySelector } from '@/components/CategorySelector'
import { DailyRanking } from '@/components/DailyRanking'
import { FortunePicker } from '@/components/FortunePicker'
import { RandomPicker } from '@/components/RandomPicker'
import { RadiusSelector } from '@/components/RadiusSelector'
import { RestaurantList } from '@/components/RestaurantList'
import {
  OFFICE_DATA_CHECKED_AT,
  OFFICE_LOCATION,
} from '@/data/office-restaurants'
import { getNearbyCafes } from '@/lib/cafes'
import {
  getTodayKey,
  parseLunchExclusions,
  parseSelectionStats,
  type SelectionStats,
  type StoredLunchExclusionPayload,
  type StoredSelection,
} from '@/lib/browser-history'
import { getPopularityStars } from '@/lib/popularity'
import { searchRestaurants } from '@/lib/restaurants'
import {
  CATEGORY_LABELS,
  type Category,
  type Radius,
  type Restaurant,
} from '@/types/restaurant'

const SELECTION_STORAGE_KEY = 'nearby-table:office-selections:v1'
const LUNCH_EXCLUSION_STORAGE_KEY = 'nearby-table:lunch-exclusions:v1'
const [DATA_YEAR, DATA_MONTH, DATA_DAY] = OFFICE_DATA_CHECKED_AT.split('-')
const DATA_NOTICE = `${DATA_YEAR}년 ${Number(DATA_MONTH)}월 ${Number(DATA_DAY)}일 조회한 갈월동 오피스 주변 매장정보를 보여드려요.`

interface Notice {
  message: string
  tone: 'info' | 'error' | 'success'
}

interface StoredSelectionPayload {
  selections: Record<string, StoredSelection>
  version: 1
}

function loadSelectionStats(): SelectionStats {
  return parseSelectionStats(window.localStorage.getItem(SELECTION_STORAGE_KEY))
}

function saveSelectionStats(selections: SelectionStats) {
  const payload: StoredSelectionPayload = { selections, version: 1 }
  window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(payload))
}

function loadLunchExclusions() {
  return parseLunchExclusions(
    window.localStorage.getItem(LUNCH_EXCLUSION_STORAGE_KEY),
  )
}

function saveLunchExclusions(restaurantIds: number[]) {
  const payload: StoredLunchExclusionPayload = {
    date: getTodayKey(),
    restaurantIds,
    version: 1,
  }
  window.localStorage.setItem(
    LUNCH_EXCLUSION_STORAGE_KEY,
    JSON.stringify(payload),
  )
}

function applySelectionStats(
  restaurants: Restaurant[],
  selectionStats: SelectionStats,
  today: string,
) {

  return restaurants.map((restaurant) => {
    const stored = selectionStats[String(restaurant.id)]
    const selectionCount = stored?.total ?? 0

    return {
      ...restaurant,
      selectionCount,
      todaySelectionCount: stored?.date === today ? stored.today : 0,
      popularityStars: getPopularityStars(selectionCount),
    }
  })
}

export function SearchPanel() {
  const location = OFFICE_LOCATION
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isBrowseOpen, setIsBrowseOpen] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousStepRef = useRef(step)
  const [radius, setRadius] = useState<Radius>(1000)
  const [category, setCategory] = useState<Category>('ALL')
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([])
  const [randomRestaurants, setRandomRestaurants] = useState<Restaurant[]>([])
  const [selectedRandomRestaurantId, setSelectedRandomRestaurantId] = useState<
    number | null
  >(null)
  const [isChoosingRestaurant, setIsChoosingRestaurant] = useState(false)
  const [randomSelectionError, setRandomSelectionError] = useState<string | null>(
    null,
  )
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(
    null,
  )
  const [selectionStats, setSelectionStats] = useState<SelectionStats>({})
  const [todayKey, setTodayKey] = useState(OFFICE_DATA_CHECKED_AT)
  const [lunchExclusions, setLunchExclusions] =
    useState<StoredLunchExclusionPayload>(() => ({
      date: getTodayKey(), restaurantIds: [], version: 1,
    }))
  const [hasLoadedSelectionStats, setHasLoadedSelectionStats] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>({
    message: DATA_NOTICE,
    tone: 'info',
  })
  const restaurants = useMemo(
    () => applySelectionStats(restaurantResults, selectionStats, todayKey),
    [restaurantResults, selectionStats, todayKey],
  )
  const lunchEligibleRestaurants = useMemo(() => {
    const excludedIds = new Set(
      lunchExclusions.date === todayKey ? lunchExclusions.restaurantIds : [],
    )
    return restaurants.filter((restaurant) => !excludedIds.has(restaurant.id))
  }, [lunchExclusions, restaurants, todayKey])
  const dailyTopRestaurants = useMemo(
    () =>
      restaurants
        .filter((restaurant) => restaurant.todaySelectionCount > 0)
        .toSorted(
          (a, b) =>
            b.todaySelectionCount - a.todaySelectionCount ||
            b.selectionCount - a.selectionCount ||
            a.distance - b.distance,
        )
        .slice(0, 3),
    [restaurants],
  )
  const selectedRandomRestaurant = useMemo(
    () =>
      randomRestaurants.find(
        (restaurant) => restaurant.id === selectedRandomRestaurantId,
      ),
    [randomRestaurants, selectedRandomRestaurantId],
  )
  const nearbyCafes = useMemo(
    () =>
      selectedRandomRestaurant
        ? getNearbyCafes(selectedRandomRestaurant)
        : [],
    [selectedRandomRestaurant],
  )

  useEffect(() => {
    if (previousStepRef.current !== step) {
      stepHeadingRef.current?.focus()
      previousStepRef.current = step
    }
  }, [step])

  useEffect(() => {
    try {
      setTodayKey(getTodayKey())
      setSelectionStats(loadSelectionStats())
      setLunchExclusions(loadLunchExclusions())
    } catch {
      setNotice({
        message:
          '브라우저 저장소를 사용할 수 없어 이번 화면에서만 선택이 유지돼요.',
        tone: 'error',
      })
    } finally {
      setHasLoadedSelectionStats(true)
    }
  }, [])

  useEffect(() => {
    const refreshDate = () => setTodayKey(getTodayKey())
    const timer = window.setInterval(refreshDate, 30_000)
    window.addEventListener('focus', refreshDate)
    document.addEventListener('visibilitychange', refreshDate)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDate)
      document.removeEventListener('visibilitychange', refreshDate)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedSelectionStats) {
      return
    }

    function loadRestaurants() {
      setStep(1)
      setIsLoading(true)
      setApiError(null)
      setRestaurantResults([])
      setRandomRestaurants([])
      setSelectedRandomRestaurantId(null)
      setRandomSelectionError(null)
      setSelectedRestaurantId(null)

      try {
        // The public snapshot is bundled with the page, so GitHub Pages does
        // not need a Next.js API server or expose any private API keys.
        setRestaurantResults(searchRestaurants({
          lat: location.lat,
          lng: location.lng,
          radius,
          category,
        }))
      } catch (error) {
        setRestaurantResults([])
        setApiError(
          error instanceof Error
            ? error.message
            : '음식점 정보를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadRestaurants()
  }, [category, hasLoadedSelectionStats, location.lat, location.lng, radius, searchVersion])

  const handleRestaurantSelect = useCallback((id: number) => {
    setSelectedRestaurantId(id)
  }, [])

  function handleRandomPick() {
    const today = getTodayKey()
    setTodayKey(today)
    const excludedIds = new Set(
      lunchExclusions.date === today ? lunchExclusions.restaurantIds : [],
    )
    const eligibleRestaurants = restaurants.filter(
      (restaurant) => !excludedIds.has(restaurant.id),
    )
    if (eligibleRestaurants.length === 0) {
      return
    }

    const previousIds = new Set(
      randomRestaurants.map((restaurant) => restaurant.id),
    )
    const freshRestaurants = eligibleRestaurants.filter(
      (restaurant) => !previousIds.has(restaurant.id),
    )
    const pool =
      freshRestaurants.length >= 2
        ? freshRestaurants
        : eligibleRestaurants
    const shuffled = [...pool]

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ]
    }

    setRandomRestaurants(shuffled.slice(0, Math.min(2, shuffled.length)))
    setSelectedRandomRestaurantId(null)
    setRandomSelectionError(null)
    setSelectedRestaurantId(null)
    setStep(2)
    setNotice({ message: DATA_NOTICE, tone: 'info' })
  }

  function handleBackToTaste() {
    if (isChoosingRestaurant) return
    setStep(1)
    setSelectedRandomRestaurantId(null)
    setRandomSelectionError(null)
    setNotice({ message: DATA_NOTICE, tone: 'info' })
  }

  function handleLunchUnavailable(restaurantId: number) {
    if (selectedRandomRestaurantId !== null || isChoosingRestaurant) {
      return
    }

    const restaurant = randomRestaurants.find(
      (candidate) => candidate.id === restaurantId,
    )
    if (!restaurant) return
    const today = getTodayKey()
    const currentExcludedIds =
      lunchExclusions.date === today ? lunchExclusions.restaurantIds : []
    const nextExcludedIds = [...new Set([...currentExcludedIds, restaurantId])]

    try {
      saveLunchExclusions(nextExcludedIds)
      setLunchExclusions({date: today, restaurantIds: nextExcludedIds, version: 1})
      setTodayKey(today)

      const currentCandidateIds = new Set(
        randomRestaurants
          .filter((candidate) => candidate.id !== restaurantId)
          .map((candidate) => candidate.id),
      )
      const excludedIds = new Set(nextExcludedIds)
      const replacementPool = restaurants.filter(
        (candidate) =>
          !excludedIds.has(candidate.id) &&
          !currentCandidateIds.has(candidate.id),
      )
      const replacement =
        replacementPool[
          Math.floor(Math.random() * Math.max(1, replacementPool.length))
        ]

      setRandomRestaurants((currentCandidates) =>
        currentCandidates.flatMap((candidate) => {
          if (candidate.id !== restaurantId) {
            return [candidate]
          }

          return replacement ? [replacement] : []
        }),
      )
      setRandomSelectionError(null)
      setNotice({
        message: replacement
          ? `${restaurant.name}을 오늘 점심 후보에서 제외하고 새 후보로 바꿨어요.`
          : `${restaurant.name}을 오늘 점심 후보에서 제외했어요. 더 교체할 후보가 없어요.`,
        tone: 'success',
      })
    } catch {
      setRandomSelectionError('점심 제외 정보를 브라우저에 저장하지 못했습니다.')
    }
  }

  async function handleRandomChoice(restaurantId: number) {
    if (selectedRandomRestaurantId !== null || isChoosingRestaurant) {
      return false
    }

    setIsChoosingRestaurant(true)
    setRandomSelectionError(null)

    try {
      const key = String(restaurantId)
      const today = getTodayKey()
      const current = selectionStats[key]
      const nextRecord: StoredSelection = {
        date: today,
        today: current?.date === today ? current.today + 1 : 1,
        total: (current?.total ?? 0) + 1,
      }
      const nextSelectionStats = {
        ...selectionStats,
        [key]: nextRecord,
      }

      let wasPersisted = true
      try {
        saveSelectionStats(nextSelectionStats)
      } catch {
        wasPersisted = false
      }
      setSelectionStats(nextSelectionStats)
      setTodayKey(today)

      const applySelection = (restaurant: Restaurant) =>
        restaurant.id === restaurantId
          ? {
              ...restaurant,
              selectionCount: nextRecord.total,
              todaySelectionCount: nextRecord.today,
              popularityStars: getPopularityStars(nextRecord.total),
            }
          : restaurant

      setRandomRestaurants((currentRestaurants) =>
        currentRestaurants.map(applySelection),
      )
      setSelectedRandomRestaurantId(restaurantId)
      setSelectedRestaurantId(restaurantId)
      setStep(3)
      setNotice({
        message: wasPersisted
          ? '선택했어요. 가까운 카페 추천과 길찾기를 확인해 보세요.'
          : '선택했어요. 저장소를 사용할 수 없어 이번 화면에서만 기록이 유지돼요.',
        tone: wasPersisted ? 'success' : 'info',
      })
      return true
    } catch {
      setRandomSelectionError('브라우저에 선택을 저장하지 못했습니다.')
      return false
    } finally {
      setIsChoosingRestaurant(false)
    }
  }

  const comparisonTitle = randomRestaurants.length === 1
    ? '가까운 한 곳을 찾았어요.'
    : randomRestaurants.length === 0
      ? '다른 취향도 골라볼까요?'
      : '마지막 고민은 둘 중 하나.'
  const stepTitles = ['오늘은 뭐가 당겨요?', comparisonTitle, '좋아요, 점심 결정 완료!']
  const stepCaptions = [
    '하나를 골라도, 아무거나 골라도 좋아요.',
    randomRestaurants.length === 1
      ? '이 조건에는 한 곳만 남아 있어요. 영업정보를 확인하고 선택해 주세요.'
      : '영업정보를 확인하고 마음에 드는 한 곳을 골라주세요.',
    '길찾기를 확인하고, 가까운 카페까지 골라보세요.',
  ]
  const stepNames = ['TASTE', 'CHOOSE', 'AFTER LUNCH']

  return (
    <main className="app-shell steps-app" id="top">
      <header className="steps-header">
        <a className="brand steps-brand" href="#top" onClick={handleBackToTaste} aria-label="한끼지도 홈">
          <span className="steps-brand-icon" aria-hidden="true">✦</span>
          <strong>한끼지도</strong>
        </a>
        <div className="steps-header-location">
          <span>⌖ 갈월동 오피스</span>
          <small>서울 용산구 한강대로71길 4</small>
        </div>
      </header>

      <section className="steps-flow" aria-label="한 단계씩 점심 선택">
        <aside className="steps-intro">
          <p className="steps-eyebrow">ONE SMALL DECISION</p>
          <h1>점심 고민,<br />{' '}<em>한 단계씩.</em></h1>
          <p className="steps-intro-copy">
            취향만 알려주세요.<br />다음 선택은 우리가 좁혀드릴게요.
          </p>
          <details className="steps-fortune">
            <summary>
              <span className="steps-fortune-spark" aria-hidden="true">✦</span>
              <span className="steps-fortune-copy">
                <span className="steps-fortune-badge">오늘의 행운픽</span>
                <strong>취향 대신 운세로 고를래요</strong>
                <small>고민될 땐 오늘의 행운에 맡겨봐요 · 만 19세 이상</small>
              </span>
              <span className="steps-expand" aria-hidden="true">+</span>
            </summary>
            <FortunePicker isLoading={isLoading} location={location} restaurants={lunchEligibleRestaurants} todayKey={todayKey} />
          </details>
          <ol className="steps-progress" aria-label="점심 선택 진행 단계">
            {['취향 고르기', '두 곳 비교', '커피까지'].map((label, index) => (
              <li aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'is-current' : step > index + 1 ? 'is-complete' : undefined} key={label}>
                <span aria-hidden="true">{index + 1}</span>{label}
              </li>
            ))}
          </ol>
        </aside>

        <section aria-labelledby="steps-stage-title" className="steps-sheet" data-step={step}>
          <p className="steps-stage-label">STEP 0{step} / {stepNames[step - 1]}</p>
          <h2 id="steps-stage-title" ref={stepHeadingRef} tabIndex={-1}>{stepTitles[step - 1]}</h2>
          <p className="steps-stage-caption">{stepCaptions[step - 1]}</p>
          {step === 1 ? (
            <div className="steps-taste">
              <CategorySelector value={category} onChange={setCategory} />
              <RadiusSelector value={radius} onChange={setRadius} />
              <button
                className="steps-next"
                disabled={isLoading || lunchEligibleRestaurants.length === 0}
                onClick={handleRandomPick}
                type="button"
              >{isLoading ? '가까운 음식점 찾는 중…' : '다음, 두 곳만 추천받기 →'}</button>
              <p className="steps-hint">
                {isLoading ? '선택한 취향에 맞는 음식점을 확인하고 있어요.' : apiError ? '음식점 정보를 불러오지 못했어요.' : lunchEligibleRestaurants.length === 0 ? '이 조건에서 추첨할 곳이 없어요. 테마나 반경을 바꿔주세요.' : '실제 도보 경로는 카카오맵에서 확인해요.'}
              </p>
              {apiError ? (
                <div className="steps-api-error" role="alert">
                  <p>{apiError}</p>
                  <button onClick={() => setSearchVersion((version) => version + 1)} type="button">다시 불러오기 ↻</button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p className="steps-condition">
                {CATEGORY_LABELS[category]} · 직선 반경 {radius < 1000 ? radius + 'm' : radius / 1000 + 'km'}
              </p>
              <RandomPicker
                candidates={randomRestaurants}
                isChoosing={isChoosingRestaurant}
                isLoading={isLoading}
                location={location}
                nearbyCafes={nearbyCafes}
                onChoose={handleRandomChoice}
                onMarkLunchUnavailable={handleLunchUnavailable}
                onPick={handleRandomPick}
                resultCount={lunchEligibleRestaurants.length}
                selectedCandidateId={selectedRandomRestaurantId}
                selectionError={randomSelectionError}
              />
              <button className="steps-back" disabled={isChoosingRestaurant} onClick={handleBackToTaste} type="button">
                {step === 2 ? '← 취향 다시 고르기' : '← 처음부터 다시 고르기'}
              </button>
            </>
          )}
          <DailyRanking restaurants={dailyTopRestaurants} />
        </section>
      </section>

      <div className={'search-notice steps-notice search-notice--' + notice.tone} role="status">
        <span aria-hidden="true" /><p>{notice.message}</p>
      </div>

      <details className="steps-browse" onToggle={(event) => setIsBrowseOpen(event.currentTarget.open)}>
        <summary>
          <span>근처 음식점도 둘러보기 <span aria-hidden="true">↗</span></span>
          <small>{isLoading ? '검색 중' : restaurants.length + '곳'} · 가까운 순</small>
        </summary>
        {isBrowseOpen ? (
          <RestaurantList error={apiError} isLoading={isLoading} onSelect={handleRestaurantSelect} restaurants={restaurants} selectedRestaurantId={selectedRestaurantId} />
        ) : null}
      </details>

      <footer className="steps-footer">
        <p>목록 없이, 한 번에 하나의 선택.</p>
        <p>{OFFICE_DATA_CHECKED_AT.replaceAll('-', '.')} 조회 · 갈월동 오피스 주변 매장정보</p>
      </footer>
    </main>
  )
}
