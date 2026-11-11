import { describe, it, expect } from 'vitest'
import { parseBankSms } from './sms'

describe('sms', () => {
  it('amount and direction parsing', () => {
    const r = parseBankSms('Rs. 500.00 credited to A/C XX1234 on 11-11-26')
    expect(r).not.toBeNull()
    expect(r!.amount).toBe(50000)
    expect(r!.kind).toBe('credit')
    const d = parseBankSms('INR 1,250.00 debited from account 9876 via UPI')
    expect(d).not.toBeNull()
    expect(d!.amount).toBe(125000)
    expect(d!.kind).toBe('debit')
  })

  it('rejecting non-transactions', () => {
    expect(parseBankSms('Hello your OTP is 1234')).toBeNull()
    expect(parseBankSms('Rs 500 received')).toBeNull() // no credited/debited
    expect(parseBankSms('credited debited Rs 500 to A/C 1234')).toBeNull()
  })

  it('review flag and confidence', () => {
    const withAcct = parseBankSms('Rs 500 credited to A/C 1234')
    expect(withAcct!.confidence).toBe(0.9)
    expect(withAcct!.needsReview).toBe(false)
    const noAcct = parseBankSms('Rs 500 credited today')
    expect(noAcct!.confidence).toBe(0.7)
    expect(noAcct!.needsReview).toBe(true)
  })

  it('identical messages share a dedupe key', () => {
    const msg = 'Rs 500 credited to A/C 1234 on 11-11'
    const a = parseBankSms(msg)
    const b = parseBankSms(msg)
    expect(a!.dedupeKey).toBe(b!.dedupeKey)
  })

  it('masks long digits in note', () => {
    const r = parseBankSms('Rs 500 credited to A/C 1234567890')
    expect(r!.note).not.toContain('1234567890')
    expect(r!.note).toContain('••••')
  })
})
