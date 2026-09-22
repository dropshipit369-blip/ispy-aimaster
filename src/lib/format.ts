const moneyFormatters = new Map<string, Intl.NumberFormat>()

/** en-AU currency formatting, e.g. formatMoney(1250) → "$1,250.00". Falls back safely on unknown codes. */
export function formatMoney(amount: number, currency = 'AUD'): string {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    let formatter = moneyFormatters.get(currency)
    if (!formatter) {
      formatter = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      moneyFormatters.set(currency, formatter)
    }
    return formatter.format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

/** Whole-dollar AUD for plan prices, e.g. 1900 minor units → "$19". */
export function formatPlanPrice(amountMinor: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
}

export function formatDateAU(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTimeAU(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Quota resets at Melbourne midnight; show it in Melbourne time so the label is always "12:00 am AEST/AEDT". */
export function formatResetTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Melbourne',
    timeZoneName: 'short',
  })
}
