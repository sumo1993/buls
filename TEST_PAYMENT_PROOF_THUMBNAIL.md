# Test Payment Proof Thumbnail Display

## Quick Test Steps

### 1. Access Loans Page
Navigate to: **http://localhost:3000/loans**

### 2. Find Your Loan
Look for the loan with:
- **Loan ID**: `2ea425ee-f40a-4a4e-a3dd-732183dff4ec`
- **Original Amount**: ¥10.00
- **Already Paid**: ¥5.00
- **Remaining Balance**: ¥5.00

### 3. Check Payment Proof Thumbnail
On the loan card, below the "View Payment History" button, you should now see:

```
LATEST PAYMENT PROOF
┌──────────────────────────────────┐
│ [📷 Thumbnail]  Click image to   │
│  20x20 preview  view full size   │
│                                   │
│                 View All Proofs → │
└──────────────────────────────────┘
```

**Expected Behavior**:
- ✅ 20x20 thumbnail image appears
- ✅ Shows the base64 payment proof image (57,158 characters)
- ✅ Border is gray (#D1D5DB)
- ✅ Hover changes border to navy blue (#00205B)

### 4. Test Interactions

**Click Thumbnail**:
- Should open full-size image modal
- Image should display clearly

**Click "View All Proofs →"**:
- Should open payment history modal
- Should show all payment records with proofs

### 5. What If No Thumbnail Shows?

**Check browser console** (F12) for:
- API fetch errors
- Image loading errors
- Network issues

**Verify data**:
1. Open browser DevTools → Network tab
2. Reload the page
3. Find the `/api/loans` request
4. Check response JSON for `last_payment_proof_url` field

Expected response structure:
```json
{
  "loans": [
    {
      "id": "2ea425ee-f40a-4a4e-a3dd-732183dff4ec",
      "amount": 10,
      "amount_paid": 5,
      "balance": 5,
      "last_payment_proof_url": "data:image/jpeg;base64,/9j/4AAQ...",
      ...
    }
  ]
}
```

## Test Different Scenarios

### Scenario 1: Loan with Payment Proofs ✅
- Thumbnail **SHOULD** appear
- Shows most recent proof

### Scenario 2: Loan without Payment Proofs
- Thumbnail section **SHOULD NOT** appear
- Only "Make Payment" and "View Payment History" buttons show

### Scenario 3: Multiple Payments
1. Make a second payment with a different proof image
2. Refresh the page
3. Thumbnail should update to show the **newest** proof

## Troubleshooting

### Issue: Thumbnail Not Showing

**Check 1**: Verify API Response
```javascript
// In browser console:
fetch('/api/loans')
  .then(r => r.json())
  .then(data => console.log(data.loans[0].last_payment_proof_url))
```

**Check 2**: Verify Database
Run in Supabase SQL Editor:
```sql
SELECT 
  l.id,
  l.amount,
  lr.payment_proof_url,
  lr.created_at
FROM loans l
LEFT JOIN loan_repayments lr ON lr.loan_id = l.id
WHERE l.id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'
ORDER BY lr.created_at DESC;
```

**Check 3**: Clear Cache
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache completely

### Issue: Image Shows Broken Icon

**Possible Causes**:
1. Base64 data is corrupted
2. Image format not supported
3. Browser memory limit exceeded (image too large)

**Solution**:
- Verify base64 string starts with `data:image/jpeg;base64,` or similar
- Check image size (should be reasonable, < 5MB recommended)

## Success Criteria

✅ Payment proof thumbnail appears on loan card  
✅ Clicking thumbnail opens full-size modal  
✅ "View All Proofs" link opens payment history  
✅ Most recent proof is always displayed  
✅ Graceful handling when no proofs exist  

---

**Current Server**: http://localhost:3000  
**Test Page**: http://localhost:3000/loans  
**Status**: Ready to test ✅
