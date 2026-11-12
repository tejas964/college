import { describe, expect, it } from 'vitest'
import { bankTotals, isDuplicate, maskNote } from './ledger'
import type { LedgerEntry } from './ledger'

const entry = (patch: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'e1',
  kind: 'credit',
  amount: 1_000,
  day: '2026-01-01',
  source: 'sms',
  dedupeKey: 'key1',
  status: 'posted',
  note: 'credit',
  ...patch,
})

describe('ledger', () => {
  it('detects duplicates', () => {
    const entries = [entry({})]
    expect(isDuplicate(entries, 'key1')).toBe(true)
    expect(isDuplicate(entries, 'key2')).toBe(false)
  })

  it('masks long digit runs and caps notes', () => {
    expect(maskNote('a/c 1234567890 UPI ref 9876543210')).toBe('a/c •••• UPI ref ••••')
    expect(maskNote('  lots   of\n space  ')).toBe('lots of space')
    expect(maskNote('1234567890 '.repeat(20)).length).toBe(80)
  })

  it('sums only posted entries inside the range', () => {
    const entries = [
      entry({ id: 'a', kind: 'credit', amount: 1_000, day: '2026-01-01' }),
      entry({ id: 'b', kind: 'debit', amount: 500, day: '2026-01-02' }),
      entry({ id: 'c', kind: 'credit', amount: 2_000, day: '2026-01-03', status: 'review' }),
      entry({ id: 'd', kind: 'debit', amount: 300, day: '2026-01-04', status: 'rejected' }),
      entry({ id: 'e', kind: 'credit', amount: 4_000, day: '2026-02-01' }),
    ]
    expect(bankTotals(entries, '2026-01-01', '2026-01-31')).toEqual({ credits: 1_000, debits: 500 })
  })
})