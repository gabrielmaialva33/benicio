import { isValidCnj } from '#modules/processes/domain/cnj'

function numericBase(value: string, length: number): string {
  const digits = value.replace(/\D/g, '').padStart(length, '0').slice(-length)
  if (/^(\d)\1+$/.test(digits)) {
    return `${digits.slice(0, -1)}${(Number(digits.at(-1)) + 1) % 10}`
  }
  return digits
}

function modulo11Digit(base: string, weights: number[]): number {
  const sum = [...base].reduce((total, digit, index) => total + Number(digit) * weights[index], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/** Builds a checksum-valid synthetic CPF from any nine-digit value. */
export function cpfFrom(value: string): string {
  const base = numericBase(value, 9)
  const first = modulo11Digit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = modulo11Digit(`${base}${first}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${base}${first}${second}`
}

/** Builds a checksum-valid synthetic CNPJ from any twelve-digit value. */
export function cnpjFrom(value: string): string {
  const base = numericBase(value, 12)
  const first = modulo11Digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = modulo11Digit(`${base}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${base}${first}${second}`
}

/** Builds a checksum-valid, digits-only CNJ number for factory data. */
export function cnjFrom(parts: {
  sequence: string
  year: number
  segment: number
  tribunal: string
  origin: string
}): string {
  const sequence = numericBase(parts.sequence, 7)
  const year = String(parts.year).padStart(4, '0').slice(-4)
  const segment = String(parts.segment).slice(-1)
  const tribunal = numericBase(parts.tribunal, 2)
  const origin = numericBase(parts.origin, 4)

  for (let check = 0; check <= 99; check++) {
    const candidate = `${sequence}${String(check).padStart(2, '0')}${year}${segment}${tribunal}${origin}`
    if (isValidCnj(candidate)) return candidate
  }

  throw new Error('Unable to generate a valid synthetic CNJ number')
}
