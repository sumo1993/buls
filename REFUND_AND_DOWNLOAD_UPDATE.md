# Refund and Download Feature Updates

## Changes Made

### 1. Refund Button Now Visible for All Payment Statuses
**Previous Behavior:**
- Refund button only appeared for `approved` or `pending` status registrations
- Had to verify payment first before refund option appeared

**New Behavior:**
- Refund button now appears for:
  - `payment_pending` (Awaiting Verification)
  - `pending` (Verified)
  - `approved` (Approved)
- Can process refund at any stage without verifying payment first
- Button only hidden if registration is already refunded

**Location:** Treasurer → Non-Member Payment Verification → Actions column

### 2. Download Button for Payment Proof Images
**Feature:**
- Download button added next to payment proof images
- Downloads with automatic filename: `payment-proof-{verification_code}.jpg`
- Works in both Treasurer and Secretary views

**Locations:**
- Treasurer → Non-Member Payment Verification → Detail Modal → Payment Proof section
- Secretary → Non-Member Registrations → Detail Modal → Payment Proof section

**How to Use:**
1. Open registration detail modal (click "View" button)
2. Find payment proof image
3. Click "Download" button in top-right of image section
4. File downloads automatically

## UI Updates

### Treasurer Page
```
┌─────────────────────────────────────────────────┐
│ Payment Proof                    [Download] ←NEW│
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │         [Payment Proof Image]               │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Actions Column:
[View] [Refund] ←NOW SHOWS FOR "Awaiting Verification" too
```

### Secretary Page
```
Same download button layout as treasurer page
(View-only, cannot process refunds)
```

## Technical Details

### Download Function
```javascript
const downloadPaymentProof = async (url: string, fileName: string) => {
  // Fetches image as blob
  // Creates temporary download link
  // Triggers download
  // Cleans up temporary URL
}
```

### Refund Button Condition (Updated)
```javascript
// OLD
{(reg.status === 'approved' || reg.status === 'pending') && !reg.refunded_at && (
  <RefundButton />
)}

// NEW
{(reg.status === 'approved' || reg.status === 'pending' || reg.status === 'payment_pending') && !reg.refunded_at && (
  <RefundButton />
)}
```

## User Workflow

### Option 1: Refund Before Verification
1. Registration comes in with status "Awaiting Verification"
2. Treasurer sees **[Refund]** button immediately
3. Can process refund without verifying payment first
4. Registration status changes to "Refunded"

### Option 2: Refund After Verification (Previous Flow)
1. Registration comes in with status "Awaiting Verification"
2. Treasurer verifies payment → status changes to "Verified"
3. Secretary approves → status changes to "Approved"
4. Treasurer can refund at any point after verification

## Benefits

### Faster Refund Processing
- No need to verify payment first if refund is needed
- Reduces steps for cancelled registrations
- Saves time when event is cancelled before verification

### Better Record Keeping
- Download payment proofs for offline records
- Keep proof files for accounting
- Share proof with finance team easily

### Improved Audit Trail
- Downloaded files include verification code in filename
- Easy to organize and track
- Consistent naming convention

## Files Modified
1. `/app/treasurer/non-member-payments/page.tsx`
   - Added download function
   - Updated refund button condition
   - Added download button to payment proof section

2. `/app/secretary/non-member-registrations/page.tsx`
   - Added download function
   - Added download button to payment proof section

## Testing Checklist
- [x] Refund button appears for "Awaiting Verification" status
- [x] Download button appears when payment proof exists
- [x] Download creates properly named file
- [x] Download works in both treasurer and secretary views
- [x] Refund modal opens and processes correctly
- [x] Toast notifications show for success/error
