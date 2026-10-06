import assert from 'node:assert/strict'

import snapshot from '../src/data/office-businesses.generated.json'
import {
  getTodayKey,
  parseLunchExclusions,
  parseSelectionStats,
} from '../src/lib/browser-history'
import { getNearbyCafes } from '../src/lib/cafes'
import { parseCafeSelectionCounts } from '../src/lib/cafe-selections'
import { searchRestaurants } from '../src/lib/restaurants'
import { buildNaverPlaceSearchUrl } from '../src/lib/place-search'
import { buildKakaoWalkingDirectionsUrl } from '../src/lib/kakao-directions'
import { CATEGORY_VALUES, CATEGORY_LABELS } from '../src/types/restaurant'

assert.equal(getTodayKey(new Date('2026-10-05T14:59:59Z')), '2026-10-05')
assert.equal(getTodayKey(new Date('2026-10-05T15:00:00Z')), '2026-10-06')
for (const value of [null, 'null', '[]', '{', '{"version":1,"selections":null}']) {
  assert.deepEqual(parseSelectionStats(value), {})
}
const validRecord = { date: '2026-10-05', today: 2, total: 3 }
assert.deepEqual(parseSelectionStats(JSON.stringify({
  version: 1,
  selections: {
    '1': validRecord,
    '2': { ...validRecord, total: '3' },
    '3': { ...validRecord, today: -1 },
    '4': { ...validRecord, today: 4 },
  },
})), { '1': validRecord })
const exclusions = JSON.stringify({
  version: 1, date: '2026-10-05', restaurantIds: [1, 1, 2, -1, '3', null],
})
assert.deepEqual(parseLunchExclusions(exclusions, '2026-10-05').restaurantIds, [1, 2])
assert.deepEqual(parseLunchExclusions(exclusions, '2026-10-06').restaurantIds, [])
for (const value of [null, 'null', '[]', '{', '{"version":1,"counts":null}']) {
  assert.deepEqual(parseCafeSelectionCounts(value), {})
}
assert.deepEqual(parseCafeSelectionCounts(JSON.stringify({
  version: 1,
  counts: { '1': 0, '2': 8, '3': -1, '4': '2', '5': 1.2, '6': Number.MAX_SAFE_INTEGER + 1, 'bad': 1 },
})), { '1': 0, '2': 8 })

const center = { lat: 37.540496120947, lng: 126.972590790583 }
const routeStart = { ...center, label: '갈월동 오피스 & 본관/1층' }
const routeEnd = { name: '밥, 면 & 카페/2호점 + #맛집', lat: 37.541, lng: 126.973 }
const routeUrl = new URL(buildKakaoWalkingDirectionsUrl(routeStart, routeEnd))
assert.equal(routeUrl.hostname, 'map.kakao.com')
const routeParts = routeUrl.pathname.split('/')
assert.deepEqual(routeParts.slice(0, 4), ['', 'link', 'by', 'walk'])
assert.equal(routeParts.length, 6)
assert.deepEqual(routeParts[4].split(',').map(decodeURIComponent), [routeStart.label, String(routeStart.lat), String(routeStart.lng)])
assert.deepEqual(routeParts[5].split(',').map(decodeURIComponent), [routeEnd.name, String(routeEnd.lat), String(routeEnd.lng)])
assert.equal(routeUrl.hash, '')
assert.equal(routeUrl.search, '')
const counts: Record<number, number> = {}
for (const radius of [500, 1000, 1500] as const) {
  const all = searchRestaurants({ ...center, radius, category: 'ALL' })
  assert.equal(new Set(all.map((place) => place.id)).size, all.length)
  assert.ok(all.every((place) => place.distance <= radius && Number.isFinite(place.distance)))
  assert.ok(all.every((place, index) => index === 0 || all[index - 1].distance <= place.distance))
  let categoryTotal = 0
  for (const category of CATEGORY_VALUES.filter((value) => value !== 'ALL')) {
    const places = searchRestaurants({ ...center, radius, category })
    assert.ok(places.every((place) => place.categoryCode === category))
    assert.ok(places.every((place) => place.categoryName === CATEGORY_LABELS[category]))
    categoryTotal += places.length
  }
  assert.equal(categoryTotal, all.length)
  counts[radius] = all.length
}
assert.equal(new Set(snapshot.cafes.map((cafe) => cafe.id)).size, snapshot.cafes.length)
const cafeIds = new Set(snapshot.cafes.map((cafe) => cafe.id))
assert.ok(snapshot.restaurants.every((place) => !cafeIds.has(place.id)))
const withoutCafes: string[] = []
for (const restaurant of snapshot.restaurants) {
  const directions = new URL(buildKakaoWalkingDirectionsUrl(center, restaurant))
  assert.equal(directions.hostname, 'map.kakao.com')
  const destination = directions.pathname.split('/').at(-1)!.split(',')
  assert.equal(decodeURIComponent(destination[0]), restaurant.name)
  assert.deepEqual(destination.slice(1), [String(restaurant.lat), String(restaurant.lng)])
  const cafes = getNearbyCafes(restaurant)
  if (!cafes.length) withoutCafes.push(restaurant.name)
  assert.ok(cafes.length <= 3)
  assert.ok(cafes.every((cafe) => cafe.distance <= 500))
  assert.ok(cafes.every((cafe, index) => index === 0 || cafes[index - 1].distance <= cafe.distance))
  for (const cafe of cafes) {
    const url = new URL(buildNaverPlaceSearchUrl(cafe))
    assert.equal(url.hostname, 'search.naver.com')
    assert.equal(url.searchParams.get('query'), `${cafe.name} ${cafe.roadAddress} 영업시간`)
  }
}
console.log(JSON.stringify({ status: 'PASS', counts, cafes: snapshot.cafes.length, withoutCafes }, null, 2))
