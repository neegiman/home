'use client'

import { useEffect, useRef, useState } from 'react'

import {
  CAFE_SELECTION_STORAGE_KEY,
  parseCafeSelectionCounts,
  type CafeSelectionCounts,
} from '@/lib/cafe-selections'
import { formatStraightLineDistance } from '@/lib/distance'
import { buildNaverPlaceSearchUrl } from '@/lib/place-search'
import type { Cafe } from '@/types/cafe'

interface CafeRecommendationsProps {
  cafes: Cafe[]
  restaurantName: string
}

export function CafeRecommendations({
  cafes,
  restaurantName,
}: CafeRecommendationsProps) {
  const [selectionCounts, setSelectionCounts] = useState<CafeSelectionCounts>({})
  const [selectedCafeId, setSelectedCafeId] = useState<number | null>(null)
  const [hasLoadedCounts, setHasLoadedCounts] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const chosenCafeRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      setSelectionCounts(parseCafeSelectionCounts(
        window.localStorage.getItem(CAFE_SELECTION_STORAGE_KEY),
      ))
    } catch {
      setNotice('저장소를 사용할 수 없어 이번 화면에서만 카페 별점이 유지돼요.')
    } finally {
      setHasLoadedCounts(true)
    }
  }, [])

  function handleChoose(cafe: Cafe) {
    if (!hasLoadedCounts || chosenCafeRef.current !== null) return
    chosenCafeRef.current = cafe.id

    const nextCounts = {
      ...selectionCounts,
      [String(cafe.id)]: Math.min(
        Number.MAX_SAFE_INTEGER,
        (selectionCounts[String(cafe.id)] ?? 0) + 1,
      ),
    }
    let wasPersisted = true
    try {
      window.localStorage.setItem(
        CAFE_SELECTION_STORAGE_KEY,
        JSON.stringify({ version: 1, counts: nextCounts }),
      )
    } catch {
      wasPersisted = false
    }

    setSelectionCounts(nextCounts)
    setSelectedCafeId(cafe.id)
    setNotice(wasPersisted
      ? `${cafe.name}을 선택해 별점 1개를 추가했어요.`
      : `${cafe.name}을 선택했어요. 저장소를 사용할 수 없어 이번 화면에서만 별점이 유지돼요.`,
    )
  }

  return (
    <section className="cafe-recommendations" aria-labelledby="cafe-title">
      <div className="cafe-recommendations-heading">
        <span className="cafe-icon" aria-hidden="true">
          ☕
        </span>
        <span>
          <strong id="cafe-title">식사 다음, 커피 한 잔.</strong>
          <small>{restaurantName} 기준 · 직선거리 500m 이내 · 거리순 3곳</small>
        </span>
      </div>
      {cafes.length > 0 ? (
        <ol className="cafe-list">
          {cafes.map((cafe, index) => (
            <li className={selectedCafeId === cafe.id ? 'is-selected' : undefined} key={cafe.id}>
              <span className="cafe-rank">{index + 1}</span>
              <span className="cafe-copy">
                <strong>{cafe.name}</strong>
                <small>{formatStraightLineDistance(cafe.distance)}</small>
                <span>{cafe.roadAddress}</span>
                <span
                  aria-label={`이 브라우저 선택 별점 ${selectionCounts[String(cafe.id)] ?? 0}개`}
                  className="cafe-selection-stars"
                >
                  ★ {selectionCounts[String(cafe.id)] ?? 0} · 선택 별점
                </span>
              </span>
              <div className="cafe-actions">
                <button
                  aria-label={`${cafe.name} 선택${selectedCafeId === cafe.id ? ' 완료' : ''}`}
                  className="cafe-select-button"
                  disabled={!hasLoadedCounts || selectedCafeId !== null}
                  onClick={() => handleChoose(cafe)}
                  type="button"
                >
                  {selectedCafeId === cafe.id ? '선택 완료' : '선택 +1★'}
                </button>
                <a
                  aria-label={`네이버에서 ${cafe.name} 영업정보 검색`}
                  href={buildNaverPlaceSearchUrl(cafe)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  네이버 확인
                </a>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cafe-empty">500m 안에서 확인된 카페가 없습니다.</p>
      )}
      <p className="cafe-rating-note">선택 1회 = 별점 +1 · 이 브라우저에 누적 · 맛 평가가 아니에요.</p>
      {notice ? <p className="cafe-selection-notice" role="status">{notice}</p> : null}
    </section>
  )
}
