# Guest Payment Options - Quick Summary

## What Changed?

### Before
- ✅ Simple checkbox: "Require payment" (checked/unchecked)
- ❌ No distinction between roles
- ❌ No VIP guest support

### After
- ✅ **3 payment options for Treasurer/Admin:**
  1. 💰 Full Payment Required (¥{price})
  2. 🎁 Complimentary Guest (free)
  3. ⭐ VIP Special Guest (free with VIP status)

- ✅ **1 option for Regular Members:**
  1. 💰 Full Payment Required only (cannot waive)

- ✅ **Automatic for Free Events:**
  - No payment UI shown

## Visual Examples

### Treasurer View
```
○ 💰 Full Payment Required - Guest pays ¥10 at door
○ 🎁 Complimentary Guest - Payment waived - free entry  
○ ⭐ VIP Special Guest - Payment waived - VIP status
```

### Member View
```
ℹ️ Full Payment Required: ¥10
Your guest will need to pay at the door. 
Only treasurers can waive payments.
```

## Guest List Badges
- ⭐ **VIP Guest** (purple) - VIP special guest
- 🎁 **Complimentary** (blue) - Payment waived
- 💰 **Payment Due: ¥X** (yellow) - Needs to pay
- ✓ **Paid at Door** (green) - Payment collected

## Next Steps

1. **Run the database migration:**
   ```sql
   -- See ADD_GUEST_TYPE_COLUMN.sql
   ALTER TABLE ticket_guests 
   ADD COLUMN guest_type VARCHAR(20) DEFAULT 'regular';
   ```

2. **Test as treasurer:**
   - Navigate to check-in page
   - Click 👤 icon
   - Try all 3 payment options

3. **Test as member:**
   - Login as regular member
   - Should only see "Full Payment Required"

## Files Changed
- ✅ `components/SimpleGuestManagementModal.tsx` - UI updates
- ✅ `app/api/tickets/[id]/guests/route.ts` - API updates
- ✅ `ADD_GUEST_TYPE_COLUMN.sql` - Database migration

## Key Rule
**Only Treasurer/Admin can waive payments or set VIP guests. Regular members must collect full payment.**
