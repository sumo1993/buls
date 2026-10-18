# Investigation: Registered Members Count Showing 0 for Events with Non-Member Registrations

## Summary

The issue is a **naming mismatch**, not a counting bug. The API correctly calculates total registrations (member + non-member), but the UI label "Registered Members" is misleading because it shows the total count which includes non-member registrations.

## Evidence

### 1. API Counting Logic (app/api/events/route.ts, lines 89-131)

The API correctly fetches both member and non-member registrations:

```typescript
// Direct count queries for registration counts
const { count: registrationCount } = await adminClient
  .from('event_registrations')  // Member registrations
  .select('*', { count: 'exact', head: true })
  .eq('event_id', event.id)

const { count: nonMemberCount } = await adminClient
  .from('non_member_registrations')  // Non-member registrations
  .select('*', { count: 'exact', head: true })
  .eq('event_id', event.id)

const totalRegistrations = (registrationCount || 0) + (nonMemberCount || 0)
```

The API returns `registration_count: totalRegistrations` which correctly includes both types.

### 2. SQL Verification

From the provided SQL data:
- Event 6: `event_registrations` count = 0 (member registrations)
- Event 6: `non_member_registrations` count = 2 (non-member registrations)
- Expected `registration_count` from API = 0 + 2 = 2 ✓

The API should correctly return `registration_count: 2` for Event 6.

### 3. UI Display (app/events/page.tsx, line 560)

```typescript
<span className="font-semibold">
  {event.capacity ? `${event.registration_count || 0}/${event.capacity}` : `${event.registration_count || 0}`}
</span>
```

This displays the `registration_count` which is the **total** (member + non-member), but the adjacent UI element says "Registered Members" which implies it should show **only member registrations**.

### 4. Secretary Page (app/secretary/page.tsx, line 7555)

```typescript
<h4 className="text-sm font-semibold text-gray-900 mb-2">
  Registered Members ({eventRegistrations.length})
</h4>
```

This shows `eventRegistrations.length` which comes from `/api/event-registrations`. That endpoint DOES include non-member registrations in its response (lines 269-291), but labels them with `type: 'non_member'`. The count shown is the total count of all registration types, not just member registrations.

## Root Cause

**The term "Registered Members" is being used to display total registrations, which includes non-member registrations.** This creates confusion because:

1. The label says "Members" but the count includes non-members
2. There is no separate display showing "Member Registrations" vs "Non-Member Registrations" independently

## Recommendations

### Option 1: Fix the Label (Simple)
Change the UI label to be accurate:
- Change "Registered Members" to "Total Registrations" or "Registered Attendees"
- Optionally add a separate line showing "Member Registrations: X" and "Non-Member Registrations: Y"

### Option 2: Add Separate Counts (Recommended)
Modify the API to return separate counts:

```typescript
// In app/api/events/route.ts
return {
  ...event,
  registration_count: totalRegistrations,
  member_registration_count: registrationCount,      // NEW
  non_member_registration_count: nonMemberCount,     // NEW
  registration_status: registrationStatus,
  spots_remaining: event.capacity ? Math.max(0, event.capacity - totalRegistrations) : null
}
```

Then update the UI to display both:
```typescript
<div>
  <span className="font-semibold">
    {event.member_registration_count || 0} Registered Members
  </span>
  <span className="text-sm text-gray-500 ml-2">
    (+{event.non_member_registration_count || 0} non-members)
  </span>
</div>
```

### Option 3: Filter in Secretary Page
If "Registered Members" should truly mean only member registrations, modify the secretary page to filter:

```typescript
// In app/secretary/page.tsx
const memberRegistrations = result.registrations?.filter(
  (r: any) => r.type === 'free' || r.type === 'ticket'
) || [];
setEventRegistrations(memberRegistrations);
```

And display separately:
```typescript
<div>
  <span>Registered Members: {eventRegistrations.length}</span>
  <span className="ml-2 text-sm text-gray-500">
    Non-Member: {nonMemberRegistrations.length}
  </span>
</div>
```

## Conclusion

The API logic is **correct** - it properly counts both member and non-member registrations. The issue is purely semantic: the label "Registered Members" does not match the actual data being displayed (total registrations including non-members). 

No code changes are required for the counting logic. Only UI label changes or additional count displays are needed to make the interface clearer.
