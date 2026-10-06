export const CATEGORY_VALUES = [
  'ALL',
  'KOREAN',
  'CHINESE',
  'JAPANESE',
  'WESTERN',
  'ASIAN',
  'FAST_FOOD',
  'SNACK',
] as const

export type Category = (typeof CATEGORY_VALUES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  ALL: '전체',
  KOREAN: '한식',
  CHINESE: '중식',
  JAPANESE: '일식',
  WESTERN: '양식',
  ASIAN: '아시안',
  FAST_FOOD: '패스트푸드',
  SNACK: '분식',
}

export const RADIUS_VALUES = [500, 1000, 1500] as const

export type Radius = (typeof RADIUS_VALUES)[number]

export interface Location {
  lat: number
  lng: number
  label?: string
}

export type MenuPriceSource =
  | 'SAMPLE'
  | 'WEB_VERIFIED'
  | 'PUBLIC_DATA'
  | 'RESTAURANT'
  | 'ADMIN'

export type MenuCalorieSource =
  | 'MFDS_ESTIMATE'
  | 'PUBLIC_DATA'
  | 'RESTAURANT'
  | 'ADMIN'

export interface RestaurantMenu {
  id: number
  name: string
  priceWon: number | null
  caloriesMin: number | null
  caloriesMax: number | null
  priceSource: MenuPriceSource
  calorieSource: MenuCalorieSource
  checkedAt: string | null
}

export interface Restaurant {
  id: number
  name: string
  categoryCode: Exclude<Category, 'ALL'>
  categoryName: string
  distance: number
  roadAddress: string
  lat: number
  lng: number
  selectionCount: number
  todaySelectionCount: number
  popularityStars: number
  menus: RestaurantMenu[]
}

export interface RestaurantSelectionResponse {
  restaurantId: number
  selectionCount: number
  todaySelectionCount: number
  popularityStars: number
}

export interface RestaurantSearchResponse {
  center: Pick<Location, 'lat' | 'lng'>
  radius: Radius
  category: Category
  count: number
  dataCheckedAt: string
  restaurants: Restaurant[]
}
