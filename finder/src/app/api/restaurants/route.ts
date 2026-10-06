import { NextRequest, NextResponse } from 'next/server'

import {
  OFFICE_DATA_CHECKED_AT,
  searchRestaurants,
} from '@/lib/restaurants'
import {
  CATEGORY_VALUES,
  RADIUS_VALUES,
  type Category,
  type Radius,
} from '@/types/restaurant'

export const dynamic = 'force-dynamic'

function isCategory(value: string): value is Category {
  return CATEGORY_VALUES.includes(value as Category)
}

function isRadius(value: number): value is Radius {
  return RADIUS_VALUES.includes(value as Radius)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const radiusParam = searchParams.get('radius')
  const lat = Number(latParam)
  const lng = Number(lngParam)
  const radius = Number(radiusParam)
  const categoryParam = (searchParams.get('category') ?? 'ALL').toUpperCase()

  if (
    latParam === null ||
    lngParam === null ||
    radiusParam === null ||
    latParam.trim() === '' ||
    lngParam.trim() === '' ||
    radiusParam.trim() === '' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    !isRadius(radius) ||
    !isCategory(categoryParam)
  ) {
    return NextResponse.json(
      {
        error:
          'lat, lng와 radius(500, 1000, 1500)를 확인해 주세요. category는 지원되는 값이어야 합니다.',
      },
      { status: 400 },
    )
  }

  try {
    const restaurants = searchRestaurants({
      lat,
      lng,
      radius,
      category: categoryParam,
    })

    return NextResponse.json(
      {
        center: { lat, lng },
        radius,
        category: categoryParam,
        count: restaurants.length,
        dataCheckedAt: OFFICE_DATA_CHECKED_AT,
        restaurants,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error('Restaurant search failed:', error)

    return NextResponse.json(
      { error: '음식점 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    )
  }
}
