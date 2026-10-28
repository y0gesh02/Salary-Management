import type { Period } from '@/api/types'

const PERIOD_LABELS: Record<Period, string> = { annual: 'year', monthly: 'month' }

// "INR 2,149,100" — the currency code is always shown because the org pays in
// several currencies and the app never converts between them. One grouping style
// (en-US) everywhere keeps figures comparable at a glance.
export function formatMoney(amount: string, currency: string, period?: Period): string {
  return `${currency} ${formatAmount(amount)}${period ? ` / ${PERIOD_LABELS[period]}` : ''}`
}

// The number alone, for tables that show the currency in its own column.
export function formatAmount(amount: string): string {
  const value = Number(amount)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

// "INR 2.4M" — for chart labels and axes, where full figures would collide.
// Tables and tooltips keep using formatMoney.
export function formatMoneyCompact(amount: string | number, currency: string): string {
  return `${currency} ${formatCompact(amount)}`
}

export function formatCompact(amount: string | number): string {
  return compact.format(Number(amount))
}
