export type LedgerKind = 'credit' | 'debit'
export type LedgerSource = 'sms' | 'manual'
export type LedgerStatus = 'posted' | 'review' | 'rejected'

export interface LedgerEntry {
  id: string
  kind: LedgerKind
  amount: number
  day: string
  source: LedgerSource
  dedupeKey: string
  status: LedgerStatus
  note: string
}

export function isDuplicate(entries: LedgerEntry[], key: string): boolean {
  return entries.some((entry) => entry.dedupeKey === key)
}

export function maskNote(text: string): string {
  return String(text)
    .replace(/\d{4,}/g, '••••')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export interface BankTotals {
  credits: number
  debits: number
}

export function bankTotals(entries: LedgerEntry[], from: string, to: string): BankTotals {
  let credits = 0
  let debits = 0
  for (const entry of entries) {
    if (entry.status !== 'posted') continue
    if (entry.day < from || entry.day > to) continue
    if (entry.kind === 'credit') credits += entry.amount
    else debits += entry.amount
  }
  return { credits, debits }
}