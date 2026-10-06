interface PopularityRatingProps {
  selectionCount: number
  stars: number
}

export function PopularityRating({
  selectionCount,
  stars,
}: PopularityRatingProps) {
  return (
    <span
      aria-label={`이 브라우저 선택 인기도 별 ${stars}개, ${selectionCount}회 선택`}
      className="popularity-rating"
    >
      <span aria-hidden="true" className="popularity-stars">
        {Array.from({ length: 5 }, (_, index) => (
          <span className={index < stars ? 'is-filled' : ''} key={index}>
            ★
          </span>
        ))}
      </span>
      <span>이 기기 {selectionCount}회</span>
    </span>
  )
}
