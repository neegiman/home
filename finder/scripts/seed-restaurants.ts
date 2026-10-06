import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { loadEnvConfig } from '@next/env'
import { Pool } from 'pg'

loadEnvConfig(process.cwd())

type CategoryCode =
  | 'KOREAN'
  | 'CHINESE'
  | 'JAPANESE'
  | 'WESTERN'
  | 'ASIAN'
  | 'FAST_FOOD'
  | 'SNACK'

interface SeedRestaurant {
  name: string
  categoryCode: CategoryCode
  categoryName: string
  roadAddress: string
  latitude: number
  longitude: number
  businessStatus?: 'OPEN' | 'CLOSED'
}

interface SeedMenu {
  name: string
  priceWon: number
  caloriesMin: number
  caloriesMax: number
}

const sampleMenus: Record<CategoryCode, SeedMenu[]> = {
  KOREAN: [
    { name: '한식 정식', priceWon: 10000, caloriesMin: 650, caloriesMax: 850 },
    { name: '김치찌개', priceWon: 9000, caloriesMin: 450, caloriesMax: 650 },
  ],
  CHINESE: [
    { name: '짜장면', priceWon: 7000, caloriesMin: 650, caloriesMax: 850 },
    { name: '짬뽕', priceWon: 9000, caloriesMin: 600, caloriesMax: 800 },
  ],
  JAPANESE: [
    { name: '돈카츠', priceWon: 12000, caloriesMin: 750, caloriesMax: 950 },
    { name: '냉소바', priceWon: 10000, caloriesMin: 450, caloriesMax: 650 },
  ],
  WESTERN: [
    { name: '토마토 파스타', priceWon: 14000, caloriesMin: 650, caloriesMax: 850 },
    { name: '리조또', priceWon: 15000, caloriesMin: 700, caloriesMax: 900 },
  ],
  ASIAN: [
    { name: '소고기 쌀국수', priceWon: 11000, caloriesMin: 450, caloriesMax: 650 },
    { name: '팟타이', priceWon: 13000, caloriesMin: 700, caloriesMax: 900 },
  ],
  FAST_FOOD: [
    { name: '버거 세트', priceWon: 9500, caloriesMin: 800, caloriesMax: 1100 },
    { name: '치킨 메뉴', priceWon: 19000, caloriesMin: 900, caloriesMax: 1300 },
  ],
  SNACK: [
    { name: '떡볶이', priceWon: 5000, caloriesMin: 400, caloriesMax: 600 },
    { name: '김밥', priceWon: 4000, caloriesMin: 350, caloriesMax: 500 },
  ],
}

