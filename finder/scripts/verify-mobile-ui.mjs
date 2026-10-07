import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, webkit } from 'playwright'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const target = new URL(process.env.FINDER_URL ?? 'http://127.0.0.1:3001/finder/')
assert(['127.0.0.1', 'localhost', 'neegiman.github.io'].includes(target.hostname), 'Unexpected audit host')
const baseline = process.argv.includes('--baseline')
const screenshotRoot = path.join(projectRoot, 'node_modules/.cache/mobile-ui', baseline ? 'before' : 'after')
await mkdir(screenshotRoot, { recursive: true })
const cases = [
  { name: 'webkit-iphone15-pro-max', browser: webkit, options: devices['iPhone 15 Pro Max'] },
  { name: 'webkit-iphone15-landscape', browser: webkit, options: devices['iPhone 15 Pro Max landscape'] },
  { name: 'webkit-compact375', browser: webkit, options: { ...devices['iPhone 15 Pro Max'], viewport: { width: 375, height: 667 } } },
  { name: 'chromium-mobile430', browser: chromium, options: devices['iPhone 15 Pro Max'] },
  { name: 'chromium-desktop', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
]
const summaries = []
const regressions = await readFile(path.join(projectRoot, 'scripts/verify-ui.js'), 'utf8')

for (const test of cases) {
  const browser = await test.browser.launch({ headless: true })
  const context = await browser.newContext({ ...test.options, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  const stages = []
  let popupCount = 0
  context.on('page', async (popup) => {
    if (popup !== page) { popupCount += 1; await popup.close() }
  })

  async function inspect(stage) {
    await page.evaluate(() => document.fonts.ready)
    const audit = await page.evaluate(() => {
      const visible = (element) => {
        if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return false
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(element)) return false
        }
        return true
      }
      const rect = (element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      }
      const brand = document.querySelector('.steps-brand-icon')
      const svg = brand.querySelector('svg')
      const brandBox = rect(brand)
      const glyph = document.createRange()
      glyph.selectNodeContents(brand)
      const symbolBox = svg ? rect(svg) : rect(glyph)
      const controls = [...document.querySelectorAll('a,button,select,summary')].filter(visible)
      const shortTargets = controls.filter((element) => !element.disabled && rect(element).height < 43.5)
        .map((element) => ({ label: element.textContent.trim().slice(0, 35), ...rect(element) }))
      const color = (value) => {
        const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
        return [...numbers.slice(0, 3), numbers[3] ?? 1]
      }
      const background = (element) => {
        if (!element) return [255, 255, 255]
        const own = color(getComputedStyle(element).backgroundColor)
        const parent = background(element.parentElement)
        return own.slice(0, 3).map((channel, index) => channel * own[3] + parent[index] * (1 - own[3]))
      }
      const luminance = (rgb) => rgb.slice(0, 3).map((channel) => {
        const value = channel / 255
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
      const contrastTargets = [...document.querySelectorAll('.steps-next,.fortune-form-row button,.candidate-actions > a,.candidate-actions > button,.cafe-actions > a,.cafe-actions > button,.steps-back,.steps-progress .is-current > span,.steps-stage-caption,.steps-hint,.fortune-heading small,.fortune-placeholder,.fortune-privacy,.fortune-reading,.fortune-signals small,.fortune-restaurant-meta,.cafe-copy small,.cafe-copy > span,.restaurant-address,.distance,.menu-preview-source,.daily-rank-count')]
        .filter((element) => visible(element) && !element.disabled)
      const lowContrast = contrastTargets.map((element) => {
        const foreground = luminance(color(getComputedStyle(element).color))
        const backdrop = luminance(background(element))
        return { label: element.textContent.trim().slice(0, 35), ratio: (Math.max(foreground, backdrop) + .05) / (Math.min(foreground, backdrop) + .05) }
      }).filter((element) => element.ratio < 4.5)
      const overflowBoxes = [...document.querySelectorAll('.steps-header,.steps-fortune,.steps-sheet,.steps-browse,.random-candidate,.cafe-list li,.restaurant-panel')]
        .filter(visible).filter((element) => {
          const box = element.getBoundingClientRect()
          return box.left < -.5 || box.right > innerWidth + .5
        }).map((element) => element.className)
      return {
        viewport: { width: innerWidth, height: innerHeight },
        hasSvgLogo: Boolean(svg),
        logoCenterDelta: { x: symbolBox.x + symbolBox.width / 2 - brandBox.x - brandBox.width / 2, y: symbolBox.y + symbolBox.height / 2 - brandBox.y - brandBox.height / 2 },
        logoBox: brandBox,
        shortTargets, lowContrast, overflowBoxes,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        smallSelects: [...document.querySelectorAll('select')].filter(visible).filter((element) => matchMedia('(pointer: coarse)').matches && parseFloat(getComputedStyle(element).fontSize) < 16).map((element) => element.getAttribute('autocomplete') ?? element.id),
      }
    })
    stages.push({ stage, ...audit })
    await page.screenshot({ path: path.join(screenshotRoot, `${test.name}-${stage}.png`), fullPage: true, scale: 'css' })
    if (!baseline) {
      assert(audit.hasSvgLogo, `${test.name}/${stage}: logo must not depend on a font glyph`)
      assert(Math.abs(audit.logoCenterDelta.x) <= .5 && Math.abs(audit.logoCenterDelta.y) <= .5, `${test.name}/${stage}: logo not centered`)
      assert(!audit.horizontalOverflow && audit.overflowBoxes.length === 0, `${test.name}/${stage}: horizontal overflow`)
      assert.equal(audit.shortTargets.length, 0, `${test.name}/${stage}: undersized touch targets ${JSON.stringify(audit.shortTargets)}`)
      assert.equal(audit.lowContrast.length, 0, `${test.name}/${stage}: low text contrast ${JSON.stringify(audit.lowContrast)}`)
      assert.equal(audit.smallSelects.length, 0, `${test.name}/${stage}: mobile selects may trigger zoom`)
    }
  }

  try {
    await page.goto(target.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.querySelector('.steps-next') && !document.querySelector('.steps-next').disabled)
    await inspect('taste')
    await page.locator('.steps-fortune > summary').click()
    if (!baseline) assert.equal(await page.getByLabel('태어난 연도', { exact: true }).count(), 1, 'Birth select must have a concise accessible name')
    await inspect('fortune-entry')
    await page.locator('select[autocomplete="bday-year"]').selectOption('2000')
    await page.locator('select[autocomplete="bday-month"]').selectOption('5')
    await page.locator('select[autocomplete="bday-day"]').selectOption('24')
    await page.locator('.fortune-form button[type="submit"]').click()
    await page.locator('.fortune-result').waitFor()
    await inspect('fortune')
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('.steps-fortune > summary').click()
    assert.equal(await page.locator('select[autocomplete="bday-year"]').inputValue(), '2000', 'Birth date restore failed')
    await page.getByRole('button', { name: '저장된 생년월일 삭제' }).click()
    assert.equal(await page.evaluate(() => localStorage.getItem('nearby-table:fortune-birth-date:v1')), null)
    await page.locator('.steps-fortune > summary').click()
    await page.locator('.steps-next').click()
    await page.locator('.steps-sheet[data-step="2"]').waitFor()
    await inspect('compare')
    await page.locator('.candidate-actions > button:first-child').first().click()
    await page.locator('.steps-sheet[data-step="3"]').waitFor()
    await page.locator('.cafe-select-button:not(:disabled)').first().waitFor()
    await inspect('chosen')
    await page.locator('.cafe-select-button').first().click()
    await page.locator('.cafe-list li.is-selected').waitFor()
    await inspect('coffee')
    assert.equal(popupCount, 0, 'Choosing must not open a map')
    await page.locator('.steps-back').click()
    await page.locator('.steps-browse > summary').click()
    await page.locator('.restaurant-item').first().waitFor()
    await inspect('browse')
    if (!baseline) {
      // Check the SVG center even when a browser substitutes the UI font.
      await page.addStyleTag({ content: 'body { font-family: Arial, sans-serif !important; }' })
      await inspect('fallback-font')
      if (test.options.isMobile) {
        const landscape = test.name.includes('landscape')
        await page.locator('.steps-app').evaluate((element, landscape) => {
          // A desktop engine cannot reproduce the phone's physical notch. Exercise
          // the same inset variables explicitly, without claiming device validation.
          element.style.setProperty('--safe-left', landscape ? '59px' : '0px')
          element.style.setProperty('--safe-right', landscape ? '59px' : '0px')
          element.style.setProperty('--safe-top', landscape ? '0px' : '59px')
          element.style.setProperty('--safe-bottom', landscape ? '21px' : '34px')
        }, landscape)
        await page.evaluate(() => scrollTo(0, 0))
        await inspect('safe-area')
        assert(await page.locator('.steps-header').evaluate((element) => {
          const box = element.getBoundingClientRect()
          const shell = getComputedStyle(document.querySelector('.steps-app'))
          return box.left >= parseFloat(shell.paddingLeft) && box.right <= innerWidth - parseFloat(shell.paddingRight)
        }), 'Header crosses the simulated safe area')
      }
      await page.reload({ waitUntil: 'networkidle' })
      await page.evaluate(() => {
        for (const key of ['nearby-table:office-selections:v1', 'nearby-table:lunch-exclusions:v1', 'nearby-table:cafe-selections:v1', 'nearby-table:fortune-birth-date:v1']) localStorage.removeItem(key)
      })
      await page.reload({ waitUntil: 'networkidle' })
      const regressionResult = await page.evaluate(regressions)
      assert.equal(regressionResult.status, 'PASS')
      stages.push({ stage: 'regression', checks: regressionResult.results.length })
    }
    assert.deepEqual(errors, [], `${test.name}: browser errors`)
    summaries.push({ name: test.name, stages, status: baseline ? 'BASELINE' : 'PASS' })
  } finally {
    await context.close()
    await browser.close()
  }
}
console.log(JSON.stringify({ mode: baseline ? 'baseline' : 'strict', target: target.href, screenshotRoot, summaries }, null, 2))
