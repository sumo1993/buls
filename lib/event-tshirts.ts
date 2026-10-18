/** Shared helpers for event-attached T-shirts (v1–v3) */

export const DEFAULT_TSHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const

export type TshirtPricing = 'free' | 'paid'
export type TshirtPaymentStatus = 'waived' | 'pending' | 'paid' | 'refunded'

export function normalizeTshirtSizes(sizes: unknown): string[] {
  if (Array.isArray(sizes)) {
    const cleaned = sizes
      .map((s) => String(s).trim().toUpperCase())
      .filter(Boolean)
    if (cleaned.length > 0) return [...new Set(cleaned)]
  }
  return [...DEFAULT_TSHIRT_SIZES]
}

export function isValidTshirtSize(size: string | null | undefined, available: string[]): boolean {
  if (!size) return false
  return available.map((s) => s.toUpperCase()).includes(size.trim().toUpperCase())
}

/** Resolve payment status for a new registration / purchase. */
export function resolveTshirtPaymentStatus(
  wanted: boolean,
  pricing: TshirtPricing | string | null | undefined
): TshirtPaymentStatus | null {
  if (!wanted) return null
  // Free shirts use DB value "waived" (= no shirt payment due)
  return pricing === 'paid' ? 'pending' : 'waived'
}

/** Human-readable T-shirt payment label (avoid showing raw "waived"). */
export function formatTshirtPaymentStatus(
  status: string | null | undefined
): string {
  switch (status) {
    case 'waived':
      return 'Free'
    case 'pending':
      return 'Pending payment'
    case 'paid':
      return 'Paid'
    case 'refunded':
      return 'Refunded'
    default:
      return status || 'n/a'
  }
}

/** Shirt unit price from event config (0 if free / disabled / not wanted). */
export function getTshirtUnitPrice(
  event: {
    tshirt_enabled?: boolean | null
    tshirt_pricing?: string | null
    tshirt_price?: number | string | null
  } | null | undefined,
  wanted: boolean
): number {
  if (!wanted || !event?.tshirt_enabled) return 0
  if (event.tshirt_pricing !== 'paid') return 0
  const price = parseFloat(String(event.tshirt_price ?? 0))
  return Number.isFinite(price) && price >= 0 ? price : 0
}

/** Ticket line + optional shirt (one shirt per buyer for v2) + optional guests. */
export function combinedPurchaseTotal(
  ticketUnitPrice: number,
  quantity: number,
  tshirtAmount: number,
  guestAmount: number = 0
): number {
  const ticketTotal = (Number(ticketUnitPrice) || 0) * (Number(quantity) || 0)
  return (
    Math.round(
      (ticketTotal + (Number(tshirtAmount) || 0) + (Number(guestAmount) || 0)) * 100
    ) / 100
  )
}
