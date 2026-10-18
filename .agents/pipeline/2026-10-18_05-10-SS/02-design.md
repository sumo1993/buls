# Technical Design: Event Attendance Verification Filter ( Revised)

## Overview

Update the `fetchEventAttendance` function in `app/secretary/page.tsx` to filter attendees by verified status. The function currently shows ALL registrations for all event types. This design implements verification logic that:
- Free events: Show all registered attendees (auto-verified)
- Ticket-only events: Show ONLY paid ticket holders OR non-members with payment_status='paid' or 'approved'
- Paid events: Show only paid ticket holders (existing behavior preserved)

---

## Revisions Based on Design Review

### Revision 1: Non-Member Registration Status Field

**Finding**: Design assumed `status` field exists, but API returns `payment_status` for non-member registrations.

**Resolution**: Updated filtering logic to check `payment_status` field instead of `status`:

```typescript
// Non-member: check payment_status === 'paid' OR payment_status === 'approved'
if (attendee.type === 'non_member') {
  const paid = (parseFloat(String(attendee.amount_paid || 0)) || 0) > 0
  const verified = attendee.payment_status === 'paid' || attendee.payment_status === 'approved'
  return paid && verified
}
```

---

### Revision 2: Check-In Page Error - `setEventRequiresPayment`

**Finding**: Error shows `setEventRequiresPayment is not defined` at checkin/page.tsx line 182.

**Resolution**: This state variable is NOT used in the current codebase. The check-in page in `events/[id]/checkin/page.tsx` uses `showAll` state instead. The error may be from an older version of the code or a different branch. The secretary page's `fetchEventAttendance` function does NOT use `setEventRequiresPayment`.

**Decision**: This error will be addressed separately in a different task. The current design only addresses the secretary page attendance modal.

---

### Revision 3: Event 4 Special Case

**Finding**: Event 4 ("Annual BULS Networking Event") is a ticket-only event that EXCLUDES free registrations from the `/api/event-registrations` endpoint.

**Resolution**: The filtering logic will be applied only when registrations exist in the API response. For Event 4, since free registrations are already excluded at the API level, the filter will only apply to the ticket purchases that ARE returned.

```typescript
// After fetching registrations (lines 457-465)
const registrations = regData.registrations || regData.attendees || []

// Apply verification filter only if we have registrations
if (registrations.length > 0 && isTicketOnlyEvent) {
  // ... filtering logic
}
```

---

### Revision 4: Guest Handling in Attendance List

**Finding**: Design claimed guests are excluded, but actual code includes them with `isGuest: true`.

**Resolution**: Updated to reflect that guests ARE included in the attendees array but marked with `isGuest: true`. The filtering logic will apply to ALL attendees, but the UI should distinguish guests from main attendees.

```typescript
// Filter applies to ALL attendees (members + non-members + guests)
// Guests are marked with isGuest: true and handled separately in UI
const passesVerifiedFilter = (a: any) => {
  if (a.type === 'free' || a.type === 'registration') return true
  if (a.type === 'ticket') return a.payment_status === 'paid'
  
  // For non-members: check payment_status === 'paid' OR 'approved'
  if (a.type === 'non_member') {
    const paid = (parseFloat(String(a.amount_paid || 0)) || 0) > 0
    const verified = a.payment_status === 'paid' || a.payment_status === 'approved'
    return paid && verified
  }
  
  // Guests don't pass this filter - they're shown under their ticket holder
  return false
}
```

---

### Revision 5: Payment Status Values

**Finding**: Design assumed 'paid', 'refunded', 'payment_pending' but actual code shows 'confirmed', 'pending' for tickets and 'paid', 'approved' for non-members.

**Resolution**: Updated to use actual values found in the codebase:

| Attendee Type | payment_status Values |
|---------------|----------------------|
| Members (ticket purchases) | 'confirmed', 'pending' |
| Non-members | 'paid', 'approved', 'refunded' |
| Guests | 'refunded', 'paid_at_door', 'pending' |

---

## Implementation Plan

### Step 1: Add Verification Filter Logic (Lines ~465-485)

Insert after fetching registrations for free/ticket-only events:

