// Run twice with a page reload between runs, only in an isolated test browser.
// Get-Content -Raw scripts/verify-cafe-ui.js | agent-browser --session ww-cafe eval --stdin
(async () => {
  const waitFor = async (predicate) => {
    for (let i = 0; i < 100; i += 1) {
      if (predicate()) return
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    throw new Error('Timed out waiting for cafe UI')
  }
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const nativeRandom = Math.random
  const nativeOpen = window.open
  try {
    Math.random = () => 0
    window.open = () => null
    await waitFor(() => !document.querySelector('.steps-next, .random-picker-heading > button').disabled)
    document.querySelector('.steps-next, .random-picker-heading > button').click()
    await waitFor(() => document.querySelectorAll('.random-candidate').length === 2)
    document.querySelector('.random-candidate .candidate-actions > button').click()
    await waitFor(() => document.querySelector('.cafe-select-button') && !document.querySelector('.cafe-select-button').disabled)

    const cards = [...document.querySelectorAll('.cafe-list li')]
    const names = cards.map((card) => card.querySelector('.cafe-copy strong').textContent)
    const count = () => Number(cards[0].querySelector('.cafe-selection-stars').textContent.match(/\d+/)[0])
    const restaurant = document.querySelector('.random-candidate.is-selected .random-result-copy strong').textContent
    const previous = JSON.parse(sessionStorage.getItem('ww-audit:cafe-result') || 'null')
    if (previous) {
      check(previous.restaurant === restaurant && previous.names.join('|') === names.join('|'), 'Same restaurant and distance-ordered cafes after reload')
      check(previous.after === count(), 'Saved cafe stars restored after reload')
    }
    const before = count()
    cards[0].querySelector('button').click()
    await waitFor(() => cards[0].classList.contains('is-selected'))
    check(count() === before + 1, 'Cafe stars accumulate across rounds')
    check(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow')
    document.querySelector('.cafe-recommendations').scrollIntoView({ block: 'center' })
    const result = { status: 'PASS', restoredAfterReload: !!previous, restaurant, names, before, after: count(), width: innerWidth }
    sessionStorage.setItem('ww-audit:cafe-result', JSON.stringify(result))
    return result
  } finally {
    Math.random = nativeRandom
    window.open = nativeOpen
  }
})()
