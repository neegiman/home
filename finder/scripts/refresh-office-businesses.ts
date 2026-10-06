import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const OFFICE_LOCATION = {
  lat: 37.540496120947,
  lng: 126.972590790583,
} as const

const OFFICE_MAP_POINT = { x: 493_956, y: 1_122_501 } as const
const SEARCH_OFFSETS = [-900, 0, 900] as const
const SEARCH_PAGE_LIMIT = 35
const SEARCH_RADIUS_METERS = 1_500
const CAFE_COVERAGE_RADIUS_METERS = 2_000
const EARTH_RADIUS_METERS = 6_371_000

type CategoryCode =
  | 'KOREAN'
  | 'CHINESE'
  | 'JAPANESE'
  | 'WESTERN'
  | 'ASIAN'
  | 'FAST_FOOD'
  | 'SNACK'

interface KakaoMapPlace {
  address: string
  cate_name_depth1: string
  cate_name_depth2: string
  cate_name_depth3: string
  cate_name_depth4: string
  cate_name_depth5: string
  confirmid: string
  lat: number
  lon: number
  name: string
  new_address: string
}

interface KakaoMapSearchResponse {
  place?: KakaoMapPlace[]
}

interface SnapshotRestaurant {
  categoryCode: CategoryCode
  categoryName: string
  id: number
  lat: number
  lng: number
  name: string
  roadAddress: string
  sourceCategory: string
}

interface SnapshotCafe {
  id: number
  lat: number
  lng: number
  name: string
  roadAddress: string
  sourceCategory: string
}

const CATEGORY_LABELS: Record<CategoryCode, string> = {
  KOREAN: '한식',
  CHINESE: '중식',
  JAPANESE: '일식',
  WESTERN: '양식',
  ASIAN: '아시안',
  FAST_FOOD: '패스트푸드',
  SNACK: '분식',
}

const BRAND_CATEGORY_RULES: ReadonlyArray<{
  categoryCode: CategoryCode
  namePattern: RegExp
}> = [
  { categoryCode: 'KOREAN', namePattern: /등촌샤브칼국수/ },
  { categoryCode: 'ASIAN', namePattern: /아비꼬/ },
  { categoryCode: 'JAPANESE', namePattern: /막썰이회/ },
  { categoryCode: 'WESTERN', namePattern: /마이브런치|오븐앤바인/ },
]

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function getDistanceInMeters(place: Pick<KakaoMapPlace, 'lat' | 'lon'>) {
  const latitudeDelta = toRadians(place.lat - OFFICE_LOCATION.lat)
  const longitudeDelta = toRadians(place.lon - OFFICE_LOCATION.lng)
  const startLatitude = toRadians(OFFICE_LOCATION.lat)
  const endLatitude = toRadians(place.lat)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function isMealBusiness(place: KakaoMapPlace) {
  if (place.cate_name_depth1 !== '음식점') {
    return false
  }

  if (['카페', '술집'].includes(place.cate_name_depth2)) {
    return false
  }

  if (
    place.cate_name_depth2 === '간식' &&
    !['토스트', '닭강정'].includes(place.cate_name_depth3)
  ) {
    return false
  }

  return !['와인집', '주식회사 바다원젤'].includes(place.name)
}

function isCoffeeCafe(place: KakaoMapPlace) {
  return (
    place.cate_name_depth1 === '음식점' &&
    place.cate_name_depth2 === '카페' &&
    !['테마카페', '전통찻집', '다방', '생과일전문점'].includes(
      place.cate_name_depth3,
    )
  )
}

function classifyRestaurant(place: KakaoMapPlace): CategoryCode | null {
  const category = [
    place.cate_name_depth2,
    place.cate_name_depth3,
    place.cate_name_depth4,
    place.cate_name_depth5,
  ]
    .filter(Boolean)
    .join(' ')

  const searchableName = place.name.replaceAll(' ', '')
  const brandCategory = BRAND_CATEGORY_RULES.find(({ namePattern }) =>
    namePattern.test(searchableName),
  )

  if (brandCategory) return brandCategory.categoryCode
  if (/중식|중국요리/.test(category)) return 'CHINESE'
  if (/일식/.test(category)) return 'JAPANESE'
  if (/패스트푸드|치킨|햄버거/.test(category)) return 'FAST_FOOD'
  if (/양식|샐러드/.test(category)) return 'WESTERN'
  if (/아시아음식|샤브샤브/.test(category)) return 'ASIAN'
  if (/분식|도시락|토스트|닭강정/.test(category)) return 'SNACK'
  if (/한식|기사식당/.test(category)) return 'KOREAN'

  if (/반점|중화|마라/.test(searchableName)) return 'CHINESE'
  if (/스시|초밥|카츠|라멘|우동|소바/.test(searchableName)) return 'JAPANESE'
  if (/쌀국수|타이|커리|케밥/.test(searchableName)) return 'ASIAN'
  if (/버거|치킨/.test(searchableName)) return 'FAST_FOOD'
  if (/떡볶이|김밥|분식/.test(searchableName)) return 'SNACK'

  return null
}

async function searchGridPoint(x: number, y: number, query: string) {
  const results: KakaoMapPlace[] = []

  for (let page = 1; page <= SEARCH_PAGE_LIMIT; page += 1) {
    const endpoint = new URL(
      'https://search.map.kakao.com/mapsearch/map.daum',
    )
    endpoint.searchParams.set('q', query)
    endpoint.searchParams.set('msFlag', 'S')
    endpoint.searchParams.set('sort', '1')
    endpoint.searchParams.set('center', `${x},${y}`)
    endpoint.searchParams.set('page', String(page))

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://map.kakao.com/',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Kakao Map search returned ${response.status}`)
    }

    const data = (await response.json()) as KakaoMapSearchResponse
    const places = data.place ?? []

    if (places.length === 0) {
      break
    }

    results.push(...places)
  }

  return results
}