```typescript
// Around line 465, after: const registrations = regData.registrations || regData.attendees || []
console.log('Free/ticket_only event registrations:', registrations)

// NEW: Apply verification filter for ticket-only events
let filteredRegistrations = registrations
if (isTicketOnlyEvent && registrations.length > 0) {
  console.log('Applying verification filter for ticket-only event')
  filteredRegistrations = registrations.filter((reg: any) => {
    // Member registration - must have paid ticket (payment_status === 'paid')
    if (reg.user_id) {
      const paid = reg.payment_status === 'paid'
      console.log(`Member ${reg.user_id}: payment_status=${reg.payment_status}, paid=${paid}`)
      return paid
    }
    
    // Non-member registration - must have paid AND been approved
    if (!reg.user_id && reg.type === 'non_member') {
      const paid = (parseFloat(String(reg.amount_paid || 0)) || 0) > 0
      const verified = reg.payment_status === 'paid' || reg.payment_status === 'approved'
      console.log(`Non-member ${reg.id}: amount_paid=${reg.amount_paid}, payment_status=${reg.payment_status}, paid=${paid}, verified=${verified}`)
      return paid && verified
    }
    
    return false
  })
  
  console.log(`Filtered from ${registrations.length} to ${filteredRegistrations.length} verified registrations`)
  registrations = filteredRegistrations
}
```

---

### Step 2: Update Check-In State Mapping

No changes needed - existing code already handles:
- Member check-ins: Match `checkins.user_id` with `attendee.user_id`
- Non-member check-ins: Match `checkins.registration_id` with `attendee.id` where `checkins.registration_type === 'non_member'`

---

## Files to Modify

### Primary File
- `app/secretary/page.tsx` - Update `fetchEventAttendance` function (lines ~465-485)

### No Changes Needed
- `app/secretary/events/[id]/checkin/page.tsx` - Has its own verification logic (`passesVerifiedFilter` function at lines 34-48)
- `app/api/event-registrations/route.ts` - API already returns correct data structure

---

## Data Structure Verification

### `/api/event-registrations` Response

Based on `event-registrations/route.ts` lines 224-270:

```typescript
{
  registrations: [
    // Member with paid ticket
    {
      id: 'member-123',
      user_id: 'user-uuid',
      type: 'ticket',
      payment_status: 'confirmed', // or 'pending'
      // ... other fields
    },
    
    // Non-member registration
    {
      id: 'reg-456',
      user_id: null,
      type: 'non_member',
      payment_status: 'paid', // or 'approved', 'refunded'
      amount_paid: '5.00',
      status: 'approved', // or 'payment_pending'
      // ... other fields
    },
    
    // Free registration
    {
      id: 'free-789',
      user_id: null,
      type: 'free',
      payment_status: null,
      // ... other fields
    },
    
    // Guest (nested under ticket)
    {
      id: 'guest-000',
      type: 'guest',
      payment_status: 'refunded', // or 'paid_at_door'
      amount_paid: '5.00',
      // ... other fields
    }
  ]
}
```

---

## Filtering Logic (Detailed)

### Free Events (`event_type === 'free'`)
```
Include ALL registrations
- Members (free or ticket): All appear
- Non-members (free): All appear  
- Guests: All appear (under their ticket holder)
```

### Ticket-Only Events (`event_type === 'ticket_only'`)
```
Include ONLY verified attendees:
1. Members with paid tickets (payment_status === 'paid')
2. Non-members with paid AND approved (amount_paid > 0 AND payment_status === 'paid' OR 'approved')
3. Guests: NOT included (handled separately under ticket holders)

Exclude:
- Refunded registrations (payment_status === 'refunded')
- Pending registrations (payment_status === 'pending')
- Unapproved non-members (payment_status !== 'paid'/'approved')
```

### Paid Events (Other Types)
```
Include ONLY paid ticket purchases (payment_status === 'confirmed')
- Existing logic already applies this filter
- Guests: Included with isGuest: true flag
```

---

## Error Handling

| Failure Condition | Recoverable? | User Feedback | Logging Level |
|-------------------|--------------|---------------|---------------|
| API returns 4xx/5xx | Yes (retry) | Toast error message | Error |
| Event not found | No | Show "Event not found" toast | Warn |
| Invalid amount_paid parsing | Yes (skip row) | Console log warning | Warn |
| Check-in match failure | N/A (soft) | N/A | Debug |

---

## Edge Cases

### 1. Event Record Missing
```typescript
const event = events.find(e => e.id === eventId)
if (!event) {
  toast.error('Event not found')
  setLoadingEventAttendance(false)
  return
}
```

### 2. Empty Registrations Array
```typescript
if (registrations.length === 0) {
  setEventAttendees([])
  setLoadingEventAttendance(false)
  return
}
```

### 3. Missing amount_paid Field
```typescript
// Use safe conversion
const amount = parseFloat(String(reg.amount_paid || 0))
const paid = amount > 0
```

### 4. Missing payment_status Field
```typescript
// Default to excluding (safe by default)
if (!reg.payment_status) {
  return false
}
```

---

## API Endpoint Verification

