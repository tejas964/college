import type { LedgerKind } from '../engine/ledger'

export interface ParsedSms {
  kind: LedgerKind
  amountPaise: number
  confidence: number
  needsReview: boolean
  dedupeKey: string
  raw: string
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function parseBankSms(text: string): ParsedSms | null {
  if (typeof text !== 'string') return null
  const amountMatch = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i.exec(text)
  if (!amountMatch) return null
  const amountRupees = Number(amountMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(amountRupees) || amountRupees <= 0) return null

  const hasCredit = /credit(?:ed)?\b/i.test(text)
  const hasDebit = /debit(?:ed)?\b/i.test(text)
  if (hasCredit === hasDebit) return null
  const kind: LedgerKind = hasCredit ? 'credit' : 'debit'

  const confidence = /a\/c|acct|account|upi/i.test(text) ? 0.9 : 0.7
  const normalised = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const amountPaise = Math.round(amountRupees * 100)
  return {
    kind,
    amountPaise,
    confidence,
    needsReview: confidence < 0.85,
    dedupeKey: fnv1a(`${kind}|${amountPaise}|${normalised}`),
    raw: text,
  }
}