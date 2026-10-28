import type { Period } from '@/api/types'

const PERIOD_LABELS: Record<Period, string> = { annual: 'year', monthly: 'month' }

// "INR 2,149,100" — the currency code is always shown because the org pays in
// several currencies and the app never converts between them. One grouping style
// (en-US) everywhere keeps figures comparable at a glance.
export function formatMoney(amount: string, currency: string, period?: Period): string {
  const value = Number(amount)
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)

  return `${currency} ${number}${period ? ` / ${PERIOD_LABELS[period]}` : ''}`
}
