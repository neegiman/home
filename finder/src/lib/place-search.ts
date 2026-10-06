import type { Restaurant } from '@/types/restaurant'

export function buildNaverPlaceSearchUrl(
  place: Pick<Restaurant, 'name' | 'roadAddress'>,
) {
  const params = new URLSearchParams({
    query: `${place.name} ${place.roadAddress} 영업시간`,
  })

  return `https://search.naver.com/search.naver?${params}`
}
