# Requirements: Event Attendance Verification Filter

## Summary
Update the `fetchEventAttendance` function in `app/secretary/page.tsx` to filter attendees by verified status. Currently, the function shows ALL registrations for events. The requirement is to show ONLY verified attendees based on event type and payment status.

## Functional Requirements

### FR1: Free Event Attendance Display
- Free events (`event_type === 'free'`) must show ALL registered attendees (both members and non-members).
- All free event attendees are considered auto-verified.
- No payment status or approval status filtering required.

### FR2: Ticket-Only Event Attendance Display  
- Ticket-only events (`event_type === 'ticket_only'`) must show ONLY attendees who meet ALL of the following:
  - Have `payment_status === 'paid'` OR
  - Is a non-member with `status === 'approved'` AND `amount_paid > 0`
- Exclude attendees with `payment_status === 'refunded'`, `payment_pending`, or unapproved non-members.
- Exclude members without paid tickets unless they meet non-member approval criteria.

### FR3: Paid Event Attendance Display
- Paid events (not free, not ticket_only) already show only paid ticket holders (existing behavior is correct).
- Guest attendees must be excluded from the main attendee list (guests are handled separately in FR2 logic for ticket-only events).

### FR4: Verification Logic Priority
The verification order must be:
1. Free events → auto-verify all registrations
2. Ticket-only events → verify payment_status='paid' OR (non-member + approved + amount_paid > 0)
3. Paid events → verify ticket purchase payment_status='paid'

## Acceptance Criteria

### AC1: Free Event Attendees
Given an event with `event_type = 'free'`
When fetching attendance
Then ALL registrations appear regardless of payment status or approval status

### AC2: Ticket-Only Event Attendees  
Given an event with `event_type = 'ticket_only'`
When fetching attendance
Then ONLY attendees with:
  - `payment_status = 'paid'` OR
  - (non-member AND `status = 'approved'` AND `amount_paid > '0.00'`)
are shown

### AC3: Excluded Attendees for Ticket-Only Events
Given an event with `event_type = 'ticket_only'`
When fetching attendance
Then attendees with:
  - `payment_status = 'refunded'`
  - `payment_status = 'payment_pending'`
  - non-member with `status != 'approved'` OR `amount_paid = '0.00'`
are NOT shown

### AC4: Paid Event Attendees (Existing Behavior)
Given an event with `event_type != 'free'` AND `event_type != 'ticket_only'`
When fetching attendance
Then ONLY ticket purchases with `payment_status = 'paid'` appear in main attendees
Guests are handled separately (already implemented)

## Out of Scope
- Modifying the check-in functionality (marking attendance)
- Modifying the guest management modal
- Changing the event registration flow
- Updating other tabs (meetings, announcements, etc.)
- Implementing new API endpoints
- Modifying database schema

## Assumptions
1. The `payment_status` field exists and has values: 'paid', 'refunded', 'payment_pending'
2. Non-member registrations have a `status` field with values: 'approved', 'payment_pending', etc.
3. The `amount_paid` field exists as a numeric or string representation of currency
4. Event type is determined by `event.event_type` field
5. Existing event registration data includes `user_id` for members (nullable) and registration fields for non-members