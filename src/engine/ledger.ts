import { dayNumber } from './bills'

export interface LedgerEntry {
  id: string
  kind: 'credit' | 'debit'
  amount: number
  day: string
  source: 'sms' | 'manual'
  dedupeKey: string
  status: 'posted' | 'review' | 'rejected'
  note: string
}

export function isDuplicate(entries: LedgerEntry[], key: string): boolean {
  return entries.some((e) => e.dedupeKey === key)
}

export function maskNote(text: string): string {
  const replaced = text.replace(/\d{4,}/g, '••••')
  const collapsed = replaced.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= 80) return collapsed
  return collapsed.slice(0, 80)
}

export interface BankTotals {
  credits: number
  debits: number
}

export function bankTotals(entries: LedgerEntry[], from: string, to: string): BankTotals {
  const fromN = dayNumber(from)
  const toN = dayNumber(to)
  let credits = 0
  let debits = 0
  for (const e of entries) {
    if (e.status !== 'posted') continue
    const dn = dayNumber(e.day)
    if (dn < fromN || dn > toN) continue
    if (e.kind === 'credit') credits += e.amount
    else debits += e.amount
  }
  return { credits, debits }
}