// 구리시청 인근(37.5944, 127.1297)을 기준으로 반경별 결과가 달라지도록 배치한 샘플입니다.
const restaurants: SeedRestaurant[] = [
  {
    name: '돌다리 한상',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 아차산로 421',
    latitude: 37.59505,
    longitude: 127.1308,
  },
  {
    name: '구리손칼국수',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 체육관로 145',
    latitude: 37.5932,
    longitude: 127.1287,
  },
  {
    name: '오늘의 백반',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 건원대로 18',
    latitude: 37.5961,
    longitude: 127.1279,
  },
  {
    name: '장자숯불갈비',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 검배로 29',
    latitude: 37.59225,
    longitude: 127.13135,
  },
  {
    name: '홍복루',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 경춘로 227',
    latitude: 37.5949,
    longitude: 127.1323,
  },
  {
    name: '만리장성 중화요리',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 안골로 62',
    latitude: 37.5918,
    longitude: 127.1291,
  },
  {
    name: '하루스시',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 인창동로 34',
    latitude: 37.5956,
    longitude: 127.1266,
  },
  {
    name: '소바정원',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 응달말로 12',
    latitude: 37.5927,
    longitude: 127.1327,
  },
  {
    name: '라운드테이블',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 이문안로 48',
    latitude: 37.5968,
    longitude: 127.1318,
  },
  {
    name: '오후의 파스타',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 동구릉로 84',
    latitude: 37.5921,
    longitude: 127.1268,
  },
  {
    name: '시장떡볶이',
    categoryCode: 'SNACK',
    categoryName: '분식',
    roadAddress: '경기도 구리시 검배로6번길 31',
    latitude: 37.5938,
    longitude: 127.1259,
  },
  {
    name: '인창김밥',
    categoryCode: 'SNACK',
    categoryName: '분식',
    roadAddress: '경기도 구리시 건원대로34번길 17',
    latitude: 37.5972,
    longitude: 127.1285,
  },
  {
    name: '동구릉 보리밥',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 동구릉로 157',
    latitude: 37.5992,
    longitude: 127.1308,
  },
  {
    name: '담소순대국',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 체육관로172번길 22',
    latitude: 37.5901,
    longitude: 127.1266,
  },
  {
    name: '교문집',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 장자대로 13',
    latitude: 37.5889,
    longitude: 127.1324,
  },
  {
    name: '청연각',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 이문안로99번길 9',
    latitude: 37.5978,
    longitude: 127.1353,
  },
  {
    name: '용문반점',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 원수택로 31',
    latitude: 37.5893,
    longitude: 127.1248,
  },
  {
    name: '스시마루',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 벌말로 186',
    latitude: 37.6005,
    longitude: 127.1272,
  },
  {
    name: '카츠오름',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 아차산로506번길 10',
    latitude: 37.5881,
    longitude: 127.1282,
  },
  {
    name: '브릭오븐',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 장자대로86번길 41',
    latitude: 37.5962,
    longitude: 127.1383,
  },
  {
    name: '테이블구리',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 검배로84번길 7',
    latitude: 37.5874,
    longitude: 127.1342,
  },
  {
    name: '장자호수 샤브',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 장자호수길 18',
    latitude: 37.6014,
    longitude: 127.1335,
  },
  {
    name: '갈매 들밥',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 산성로 55',
    latitude: 37.6041,
    longitude: 127.1296,
  },
  {
    name: '수택동 제육상회',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 원수택로64번길 24',
    latitude: 37.5851,
    longitude: 127.1285,
  },
  {
    name: '금룡',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 장자대로1번길 38',
    latitude: 37.6026,
    longitude: 127.1219,
  },
  {
    name: '아차산 짬뽕',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 아차산로 538',
    latitude: 37.5868,
    longitude: 127.1209,
  },
  {
    name: '우미초밥',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 딸기원로 19',
    latitude: 37.6057,
    longitude: 127.1344,
  },
  {
    name: '멘야구리',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '경기도 구리시 한다리길 27',
    latitude: 37.5839,
    longitude: 127.1336,
  },
  {
    name: '포레스트키친',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 동구릉로460번길 8',
    latitude: 37.6019,
    longitude: 127.1412,
  },
  {
    name: '라비앙로즈',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '경기도 구리시 아차산로 590',
    latitude: 37.5835,
    longitude: 127.1216,
  },
  {
    name: '사이공키친 구리점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '경기도 구리시 경춘로 214',
    latitude: 37.5934,
    longitude: 127.133,
  },
  {
    name: '방콕테이블 인창점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '경기도 구리시 건원대로76번길 12',
    latitude: 37.5985,
    longitude: 127.126,
  },
  {
    name: '마살라하우스 수택점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '경기도 구리시 검배로 73',
    latitude: 37.5879,
    longitude: 127.1257,
  },
  {
    name: '버거스테이션',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '경기도 구리시 경춘로 239',
    latitude: 37.5958,
    longitude: 127.1331,
  },
  {
    name: '크리스피치킨 구리점',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '경기도 구리시 이문안로 102',
    latitude: 37.5902,
    longitude: 127.1362,
  },
  {
    name: '퀵피자 인창점',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '경기도 구리시 동구릉로136번길 18',
    latitude: 37.601,
    longitude: 127.1241,
  },
  {
    name: '먼거리 냉면',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '경기도 구리시 담터길 44',
    latitude: 37.6097,
    longitude: 127.1297,
  },
  {
    name: '영업종료 테스트식당',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '경기도 구리시 경춘로 201',
    latitude: 37.59455,
    longitude: 127.1299,
    businessStatus: 'CLOSED',
  },
]

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL이 없습니다. .env.local 파일을 먼저 설정해 주세요.')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    const schema = await readFile(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8')
    await client.query('BEGIN')
    await client.query(schema)
    await client.query(
      'TRUNCATE TABLE restaurant_menu, restaurant_selection_event, restaurant RESTART IDENTITY',
    )

    for (const restaurant of restaurants) {
      const restaurantResult = await client.query<{ id: string }>(
        `
          INSERT INTO restaurant (
            name,
            category_code,
            category_name,
            road_address,
            business_status,
            latitude,
            longitude,
            location
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography
          )
          RETURNING id
        `,
        [
          restaurant.name,
          restaurant.categoryCode,
          restaurant.categoryName,
          restaurant.roadAddress,
          restaurant.businessStatus ?? 'OPEN',
          restaurant.latitude,
          restaurant.longitude,
        ],
      )

      const restaurantId = restaurantResult.rows[0].id

      for (const [index, menu] of sampleMenus[restaurant.categoryCode].entries()) {
        await client.query(
          `
            INSERT INTO restaurant_menu (
              restaurant_id,
              name,
              price_won,
              calories_min,
              calories_max,
              price_source,
              calorie_source,
              is_representative,
              display_order
            )
            VALUES ($1, $2, $3, $4, $5, 'SAMPLE', 'MFDS_ESTIMATE', $6, $7)
          `,
          [
            restaurantId,
            menu.name,
            menu.priceWon,
            menu.caloriesMin,
            menu.caloriesMax,
            index === 0,
            index + 1,
          ],
        )
      }
    }

    await client.query('COMMIT')
    console.log(
      `샘플 음식점 ${restaurants.length}개와 대표 메뉴 ${restaurants.length * 2}개를 저장했습니다.`,
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('샘플 데이터 생성에 실패했습니다.', error)
  process.exitCode = 1
})
