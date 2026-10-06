// Run only in an isolated agent-browser session:
// Get-Content -Raw scripts/verify-ui.js | agent-browser --session ww-audit eval --stdin
(async () => {
  const results = []
  const check = (condition, name) => {
    if (!condition) throw new Error(name)
    results.push(name)
  }
  const waitFor = async (predicate) => {
    for (let i = 0; i < 100; i += 1) {
      if (predicate()) return
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    throw new Error('Timed out waiting for UI')
  }
  const candidates = () => [...document.querySelectorAll('.random-candidate')]
  const names = () => candidates().map((card) => card.querySelector('.random-result-copy strong').textContent)
  const draw = () => document.querySelector('.steps-next, .random-picker-heading > button').click()
  const select = (label, value) => {
    const element = [...document.querySelectorAll('select')].find(
      (node) => node.closest('label').textContent.includes(label),
    )
    element.value = value
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const nativeDate = Date
  const nativeOpen = window.open
  const initialHostname = location.hostname
  let openedDirectionsUrl = null
  let directionsOpenCount = 0
  let simulatedNow = nativeDate.parse('2026-10-05T03:00:00Z')
  window.Date = class extends nativeDate {
    constructor(...args) { super(...(args.length ? args : [simulatedNow])) }
    static now() { return simulatedNow }
  }
  try {
    await waitFor(() => document.querySelector('.steps-next') && !document.querySelector('.steps-next').disabled)
    check(document.querySelector('.steps-sheet').dataset.step === '1', '단계 1 취향 선택부터 시작')
    check(document.querySelectorAll('.steps-theme-tile').length === 8, '음식 테마 8개 타일 표시')
    check(!document.querySelector('.restaurant-panel'), '전체 음식점 목록 기본 접힘')
    check(!document.querySelector('.daily-ranking'), '빈 오늘 TOP 3 숨김')
    check(!document.querySelector('.cafe-recommendations'), '선택 전 카페 추천 숨김')
    draw()
    await waitFor(() => candidates().length === 2)
    check(document.querySelector('.steps-sheet').dataset.step === '2', '단계 2 두 후보 비교로 전환')
    check(document.activeElement.id === 'steps-stage-title', '단계 전환 시 제목으로 키보드 초점 이동')
    check(new Set(names()).size === 2, '랜덤 후보 2곳 중복 없음')
    const firstNames = names()
    check(document.querySelectorAll('.candidate-search-link').length === 2, '네이버 확인 링크 2개')
    for (const card of candidates()) {
      const link = card.querySelector('.candidate-search-link')
      const query = new URL(link.href).searchParams.get('query')
      check(query.includes(card.querySelector('.random-result-copy strong').textContent), '매장명 포함 네이버 검색')
    }
    candidates()[0].querySelector('.candidate-lunch-button').click()
    await waitFor(() => !names().includes(firstNames[0]))
    check(names()[1] === firstNames[1], '점심 제외 시 해당 후보만 교체')
    document.querySelector('.steps-browse').open = true
    await waitFor(() => document.querySelector('.result-count'))
    check(document.querySelector('.result-count').textContent === '589곳', '점심 제외 후 전체 목록 유지')
    document.querySelector('.steps-browse').open = false
    simulatedNow = nativeDate.parse('2026-10-06T03:00:00Z')
    window.dispatchEvent(new Event('focus'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    candidates()[0].querySelector('.candidate-lunch-button').click()
    await new Promise((resolve) => setTimeout(resolve, 100))
    const saved = JSON.parse(localStorage.getItem('nearby-table:lunch-exclusions:v1'))
    check(saved.date === '2026-10-06' && saved.restaurantIds.length === 1, '열린 화면에서 다음 날 점심 제외 초기화')

    window.open = (url) => {
      directionsOpenCount += 1
      openedDirectionsUrl = String(url)
      return null
    }
    const selectedName = names()[0]
    candidates()[0].querySelector('.candidate-actions > button').click()
    await waitFor(() => !!document.querySelector('.cafe-recommendations'))
    check(document.querySelector('.steps-sheet').dataset.step === '3', '단계 3 선택 완료 및 카페 추천으로 전환')
    check(candidates().length === 1 && names()[0] === selectedName, '선택 완료 화면은 선택한 한 곳에 집중')
    check(location.hostname === initialHostname, '음식점 선택 후 현재 화면 유지')
    check(directionsOpenCount === 0 && openedDirectionsUrl === null, '음식점 선택 시 길찾기 자동 호출 없음')
    check(!document.querySelector('.directions-blocked'), '선택 직후 팝업 차단 안내 없음')
    const directionsLink = document.querySelector('.candidate-directions-link')
    const selectedRoute = new URL(directionsLink.href)
    check(selectedRoute.hostname === 'map.kakao.com' && selectedRoute.pathname.startsWith('/link/by/walk/'), '별도 길찾기 버튼에 카카오맵 도보 경로 설정')
    check(decodeURIComponent(selectedRoute.pathname.split('/').at(-1).split(',')[0]) === selectedName, '카카오맵 링크의 도착지 이름 전달')
    check(directionsLink.target === '_blank' && directionsLink.rel.includes('noopener'), '길찾기 버튼은 안전한 새 탭 링크')
    let explicitlyClickedRoute = null
    directionsLink.addEventListener('click', (event) => {
      event.preventDefault()
      explicitlyClickedRoute = event.currentTarget.href
    }, { once: true })
    directionsLink.click()
    check(explicitlyClickedRoute === selectedRoute.href, '길찾기 버튼을 누를 때만 경로 링크 활성화')
    check(document.querySelector('.cafe-recommendations-heading small').textContent.includes(selectedName), '선택 음식점 기준 카페 추천')
    check(document.querySelectorAll('.cafe-list li').length === 3, '가까운 카페 3곳 표시')
    check(!!document.querySelector('.daily-ranking'), '선택 후 오늘 TOP 3 표시')
    check(document.querySelectorAll('.cafe-list a[target="_blank"]').length === 3, '카페 영업정보 링크 새 탭')
    const cafeCards = [...document.querySelectorAll('.cafe-list li')]
    const cafeNames = cafeCards.map((card) => card.querySelector('.cafe-copy strong').textContent)
    const cafeDistances = cafeCards.map((card) => Number(card.querySelector('.cafe-copy small').textContent.match(/\d+/)[0]))
    check(cafeDistances.every((distance, index) => index === 0 || cafeDistances[index - 1] <= distance), '카페 3곳 거리순 유지')
    await waitFor(() => !cafeCards[1].querySelector('button').disabled)
    const beforeStars = Number(cafeCards[1].querySelector('.cafe-selection-stars').textContent.match(/\d+/)[0])
    cafeCards[1].querySelector('button').click()
    cafeCards[1].querySelector('button').click()
    await waitFor(() => cafeCards[1].classList.contains('is-selected'))
    const afterStars = Number(cafeCards[1].querySelector('.cafe-selection-stars').textContent.match(/\d+/)[0])
    check(afterStars === beforeStars + 1, '카페 선택 별점 정확히 +1, 연속 클릭 중복 방지')
    check(cafeCards.every((card) => card.querySelector('button').disabled), '한 추천에서 카페 한 곳만 선택')
    check([...document.querySelectorAll('.cafe-copy strong')].map((node) => node.textContent).join('|') === cafeNames.join('|'), '별점 추가 후에도 거리순 유지')
    const cafeSaved = JSON.parse(localStorage.getItem('nearby-table:cafe-selections:v1'))
    check(cafeSaved.version === 1 && Object.values(cafeSaved.counts).includes(afterStars), '카페 별점 별도 저장')
    check(directionsOpenCount === 0, '카페 선택도 지도 자동 호출 없음')

    document.querySelector('.steps-fortune').open = true
    select('태어난 연도', '2007')
    await new Promise((resolve) => setTimeout(resolve, 50))
    select('태어난 월', '10')
    await new Promise((resolve) => setTimeout(resolve, 50))
    select('태어난 일', '7')
    await new Promise((resolve) => setTimeout(resolve, 50))
    document.querySelector('.fortune-form button').click()
    await waitFor(() => !!document.querySelector('.fortune-error'))
    check(document.querySelector('.fortune-error').textContent.includes('만 19세'), '만 19세 미만 운세 차단')
    select('태어난 연도', '2000')
    await new Promise((resolve) => setTimeout(resolve, 50))
    document.querySelector('.fortune-form button').click()
    await waitFor(() => !!document.querySelector('.fortune-result'))
    check(!!document.querySelector('.fortune-restaurant strong'), '성인 운세 음식점 추천')
    check(directionsOpenCount === 0, '운세 추천도 지도 자동 호출 없음')
    document.querySelector('.fortune-restaurant button').click()
    await waitFor(() => !!document.querySelector('.fortune-directions-fallback'))
    check(!!document.querySelector('.fortune-directions-fallback'), '운세 길찾기 팝업 차단 안내')
    check(directionsOpenCount === 1, '운세 길찾기 버튼을 눌렀을 때만 지도 호출')
    check(new URL(openedDirectionsUrl).hostname === 'map.kakao.com', '운세 길찾기도 카카오맵으로 통일')
    check(document.querySelector('.fortune-directions-fallback').href === openedDirectionsUrl, '운세 팝업 차단 대체 링크도 카카오맵')
    document.querySelector('.steps-fortune').open = false

    draw()
    await waitFor(() => !document.querySelector('.cafe-recommendations') && candidates().length === 2)
    const nativeSetItem = Storage.prototype.setItem
    const callsBeforeStorageFailure = directionsOpenCount
    try {
      Storage.prototype.setItem = () => {
        throw new DOMException('Simulated storage unavailable', 'QuotaExceededError')
      }
      candidates()[0].querySelector('.candidate-actions > button').click()
      await waitFor(() => !!document.querySelector('.cafe-recommendations'))
      check(document.querySelector('.search-notice').textContent.includes('이번 화면에서만'), '저장소 오류 시 선택 유지 및 안내')
      check(document.querySelectorAll('.cafe-list li').length === 3, '저장소 오류 시에도 카페 추천 유지')
      check(directionsOpenCount === callsBeforeStorageFailure, '저장소 오류 시 선택도 지도 자동 호출 없음')
      await waitFor(() => !document.querySelector('.cafe-select-button').disabled)
      document.querySelector('.cafe-select-button').click()
      await waitFor(() => !!document.querySelector('.cafe-list li.is-selected'))
      check(document.querySelector('.cafe-selection-notice').textContent.includes('이번 화면에서만'), '카페 저장소 오류 시 선택 유지 및 안내')
    } finally {
      Storage.prototype.setItem = nativeSetItem
    }
    document.querySelector('.steps-back').click()
    await waitFor(() => document.querySelector('.steps-sheet').dataset.step === '1')
    check(!document.querySelector('.cafe-recommendations'), '처음부터 다시 고르기 시 카페 선택 초기화')
    check(document.querySelector('.steps-theme-tile[aria-pressed="true"]').textContent.includes('전체'), '뒤로 가도 기존 취향 유지')
    check(document.documentElement.scrollWidth <= innerWidth, '화면 가로 넘침 없음')
    return { status: 'PASS', results }
  } finally {
    window.Date = nativeDate
    window.open = nativeOpen
    window.dispatchEvent(new Event('focus'))
  }
})()
