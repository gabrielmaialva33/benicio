export function normalizeCnj(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Validates the CNJ 20-digit number using ISO 7064 Mod 97-10.
 * The persisted representation is NNNNNNNDDYYYYJTR0000 (digits only).
 */
export function isValidCnj(value: string): boolean {
  if (!/^[0-9]{13}[1-9][0-9]{6}$/.test(value)) {
    return false
  }

  const verificationOrder = `${value.slice(0, 7)}${value.slice(9)}${value.slice(7, 9)}`
  let remainder = 0

  for (const digit of verificationOrder) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }

  return remainder === 1
}

export function formatCnj(value: string): string {
  return value.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6')
}
