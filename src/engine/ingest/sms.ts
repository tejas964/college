import { maskNote } from '../ledger'

export interface SmsParseResult {
  amount: number
  kind: 'credit' | 'debit'
  confidence: number
  needsReview: boolean
  note: string
  dedupeKey: string
}

export function fnv1a32(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function normalizeForKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number | null {
  // Match Rs./INR/₹ followed by amount
  const re = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  const m = text.match(re)
  if (!m) return null
  const numStr = m[1].replace(/,/g, '')
  const n = Number(numStr)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export function parseBankSms(text: string): SmsParseResult | null {
  const amount = parseAmount(text)
  if (amount === null) return null
  const lower = text.toLowerCase()
  const credited = /\bcredited\b/.test(lower)
  const debited = /\bdebited\b/.test(lower)
  if (credited === debited) {
    // must be clearly one or the other
    if (!credited && !debited) return null
    return null
  }
  const kind: 'credit' | 'debit' = credited ? 'credit' : 'debit'
  const hasAcct = /\b(a\/c|acct|account|upi)\b/i.test(text)
  const confidence = hasAcct ? 0.9 : 0.7
  const needsReview = confidence < 0.85
  const note = maskNote(text)
  const dedupeKey = fnv1a32(`${kind}|${amount}|${normalizeForKey(text)}`)
  return { amount, kind, confidence, needsReview, note, dedupeKey }
}
