import { describe, expect, it } from 'vitest'
import { formatINR, parseRupees, toPaise, toRupees } from './money'

describe('money', () => {
  it('formats Indian grouping without paise', () => {
    expect(formatINR(12_500_000)).toBe('₹1,25,000')
    expect(formatINR(4_332_809)).toBe('₹43,328')
    expect(formatINR(0)).toBe('₹0')
  })

  it('formats paise when asked', () => {
    expect(formatINR(4_332_809, { decimals: 2 })).toBe('₹43,328.09')
    expect(formatINR(500, { decimals: 2 })).toBe('₹5.00')
  })

  it('formats negatives with a true minus sign', () => {
    expect(formatINR(-123_450)).toBe('−₹1,235')
    expect(formatINR(-123_450, { decimals: 2 })).toBe('−₹1,234.50')
  })

  it('converts without floating point error', () => {
    expect(toPaise(19.99)).toBe(1999)
    expect(toPaise(0.1 + 0.2)).toBe(30)
    expect(toRupees(1999)).toBe(19.99)
  })

  it('parses rupee strings', () => {
    expect(parseRupees('₹1,25,000.50')).toBe(125_000.5)
    expect(parseRupees(' 1 234 ')).toBe(1234)
    expect(parseRupees('')).toBeNull()
    expect(parseRupees('abc')).toBeNull()
    expect(parseRupees('12abc')).toBeNull()
    expect(parseRupees('1.2.3')).toBeNull()
  })
})