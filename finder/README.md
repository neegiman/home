# 한끼지도

서울 용산구 한강대로71길 4 갈월동 오피스를 기준으로 가까운 음식점을
찾고, 무작위 후보 두 곳 중 한 곳을 선택해 길찾기로 연결하는 Next.js
MVP입니다.

현재 앱 실행에는 데이터베이스, Docker, 외부 API 키가 필요하지 않습니다.

## 현재 기준 데이터

- 기준 주소: 서울 용산구 한강대로71길 4
- 기준 좌표: `37.540496120947, 126.972590790583`
- 데이터 조회일: 2026-10-05
- 음식점: 720곳 (한식 370, 중식 44, 일식 82, 양식 96, 아시안 25,
  패스트푸드 48, 분식 55)
- 카페: 733곳 (선택 음식점 기준 직선거리 500m 이내 가까운 3곳 추천용)
- 직선 반경별 결과: 500m 256곳, 1km 589곳, 1.5km 720곳
- 수집 범위: 기준점 주변 9개 검색 지점을 합친 뒤 사업장 ID 중복 제거 및
  기준점 직선거리 1.5km 재검증
- 제외 범위: 카페, 주점, 베이커리·디저트처럼 식사점 성격이 아닌 업종과
  브랜드·업종 정보로 테마를 판별할 수 없는 사업장
- 가격: 최근 공개 매장정보에서 확인한 값
- 칼로리: 음식 영양DB를 참고한 예상 범위

매장 영업 여부와 메뉴 가격은 수시로 바뀔 수 있으므로 실제 방문 전 길찾기
화면에서 다시 확인해야 합니다. 화면에서도 `웹 매장정보 확인 가격`과
`영양DB 참고 추정`을 구분해 표시합니다.

주요 확인 자료:

