import { describe, it, expect } from 'vitest'
import { computeTax, bestRegime, presumptiveTax, taxFromTds, estimateAnnualNet, slabTax } from './tax'

describe('tax', () => {
  it('slab maths', () => {
    expect(slabTax(0, [{ upTo: 250000, rate: 0 }, { upTo: null, rate: 0.1 }])).toBe(0)
  })

  it('old regime example (₹6,00,000 gives ₹33,800)', () => {
    const r = computeTax(600000 * 100, 'old')
    // slab: 0-2.5L 0, 2.5-5L 12500, 5-6L 20000 => 32500. income 6L > 5L so no rebate. cess 1300. total 33800
    expect(r.slabTax).toBe(32500)
    expect(r.rebate).toBe(0)
    expect(r.cess).toBe(1300)
    expect(r.totalPaise).toBe(33800 * 100)
  })

  it('new regime example (₹15,00,000 gives ₹1,09,200)', () => {
    const r = computeTax(1500000 * 100, 'new')
    // 0-4:0, 4-8:20000, 8-12:40000, 12-15:45000 => 105000, no rebate (>12L), cess 4200, total 109200
    expect(r.slabTax).toBe(105000)
    expect(r.rebate).toBe(0)
    expect(r.cess).toBe(4200)
    expect(r.totalPaise).toBe(109200 * 100)
  })

  it('87A rebate', () => {
    const n = computeTax(1200000 * 100, 'new')
    // slab 60000, rebate 60000 => 0
    expect(n.slabTax).toBe(60000)
    expect(n.rebate).toBe(60000)
    expect(n.totalPaise).toBe(0)
    const o = computeTax(500000 * 100, 'old')
    expect(o.slabTax).toBe(12500)
    expect(o.rebate).toBe(12500)
    expect(o.totalPaise).toBe(0)
  })

  it('best regime', () => {
    const b = bestRegime(1500000 * 100)
    expect(['new', 'old']).toContain(b.recommended)
    expect(b[b.recommended].totalPaise).toBeLessThanOrEqual(
      b[b.recommended === 'new' ? 'old' : 'new'].totalPaise
    )
  })

  it('TDS refund/still to set', () => {
    expect(taxFromTds(10000, 3000)).toEqual({ stillToSet: 7000, refund: 0 })
    expect(taxFromTds(10000, 15000)).toEqual({ stillToSet: 0, refund: 5000 })
  })

  it('presumptive eligibility and 6% deemed income', () => {
    const no = presumptiveTax(1000000 * 100, false)
    expect(no.eligible).toBe(false)
    const yes = presumptiveTax(1000000 * 100, true)
    expect(yes.eligible).toBe(true)
    expect(yes.deemedIncomePaise).toBe(Math.round(1000000 * 0.06) * 100)
    const over = presumptiveTax(40000000 * 100, true)
    expect(over.eligible).toBe(false)
  })

  it('annualisation', () => {
    expect(estimateAnnualNet(10000, 10, 300)).toBe(300000)
    expect(estimateAnnualNet(10000, 0, 300)).toBe(0)
  })
})
