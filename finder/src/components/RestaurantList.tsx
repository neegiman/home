'use client'

import { MenuPreview } from '@/components/MenuPreview'
import { PopularityRating } from '@/components/PopularityRating'
import { formatStraightLineDistance } from '@/lib/distance'
import type { Restaurant } from '@/types/restaurant'

interface RestaurantListProps {
  error: string | null
  isLoading: boolean
  onSelect: (id: number) => void
  restaurants: Restaurant[]
  selectedRestaurantId: number | null
}

export function RestaurantList({
  error,
  isLoading,
  onSelect,
  restaurants,
  selectedRestaurantId,
}: RestaurantListProps) {
  return (
    <section className="restaurant-panel" aria-busy={isLoading}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">가까운 순</p>
          <h2>음식점 목록</h2>
        </div>
        <span className="result-count">{isLoading ? '—' : restaurants.length}곳</span>
      </div>

      <div className="restaurant-list" aria-live="polite">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div className="restaurant-skeleton" key={index}>
              <span />
              <span />
              <span />
            </div>
          ))}

        {!isLoading && error && (
          <div className="empty-state empty-state--error">
            <span aria-hidden="true">!</span>
            <strong>검색 결과를 불러오지 못했어요</strong>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && restaurants.length === 0 && (
          <div className="empty-state">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M10.5 3a7.5 7.5 0 1 0 4.58 13.44l3.74 3.74a.96.96 0 0 0 1.36-1.36l-3.74-3.74A7.5 7.5 0 0 0 10.5 3Zm0 1.92a5.58 5.58 0 1 1 0 11.16 5.58 5.58 0 0 1 0-11.16Z" />
            </svg>
            <strong>조건에 맞는 음식점이 없어요</strong>
            <p>검색 반경을 넓히거나 다른 음식 종류를 선택해 보세요.</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          restaurants.map((restaurant, index) => {
            const isSelected = selectedRestaurantId === restaurant.id
            return (
              <button
                aria-pressed={isSelected}
                className={`restaurant-item${isSelected ? ' is-selected' : ''}`}
                key={restaurant.id}
                onClick={() => onSelect(restaurant.id)}
                type="button"
              >
                <span className="restaurant-rank">{index + 1}</span>
                <span className="restaurant-details">
                  <span className="restaurant-title-row">
                    <strong>{restaurant.name}</strong>
                    <span className="distance">
                      {formatStraightLineDistance(restaurant.distance)}
                    </span>
                  </span>
                  <span className="category-label">{restaurant.categoryName}</span>
                  <PopularityRating
                    selectionCount={restaurant.selectionCount}
                    stars={restaurant.popularityStars}
                  />
                  <MenuPreview menus={restaurant.menus} />
                  <span className="restaurant-address">{restaurant.roadAddress}</span>
                </span>
                <svg className="list-chevron" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            )
          })}
      </div>
    </section>
  )
}
