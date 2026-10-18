# 🚀 Quick Test: Member Disbursement Proof View

## 5-Minute Test Guide

---

## Prerequisites ✅

```bash
# 1. Ensure database migration is applied
# Run this SQL if not already done:
# ADD_DISBURSEMENT_PROOF.sql

# 2. Server must be running
npm run dev
# or
yarn dev

# 3. Have these test accounts ready:
# - Member account
# - Treasurer account
# - Finance account
# - Secretary account
```

---

## Quick Test Steps (5 minutes)

### Step 1: Apply for Loan (as Member)
```
1. Login as MEMBER
2. Go to "Loans" page
3. Click "New Loan Request"
4. Fill in:
   - Amount: ¥5000
   - University: (select any)
   - Purpose: "Test disbursement proof feature"
   - Repayment date: (select future date)
   - Guarantor: (fill in test data)
5. Upload application document
6. Submit
7. Logout
```

### Step 2: Approve Loan (as Secretary & Finance)
```
1. Login as SECRETARY
2. Go to Secretary dashboard
3. Find the test loan
4. Approve it
5. Logout

6. Login as FINANCE
7. Go to Finance dashboard
8. Find the test loan
9. Approve it
10. Logout
```

### Step 3: Disburse with Proof (as Treasurer)
```
1. Login as TREASURER
2. Go to Treasurer dashboard
3. Find "Loans Awaiting Disbursement" section
4. Find the test loan
5. Click "Disburse" button
6. In the modal:
   - Method: Select "Bank Transfer"
   - Upload proof: Upload any image (screenshot, photo)
   - Notes: "Test transfer to account 123456"
7. Click "Complete Disbursement"
8. Verify success message
9. Logout
```

### Step 4: View Proof (as Member) ⭐ THIS IS THE NEW FEATURE
```
1. Login as MEMBER (original applicant)
2. Go to "Loans" page
3. Find the disbursed loan
4. Look for GREEN section "Disbursement Details"
5. Verify you see:
   ✅ Method: Bank Transfer
   ✅ Date: Today's date
   ✅ Notes: "Test transfer to account 123456"
   ✅ Button: "View Disbursement Proof"
6. Click "View Disbursement Proof"
7. Verify modal opens with proof image
8. Click "Download" - verify image downloads
9. Click "Close" - verify modal closes
10. Done! ✅
```

---

## Expected Results

### ✅ Pass Criteria

1. **Green section appears** on disbursed loan card
2. **Disbursement details shown**: method, date, notes
3. **"View Disbursement Proof" button** is visible and clickable
4. **Modal opens** when button is clicked
5. **Proof image displays** correctly in modal
6. **Download works** - image saves to device
7. **Close works** - modal closes on button click or background click
8. **Mobile responsive** - works on phone/tablet

### ❌ Fail Criteria

1. Green section doesn't appear
2. Button doesn't work
3. Modal doesn't open
4. Image doesn't display
5. Download fails
6. Modal won't close
7. Console errors appear

---

## Troubleshooting

### Issue: Green section doesn't appear
**Solution:**
- Check if loan status is `disbursed` or `approved`
- Check if `disbursement_proof_url` exists in database
- Verify treasurer actually uploaded proof

### Issue: Modal doesn't open
**Solution:**
- Check browser console for errors
- Clear cache and reload
- Verify `viewProofImage` state is being set

### Issue: Image doesn't display
**Solution:**
- Check if proof URL is valid base64 string
- Verify image was uploaded correctly by treasurer
- Check network tab for loading issues

### Issue: Works for treasurer but not member
**Solution:**
- Verify member is logged in as the loan applicant
- Check RLS policies on loans table
- Verify API route returns disbursement_proof_url

---

## Quick Verification Queries

### Check if migration was applied:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'loans' 
  AND column_name IN ('disbursement_proof_url', 'disbursement_notes');
```

### Check if proof was uploaded:
```sql
SELECT id, amount, status, 
       disbursement_method, 
       disbursement_notes,
       LENGTH(disbursement_proof_url) as proof_size
FROM loans 
WHERE status = 'disbursed'
ORDER BY approved_at DESC
LIMIT 5;
```

### Check member's loans:
```sql
SELECT l.id, l.amount, l.status, 
       l.disbursement_proof_url IS NOT NULL as has_proof,
       u.full_name, u.email
FROM loans l
JOIN users u ON l.user_id = u.id
WHERE u.email = 'member@test.com'  -- Replace with test member email
ORDER BY l.created_at DESC;
```

---

## Screenshot Checklist

Take screenshots of:
- [ ] Member's loan card showing green disbursement details section
- [ ] "View Disbursement Proof" button
- [ ] Modal opened with proof image
- [ ] Downloaded proof file
- [ ] Mobile view of the feature

---

## Performance Check

### Load Times
- [ ] Loans page loads in < 2 seconds
- [ ] Modal opens instantly (< 100ms)
- [ ] Image displays in < 500ms
- [ ] Download completes in < 1 second

### Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Done! ✅

If all steps pass, the feature is working correctly!

**Estimated Test Time**: 5-10 minutes  
**Status**: READY TO TEST  
**Priority**: HIGH (user-facing feature)

---

## Next Steps After Testing

1. ✅ Mark feature as tested
2. ✅ Deploy to production (if test passes)
3. ✅ Notify members about new feature
4. ✅ Update user documentation
5. ✅ Monitor for issues in first week

---

## Support

If issues persist:
1. Check `TASK_COMPLETE_MEMBER_PROOF_VIEW.md` for full details
2. Check `MEMBER_PROOF_VIEW_GUIDE.md` for visual guide
3. Review `app/loans/page.tsx` code changes
4. Check browser console for errors
5. Verify database migration was applied

**Feature Status**: ✅ COMPLETE & READY
