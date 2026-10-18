/**
 * Shared eligibility rules for event check-in / verified lists.
 * Paid events: treasurer (or collected door payment) must clear payment first.
 */

export const GUEST_CHECKIN_PAYMENT_STATUSES = [
  'paid',
  'paid_online',
  'paid_at_door',
  'complimentary',
  'waived',
] as const

export function isGuestPaymentCleared(paymentStatus: string | null | undefined): boolean {
  if (!paymentStatus) return false
  return (GUEST_CHECKIN_PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)
}

export function isGuestRefunded(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === 'refunded'
}

/** Non-member may check in only after treasurer approval. */
export function isNonMemberApproved(status: string | null | undefined): boolean {
  // Treasurer writes "approved"; accept legacy "verified" synonym
  return status === 'approved' || status === 'verified'
}

export function isTicketPaid(paymentStatus: string | null | undefined, status?: string | null): boolean {
  if (paymentStatus === 'refunded') return false
  return (
    paymentStatus === 'paid' ||
    status === 'confirmed' ||
    status === 'paid'
  )
}

/**
 * Verified-only filter used by check-in UI and attendance reports.
 * Free event: everyone. Paid-like: paid tickets, cleared guests, approved non-members.
 */
export function passesVerifiedAttendeeFilter(
  a: any,
  options?: { isFreeEvent?: boolean; includeRefundedForReport?: boolean }
): boolean {
  const isFreeEvent = !!options?.isFreeEvent
  const includeRefunded = !!options?.includeRefundedForReport

  // Waitlisted members are not check-in eligible until promoted
  if (a.status === 'waitlist') return false

  if (isFreeEvent) return true

  if (a.type === 'free' || a.type === 'registration') return true

  if (a.type === 'ticket') {
    if (a.payment_status === 'refunded') return includeRefunded
    return isTicketPaid(a.payment_status, a.status)
  }

  if (a.type === 'guest') {
    if (isGuestRefunded(a.payment_status)) return includeRefunded
    return isGuestPaymentCleared(a.payment_status)
  }

  if (a.type === 'non_member') {
    if (a.status === 'refunded') return includeRefunded
    return isNonMemberApproved(a.status)
  }

  return false
}
