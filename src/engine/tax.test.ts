import { describe, expect, it } from 'vitest'
import {
  TAX_CONFIG,
  bestRegime,
  computeTax,
  estimateAnnualNet,
  presumptiveTax,
  slabTax,
  taxFromTds,
} from './tax'

describe('tax', () => {
  it('computes progressive slab tax in rupees', () => {
    expect(slabTax(1_500_000, TAX_CONFIG.regimes.new.slabs)).toBe(105_000)
    expect(slabTax(600_000, TAX_CONFIG.regimes.old.slabs)).toBe(32_500)
  })

  it('computes the new regime example', () => {
    const result = computeTax(150_000_000, 'new')
    expect(result.slabRupees).toBe(105_000)
    expect(result.rebateRupees).toBe(0)
    expect(result.cessPaise).toBe(420_000)
    expect(result.totalPaise).toBe(10_920_000)
  })

  it('computes the old regime example', () => {
    const result = computeTax(60_000_000, 'old')
    expect(result.slabRupees).toBe(32_500)
    expect(result.rebateRupees).toBe(0)
    expect(result.cessPaise).toBe(130_000)
    expect(result.totalPaise).toBe(3_380_000)
  })

  it('applies the 87A rebate', () => {
    const newAtLimit = computeTax(120_000_000, 'new')
    expect(newAtLimit.slabPaise).toBe(6_000_000)
    expect(newAtLimit.rebatePaise).toBe(6_000_000)
    expect(newAtLimit.totalPaise).toBe(0)

    const oldAtLimit = computeTax(50_000_000, 'old')
    expect(oldAtLimit.rebatePaise).toBe(1_250_000)
    expect(oldAtLimit.totalPaise).toBe(0)
  })

  it('recommends the cheaper regime', () => {
    const result = bestRegime(60_000_000)
    expect(result.recommended).toBe('new')
    expect(result.totalPaise).toBe(result.new.totalPaise)
    expect(result.old.totalPaise).toBe(3_380_000)
  })

  it('handles TDS refunds and amounts still to set aside', () => {
    expect(taxFromTds(10_920_000, 2_000_000)).toEqual({ stillToSet: 8_920_000, refund: 0 })
    expect(taxFromTds(10_920_000, 20_000_000)).toEqual({ stillToSet: 0, refund: 9_080_000 })
  })

  it('computes presumptive income only when eligible', () => {
    const eligible = presumptiveTax(2_500_000_000, true)
    expect(eligible.eligible).toBe(true)
    expect(eligible.deemedPaise).toBe(150_000_000)
    expect(eligible.totalPaise).toBe(10_920_000)

    expect(presumptiveTax(2_500_000_000, false).eligible).toBe(false)
    expect(presumptiveTax(3_000_000_001, true).eligible).toBe(false)
  })

  it('annualises actual net income', () => {
    expect(estimateAnnualNet(10_000, 10, 300)).toBe(300_000)
    expect(estimateAnnualNet(10_000, 0, 300)).toBe(0)
  })
})