async function main() {
  const gridPoints = SEARCH_OFFSETS.flatMap((xOffset) =>
    SEARCH_OFFSETS.map((yOffset) => ({
      x: OFFICE_MAP_POINT.x + xOffset,
      y: OFFICE_MAP_POINT.y + yOffset,
    })),
  )
  const restaurantGridResults = await Promise.all(
    gridPoints.map(({ x, y }) => searchGridPoint(x, y, '음식점')),
  )
  const uniquePlaces = new Map<string, KakaoMapPlace>()

  for (const place of restaurantGridResults.flat()) {
    uniquePlaces.set(String(place.confirmid), place)
  }

  const restaurants: SnapshotRestaurant[] = [...uniquePlaces.values()]
    .filter(isMealBusiness)
    .filter((place) => getDistanceInMeters(place) <= SEARCH_RADIUS_METERS)
    .flatMap((place) => {
      const categoryCode = classifyRestaurant(place)

      if (!categoryCode) {
        return []
      }

      const id = Number(place.confirmid)

      if (!Number.isSafeInteger(id)) {
        throw new Error(`Invalid Kakao place id: ${place.confirmid}`)
      }

      return [
        {
          id,
          name: place.name,
          categoryCode,
          categoryName: CATEGORY_LABELS[categoryCode],
          roadAddress: place.new_address || place.address,
          lat: Number(place.lat),
          lng: Number(place.lon),
          sourceCategory: [
            place.cate_name_depth1,
            place.cate_name_depth2,
            place.cate_name_depth3,
            place.cate_name_depth4,
            place.cate_name_depth5,
          ]
            .filter(Boolean)
            .join(' > '),
        },
      ]
    })
    .toSorted((a, b) => {
      const distanceDelta =
        getDistanceInMeters({ lat: a.lat, lon: a.lng }) -
        getDistanceInMeters({ lat: b.lat, lon: b.lng })

      return distanceDelta || a.name.localeCompare(b.name, 'ko')
    })

  const cafeGridResults = await Promise.all(
    gridPoints.map(({ x, y }) => searchGridPoint(x, y, '카페')),
  )
  const uniqueCafes = new Map<string, KakaoMapPlace>()

  for (const cafe of cafeGridResults.flat()) {
    uniqueCafes.set(String(cafe.confirmid), cafe)
  }

  const cafes: SnapshotCafe[] = [...uniqueCafes.values()]
    .filter(isCoffeeCafe)
    .filter(
      (cafe) => getDistanceInMeters(cafe) <= CAFE_COVERAGE_RADIUS_METERS,
    )
    .map((cafe) => {
      const id = Number(cafe.confirmid)

      if (!Number.isSafeInteger(id)) {
        throw new Error(`Invalid Kakao cafe id: ${cafe.confirmid}`)
      }

      return {
        id,
        name: cafe.name,
        roadAddress: cafe.new_address || cafe.address,
        lat: Number(cafe.lat),
        lng: Number(cafe.lon),
        sourceCategory: [
          cafe.cate_name_depth1,
          cafe.cate_name_depth2,
          cafe.cate_name_depth3,
          cafe.cate_name_depth4,
          cafe.cate_name_depth5,
        ]
          .filter(Boolean)
          .join(' > '),
      }
    })
    .toSorted((a, b) => {
      const distanceDelta =
        getDistanceInMeters({ lat: a.lat, lon: a.lng }) -
        getDistanceInMeters({ lat: b.lat, lon: b.lng })

      return distanceDelta || a.name.localeCompare(b.name, 'ko')
    })

  if (restaurants.length < 500) {
    throw new Error(
      `Expected a full-area snapshot, but only found ${restaurants.length} restaurants.`,
    )
  }

  const checkedAt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
  const outputPath = path.join(
    process.cwd(),
    'src',
    'data',
    'office-businesses.generated.json',
  )

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        checkedAt,
        source: 'Kakao Map public place search',
        scope:
          '갈월동 오피스 직선 1.5km 이내 식사 가능 음식점. 카페·주점·베이커리·디저트 전문점과 테마 미분류 사업장 제외.',
        restaurants,
        cafes,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const categoryCounts = Object.entries(
    restaurants.reduce<Record<string, number>>((counts, restaurant) => {
      counts[restaurant.categoryCode] =
        (counts[restaurant.categoryCode] ?? 0) + 1
      return counts
    }, {}),
  )
    .map(([category, count]) => `${category}=${count}`)
    .join(', ')

  console.log(
    `Saved ${restaurants.length} restaurants and ${cafes.length} cafes checked ${checkedAt}: ${categoryCounts}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
