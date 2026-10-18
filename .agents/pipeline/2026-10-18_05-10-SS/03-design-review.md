# Design Review: Event Attendance Verification Filter

## Verdict
**CHANGES_REQUESTED** — 1 HIGH, 1 MEDIUM findings

---

## Findings

### HIGH-1: Missing `amount_paid` field validation in non-member filtering logic

**Location:** Design Section "Step 1: Add Verification Filter Logic" (lines ~465-485)

**Problem:** The design proposes filtering non-member registrations using `payment_status === 'paid' || 'approved'` AND checking if `amount_paid > 0`. However, the actual API (`/api/event-registrations`) returns non-member registrations with `amount_paid` as a numeric/string value but does NOT always include this field in the API response structure shown in line 235-250 of `app/api/event-registrations/route.ts`.

The API returns:
```typescript
{
  amount_paid: reg.amount_paid || 0,  // May be null/undefined
  payment_status: reg.status === 'refunded' ? 'refunded' : reg.status,  // Maps status directly
  status: reg.status,  // 'approved', 'payment_pending', 'refunded'
}
```

The filtering logic in the design assumes `amount_paid` is always present and numeric, but the actual data may have `amount_paid: null` or `amount_paid: "5.00"` (string), which would cause parsing errors.

**Current API behavior (line 242-243 of event-registrations/route.ts):**
```typescript
amount_paid: reg.amount_paid || 0,
payment_status: reg.status === 'refunded' ? 'refunded' : reg.status,
```

**CONCRETE FIX:** The filtering logic must safely handle string/nullable `amount_paid` values:

```typescript
// In secretary/page.tsx fetchEventAttendance function, around line 465
if (isTicketOnlyEvent && registrations.length > 0) {
  filteredRegistrations = registrations.filter((reg: any) => {
    if (reg.user_id) {
      // Member: must have paid ticket
      return reg.payment_status === 'paid' || reg.payment_status === 'confirmed'
    }
    
    // Non-member: must have paid AND been approved by treasurer
    if (!reg.user_id && reg.type === 'non_member') {
      // Safe amount parsing (handles null, string "5.00", number 5)
      const amount = parseFloat(String(reg.amount_paid || 0))
      const paid = amount > 0
      const verified = reg.status === 'approved'
      console.log(`Non-member ${reg.id}: amount=${reg.amount_paid} (${amount}), status=${reg.status}, paid=${paid}, verified=${verified}`)
      return paid && verified
    }
    
    return false
  })
}
```

**Severity:** HIGH — Without this fix, non-member filtering will fail for any registration where `amount_paid` is null or a non-numeric string, potentially showing unverified attendees or hiding verified ones.

---

### HIGH-2: Incorrect `payment_status` mapping for non-members in API

**Location:** `app/api/event-registrations/route.ts`, lines 242-243

**Problem:** The API currently maps `non_member_registrations.status` directly to `payment_status`:

```typescript
// Line 242-243
payment_status: reg.status === 'refunded' ? 'refunded' : reg.status,
```

This means:
- If `reg.status = 'approved'`, then `payment_status = 'approved'`
- If `reg.status = 'payment_pending'`, then `payment_status = 'payment_pending'`

But the design and requirements state that the filtering logic should check for `payment_status === 'paid'` OR `status === 'approved'`, which creates a mismatch because non-members never have `payment_status === 'paid'` — they have `status === 'approved'`.

The requirements say (FR2, AC2):
> `payment_status = 'paid'` OR `(non-member AND status = 'approved' AND amount_paid > '0.00')`

**But the actual data structure has two separate fields:**
- `payment_status`: maps to `status` with special handling for 'refunded'
- `status`: original value ('approved', 'payment_pending', 'refunded')

**CONCRETE FIX:** The API should expose both fields correctly:

```typescript
// In event-registrations/route.ts, transformNonMembers function (after line 240)
const transformedNonMembers = nonMemberRegs.map(reg => ({
  id: reg.id,
  event_id: reg.event_id,
  user_id: null,
  // ... other fields ...
  status: reg.status,  // Keep original status: 'approved', 'payment_pending', 'refunded'
  payment_status: reg.status === 'refunded' ? 'refunded' : (reg.amount_paid && parseFloat(String(reg.amount_paid)) > 0 ? 'paid' : 'pending'),  // Derive payment_status from amount and status
  // ... rest of fields
}))
```

**Or alternatively, update the filter logic to check `status` instead of `payment_status` for non-members:**

```typescript
// In secretary/page.tsx filter logic
if (a.type === 'non_member') {
  const paid = (parseFloat(String(a.amount_paid || 0)) || 0) > 0
  const verified = a.status === 'approved'  // Check status, not payment_status
  return paid && verified
}
```

**Severity:** HIGH — This mismatch means the verification filter will never work correctly for non-member registrations. Currently, non-members with `status = 'approved'` will not pass the filter because `payment_status = 'approved'` is not included in the allowed values ('paid', 'confirmed').

---

### MEDIUM-1: Check-in page error (`setEventRequiresPayment`) is acknowledged but unresolved

**Location:** Design Revision 2, and `app/secretary/events/[id]/checkin/page.tsx`

