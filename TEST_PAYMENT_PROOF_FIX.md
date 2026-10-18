# 🧪 Test Guide: Payment Proof Display Fix

## Quick Test (3 minutes)

### Step 1: Access Treasurer Dashboard
1. Open browser to: **http://localhost:3000/treasurer**
2. Login with one of these users:
   - 429318n@gmail.com (Admin)
   - jane+clerk_test@example.com (Admin)
   - 1secratury+clerk_test@example.com (Treasurer)

### Step 2: Verify Pending Verifications Section Appears
Look for the section:
```
✅ Pending Loan Payment Verifications (1)
Member-submitted loan payments awaiting your verification
```

### Step 3: Check Payment Card Display
You should see a payment card with:
- ✅ Payment proof thumbnail image (on the left)
- ✅ Member name: **Committee**
- ✅ Email: committee+clerk_test@example.com
- ✅ Amount: **¥5.00** (in green)
- ✅ Payment date
- ✅ Payment method
- ✅ Loan balance: ¥5.00

### Step 4: View Full Payment Proof
1. Click on the thumbnail image
2. Modal should open with full-size payment proof
3. Image should display clearly
4. Click outside or close button to close modal

### Step 5: Test Verification
1. Click "✅ Verify" button on the payment card
2. Payment should be approved
3. Card should disappear from pending section
4. Verify in database or member's payment history

## Console Logs to Check

Open browser console (F12) and look for:
```
🔍 Fetching pending loan repayment verifications via API...
📊 Pending verifications API result: {success: true, count: 1, ...}
✅ Set pending verifications: 1
```

## Expected Database State BEFORE Test

Run this SQL to verify the pending payment exists:
```sql
SELECT 
  id,
  loan_id,
  amount,
  payment_type,
  verification_status,
  payment_date,
  LENGTH(payment_proof_url) as proof_length
FROM loan_repayments
WHERE id = '456095e9-2f7b-4156-9ca7-473762c83d5a';
```

Expected result:
- verification_status: `pending`
- payment_type: `member`
- amount: `5.00`
- proof_length: `57158` (base64 image)

## Troubleshooting

### Issue: No pending verifications section appears
**Check**:
1. Browser console for API errors
2. Network tab - check `/api/treasurer/pending-verifications` response
3. Database - verify payment exists with `verification_status='pending'`

### Issue: Thumbnail shows "No Image"
**Check**:
1. Console for image load errors
2. Verify `payment_proof_url` contains base64 data (starts with `data:image/`)
3. Check base64 string length (should be ~57k characters)

### Issue: Full image modal doesn't open
**Check**:
1. Click is registered (check console)
2. Modal state variable `viewImage` is set
3. Modal component exists in the page

### Issue: Verify button doesn't work
**Check**:
1. Console for verification API call
2. Network tab for `/api/loans/[id]/repayments/[repaymentId]` PATCH request
3. Database RLS policies allow update for treasurer role

## Success Criteria

✅ Pending verifications section displays
✅ Payment proof thumbnail visible and clickable
✅ Full-size image modal opens and displays image correctly
✅ Member details (name, email, amount) display correctly
✅ Verify button successfully approves payment
✅ Payment disappears from pending section after verification

## After Verification Test

To reset and test again, run this SQL:
```sql
UPDATE loan_repayments
SET verification_status = 'pending'
WHERE id = '456095e9-2f7b-4156-9ca7-473762c83d5a';
```

## Additional Tests (Optional)

### Test Reject Functionality
1. Click "❌ Reject" button
2. Enter rejection reason
3. Click "Confirm Reject"
4. Verify payment status changes to 'rejected'

### Test Multiple Pending Payments
Create additional test payment to verify list display:
```sql
-- Check if there are other payments to test with
SELECT COUNT(*) 
FROM loan_repayments 
WHERE verification_status = 'pending' 
AND payment_type = 'member';
```

## Related Documentation
- Full implementation details: `PAYMENT_PROOF_FIX_COMPLETE.md`
- Original issue context: Conversation summary
- API endpoint: `app/api/treasurer/pending-verifications/route.ts`
- Frontend component: `app/treasurer/page.tsx` (lines 853-879, 1934-2020)
