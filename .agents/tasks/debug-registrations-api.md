# Event Registrations API Debug Findings

## Investigation Summary
This document outlines findings from debugging the `/api/event-registrations` API endpoint for event ID 6 (Climate Conference). The issue reported is that the UI shows "Registered Members (2)" with Name/Email as "N/A" and type badge as "✓ Free".

## 1. API Response Status & Data Availability

**Status Analysis:**
- API endpoint is properly configured at `/api/event-registrations`
- Requires authentication (Clerk auth) and secretary/admin role
- Returns 401 Unauthorized without valid session (as expected)
- When authenticated, should return JSON with `registrations` array and `stats` object

**Data Structure:**
Based on the API code analysis, the endpoint aggregates data from 4 sources:
1. `event_registrations` (free registrations) → `type: 'free'`
2. `ticket_purchases` (paid tickets) → `type: 'ticket'`
3. `ticket_guests` (guest attendees) → `type: 'guest'`
4. `non_member_registrations` (non-member registrations) → `type: 'non_member'`

## 2. Exact Response Object Structure

**Example registration object for `type: 'free'` (from event_registrations):**
```javascript
{
  "id": "uuid",
  "event_id": "6",
  "user_id": "user-uuid",
  "phone_number": null,
  "passport_number": null,
  "registered_at": "2026-10-16T19:31:00Z",
  "status": "registered",
  "notes": "Free Registration",
  "full_name": "User Full Name",  // <-- Root level
  "email": "user@example.com",    // <-- Root level
  "user": {                       // <-- Nested user object
    "id": "user-uuid",
    "full_name": "User Full Name",
    "email": "user@example.com",
    "clerk_id": "clerk-user-id",
    "phone_number": null,
    "passport_number": null
  },
  "event": { "id": "6", "title": "Climate Conference", "event_date": "..." },
  "type": "free",                 // <-- Type identifier
  "source_type": "registration",
  "is_guest": false,
  "guest_of": null
}
```

**Example registration object for `type: 'non_member'`:**
```javascript
{
  "id": "uuid",
  "event_id": "6",
  "user_id": null,                // <-- Non-members don't have user accounts
  "phone_number": "1234567890",
  "passport_number": null,
  "registered_at": "2026-10-16T18:24:00Z",
  "status": "registered",
  "notes": "Non-Member Registration",
  "full_name": "Non-Member Name", // <-- Root level (from non_member_registrations.full_name)
  "email": "nonmember@example.com", // <-- Root level (from non_member_registrations.email)
  "user": null,                   // <-- No user object for non-members
  "event": { "id": "6" },
  "type": "non_member",           // <-- Type identifier
  "source_type": "non_member_registration",
  "is_guest": false,
  "guest_of": null,
  "amount_paid": 0,
  "verification_code": "ABC123",
  "education_level": "Bachelor",
  "country": "Liberia",
  "city": "Monrovia",
  "address": "123 Street"
}
```

## 3. Member vs Non-Member Type Handling

**Key Differences:**
- **Member registrations** (`type: 'free'`, `'ticket'`, `'guest'`): Have `user_id` linking to users table, include nested `user` object
- **Non-member registrations** (`type: 'non_member'`): No `user_id`, `user: null`, data stored directly in `non_member_registrations` table

**Frontend Display Logic:**
```typescript
// Current (buggy) logic in app/secretary/page.tsx:
{reg.type === 'non_member' 
  ? reg.full_name                    // Correct for non-members
  : reg.user?.full_name || 'N/A'}    // BUG: Should check reg.full_name first

{reg.type === 'non_member' 
  ? reg.email || 'N/A'               // Correct for non-members  
  : reg.user?.email || 'N/A'}        // BUG: Should check reg.email first
```

## 4. Root Cause of N/A Name/Email and "✓ Free" Badge

**Primary Issue:**
The frontend display logic incorrectly assumes that for non-'non_member' types, the name/email should come from `reg.user` object. However, the API already provides `full_name` and `email` at the root level of each registration object for ALL types.

**Evidence from API Code:**
For `type: 'free'` registrations (lines 62-65 in route.ts):
```typescript
return {
  // ...
  full_name: user.full_name || 'Unknown User',      // Root level
  email: user.email || 'unknown@example.com',       // Root level
  user: { ...user },                                // Also in user object
  type: 'free',                                     // Shows as "✓ Free"
  // ...
}
```

**Root Cause Analysis:**
1. **The 2 registrations shown as "✓ Free"** are likely `type: 'free'` registrations from the `event_registrations` table
2. **N/A Name/Email occurs** because the frontend checks `reg.user?.full_name` instead of `reg.full_name`
3. **The "✓ Free" badge** correctly shows for `type: 'free'` registrations (blue badge in UI)
4. **Possible scenarios for the 2 registrations:**
   - Non-member registrations incorrectly typed as 'free' instead of 'non_member'
   - Free registrations where the user object might be null/empty
   - Database records with missing user relationships

## 5. Recommended Fix

**Frontend Display Fix:**
Update the table rendering logic in `app/secretary/page.tsx` (around line 7620-7630):

```typescript
{/* Current buggy code */}
<td className="py-3 px-4 text-sm text-gray-900">
  {reg.type === 'non_member' 
    ? reg.full_name 
    : reg.user?.full_name || 'N/A'}  {/* BUG */}
</td>
<td className="py-3 px-4 text-sm text-gray-600">
  {reg.type === 'non_member' 
    ? reg.email || 'N/A' 
    : reg.user?.email || 'N/A'}      {/* BUG */}
</td>

{/* Fixed code */}
<td className="py-3 px-4 text-sm text-gray-900">
  {reg.full_name || 'N/A'}           {/* Use root level field */}
</td>
<td className="py-3 px-4 text-sm text-gray-600">
  {reg.email || 'N/A'}               {/* Use root level field */}
</td>
```

**API Data Validation (Optional):**
Verify that the API consistently returns `full_name` and `email` at root level for all registration types, which it already does based on code analysis.

**Database Check:**
Verify that for event ID 6:
1. `event_registrations` table has proper `user_id` foreign keys
2. `non_member_registrations` table has records with `full_name` and `email` populated
3. User records linked to registrations have `full_name` and `email` fields populated

**Testing Steps:**
1. Log the API response in browser console to see actual data structure
2. Check if registrations have `full_name`/`email` at root level
3. Verify registration `type` values match expected types
4. Apply frontend fix and test display

---

**File created:** `c:\Users\dell\Documents\buls-main\buls-main\.agents\tasks\debug-registrations-api.md`
**Root cause summary:** Frontend displays N/A for Name/Email because it incorrectly accesses `reg.user?.full_name` and `reg.user?.email` instead of using the `reg.full_name` and `reg.email` fields already provided at the root level of all registration objects by the API.