**Problem:** The design acknowledges that the check-in page has a `setEventRequiresPayment is not defined` error but states it will be "addressed separately". However, the actual code at line 34-48 shows the filtering logic (`passesVerifiedFilter`) IS already implemented and working.

The design claims this error is from "an older version" but does not verify whether:
1. The error actually exists in the current branch
2. The current `passesVerifiedFilter` function is correctly implemented

Looking at `checkin/page.tsx` lines 34-48:
```typescript
const passesVerifiedFilter = (a: any) => {
  if (a.type === 'free' || a.type === 'registration') return true
  if (a.type === 'ticket') return a.payment_status === 'paid'
  
  // For non-members: check if they paid AND were verified by treasurer
  if (a.type === 'non_member') {
    const paid = (a.amount_paid || 0) > 0
    const verified = a.status === 'approved'
    return paid && verified
  }
  
  return false
}
```

This logic is correct and does NOT use `setEventRequiresPayment`, so the error mentioned in the console (line 182) appears to be from a different branch or stale code.

**CONCRETE FIX:** Either:
1. Verify the error exists in the current code and fix it, OR
2. Confirm the check-in page is already working correctly and remove the "unresolved" note from the design.

**Severity:** MEDIUM — If the error is real and unaddressed, the check-in page will crash. If it's already fixed, the design should not leave it as "unresolved".

---

### NIT-1: Design assumes non-member registrations exist for all ticket-only events

**Location:** Design Section "Step 1", line ~467

**Problem:** The design assumes ticket-only events will always have non-member registrations when they need filtering. However, the actual API (`app/api/event-registrations/route.ts` line 117-123) has a special case:

```typescript
// SPECIAL CASE: Event 4 is "Annual BULS Networking Event" which is ticket-only
// According to user: "only one member bought it" and "if they did not buy ticket dont list"
const isEvent4 = eventId === '4'

// 1. Fetch event registrations (free registrations)
// SKIP for event 4 (ticket-only event)
if (!isEvent4) {
```

This means for Event 4, free registrations are skipped at the API level, so the filtering logic never receives free registrations for this event. The design handles this in Revision 3 but does not clarify whether:
1. Non-member registrations are also excluded for ticket-only events
2. The filtering logic should apply to non-member registrations for ticket-only events

**CONCRETE FIX:** Clarify in the design whether ticket-only events include non-member registrations (they do, as shown in the API), and whether free registrations should ever appear for ticket-only events (they should not, based on the Event 4 special case).

**Severity:** NIT — The filtering logic is correct for the cases where registrations exist, but the design does not explicitly address the edge case of Event 4's special behavior.

---

## Verified Assumptions

| Assumption | Verified | Evidence |
|------------|----------|----------|
| `payment_status` field exists with values 'paid', 'refunded', 'pending' | **Partially true** | Member ticket purchases use `payment_status` ('confirmed', 'pending'), but non-members use `status` field ('approved', 'payment_pending') |
| Non-member registrations have `status` field | **True** | `non_member_registrations` table has `status` = 'approved', 'payment_pending', 'refunded' (verified in `treasurer/non-member-registrations/route.ts`) |
| `amount_paid` field exists for non-members | **True** | API returns `amount_paid: reg.amount_paid \|\| 0` (line 242 of event-registrations/route.ts) |
| `event.event_type` determines event type | **True** | Uses `event_type === 'free'`, `event_type === 'ticket_only'` (verified in secretary/page.tsx lines 1136-1137) |
| `/api/event-registrations` returns registrations with correct structure | **True** | Tested and verified in `app/api/event-registrations/route.ts` lines 137-285 |

---

## Unverified/Wrong Assumptions

| Assumption | Verified | Issue |
|------------|----------|-------|
| Non-member registrations will have `payment_status === 'paid'` | **False** | Non-members use `status` field, not `payment_status`. The API maps `status` to `payment_status` for refunded items only, leaving others as 'approved', 'payment_pending'. |
| Filtering logic should check `payment_status === 'paid'` for non-members | **False** | Non-members should be checked against `status === 'approved'`, not `payment_status`. |
| Check-in page has working `setEventRequiresPayment` state | **Unverified** | The error exists in the codebase (line 182 mentioned in console), but the current `passesVerifiedFilter` function does not use this state, suggesting the error may be from a stale code branch. |
| All ticket-only events have non-member registrations | **Unverified** | Event 4 is a special case where free registrations are excluded at API level; it is unclear whether non-member registrations are also excluded or handled differently. |
| Guests should be excluded from main attendee list for ticket-only events | **Partially false** | Guests ARE included in the API response (type='guest'), but the check-in page filters them out separately. The design does not clarify whether guests should be filtered at the attendance modal level or just at the UI level. |

---

## Summary

The design has solid core logic but contains two HIGH-severity issues:

1. **Incorrect field mapping:** The API maps non-member `status` to `payment_status`, but the filter logic expects `payment_status === 'paid'` for non-members, which will never match.
2. **Unsafe amount parsing:** The filtering logic does not safely handle nullable/string `amount_paid` values.

The check-in page error is acknowledged but not verified — it may already be resolved in the current codebase.

**Recommendation:** Fix the `amount_paid` parsing and the non-member status check before implementation. The rest of the design (Event 4 special case, guest handling) is accurate.
