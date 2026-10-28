import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyCompact } from './money'

describe('formatMoney', () => {
  it('always shows the currency code, so amounts in different currencies are never confused', () => {
    expect(formatMoney('2149100.0', 'INR')).toBe('INR 2,149,100')
    expect(formatMoney('156000.0', 'USD')).toBe('USD 156,000')
  })

  it('shows cents only when there are any', () => {
    expect(formatMoney('1234.5', 'EUR')).toBe('EUR 1,234.50')
  })

  it('adds the pay period when given', () => {
    expect(formatMoney('110000.0', 'INR', 'monthly')).toBe('INR 110,000 / month')
    expect(formatMoney('1320000.0', 'INR', 'annual')).toBe('INR 1,320,000 / year')
  })
})

describe('formatMoneyCompact', () => {
  it('shortens large amounts for chart labels, still naming the currency', () => {
    expect(formatMoneyCompact('2400000.0', 'INR')).toBe('INR 2.4M')
    expect(formatMoneyCompact('145000.0', 'USD')).toBe('USD 145K')
    expect(formatMoneyCompact('950.0', 'EUR')).toBe('EUR 950')
  })
})

