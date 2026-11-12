import { describe, expect, it } from 'vitest'
import { emiLoadBand, loanSummary, monthlyRate, presentValue } from './loan'

describe('loan', () => {
  it('computes present value', () => {
    expect(presentValue(1_000, 12, 0)).toBe(12_000)
    expect(presentValue(1_000, 12, 0.01)).toBeCloseTo(11_255.08, 1)
  })

  it('recovers a known monthly rate', () => {
    const rate = monthlyRate(100_000, 9_167, 12, 0)
    expect(rate).toBeGreaterThan(0.0149)
    expect(rate).toBeLessThan(0.0151)
    expect(monthlyRate(100_000, 9_167, 12, 0)).toBeCloseTo(0.015, 2)
  })

  it('raises the rate when fees are added', () => {
    const noFees = monthlyRate(100_000, 9_167, 12, 0)
    const withFees = monthlyRate(100_000, 9_167, 12, 5_000)
    expect(withFees).toBeGreaterThan(noFees)
  })

  it('returns NaN for an EMI that cannot repay the net amount', () => {
    expect(monthlyRate(100_000, 1_000, 12, 0)).toBeNaN()
    expect(monthlyRate(100_000, 9_167, 12, 150_000)).toBeNaN()
    expect(monthlyRate(0, 9_167, 12, 0)).toBeNaN()
    expect(monthlyRate(100_000, 9_167, 0, 0)).toBeNaN()
  })

  it('summarises a loan', () => {
    const summary = loanSummary(100_000, 9_168, 12, 0)
    expect(summary.monthlyRate).toBeGreaterThan(0.0149)
    expect(summary.annualEffective).toBeGreaterThan(0.19)
    expect(summary.nominalAnnual).toBeCloseTo(summary.monthlyRate * 12, 10)
    expect(summary.totalRepayable).toBe(110_016)
    expect(summary.interestCost).toBe(10_016)
  })

  it('bands EMI load', () => {
    expect(emiLoadBand(0.29)).toBe('green')
    expect(emiLoadBand(0.3)).toBe('amber')
    expect(emiLoadBand(0.45)).toBe('amber')
    expect(emiLoadBand(0.46)).toBe('red')
    expect(emiLoadBand(Number.NaN)).toBe('red')
  })
})