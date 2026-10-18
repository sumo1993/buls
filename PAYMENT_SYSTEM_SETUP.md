# Budget Proposals Payment System - Setup Guide

## 🎯 Overview
Complete payment recording system with payment proof upload, role-based access control, and audit trail.

## 📋 Features Implemented
- ✅ Auto-generated payment references (BP-YYYYMMDD-XXXXX format)
- ✅ Two-tier staff permissions:
  - **Secretary**: Approves proposals
  - **Treasurer**: Records payments (sole payment authority)
  - **Finance**: View-only access for reconciliation
- ✅ Payment proof upload requirement (images & PDFs)
- ✅ China-localized payment methods (Alipay, WeChat Pay, Bank Transfer, Cash)
- ✅ Auto-fill "Paid To" with committee head name
- ✅ Complete payment information display on proposal detail page
- ✅ Separation of duties following financial control best practices

## 🔧 Setup Instructions

### Step 1: Database Migration
Run the migration to add the receipt_url column:

```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f ADD_RECEIPT_URL_COLUMN.sql
```

Or in Supabase SQL Editor:
```sql
ALTER TABLE payment_records 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;
```

### Step 2: Verify Directory Structure
The uploads directory has been created at:
```
public/
  uploads/
    receipts/
      .gitkeep
```

### Step 3: Test the System
1. **As Secretary**: Create and approve a budget proposal
2. **As Treasurer**: 
   - Open approved proposal
   - Click "Record Payment"
   - Upload payment receipt (required)
   - Fill payment details (auto-generated reference, auto-filled paid_to)
   - Submit
3. **As Finance**: View proposal to see payment information (cannot record payments)
4. **As Committee Head**: View your proposal's payment information

## 📁 Files Modified/Created

### API Routes
- `app/api/budget-proposals/route.ts` - Role-based filtering
- `app/api/payment-records/route.ts` - Auto-reference generation, receipt_url support
- `app/api/upload/route.ts` - **NEW** File upload endpoint

### Components
- `components/BudgetProposalsPanel.tsx` - Payment form with file upload
- `app/budget-proposals/[id]/page.tsx` - Payment info display

### Utilities
- `lib/budget-access.ts` - Permission functions

### Database
- `ADD_RECEIPT_URL_COLUMN.sql` - **NEW** Migration script

## 🔐 Role Permissions

| Role | View Proposals | Approve | Record Payment | View Payment Info |
|------|---------------|---------|----------------|-------------------|
| Committee Head | Own only | ❌ | ❌ | Own only |
| Secretary | All | ✅ | ❌ | All |
| Treasurer | Approved/Paid | ❌ | ✅ | All |
| Finance | Approved/Paid | ❌ | ❌ | All |
| Admin | All | ✅ | ✅ | All |

## 💳 Payment Methods
- **Alipay** (支付宝) - Default
- **WeChat Pay** (微信支付)
- **Bank Transfer** (银行转账)
- **Cash** (现金)

## 📝 Payment Reference Format
`BP-YYYYMMDD-XXXXX`
- **BP**: Budget Proposal prefix
- **YYYYMMDD**: Date (e.g., 20241013)
- **XXXXX**: Sequential number for the day (00001, 00002, etc.)

Example: `BP-20241013-00001`

## 🔍 Testing Checklist
- [ ] Database migration applied successfully
- [ ] Secretary can approve proposals
- [ ] Treasurer can record payments with file upload
- [ ] Finance cannot record payments (view-only)
- [ ] Payment reference auto-generates correctly
- [ ] "Paid To" auto-fills with committee head name
- [ ] File upload accepts images and PDFs (rejects other types)
- [ ] Payment information displays on proposal detail page
- [ ] Receipt file is downloadable/viewable

## 🚨 Common Issues

### Upload fails
- Check `public/uploads/receipts/` directory exists
- Verify file size < 10MB
- Ensure file type is image or PDF

### Reference not generating
- Check `payment_records` table has entries
- Verify date format in query

### "Paid To" not auto-filling
- Ensure proposal has `budget_head` relation loaded
- Check `budget_head.full_name` exists

### Finance can record payments
- Verify `canPay={false}` in `app/finance/page.tsx`
- Check role is not in `PAYMENT_STAFF_ROLES`

## 📚 API Endpoints

### POST /api/upload
Upload payment receipt file
- **Body**: multipart/form-data with `file` field
- **Max size**: 10MB
- **Allowed types**: JPEG, PNG, GIF, WEBP, PDF
- **Returns**: `{ url, filename, size, type }`

### GET /api/payment-records?proposal_id={id}
Fetch payment records for a proposal
- **Auth**: Required
- **Returns**: Array of payment records

### POST /api/payment-records
Create payment record
- **Auth**: Treasurer or Admin only
- **Body**: `{ proposal_id, amount, payment_method, paid_to_name, receipt_url, notes }`
- **Auto-generates**: `payment_reference`, `recorded_by`, `payment_date`

## 🎉 What's Next?
The system is ready for production! Consider:
1. Setting up automated backups for uploaded receipts
2. Adding receipt file compression for storage optimization
3. Implementing receipt OCR for automatic amount verification
4. Adding email notifications when payment is recorded
5. Creating monthly payment reports for Finance team

## 💡 Technical Notes
- Files stored in `public/uploads/receipts/` with timestamp-prefixed names
- Filenames sanitized to prevent directory traversal
- RLS policies ensure users only see authorized proposals
- Payment records cascade delete when proposal deleted
- Audit trail tracks who recorded each payment
