# Guest Payment Options - Complete Implementation

## Overview
The guest management system now has differentiated payment options based on who is adding the guest and their role.

## Payment Rules

### For Treasurer/Admin (Secretary)
✅ **Can choose from 3 payment options:**
1. **💰 Full Payment Required** - Guest must pay ¥{price} at door
2. **🎁 Complimentary Guest** - Payment waived, free entry
3. **⭐ VIP Special Guest** - Payment waived with VIP status

### For Regular Members
✅ **Only 1 option available:**
- **💰 Full Payment Required** - Guest must pay at door
- Cannot waive payments or set VIP status
- Only treasurers/admins have authority to waive fees

### For Free Events
✅ **Automatic:**
- No payment required
- All guests enter free
- Payment options not shown

## User Interface

### Treasurer/Admin View
```
Payment Option
Guest Fee: ¥10

○ 💰 Full Payment Required
  Guest pays ¥10 at door

○ 🎁 Complimentary Guest
  Payment waived - free entry

○ ⭐ VIP Special Guest
  Payment waived - VIP status
```

### Regular Member View
```
Payment Option
Guest Fee: ¥10

ℹ️ Full Payment Required: ¥10
Your guest will need to pay at the door. 
Only treasurers can waive payments.
```

### Free Event View
```
✓ Free Event - No payment required
```

## Guest Types & Display

### Guest Type Badges (in guest list)
1. **⭐ VIP Guest** - Purple badge for VIP guests
2. **🎁 Complimentary** - Blue badge for complimentary guests
3. **💰 Payment Due: ¥X** - Yellow badge for pending payment
4. **✓ Paid at Door** - Green badge for completed payment

## Database Schema

### New Column: `guest_type`
```sql
ALTER TABLE ticket_guests 
ADD COLUMN guest_type VARCHAR(20) DEFAULT 'regular'
CHECK (guest_type IN ('regular', 'complimentary', 'vip'));
```

**Values:**
- `regular` - Standard guest who pays full price
- `complimentary` - Payment waived by treasurer
- `vip` - VIP special guest (payment waived)

## API Changes

### Request Body (POST `/api/tickets/[id]/guests`)
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "relationship": "friend",
  "payment_method": "door|complimentary",
  "payment_status": "pending|complimentary",
  "guest_type": "regular|complimentary|vip"
}
```

### Payment Status Logic
```typescript
// Free events
payment_status = 'not_applicable'
guest_type = 'regular'

// Treasurer/Admin options
if (paymentOption === 'full') {
  payment_status = 'pending'
  guest_type = 'regular'
}
if (paymentOption === 'complimentary') {
  payment_status = 'complimentary'
  guest_type = 'complimentary'
}
if (paymentOption === 'vip') {
  payment_status = 'complimentary'
  guest_type = 'vip'
}

// Regular member (forced)
payment_status = 'pending'
guest_type = 'regular'
```

## Permission Checks

### Who Can Waive Payments?
```typescript
const canWaivePayment = isAdmin || isSecretary
```

**Roles that can waive:**
- ✅ Admin
- ✅ Secretary (Treasurer)
- ❌ Regular Member

### Validation
```typescript
// Non-admin users cannot set complimentary or VIP
if (!canWaivePayment && !eventIsFree && paymentOption !== 'full') {
  alert('Only treasurers/admins can waive payment or set VIP guests')
  return
}
```

## Success Messages

### Treasurer/Admin
- Full payment: `✓ {name} added. Payment required: ¥{price}`
- Complimentary: `✓ {name} added as complimentary guest (Payment waived)`
- VIP: `✓ {name} added as VIP guest (Payment waived)`
- Free event: `✓ {name} added successfully (Free event)`

### Regular Member
- Always: `✓ {name} added. Payment required: ¥{price}`
- Free event: `✓ {name} added successfully (Free event)`

## Files Modified

### Frontend
- `components/SimpleGuestManagementModal.tsx`
  - Added `paymentOption` state ('full' | 'complimentary' | 'vip')
  - Added `canWaivePayment` permission check
  - Added radio button UI for treasurer/admin
  - Added payment validation
  - Added VIP and complimentary badges in guest list

### Backend
- `app/api/tickets/[id]/guests/route.ts`
  - Added `guest_type` field handling
  - Added guest_type to database insert

### Database
- `ADD_GUEST_TYPE_COLUMN.sql` - Migration script

## Testing Checklist

### As Treasurer/Admin
- [ ] Open guest management modal
- [ ] See 3 payment options (Full/Complimentary/VIP)
- [ ] Add guest with "Full Payment Required"
  - [ ] Guest shows "💰 Payment Due" badge
- [ ] Add guest with "Complimentary Guest"
  - [ ] Guest shows "🎁 Complimentary" badge
- [ ] Add guest with "VIP Special Guest"
  - [ ] Guest shows "⭐ VIP Guest" badge

### As Regular Member
- [ ] Open guest management modal
- [ ] See only info box "Full Payment Required"
- [ ] No radio buttons shown
- [ ] Add guest
  - [ ] Guest shows "💰 Payment Due" badge
  - [ ] Cannot set as complimentary or VIP

### Free Event
- [ ] Open guest management modal
- [ ] See "Free Event - No payment required" message
- [ ] Add guest
  - [ ] No payment badges shown
  - [ ] Success message confirms free event

## Migration Steps

1. **Run the SQL migration:**
   ```bash
   # Apply the migration to add guest_type column
   psql -d your_database -f ADD_GUEST_TYPE_COLUMN.sql
   ```

2. **Restart the development server:**
   ```bash
   npm run dev
   ```

3. **Test the new payment options:**
   - Login as treasurer/admin
   - Navigate to event check-in
   - Click 👤 icon to manage guests
   - Test all three payment options

## Key Benefits

✅ **Clear Authority** - Only treasurers can waive payments
✅ **Transparency** - Payment status visible at a glance
✅ **VIP Recognition** - Special guests get distinguished status
✅ **Compliance** - Regular members must collect payments
✅ **Flexibility** - Treasurers can handle special cases

## Future Enhancements

- [ ] Payment collection tracking (total collected per event)
- [ ] VIP guest report generation
- [ ] Complimentary guest approval workflow
- [ ] Bulk guest import with payment options
