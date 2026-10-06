import officeBusinessSnapshot from '@/data/office-businesses.generated.json'
import type { Restaurant, RestaurantMenu } from '@/types/restaurant'

export const OFFICE_DATA_CHECKED_AT = officeBusinessSnapshot.checkedAt

export const OFFICE_LOCATION = {
  lat: 37.540496120947,
  lng: 126.972590790583,
  label: '갈월동 오피스',
} as const

type StaticMenu = Omit<RestaurantMenu, 'id'>

interface StaticRestaurant
  extends Omit<
    Restaurant,
    | 'distance'
    | 'selectionCount'
    | 'todaySelectionCount'
    | 'popularityStars'
    | 'menus'
  > {
  menus: StaticMenu[]
}

function menu(
  name: string,
  priceWon: number,
  caloriesMin: number,
  caloriesMax: number,
): StaticMenu {
  return {
    name,
    priceWon,
    caloriesMin,
    caloriesMax,
    priceSource: 'WEB_VERIFIED',
    calorieSource: 'MFDS_ESTIMATE',
    checkedAt: OFFICE_DATA_CHECKED_AT,
  }
}

// 2026-10-05에 공개 매장정보를 조회해 구성한 갈월동 오피스 주변 정적 데이터입니다.
// 가격은 웹 매장정보 확인값이며, 열량은 음식 영양DB를 참고한 범위 추정치입니다.
// 메뉴를 확인하지 못한 매장도 실제 음식점 검색 결과에서는 제외하지 않습니다.
const CURATED_OFFICE_RESTAURANTS: StaticRestaurant[] = [
  {
    id: 1,
    name: '금천문 오향족발',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '서울 용산구 한강대로 268',
    lat: 37.542207873213,
    lng: 126.973079539357,
    menus: [
      menu('짜장면', 8000, 650, 850),
      menu('고기해물짬뽕', 12000, 650, 900),
    ],
  },
  {
    id: 2,
    name: '소소라면 닭꼬치',
    categoryCode: 'SNACK',
    categoryName: '분식',
    roadAddress: '서울 용산구 한강대로 268-1',
    lat: 37.542253261219,
    lng: 126.973062188818,
    menus: [
      menu('닭꼬치', 3500, 180, 280),
      menu('소소라볶이', 12000, 650, 900),
    ],
  },
  {
    id: 3,
    name: '덕순루',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '서울 용산구 한강대로80길 11',
    lat: 37.542694149326,
    lng: 126.973470890417,
    menus: [menu('짜장', 8000, 650, 850), menu('짬뽕', 9500, 600, 800)],
  },
  {
    id: 4,
    name: '초원',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 한강대로80길 7',
    lat: 37.542754499029,
    lng: 126.97336586517,
    menus: [
      menu('한우등심주물럭', 42000, 350, 520),
      menu('특상우설', 42000, 300, 450),
    ],
  },
  {
    id: 5,
    name: '남영돈',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 한강대로80길 17',
    lat: 37.542749344158,
    lng: 126.973775824054,
    menus: [
      menu('육즙가득 삼겹살', 19000, 520, 700),
      menu('탱글탱글 목살', 19000, 350, 500),
    ],
  },
  {
    id: 6,
    name: '다사랑스테이크',
    categoryCode: 'WESTERN',
    categoryName: '양식',
    roadAddress: '서울 용산구 한강대로84길 14',
    lat: 37.543604172554,
    lng: 126.973433507128,
    menus: [
      menu('부대찌개', 11000, 600, 800),
      menu('모둠스테이크 소', 41000, 1000, 1500),
    ],
  },
  {
    id: 7,
    name: '옛날감자전',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 한강대로84길 11-9',
    lat: 37.543970252175,
    lng: 126.973124382539,
    menus: [
      menu('감자전', 16000, 650, 900),
      menu('해물파전', 19000, 800, 1100),
    ],
  },
  {
    id: 8,
    name: '버거인',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '서울 용산구 청파로43길 12',
    lat: 37.543689835604,
    lng: 126.970031544087,
    menus: [
      menu('지못미버거', 8500, 650, 850),
      menu('더블버거', 10000, 850, 1100),
    ],
  },
  {
    id: 9,
    name: '까치네',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 한강대로84길 11-16',
    lat: 37.544385659296,
    lng: 126.973242818831,
    menus: [
      menu('닭볶음탕', 28000, 900, 1300),
      menu('계란범벅', 17000, 500, 750),
    ],
  },
  {
    id: 10,
    name: '은성집',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 한강대로84길 11-16',
    lat: 37.544385659296,
    lng: 126.973242818831,
    menus: [
      menu('사골 부대찌개', 9000, 650, 850),
      menu('모둠구이 중', 52000, 1400, 1900),
    ],
  },
  {
    id: 11,
    name: '구복만두',
    categoryCode: 'CHINESE',
    categoryName: '중식',
    roadAddress: '서울 용산구 두텁바위로 7',
    lat: 37.545406156008,
    lng: 126.972992451383,
    menus: [
      menu('구복전통만두', 8500, 450, 650),
      menu('김치만두', 8500, 430, 620),
    ],
  },
  {
    id: 12,
    name: '금강산식당',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 청파로 303',
    lat: 37.546594248873,
    lng: 126.970055767787,
    menus: [
      menu('묵은지뼈해장국', 10000, 600, 850),
      menu('묵은지감자탕 소', 38000, 1400, 2000),
    ],
  },
  {
    id: 13,
    name: '창수린',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 두텁바위로 55',
    lat: 37.546016526197,
    lng: 126.978179508344,
    menus: [
      menu('똠양꿍', 12000, 250, 450),
      menu('쏨땀', 11000, 200, 350),
    ],
  },
  {
    id: 14,
    name: '달볶이',
    categoryCode: 'SNACK',
    categoryName: '분식',
    roadAddress: '서울 용산구 청파로47길 88',
    lat: 37.545191369739,
    lng: 126.965651161487,
    menus: [
      menu('떡볶이', 4500, 400, 600),
      menu('순대', 5500, 350, 550),
    ],
  },
  {
    id: 15,
    name: '야스노야 본점',
    categoryCode: 'JAPANESE',
    categoryName: '일식',
    roadAddress: '서울 용산구 후암로 8-1',
    lat: 37.546726557215,
    lng: 126.978409340129,
    menus: [menu('삿포로 스프카레', 25000, 650, 900)],
  },
  {
    id: 16,
    name: '사랑방 참숯화로구이',
    categoryCode: 'KOREAN',
    categoryName: '한식',
    roadAddress: '서울 용산구 신흥로36길 4',
    lat: 37.546426275534,
    lng: 126.981789258766,
    menus: [
      menu('삼겹살', 17000, 520, 700),
      menu('돼지갈비', 17000, 500, 750),
    ],
  },
  {
    id: 17,
    name: '남박 서울',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 한강대로76길 11-31',
    lat: 37.542306318666,
    lng: 126.973568958684,
    menus: [menu('한우 쌀국수', 13000, 500, 700)],
  },
  {
    id: 18,
    name: '포36거리 숙대점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 청파로47길 77',
    lat: 37.544888992582,
    lng: 126.966111160333,
    menus: [menu('소고기 쌀국수', 9000, 450, 650)],
  },
  {
    id: 19,
    name: '베나레스 숙대점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 청파로45길 32',
    lat: 37.544642857995,
    lng: 126.968901244443,
    menus: [menu('버터치킨', 9800, 650, 900)],
  },
  {
    id: 20,
    name: '신머이 쌀국수 숙대본점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 청파로45길 9',
    lat: 37.54422862434,
    lng: 126.970026179668,
    menus: [],
  },
  {
    id: 21,
    name: '사이공마켓 숙대점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 청파로47길 76',
    lat: 37.54513412134,
    lng: 126.966389104243,
    menus: [],
  },
  {
    id: 22,
    name: '라오삐약 신용산점',
    categoryCode: 'ASIAN',
    categoryName: '아시안',
    roadAddress: '서울 용산구 한강대로46길 16',
    lat: 37.531080268105,
    lng: 126.971022871775,
    menus: [],
  },
  {
    id: 23,
    name: '롯데리아 숙대입구역점',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '서울 용산구 한강대로 283',
    lat: 37.543438168961,
    lng: 126.971957705436,
    menus: [],
  },
  {
    id: 24,
    name: 'KFC 숙대입구점',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '서울 용산구 한강대로 297',
    lat: 37.54475844444,
    lng: 126.971683617202,
    menus: [],
  },
  {
    id: 25,
    name: '한강버거',
    categoryCode: 'FAST_FOOD',
    categoryName: '패스트푸드',
    roadAddress: '서울 용산구 이태원로 10',
    lat: 37.534835696004,
    lng: 126.974865974381,
    menus: [],
  },
]

const curatedByName = new Map(
  CURATED_OFFICE_RESTAURANTS.map((restaurant) => [restaurant.name, restaurant]),
)

export const OFFICE_RESTAURANTS: StaticRestaurant[] =
  officeBusinessSnapshot.restaurants.map((restaurant) => {
    const curated = curatedByName.get(restaurant.name)

    return {
      id: restaurant.id,
      name: restaurant.name,
      categoryCode: restaurant.categoryCode as StaticRestaurant['categoryCode'],
      categoryName: restaurant.categoryName,
      roadAddress: restaurant.roadAddress,
      lat: restaurant.lat,
      lng: restaurant.lng,
      menus: curated?.menus ?? [],
    }
  })
