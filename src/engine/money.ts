export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function toRupees(paise: number): number {
  return paise / 100
}

export function formatINR(paise: number, opts?: { decimals?: 0 | 2 }): string {
  const decimals = opts?.decimals ?? 0
  const sign = paise < 0 ? '−' : ''
  let abs = Math.abs(paise)
  let intPart: number
  let fracPart: number
  if (decimals === 2) {
    intPart = Math.floor(abs / 100)
    fracPart = abs % 100
  } else {
    intPart = Math.round(abs / 100)
    fracPart = 0
  }
  const intStr = formatIndianGrouping(intPart)
  if (decimals === 2) {
    return `${sign}₹${intStr}.${String(fracPart).padStart(2, '0')}`
  }
  return `${sign}₹${intStr}`
}

function formatIndianGrouping(n: number): string {
  const s = String(Math.floor(Math.abs(n)))
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  let rest = s.slice(0, -3)
  const parts: string[] = []
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest.length > 0) parts.unshift(rest)
  return parts.join(',') + ',' + last3
}

export function parseRupees(input: string): number | null {
  const stripped = input.replace(/[₹,\s]/g, '')
  if (stripped === '' || stripped === '-' || stripped === '.' || stripped === '-.') return null
  if (!/^-?\d+(\.\d+)?$/.test(stripped)) return null
  const n = Number(stripped)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}
