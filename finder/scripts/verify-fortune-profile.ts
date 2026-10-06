import assert from 'node:assert/strict'

import {
  FORTUNE_BIRTH_STORAGE_KEY,
  formatBirthDate,
  getFortuneAge,
  isAtLeastNineteen,
  isValidBirthDate,
  parseFortuneBirthDate,
} from '../src/lib/fortune-profile'

const today = '2026-10-06'
let checks = 0
function check(actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected)
  checks += 1
}

check(FORTUNE_BIRTH_STORAGE_KEY, 'nearby-table:fortune-birth-date:v1')
check(formatBirthDate('2000', '2', '9'), '2000-02-09')
check(formatBirthDate('2000', '', '9'), '')
check(isValidBirthDate('2000-02-29', today), true)
check(isValidBirthDate('2001-02-29', today), false)
check(isValidBirthDate('1900-02-29', today), false)
check(isValidBirthDate('2000-04-31', today), false)
check(isValidBirthDate('1899-12-31', today), false)
check(isValidBirthDate('2000-00-01', today), false)
check(isValidBirthDate('2000-13-01', today), false)
check(isValidBirthDate('2000-01-00', today), false)
check(isValidBirthDate('2027-01-01', today), false)
check(isValidBirthDate('2000-1-1', today), false)
check(isValidBirthDate('2000-01-01-extra', today), false)
check(isValidBirthDate('', today), false)
check(getFortuneAge('2000-10-07', today), 25)
check(getFortuneAge('2000-10-06', today), 26)
check(getFortuneAge('2000-10-07', '2026-10-07'), 26)
check(getFortuneAge('invalid', today), null)
check(isAtLeastNineteen('2007-10-06', today), true)
check(isAtLeastNineteen('2007-10-07', today), false)
check(isAtLeastNineteen('2008-01-01', today), false)

const saved = { version: 1, birthDate: '2000-05-24' }
check(parseFortuneBirthDate(JSON.stringify(saved), today), saved)
check(parseFortuneBirthDate(JSON.stringify({ ...saved, age: 999, name: 'unused' }), today), saved)
for (const value of [
  null, '', '{broken', 'null', '[]', 'true', '19', '"2000-05-24"',
  '{}', '{"version":2,"birthDate":"2000-05-24"}',
  '{"version":"1","birthDate":"2000-05-24"}',
  '{"version":1,"birthDate":20000524}',
  '{"version":1,"birthDate":"2007-10-07"}',
  '{"version":1,"birthDate":"2001-02-29"}',
  '{"version":1,"birthDate":"1899-01-01"}',
  '{"version":1,"birthDate":"2027-01-01"}',
]) check(parseFortuneBirthDate(value, today), null)
check(parseFortuneBirthDate('{"version":1,"birthDate":"2007-10-07"}', '2026-10-07'), {
  version: 1, birthDate: '2007-10-07',
})

console.log(`PASS: ${checks} fortune profile validation checks`)
