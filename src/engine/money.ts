export const PAISE_PER_RUPEE = 100

export function toPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE)
}

export function toRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits
  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${grouped},${last3}`
}

export interface FormatOptions {
  decimals?: 0 | 2
}

export function formatINR(paise: number, options: FormatOptions = {}): string {
  const decimals = options.decimals ?? 0
  if (!Number.isFinite(paise)) return '₹0'
  const rounded = Math.round(paise)
  const negative = rounded < 0
  const abs = Math.abs(rounded)
  let body: string
  if (decimals === 2) {
    const rupees = Math.floor(abs / 100)
    const rest = abs % 100
    body = `${groupIndian(String(rupees))}.${String(rest).padStart(2, '0')}`
  } else {
    const rupees = Math.round(abs / 100)
    body = groupIndian(String(rupees))
  }
  const sign = negative && body !== '0' && body !== '0.00' ? '−' : ''
  return `${sign}₹${body}`
}

export function parseRupees(input: string): number | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .replace(/[\s\u00a0]/g, '')
  if (cleaned === '') return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}