import { formatStraightLineDistance } from '@/lib/distance'
import type { Restaurant } from '@/types/restaurant'

export function DailyRanking({ restaurants }: { restaurants: Restaurant[] }) {
  if (restaurants.length === 0) return null

  return (
    <section className="daily-ranking" aria-labelledby="daily-ranking-title">
      <div className="daily-ranking-heading">
        <span>
          <strong id="daily-ranking-title">오늘 많이 선택된 곳</strong>
          <small>이 브라우저의 현재 검색 조건 기준 · 최대 3곳</small>
        </span>
      </div>
      <ol>
        {restaurants.map((restaurant, index) => (
          <li key={restaurant.id}>
            <span className="daily-rank">{index + 1}</span>
            <span className="daily-rank-copy">
              <strong>{restaurant.name}</strong>
              <small>{restaurant.categoryName} · {formatStraightLineDistance(restaurant.distance)}</small>
            </span>
            <strong className="daily-rank-count">{restaurant.todaySelectionCount}회</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