- [카카오맵 음식점 사업장 검색](https://map.kakao.com/)
- [소상공인시장진흥공단 상가(상권)정보 API 안내](https://www.data.go.kr/data/15012005/openapi.do)
- [숙대입구역 음식점 15곳](https://delistationkorea.com/station/sookmyung/)
- [남영돈 메뉴 확인 기록](https://ramyselect.com/restaurants/namyeongdon)
- [덕순루 최근 메뉴](https://polle.com/place/3bcMe7/%EB%8D%95%EC%88%9C%EB%A3%A8)
- [버거인 영업·주소 공공데이터](https://naratbab.kr/place/6798769403/)
- [남박 서울 최근 매장정보](https://polle.com/place/2tp18i/%EB%82%A8%EB%B0%95)
- [포36거리 숙대점 최근 매장정보](https://polle.com/place/4ycBJz/%ED%8F%AC%2036%EA%B1%B0%EB%A6%AC)
- [베나레스 숙대점 최근 매장정보](https://polle.com/place/2GYhYP/%EB%B2%A0%EB%82%98%EB%A0%88%EC%8A%A4)
- [신머이 쌀국수 숙대본점 최근 매장정보](https://polle.com/place/3VRmG4/%EC%8B%A0%EB%A8%B8%EC%9D%B4%20%EC%8C%80%EA%B5%AD%EC%88%98)
- [사이공마켓 숙대점 최근 매장정보](https://polle.com/place/4VNqTK/%EC%82%AC%EC%9D%B4%EA%B3%B5%EB%A7%88%EC%BC%93)
- [라오삐약 인허가 영업정보](https://www.bizdang.com/%EC%97%85%EC%B2%B4/018de302ad085e31)
- [롯데리아 숙대입구역점 최근 매장정보](https://www.daangn.com/kr/local-profile/%EB%A1%AF%EB%8D%B0%EB%A6%AC%EC%95%84-%EC%88%99%EB%8C%80%EC%9E%85%EA%B5%AC%EC%97%AD%EC%A0%90-y9jebnctxvme/)
- [KFC 숙대입구점 최근 매장정보](https://polle.com/place/5yLDry/KFC)
- [한강버거 최근 매장정보](https://www.daangn.com/kr/local-profile/%ED%95%9C%EA%B0%95%EB%B2%84%EA%B1%B0-81a15w4tww2h/)

## 주요 기능

- ‘점심 고민, 한 단계씩’ UI: 취향 선택 → 두 곳 비교 → 선택 완료·카페 추천의 3단계 흐름
- 전체 음식점 목록과 운세는 필요할 때 펼쳐보기, 선택 단계가 바뀌면 제목으로 키보드 초점 이동
- 고정 기준 주소에서 반경 500m, 1km, 1.5km 검색
- 전체, 한식, 중식, 일식, 양식, 아시안, 패스트푸드, 분식 필터
- 확인된 메뉴가 있는 음식점만 대표 메뉴, 가격, 예상 칼로리 표시
- 현재 조건에서 음식점 두 곳 무작위 추첨
- 각 랜덤 후보를 매장명·주소로 네이버에서 검색해 영업정보 확인
- 점심 장사를 하지 않는 후보는 이 브라우저의 오늘 추첨에서 제외하고 즉시 교체
- 최종 음식점 선택 후 직선거리 500m 안의 가까운 카페 최대 3곳 추천
- 카페는 별점과 관계없이 거리순으로 추천하고, 한 곳 선택 시 선택 별점 +1 누적
- 음식점 선택·운세 추천의 길찾기를 PC·모바일 모두 카카오맵 도보 길찾기로 연결
- 만 19세 이상만 이용 가능한, 생년월일을 전송하지 않는 재미용 음식 운세 추천
- 이 브라우저에서 선택한 횟수와 오늘의 TOP 3 표시

선택 기록은 서버로 전송하지 않고 브라우저 `localStorage`에만 저장됩니다.
브라우저나 기기가 달라지면 선택 횟수도 별도로 관리됩니다.
카페 선택 별점은 맛 평가나 5점 만점 평점이 아닌 누적 선택 횟수이며,
한 번의 음식점 선택에서 카페는 한 곳만 선택할 수 있습니다.
오늘의 선택·점심 제외·운세는 한국 시간 기준이며, 열린 화면에서도 날짜가
바뀌면 갱신됩니다. 길찾기 새 탭이 차단되면 화면의 지도 링크로 다시 열 수 있습니다.
길찾기는 카카오맵 공식 링크에 출발지·도착지 이름과 위도·경도를 전달합니다.
PC는 카카오맵 웹, 모바일은 카카오맵의 앱·웹 이용 선택 화면으로 연결됩니다.
앱을 이용하거나 ‘설치없이 지도보기’로 모바일 웹 도보 경로를 확인할 수 있습니다.
별도의 지도 SDK나 경로 API를 호출하지 않습니다.
‘네이버에서 확인’ 버튼은 길찾기가 아니라 영업정보 검색용으로 유지됩니다.

## 데이터 흐름

```text
scripts/refresh-office-businesses.ts → src/data/office-businesses.generated.json
        ↓
src/data/office-restaurants.ts (확인된 메뉴 정보 병합)
        ↓
직선거리 계산(Haversine) + 반경·카테고리 필터
        ↓
GET /api/restaurants
        ↓
거리순 목록 → 두 곳 추첨 → 브라우저에 선택 저장 → 길찾기
```

## 실행

Node.js 20.9 이상이 필요합니다.

저장소 루트에서는 먼저 `cd finder`로 이동한 뒤 아래 명령을 실행합니다.

```bash
npm install
npm run data:refresh
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

프로덕션 빌드:

```bash
npm run typecheck
npm run verify:data
npm run build
npm start
```

## API

```http
GET /api/restaurants?lat=37.540496120947&lng=126.972590790583&radius=1000&category=ALL
```

`radius`는 `500`, `1000`, `1500` 중 하나이며 `category`는 `ALL`,
`KOREAN`, `CHINESE`, `JAPANESE`, `WESTERN`, `ASIAN`, `FAST_FOOD`,
`SNACK`을 지원합니다.

## 주요 파일

```text
scripts/refresh-office-businesses.ts        # 주변 사업장 스냅샷 갱신
src/data/office-businesses.generated.json   # 1.5km 전체 후보 데이터
src/data/office-restaurants.ts               # 검증된 메뉴 정보 병합
src/lib/restaurants.ts          # 직선거리 계산과 검색 필터
src/components/SearchPanel.tsx  # 검색·추첨·브라우저 선택 기록
src/lib/kakao-directions.ts     # PC·모바일 공통 카카오맵 도보 길찾기
src/lib/place-search.ts         # 네이버 영업정보 검색 링크
```

기존 Docker/PostGIS 관련 파일은 이전 구현 참고용으로 남아 있지만 현재 앱의
빌드와 실행 경로에서는 사용하지 않습니다.

## 거리와 길찾기 주의

반경과 목록의 음식점 거리는 좌표 사이의 직선거리입니다. 횡단보도·철도·골목·
건물 출입구 같은 실제 도로 사정은 반영하지 않으며, 음식점을 선택한 뒤 연결되는
지도 서비스에서 실제 도보 경로와 시간을 확인합니다.
