/**
 * Shared event occupancy / capacity counting.
 * Counts people who hold a reserved spot (excludes waitlist & refunded/rejected).
 */

type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

export type EventOccupancy = {
  member_registrations: number
  ticket_purchasers: number
  ticket_guests: number
  non_member_registrations: number
  public_registrations: number
  total: number
}

const MEMBER_ACTIVE = ['registered']
const TICKET_ACTIVE = ['paid', 'pending']
const NON_MEMBER_ACTIVE = ['pending', 'payment_pending', 'approved', 'verified']
const PUBLIC_ACTIVE = ['pending', 'payment_pending', 'approved']

/** Count confirmed (capacity-filling) attendees across all registration sources. */
export async function getEventOccupancy(
  adminClient: AdminClient,
  eventId: string
): Promise<EventOccupancy> {
  const [
    { count: memberCount },
    { data: purchases },
    { count: nonMemberCount },
    { count: publicCount },
  ] = await Promise.all([
    adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', MEMBER_ACTIVE),
    adminClient
      .from('ticket_purchases')
      .select('id, quantity, payment_status')
      .eq('event_id', eventId)
      .in('payment_status', TICKET_ACTIVE),
    adminClient
      .from('non_member_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', NON_MEMBER_ACTIVE),
    adminClient
      .from('public_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', PUBLIC_ACTIVE),
  ])

  const activePurchases = purchases || []
  // Each purchase is one purchaser seat (quantity is ticket units, not extra people)
  const ticketPurchasers = activePurchases.length

  let ticketGuests = 0
  if (activePurchases.length > 0) {
    const { count: guestCount } = await adminClient
      .from('ticket_guests')
      .select('*', { count: 'exact', head: true })
      .in(
        'ticket_purchase_id',
        activePurchases.map((p) => p.id)
      )
      .not('payment_status', 'eq', 'refunded')

    ticketGuests = guestCount || 0
  }

  const member_registrations = memberCount || 0
  const non_member_registrations = nonMemberCount || 0
  const public_registrations = publicCount || 0

  return {
    member_registrations,
    ticket_purchasers: ticketPurchasers,
    ticket_guests: ticketGuests,
    non_member_registrations,
    public_registrations,
    total:
      member_registrations +
      ticketPurchasers +
      ticketGuests +
      non_member_registrations +
      public_registrations,
  }
}

export function spotsRemaining(
  capacity: number | null | undefined,
  occupied: number
): number | null {
  if (capacity == null) return null
  return Math.max(0, capacity - occupied)
}

export function isEventFull(
  capacity: number | null | undefined,
  occupied: number
): boolean {
  if (capacity == null) return false
  return occupied >= capacity
}

/** Promote the next waitlisted member when a registered spot frees up. */
export async function promoteNextFromWaitlist(
  adminClient: AdminClient,
  eventId: string
): Promise<{ promoted: boolean; user_id?: string }> {
  const { data: event } = await adminClient
    .from('events')
    .select('capacity, waitlist_enabled')
    .eq('id', eventId)
    .maybeSingle()

  if (!event?.waitlist_enabled || !event.capacity) {
    return { promoted: false }
  }

  const occupancy = await getEventOccupancy(adminClient, eventId)
  if (occupancy.total >= event.capacity) {
    return { promoted: false }
  }

  const { data: next } = await adminClient
    .from('event_registrations')
    .select('id, user_id')
    .eq('event_id', eventId)
    .eq('status', 'waitlist')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!next) return { promoted: false }

  const { error } = await adminClient
    .from('event_registrations')
    .update({
      status: 'registered',
      promoted_from_waitlist_at: new Date().toISOString(),
      waitlist_notified_at: new Date().toISOString(),
      waitlist_position: null,
    })
    .eq('id', next.id)
    .eq('status', 'waitlist')

  if (error) {
    console.error('Auto-promote waitlist failed:', error)
    return { promoted: false }
  }

  return { promoted: true, user_id: next.user_id }
}
