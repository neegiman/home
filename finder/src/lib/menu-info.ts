import type { RestaurantMenu } from '@/types/restaurant'

const PRICE_FORMATTER = new Intl.NumberFormat('ko-KR')

const PRICE_SOURCE_LABELS: Record<RestaurantMenu['priceSource'], string> = {
  SAMPLE: '샘플 가격',
  WEB_VERIFIED: '웹 매장정보 확인 가격',
  PUBLIC_DATA: '공공데이터 가격',
  RESTAURANT: '매장 제공 가격',
  ADMIN: '관리자 확인 가격',
}

const CALORIE_SOURCE_LABELS: Record<
  RestaurantMenu['calorieSource'],
  string
> = {
  MFDS_ESTIMATE: '영양DB 참고 추정',
  PUBLIC_DATA: '공공데이터 열량',
  RESTAURANT: '매장 제공 열량',
  ADMIN: '관리자 확인 열량',
}

export function formatMenuPrice(priceWon: number | null) {
  return priceWon === null ? '가격 정보 없음' : `${PRICE_FORMATTER.format(priceWon)}원`
}

export function formatMenuCalories(menu: RestaurantMenu) {
  if (menu.caloriesMin === null && menu.caloriesMax === null) {
    return '열량 정보 없음'
  }

  if (menu.caloriesMin === menu.caloriesMax || menu.caloriesMax === null) {
    return `약 ${menu.caloriesMin} kcal`
  }

  if (menu.caloriesMin === null) {
    return `약 ${menu.caloriesMax} kcal 이하`
  }

  return `약 ${menu.caloriesMin}~${menu.caloriesMax} kcal`
}

export function getMenuSourceLabel(menu: RestaurantMenu) {
  return `${PRICE_SOURCE_LABELS[menu.priceSource]} · ${CALORIE_SOURCE_LABELS[menu.calorieSource]}`
}
