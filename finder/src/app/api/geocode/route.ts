import { NextRequest, NextResponse } from 'next/server'

interface KakaoAddressDocument {
  address_name: string
  road_address: { address_name: string } | null
  x: string
  y: string
}

interface KakaoAddressResponse {
  documents: KakaoAddressDocument[]
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim()

  if (!address || address.length > 200) {
    return NextResponse.json(
      { error: '검색할 주소를 200자 이내로 입력해 주세요.' },
      { status: 400 },
    )
  }

  const apiKey = process.env.KAKAO_REST_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          '주소 검색 키가 아직 설정되지 않았습니다. 현재 위치 기능을 이용해 주세요.',
      },
      { status: 503 },
    )
  }

  try {
    const endpoint = new URL(
      'https://dapi.kakao.com/v2/local/search/address.json',
    )
    endpoint.searchParams.set('query', address)
    endpoint.searchParams.set('size', '1')

    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: { Authorization: `KakaoAK ${apiKey}` },
    })

    if (!response.ok) {
      throw new Error(`Kakao geocoding returned ${response.status}`)
    }

    const data = (await response.json()) as KakaoAddressResponse
    const firstResult = data.documents[0]

    if (!firstResult) {
      return NextResponse.json(
        { error: '주소를 찾지 못했습니다. 도로명이나 지번을 확인해 주세요.' },
        { status: 404 },
      )
    }

    const lat = Number(firstResult.y)
    const lng = Number(firstResult.x)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Kakao geocoding returned invalid coordinates')
    }

    return NextResponse.json(
      {
        location: {
          lat,
          lng,
          label:
            firstResult.road_address?.address_name || firstResult.address_name,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Address geocoding failed:', error)

    return NextResponse.json(
      { error: '주소를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502 },
    )
  }
}