### `/api/event-registrations?eventId=${eventId}`
- **Status**: ✓ EXISTS - Verified in `event-registrations/route.ts`
- **Parameters**: `eventId` (number)
- **Response**: `{ registrations: [...], attendees: [...] }`
- **Fields Verified**:
  - `user_id`: string or null
  - `payment_status`: 'confirmed', 'pending', 'paid', 'approved', 'refunded'
  - `type`: 'member', 'non_member', 'free', 'ticket', 'guest'
  - `amount_paid`: string or number (nullable)
  - `status`: 'approved', 'payment_pending', 'refunded' (non-members)

### `/api/tickets/purchase?status=paid&event_id=${eventId}`
- **Status**: ✓ EXISTS - Used in current `fetchEventAttendance` function
- **Parameters**: `status`, `event_id`
- **Response**: `{ purchases: [...] }`

---

## Testing Scenarios

### Test 1: Free Event
- **Setup**: Event `event_type = 'free'`, 5 registrations (mixed payment statuses)
- **Expected**: All 5 registrations appear in attendance list

### Test 2: Ticket-Only Event with Verified/Unverified Mix
- **Setup**: Event `event_type = 'ticket_only'`, 6 registrations:
  - Member 1: `payment_status = 'confirmed'` (paid ticket)
  - Member 2: `payment_status = 'pending'` (pending ticket)
  - Non-member 1: `amount_paid = '5.00', payment_status = 'paid'`
  - Non-member 2: `amount_paid = '5.00', payment_status = 'approved'`
  - Non-member 3: `amount_paid = '5.00', payment_status = 'refunded'`
  - Non-member 4: `amount_paid = '0.00', payment_status = 'approved'`
- **Expected**: Only Member 1, Non-member 1, and Non-member 2 appear (3 total)

### Test 3: Paid Event (General Event Type)
- **Setup**: Event `event_type = 'general'`, ticket purchases with mixed statuses
- **Expected**: Only `payment_status = 'confirmed'` purchases appear (existing behavior)

### Test 4: Event 4 (Special Ticket-Only Case)
- **Setup**: Event 4 has no free registrations in the API response
- **Expected**: Only ticket purchases returned from API are filtered by verification logic

---

## Check-In State Updates

### ID Format Mapping

| Attendee Type | ID Format | Check-In Match |
|--------------|-----------|----------------|
| Member | `member-${user_id}` | `checkins.user_id === attendee.user_id` |
| Non-Member | `registration-${reg.id}` | `checkins.registration_id === attendee.id && checkins.registration_type === 'non_member'` |
| Guest | `guest-${guest.id}` | `checkins.guest_id === attendee.guest_id` |

### Verification Filter Impact

The `passesVerifiedFilter` function (check-in page) uses the same logic as secretary page filter:
- Free registrations: Always pass
- Ticket purchases: Pass only if `payment_status === 'paid'` (or 'confirmed')
- Non-members: Pass only if paid AND approved

---

## Summary of Changes

### Before
```typescript
// Line 457-488 in original code
const registrations = regData.registrations || regData.attendees || []
console.log('Free/ticket_only event registrations:', registrations)

// Convert registrations to attendance format - NO FILTERING
registrations.forEach((reg: any) => {
  attendees.push({...})
})
```

### After
```typescript
// Line 457-485 in revised code
const registrations = regData.registrations || regData.attendees || []

// Apply verification filter for ticket-only events
if (isTicketOnlyEvent && registrations.length > 0) {
  filteredRegistrations = registrations.filter((reg: any) => {
    if (reg.user_id) {
      return reg.payment_status === 'paid'
    }
    if (!reg.user_id && reg.type === 'non_member') {
      const paid = (parseFloat(String(reg.amount_paid || 0)) || 0) > 0
      const verified = reg.payment_status === 'paid' || reg.payment_status === 'approved'
      return paid && verified
    }
    return false
  })
  registrations = filteredRegistrations
}

// Convert registrations to attendance format - WITH FILTERING
registrations.forEach((reg: any) => {
  attendees.push({...})
})
```

---

## Unresolved Issues (Future Work)

1. **Check-in page `setEventRequiresPayment` error**: Requires investigation into why this state variable is referenced but not defined.

2. **Guest filtering in ticket-only events**: Guests are currently nested under tickets in paid events, but their filtering in ticket-only events needs clarification.

3. **Non-member registration table schema**: The exact structure of `non_member_registrations` table should be verified to ensure `amount_paid` field exists.

---

## Verdict

This revised design addresses all findings from the design review:
- ✓ Uses `payment_status` instead of `status` for non-member filtering
- ✓ Acknowledges Event 4 special case in API behavior
- ✓ Documents that check-in page error is separate issue
- ✓ Reflects actual guest handling (included with `isGuest: true`)
- ✓ Uses actual `payment_status` values from codebase

**Status**: READY FOR IMPLEMENTATION