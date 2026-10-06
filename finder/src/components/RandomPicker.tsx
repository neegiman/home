'use client'

import { useState } from 'react'

import { CafeRecommendations } from '@/components/CafeRecommendations'
import { MenuPreview } from '@/components/MenuPreview'
import { PopularityRating } from '@/components/PopularityRating'
import { CATEGORY_EMOJIS } from '@/lib/category-display'
import { formatStraightLineDistance } from '@/lib/distance'
import { buildKakaoWalkingDirectionsUrl, openKakaoWalkingDirections } from '@/lib/kakao-directions'
import { buildNaverPlaceSearchUrl } from '@/lib/place-search'
import type { Cafe } from '@/types/cafe'
import type { Location, Restaurant } from '@/types/restaurant'

interface RandomPickerProps {
  candidates: Restaurant[]
  isChoosing: boolean
  isLoading: boolean
  location: Location
  nearbyCafes: Cafe[]
  onChoose: (restaurantId: number) => Promise<boolean>
  onMarkLunchUnavailable: (restaurantId: number) => void
  onPick: () => void
  resultCount: number
  selectedCandidateId: number | null
  selectionError: string | null
}

export function RandomPicker({
  candidates, isChoosing, isLoading, location, nearbyCafes, onChoose,
  onMarkLunchUnavailable, onPick, resultCount, selectedCandidateId, selectionError,
}: RandomPickerProps) {
  const [blockedDirectionsId, setBlockedDirectionsId] = useState<number | null>(null)
  const selectedRestaurant = candidates.find((restaurant) => restaurant.id === selectedCandidateId)

  async function handleChoose(restaurant: Restaurant) {
    const wasSaved = await onChoose(restaurant.id)
    if (wasSaved) {
      const opened = openKakaoWalkingDirections(location, restaurant)
      setBlockedDirectionsId(opened ? null : restaurant.id)
    }
  }

  return (
    <section className="random-picker" aria-label="음식점 두 곳 랜덤 뽑기">
      <div className="random-results" aria-live="polite">
        {selectedRestaurant ? (
          <article className="random-candidate is-selected steps-receipt">
            <span className="steps-receipt-emoji" aria-hidden="true">
              {CATEGORY_EMOJIS[selectedRestaurant.categoryCode]}
            </span>
            <span className="steps-receipt-label">오늘 점심 결정 완료</span>
            <div className="random-result-copy">
              <strong>{selectedRestaurant.name}</strong>
              <p>
                {selectedRestaurant.categoryName} · {formatStraightLineDistance(selectedRestaurant.distance)}
                <br />{selectedRestaurant.roadAddress}
              </p>
            </div>
            <MenuPreview menus={selectedRestaurant.menus} />
            <PopularityRating selectionCount={selectedRestaurant.selectionCount} stars={selectedRestaurant.popularityStars} />
            <div className="candidate-actions steps-receipt-actions">
              <a
                className="candidate-directions-link"
                href={buildKakaoWalkingDirectionsUrl(location, selectedRestaurant)}
                rel="noopener noreferrer"
                target="_blank"
              >카카오맵 도보 길찾기 ↗</a>
              <a
                aria-label={'네이버에서 ' + selectedRestaurant.name + ' 영업정보 검색'}
                className="candidate-search-link"
                href={buildNaverPlaceSearchUrl(selectedRestaurant)}
                rel="noopener noreferrer"
                target="_blank"
              >네이버에서 확인 ↗</a>
              {blockedDirectionsId === selectedRestaurant.id ? (
                <small className="directions-blocked" role="status">
                  새 탭이 차단됐어요. 위 길찾기 링크를 눌러 주세요.
                </small>
              ) : null}
            </div>
          </article>
        ) : candidates.length > 0 ? (
          candidates.map((restaurant, index) => (
            <article className="random-candidate steps-ticket" key={restaurant.id}>
              <span className="steps-ticket-emoji" aria-hidden="true">
                {CATEGORY_EMOJIS[restaurant.categoryCode]}
              </span>
              <div className="steps-ticket-body">
                <span className="candidate-number">후보 {index + 1} · {restaurant.categoryName}</span>
                <div className="random-result-copy">
                  <strong>{restaurant.name}</strong>
                  <p>{formatStraightLineDistance(restaurant.distance)} · {restaurant.roadAddress}</p>
                </div>
                <MenuPreview menus={restaurant.menus} />
                <PopularityRating selectionCount={restaurant.selectionCount} stars={restaurant.popularityStars} />
                <div className="candidate-actions">
                  <button disabled={isChoosing} onClick={() => void handleChoose(restaurant)} type="button">
                    {isChoosing ? '저장 중…' : '선택'}
                  </button>
                  <a
                    aria-label={'네이버에서 ' + restaurant.name + ' 영업정보 검색'}
                    className="candidate-search-link"
                    href={buildNaverPlaceSearchUrl(restaurant)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >네이버에서 확인 ↗</a>
                  <button
                    aria-label={restaurant.name + ' 점심 장사 안함으로 표시'}
                    className="candidate-lunch-button"
                    disabled={isChoosing}
                    onClick={() => onMarkLunchUnavailable(restaurant.id)}
                    type="button"
                  >점심 장사 안함</button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="random-result-placeholder">
            오늘 추첨할 수 있는 음식점이 없어요. 취향 선택으로 돌아가 다른 테마나 반경을 골라보세요.
          </p>
        )}
      </div>
      {selectedRestaurant ? (
        <CafeRecommendations key={selectedRestaurant.id} cafes={nearbyCafes} restaurantName={selectedRestaurant.name} />
      ) : null}
      {selectionError ? <p className="random-selection-error" role="alert">{selectionError}</p> : null}
      <div className="random-picker-heading steps-redraw">
        <button disabled={isLoading || resultCount === 0 || isChoosing} onClick={onPick} type="button">
          다른 두 곳 뽑기 ↻
        </button>
      </div>
    </section>
  )
}
