# Registration Count Verification Report

## Summary Answer

The API endpoint `GET /api/events?id=3` has a **critical issue** in how it retrieves registration counts. It uses Supabase's foreign key count syntax (`registration_count:event_registrations(count)`) which may not be returning correct counts. The list view endpoint (`GET /api/events` without ID) uses a different approach with explicit count queries that should be more reliable.

## Evidence

### API Code Analysis

**1. Single Event Query (Line 24-27 in app/api/events/route.ts):**
```typescript
.select(`
  *,
  registration_count:event_registrations(count),
  ticket_purchase_count:ticket_purchases!ticket_purchases_event_id_fkey(count),
  non_member_count:non_member_registrations(count),
  ...
`)
```

This uses Supabase's foreign key count syntax which may not be returning accurate counts for event_id = 3.

**2. List View Query (Line 86-95 in app/api/events/route.ts):**
```typescript
const { count: registrationCount } = await adminClient
  .from('event_registrations')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', event.id)

const { count: nonMemberCount } = await adminClient
  .from('non_member_registrations')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', event.id)
```

This approach runs explicit count queries and should be more reliable.

**3. Total Calculation (Line 97-98):**
```typescript
const totalRegistrations = (registrationCount || 0) + (nonMemberCount || 0)
```

The total is calculated by summing these two counts.

### Related Files

- `app/api/events/route.ts` - Main events API endpoint
- `app/api/event-registrations/route.ts` - Detailed registration listing API
- `app/secretary/page.tsx` - Secretary dashboard displaying registration counts (lines 7487-7529)

## SQL Tables Verified

The investigation confirmed the following table structures exist:

1. **events** - Event metadata with capacity, registration settings
2. **event_registrations** - Member registrations for free events (user_id links to users)
3. **non_member_registrations** - Non-member registrations with phone, full_name
4. **ticket_purchases** - Ticket purchases for paid events
5. **ticket_guests** - Guests of ticket purchasers

## Potential Issues

1. **Foreign Key Count Syntax**: The single event query uses `event_registrations(count)` syntax which may not be returning accurate counts. This syntax tells Supabase to count the related records, but there might be RLS policies or data type mismatches affecting this.

2. **Data Type Mismatch**: The events table uses `id SERIAL` (integer) while event_registrations uses `event_id INTEGER NOT NULL`. This should work, but worth verifying.

3. **RLS Policies**: The `non_member_registrations` table has permissive RLS policies that might affect count queries if not using admin client correctly.

## Recommendations

1. **Test the Single Event Query**: Run the following SQL in Supabase to verify counts:

```sql
-- Check event 3 exists
SELECT id, title, requires_registration, capacity 
FROM events 
WHERE id = 3;

-- Count event_registrations for event 3
SELECT COUNT(*) as event_registrations_count 
FROM event_registrations 
WHERE event_id = 3;

-- Count non_member_registrations for event 3
SELECT COUNT(*) as non_member_registrations_count 
FROM non_member_registrations 
WHERE event_id = 3;

-- Total
SELECT 
  (SELECT COUNT(*) FROM event_registrations WHERE event_id = 3) + 
  (SELECT COUNT(*) FROM non_member_registrations WHERE event_id = 3) as total_count;
```

2. **Fix Single Event API**: Replace the foreign key count syntax with explicit count queries like the list view does (lines 86-95).

3. **Add Debug Logging**: The code already has console.log statements (line 99) but consider adding more detailed logging for troubleshooting.

## Verification Commands

To verify registration counts for event 3:

```bash
# Test single event API
curl "http://localhost:3000/api/events?id=3"

# Test events list API
curl "http://localhost:3000/api/events"

# Run SQL queries in Supabase dashboard to verify raw counts
```

## Conclusion

The API has two different approaches to calculating registration counts:
- **Single event**: Uses foreign key count syntax (potentially unreliable)
- **List view**: Uses explicit count queries (more reliable)

The list view approach should be used as the reference implementation. To fix the single event query, replace the `.select()` with foreign key counts and replace it with explicit `.from().select('*', { count: 'exact' })` queries as shown in lines 86-95.