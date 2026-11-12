import { describe, expect, it } from 'vitest'
import { parseBankSms } from './sms'

describe('bank sms ingest', () => {
  it('parses amount, direction and confidence', () => {
    const parsed = parseBankSms('Rs.1,234.50 credited to a/c XX')
    expect(parsed).not.toBeNull()
    expect(parsed?.kind).toBe('credit')
    expect(parsed?.amountPaise).toBe(123_450)
    expect(parsed?.confidence).toBe(0.9)
    expect(parsed?.needsReview).toBe(false)
    expect(parsed?.dedupeKey).toMatch(/^[0-9a-f]{8}$/)
  })

  it('parses INR, rupee symbols and debit', () => {
    const inr = parseBankSms('INR 500 debited from account')
    expect(inr?.kind).toBe('debit')
    expect(inr?.amountPaise).toBe(50_000)

    const rupee = parseBankSms('₹ 99.99 credited via UPI')
    expect(rupee?.kind).toBe('credit')
    expect(rupee?.amountPaise).toBe(9_999)
  })

  it('rejects non-transactions and invalid amounts', () => {
    expect(parseBankSms('Your OTP is 123456')).toBeNull()
    expect(parseBankSms('Rs 0 credited')).toBeNull()
    expect(parseBankSms('Rs 100')).toBeNull()
    expect(parseBankSms('Rs -100 credited')).toBeNull()
    expect(parseBankSms('Rs 100 credited and debited')).toBeNull()
  })

  it('marks low-confidence messages for review', () => {
    const parsed = parseBankSms('Rs 100 credited')
    expect(parsed?.confidence).toBe(0.7)
    expect(parsed?.needsReview).toBe(true)
  })

  it('gives identical messages the same dedupe key', () => {
    const a = parseBankSms('Rs 100 credited')
    const b = parseBankSms('  rs   100   credited ')
    expect(a?.dedupeKey).toBe(b?.dedupeKey)
    const debit = parseBankSms('Rs 100 debited')
    expect(debit?.dedupeKey).not.toBe(a?.dedupeKey)
  })
})