import { describe, it, expect } from 'vitest'
import { isDuplicate, maskNote, bankTotals, LedgerEntry } from './ledger'

const entry = (p: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'e1', kind: 'credit', amount: 10000, day: '2026-11-11', source: 'sms',
  dedupeKey: 'k1', status: 'posted', note: 'test', ...p,
})

describe('ledger', () => {
  it('dedupe', () => {
    const entries = [entry({ dedupeKey: 'abc' })]
    expect(isDuplicate(entries, 'abc')).toBe(true)
    expect(isDuplicate(entries, 'def')).toBe(false)
  })

  it('masking of long digit runs', () => {
    expect(maskNote('Credited to A/C 1234567890 Rs 500')).toBe('Credited to A/C •••• Rs 500')
    expect(maskNote('UPI ref 123456789012')).toBe('UPI ref ••••')
    expect(maskNote('short 123 ok')).toBe('short 123 ok')
    expect(maskNote('  lots   of   space  ')).toBe('lots of space')
    const long = 'A'.repeat(100)
    expect(maskNote(long).length).toBe(80)
  })

  it('bank totals include only posted entries in range', () => {
    const entries = [
      entry({ kind: 'credit', amount: 10000, day: '2026-11-10', status: 'posted' }),
      entry({ kind: 'debit', amount: 4000, day: '2026-11-11', status: 'posted' }),
      entry({ kind: 'credit', amount: 9000, day: '2026-11-12', status: 'review' }),
      entry({ kind: 'credit', amount: 8000, day: '2026-10-01', status: 'posted' }),
    ]
    const t = bankTotals(entries, '2026-11-01', '2026-11-30')
    expect(t.credits).toBe(10000)
    expect(t.debits).toBe(4000)
  })
})
