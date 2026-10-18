# Edit Guest Modal - Upgrade Complete ✅

## Changes Made

### 1. Modal Width Increased
- Changed from `max-w-md` (28rem) to `max-w-5xl` (64rem)
- Now displays in wide format from left to right

### 2. Two-Column Layout
**Left Column - Guest Details Form:**
- Guest Name
- Email
- Phone
- Relationship
- **Payment Proof Upload** (NEW!)

**Right Column - Payment Information & Proofs:**
- Current payment status card
- Member's payment proof (if exists)
- Guest's payment proof (if exists or uploaded)

### 3. Payment Proof Upload Added
- File input accepts images
- Converts to base64 automatically
- Shows preview immediately
- Saves to database on "Save Changes"

### 4. Payment Proof Display
**Member's Payment Proof (Purple Card):**
- Shows THEO's original payment screenshot
- Proves guest was included in member's payment
- Clickable to view full size

**Guest's Payment Proof (Green Card):**
- Shows guest's own payment/refund proof
- Displays uploaded image or existing proof
- Updates in real-time when new image uploaded
- Clickable to view full size

### 5. Database & API Updates
✅ Added `payment_proof_url` column to `ticket_guests` table
✅ Updated API to accept `payment_proof_url` in PUT request
✅ Updated frontend to send `payment_proof_url` when saving
✅ Updated state initialization to include `payment_proof_url`

## How to Use

### Upload Payment Proof:
1. Go to `/treasurer/tickets`
2. Click "Approved" tab
3. Find ticket with guests
4. Click "Users" icon button
5. Click on guest name (Prince or GCZ)
6. Edit Guest modal opens (wide layout)
7. Click "Choose File" under "Payment Proof"
8. Select image (screenshot of payment)
9. Preview shows immediately
10. Click "Save Changes"
11. Proof is saved to database

### View Payment History:
**Left Column** shows:
- Guest details (editable)
- Upload new proof button

**Right Column** shows:
- Payment status, amount, method
- Payment notes (who collected, how)
- Timeline (added, updated, refunded)
- Refund reason (if applicable)
- Member's payment proof (purple card)
- Guest's payment proof (green card)

## Test Data Setup

Run this SQL to add realistic test data:

```sql
-- Add THEO's payment proof
UPDATE ticket_purchases 
SET 
  payment_proof_url = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
  payment_method = 'wechat'
WHERE id = '3c6574d9-63f1-473f-b32f-e2b2bbc46c97';

-- Fix Prince's payment (treasurer collected at door)
UPDATE ticket_guests 
SET 
  payment_status = 'paid_at_door',
  amount_paid = 100.00,
  payment_method = 'cash',
  payment_notes = 'Payment collected by treasurer via cash at event entrance',
  updated_at = NOW()
WHERE id = '67c65384-0ab2-447d-92cb-93bc36256ca3';

-- Fix GCZ's info (paid by THEO, then refunded)
UPDATE ticket_guests 
SET 
  payment_status = 'refunded',
  amount_paid = 100.00,
  payment_method = 'wechat',
  payment_proof_url = 'https://images.unsplash.com/photo-1554224311-beee460201e4?w=800',
  payment_notes = 'Refund processed - bank transfer completed',
  refund_reason = 'Guest unable to attend event',
  refund_amount = 100.00,
  refunded_at = NOW()
WHERE id = 'af4a240d-3d31-46bd-bed3-18ee611edb3d';
```

## Files Modified

1. **`app/treasurer/tickets/page.tsx`**
   - Changed modal width to `max-w-5xl`
   - Added two-column grid layout
   - Added payment proof upload input
   - Updated payment proof display logic
   - Updated `handleEditGuest` to save `payment_proof_url`
   - Updated both `onGuestClick` callbacks to include `payment_proof_url`
   - Updated `guestEditForm` state to include `payment_proof_url`

2. **`app/api/tickets/[id]/guests/route.ts`**
   - Added `payment_proof_url` parameter extraction
   - Added `payment_proof_url` to update data object
   - Updated logging to show when proof is provided

## Before & After

### Before:
- Small modal (28rem width)
- Single column layout
- No way to upload guest payment proofs
- Payment proofs not visible
- Had to scroll to see all info

### After:
- Wide modal (64rem width)
- Two-column layout (form left, info right)
- Upload payment proofs directly
- All payment proofs visible with previews
- Everything visible at once
- Professional, organized layout

## Next Steps (Optional Enhancements)

1. **Add Image Compression**
   - Compress large images before storing
   - Reduce base64 size for faster loading

2. **Add Image Preview Before Upload**
   - Show preview modal before saving
   - Allow crop/rotate functionality

3. **Add Multiple Proof Support**
   - Allow multiple proof images per guest
   - Useful for refunds with multiple transfer screenshots

4. **Add Proof History**
   - Track all proofs uploaded over time
   - Show version history with timestamps

5. **Add Proof Verification Status**
   - Allow treasurer to mark proof as "verified"
   - Add verification timestamp and verified_by field
