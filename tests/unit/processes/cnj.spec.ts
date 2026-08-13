import { test } from '@japa/runner'

import { formatCnj, isValidCnj, normalizeCnj } from '#modules/processes/domain/cnj'

test.group('CNJ number', () => {
  test('normalizes, validates and formats the official 20-digit representation', ({ assert }) => {
    const normalized = normalizeCnj('5144506-05.2026.8.09.0112')

    assert.equal(normalized, '51445060520268090112')
    assert.isTrue(isValidCnj(normalized))
    assert.equal(formatCnj(normalized), '5144506-05.2026.8.09.0112')
  })

  test('rejects malformed numbers and invalid check digits', ({ assert }) => {
    assert.isFalse(isValidCnj('51445060620268090112'))
    assert.isFalse(isValidCnj('51445060520260090112'))
    assert.isFalse(isValidCnj('123'))
  })
})
