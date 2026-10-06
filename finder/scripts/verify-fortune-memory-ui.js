// Run only in an isolated agent-browser session. Set window.__fortuneMemoryTestPhase
// to save / restored / delete / deleted / invalid / failures. Reload between phases
// to verify restoration, deletion and invalid stored data with actual hydration.
(async () => {
  const phase = window.__fortuneMemoryTestPhase ?? 'save'
  const key = 'nearby-table:fortune-birth-date:v1'
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('-').map(Number)
  const expectedAge = year - 2000 - (month < 5 || (month === 5 && day < 24) ? 1 : 0)
  const results = []
  const check = (condition, name) => {
    if (!condition) throw new Error(name)
    results.push(name)
  }
  const waitFor = async (predicate) => {
    for (let index = 0; index < 100; index += 1) {
      if (predicate()) return
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    throw new Error('Timed out waiting for fortune UI')
  }
  await waitFor(() => document.querySelector('.steps-next') && !document.querySelector('.steps-next').disabled)
  const entry = document.querySelector('.steps-fortune')
  check(entry.querySelector('.steps-fortune-badge').textContent === '오늘의 행운픽', '행운픽 배지 표시')
  check(getComputedStyle(entry).backgroundImage.includes('gradient'), '운세 진입 카드 배경 강조')
  check(document.documentElement.scrollWidth <= innerWidth, '가로 넘침 없음')
  entry.open = true
  const fields = [...document.querySelectorAll('.fortune-birth-selects select')]
  const values = () => fields.map((field) => field.value).join('|')
  const choose = async (index, value) => {
    fields[index].value = value
    fields[index].dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  const completeBirthDate = async () => {
    await choose(0, '2000')
    await choose(1, '5')
    await choose(2, '24')
  }
  const deleteButton = () => document.querySelector('.fortune-memory button')
  let openedMaps = 0
  const nativeOpen = window.open
  window.open = () => { openedMaps += 1; return null }
  try {
    if (phase === 'save') {
      check(values() === '||', '최초 방문 생년월일 비어 있음')
      await completeBirthDate()
      const saved = JSON.parse(localStorage.getItem(key))
      check(saved.version === 1 && saved.birthDate === '2000-05-24', '생년월일 완성 즉시 자동 저장')
      check(Object.keys(saved).sort().join('|') === 'birthDate|version', '최소 필드만 저장, 나이는 저장하지 않음')
      check(!document.querySelector('.fortune-result'), '입력만으로 운세 자동 호출 없음')
      check(document.querySelector('.fortune-memory').textContent.includes('기억했어요'), '저장 완료 안내 및 삭제 버튼 표시')
    } else if (phase === 'restored') {
      await waitFor(() => values() === '2000|5|24')
      check(values() === '2000|5|24', '새로고침 후 세 선택 상자 복원')
      check(document.querySelector('.fortune-memory').textContent.includes(`만 ${expectedAge}세`), '저장된 생년월일로 현재 만 나이 계산')
      document.querySelector('.fortune-form button[type="submit"]').click()
      await waitFor(() => !!document.querySelector('.fortune-result'))
      check(!!document.querySelector('.fortune-restaurant strong'), '복원한 생년월일로 운세 추천 성공')
      const requests = performance.getEntriesByType('resource').map((resource) => resource.name)
      check(!requests.some((url) => url.includes('2000-05-24') || url.includes('/api/')), '생년월일 서버 전송 및 API 요청 없음')
    } else if (phase === 'delete') {
      await waitFor(() => !!deleteButton())
      const otherRecords = Object.fromEntries(Object.keys(localStorage).filter((item) => item !== key).map((item) => [item, localStorage.getItem(item)]))
      deleteButton().click()
      await waitFor(() => values() === '||')
      check(localStorage.getItem(key) === null, '저장된 생년월일 삭제')
      check(values() === '||' && !document.querySelector('.fortune-memory') && !document.querySelector('.fortune-result'), '삭제 후 입력 및 운세 초기화')
      check(Object.entries(otherRecords).every(([item, value]) => localStorage.getItem(item) === value), '다른 선택 기록은 보존')
      check(document.querySelector('.fortune-storage-notice').textContent.includes('삭제했어요'), '삭제 완료 안내')
    } else if (phase === 'deleted' || phase === 'invalid') {
      check(values() === '||', '삭제 또는 잘못된 저장 값은 새로고침 후 복원하지 않음')
      check(!document.querySelector('.fortune-memory'), '잘못된 저장 값에 기억 완료 안내 없음')
    } else if (phase === 'failures') {
      const originalSetItem = Storage.prototype.setItem
      try {
        Storage.prototype.setItem = () => { throw new DOMException('Test quota failure', 'QuotaExceededError') }
        await completeBirthDate()
        document.querySelector('.fortune-form button[type="submit"]').click()
        await waitFor(() => !!document.querySelector('.fortune-result'))
        check(localStorage.getItem(key) === null, '저장 실패 시 잘못된 저장 완료 처리 없음')
        check(document.querySelector('.fortune-storage-notice').textContent.includes('저장하지 못했어요'), '저장 실패 안내')
        check(!!document.querySelector('.fortune-result'), '저장소 차단 중에도 운세 추천 성공')
      } finally {
        Storage.prototype.setItem = originalSetItem
      }
      document.querySelector('.fortune-form button[type="submit"]').click()
      await waitFor(() => !!deleteButton())
      const originalRemoveItem = Storage.prototype.removeItem
      try {
        Storage.prototype.removeItem = () => { throw new DOMException('Test security failure', 'SecurityError') }
        deleteButton().click()
        await waitFor(() => document.querySelector('.fortune-storage-notice')?.textContent.includes('삭제하지 못했어요'))
        check(localStorage.getItem(key) !== null && values() === '2000|5|24', '삭제 실패 시 데이터와 입력을 유지하고 정직하게 안내')
      } finally {
        Storage.prototype.removeItem = originalRemoveItem
      }
      deleteButton().click()
      await waitFor(() => values() === '||')
      check(localStorage.getItem(key) === null, '저장소 복구 후 삭제 가능')
    } else throw new Error(`Unknown phase: ${phase}`)
    check(openedMaps === 0, '입력·복원·운세·삭제 시 지도 자동 호출 없음')
    check(!document.querySelector('[data-nextjs-dialog]'), 'React 오류 화면 없음')
    return { status: 'PASS', phase, results }
  } finally {
    window.open = nativeOpen
  }
})()
