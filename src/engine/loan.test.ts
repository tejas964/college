import { describe, it, expect } from 'vitest'
import { monthlyRate, loanSummary, emiLoadBand, presentValue } from './loan'

describe('loan', () => {
  it('rate recovered from a known schedule', () => {
    // ₹1,00,000 at 1.5%/month over 12 months ≈ ₹9,167 EMI
    const r = monthlyRate(10000000, 916700, 12, 0)
    expect(r).toBeGreaterThan(0.0145)
    expect(r).toBeLessThan(0.0155)
    // verify pv
    expect(Math.abs(presentValue(916700, 12, r) - 10000000)).toBeLessThan(200)
  })

  it('fees raise the rate', () => {
    const noFee = monthlyRate(10000000, 916700, 12, 0)
    const withFee = monthlyRate(10000000, 916700, 12, 200000)
    expect(withFee).toBeGreaterThan(noFee)
  })

  it('impossible EMI gives NaN', () => {
    expect(monthlyRate(10000000, 10000, 12, 0)).toBeNaN()
    expect(monthlyRate(10000000, 916700, 12, 0)).not.toBeNaN()
  })

  it('loanSummary fields', () => {
    const s = loanSummary(10000000, 916700, 12, 0)
    expect(s.totalRepayable).toBe(916700 * 12)
    expect(s.interestCost).toBe(916700 * 12 - 10000000)
    expect(s.nominalAnnual).toBeCloseTo(s.monthlyRate * 12, 8)
    expect(s.annualEffective).toBeCloseTo(Math.pow(1 + s.monthlyRate, 12) - 1, 8)
  })

  it('EMI load bands', () => {
    expect(emiLoadBand(0)).toBe('green')
    expect(emiLoadBand(0.29)).toBe('green')
    expect(emiLoadBand(0.3)).toBe('amber')
    expect(emiLoadBand(0.45)).toBe('amber')
    expect(emiLoadBand(0.451)).toBe('red')
  })
})
