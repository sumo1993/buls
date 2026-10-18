# Public Event Registration Feature

## Overview
This feature allows non-members (external visitors) to register for events from a public-facing website page.

## What Was Built

### 1. Database Schema (`ADD_PUBLIC_REGISTRATION.sql`)
- **New columns in `events` table:**
  - `allow_public_registration` - Enable/disable public registration per event
  - `require_guest_approval` - Whether public registrations need approval

- **New table: `public_registrations`**
  - Personal info: full_name, email, phone, address, message
  - Registration type: 'free' or 'paid'
  - Payment info: ticket_id, amount_paid, payment_method, payment_proof_url
  - Status: 'pending', 'approved', 'rejected', 'payment_pending'
  - Check-in tracking: checked_in, checked_in_at, checked_in_by
  - Approval tracking: approved_at, approved_by, rejection_reason

### 2. Event Form Updates (`secretary/page.tsx`)
Added two new checkboxes when creating/editing events:
- ✅ **Allow Public Registration** - Enables non-members to register
- ✅ **Require Approval for Public Registrations** - Controls auto-approval

### 3. Public Events Page (`/public-events`)
Beautiful public-facing page with:
- No login required
- Shows all events with `allow_public_registration = true`
- Event cards with title, date, time, location, capacity
- "Register Now" button for each event
- Free event registration form
- Paid event payment form (tickets + payment proof)

### 4. API Endpoints

#### `/api/public-events` (GET)
- **Purpose**: Fetch all public events
- **Auth**: None required (public endpoint)
- **Returns**: Events with registration counts and availability

#### `/api/public-registrations` (POST, GET, PUT, DELETE)
- **POST**: Create registration (no auth - public)
- **GET**: Fetch registrations (admin/secretary only)
- **PUT**: Approve/reject registrations (admin/secretary only)
- **DELETE**: Remove registration (admin/secretary only)

## How It Works

### For Non-Members (Public Users):
1. Visit `/public-events` (no login needed)
2. Browse upcoming public events
3. Click "Register Now" on an event
4. Fill registration form:
   - Full Name *
   - Email *
   - Phone Number *
   - Address (optional)
   - Message (optional - why they want to attend)
5. Submit registration
6. Status depends on event settings:
   - **Auto-approved**: Instant confirmation
   - **Needs approval**: "Awaiting approval" message

### For Paid Events:
1. Click "Register Now" on ticket-only event
2. Fill personal information
3. Select ticket type
4. Select payment method (WeChat, Alipay, Bank Transfer)
5. Upload payment proof screenshot
6. Submit → Status: "Payment Pending"
7. Treasurer/Secretary verifies payment
8. Status changes to "Approved"

### For Secretary/Admin:
1. Create event → Check "Allow Public Registration"
2. Optionally check "Require Approval"
3. View pending registrations in attendance modal
4. Approve/reject public registrations
5. For paid events: verify payment proof
6. Check-in public registrants at the event

## Event Type Behavior

| Event Type | Member Flow | Non-Member Flow |
|------------|-------------|-----------------|
| **Free** | Free registration | Free registration (with/without approval) |
| **Registration Required** | Free registration | Free registration (with/without approval) |
| **Ticket Only** | Must buy ticket | Must buy ticket + upload proof |
| **Hybrid** | Can register free OR buy ticket | Can register free OR buy ticket |

## Next Steps (Future Enhancements)

### Secretary Interface (TO DO):
1. Add "Public Registrations" tab in attendance modal
2. Show pending registrations with Approve/Reject buttons
3. Add payment verification interface for paid registrations
4. Filter: All / Pending / Approved / Rejected / Payment Pending

### Email Notifications (TO DO):
1. Confirmation email on registration
2. Approval/rejection notification
3. Event reminder email
4. Payment confirmation email

### Check-In Integration:
- Public registrants appear in attendance list with "Public" badge
- Can check-in using name/email lookup (no QR code needed)
- Shows registration status in check-in interface

## Testing Steps

1. **Run Migration**:
   ```sql
   -- Execute ADD_PUBLIC_REGISTRATION.sql in Supabase SQL Editor
   ```

2. **Create Test Event**:
   - Login as Secretary
   - Create event
   - Check "Allow Public Registration"
   - Check "Require Approval"
   - Save event

3. **Test Public Registration**:
   - Open `/public-events` (no login)
   - Click "Register Now"
   - Fill form
   - Submit
   - Verify success message

4. **Test Approval** (TO DO - needs UI):
   - Login as Secretary
   - View event attendance
   - See pending public registration
   - Approve it

## Database Migration

**File**: `ADD_PUBLIC_REGISTRATION.sql`

Run this in Supabase SQL Editor to enable the feature.

## Files Modified/Created

### Modified:
- `app/secretary/page.tsx` - Added public registration checkboxes

### Created:
- `ADD_PUBLIC_REGISTRATION.sql` - Database migration
- `app/public-events/page.tsx` - Public events page
- `app/api/public-events/route.ts` - Public events API
- `app/api/public-registrations/route.ts` - Registration API
- `PUBLIC_REGISTRATION_FEATURE.md` - This documentation

## Security Notes

- Public registration endpoint has no auth (intentional)
- Duplicate registration prevention by email
- Capacity checking before registration
- RLS policies on `public_registrations` table
- Only admin/secretary can approve/reject
- Payment proof stored as base64 data URL

## Advantages

✅ Non-members can register without creating accounts
✅ Controlled access with approval system
✅ Payment support for paid events
✅ Capacity management
✅ Duplicate prevention
✅ Clean separation from member system (no confusion with `ticket_guests`)
