import { describe, it, expect } from 'vitest'
import { toPaise, toRupees, formatINR, parseRupees } from './money'

describe('money', () => {
  it('float-free conversion', () => {
    expect(toPaise(125.5)).toBe(12550)
    expect(toPaise(19.99)).toBe(1999)
    expect(toPaise(0)).toBe(0)
    expect(toPaise(1)).toBe(100)
    expect(toRupees(12550)).toBe(125.5)
  })

  it('Indian grouping whole rupees', () => {
    expect(formatINR(12500000)).toBe('₹1,25,000')
    expect(formatINR(100)).toBe('₹1')
    expect(formatINR(100000)).toBe('₹1,000')
    expect(formatINR(1000000)).toBe('₹10,000')
    expect(formatINR(10000000)).toBe('₹1,00,000')
    expect(formatINR(0)).toBe('₹0')
  })

  it('paise display with decimals 2', () => {
    expect(formatINR(12500050, { decimals: 2 })).toBe('₹1,25,000.50')
    expect(formatINR(105, { decimals: 2 })).toBe('₹1.05')
    expect(formatINR(100, { decimals: 2 })).toBe('₹1.00')
  })

  it('negatives', () => {
    expect(formatINR(-123400)).toBe('−₹1,234')
    expect(formatINR(-105, { decimals: 2 })).toBe('−₹1.05')
  })

  it('parsing', () => {
    expect(parseRupees('₹1,25,000')).toBe(12500000)
    expect(parseRupees(' 1,234.50 ')).toBe(123450)
    expect(parseRupees('₹ 50')).toBe(5000)
    expect(parseRupees('')).toBeNull()
    expect(parseRupees('abc')).toBeNull()
    expect(parseRupees('-')).toBeNull()
    expect(parseRupees('   ')).toBeNull()
  })
})
