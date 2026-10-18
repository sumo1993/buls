# Finance Panel Integration for Non-Member Payments

## Current System Overview

### Existing Pages
1. **Treasurer Main Dashboard** (`/treasurer/page.tsx`)
   - Member dues payments
   - Loan management
   - Budget proposals
   - Financial reports (Excel/PDF)

2. **Non-Member Payment Verification** (`/treasurer/non-member-payments`)
   - Verify payment proofs
   - Approve/reject registrations
   - Process refunds
   - Download payment proofs

3. **Secretary View** (`/secretary/non-member-registrations`)
   - View-only access
   - Event attendance management
   - Registration details

## Recommended Integration

### Option 1: Add Tab to Main Treasurer Dashboard (RECOMMENDED)
Add "Non-Member Payments" as a 4th tab on `/treasurer` page:

**Tabs:**
- Payments (Member Dues)
- Loans
- Budget Proposals
- **Non-Member Payments** ← NEW TAB

**Benefits:**
- All financial data in one place
- Easy navigation between member and non-member payments
- Unified reporting system
- Single finance dashboard

### Option 2: Create Dedicated Finance Panel Page
Create new page: `/treasurer/finance-panel` or `/finance`

**Sections:**
1. **Financial Overview**
   - Total member payments
   - Total non-member payments
   - Total loans disbursed/repaid
   - Budget proposals spent

2. **Transaction History**
   - Combined view of all transactions
   - Filter by type (member/non-member/loan/budget)
   - Export options

3. **Audit Trail**
   - Who approved what
   - Who processed refunds
   - Payment verification history
   - Status change logs

**Benefits:**
- Comprehensive financial view
- Better for auditing
- Separate from operational pages

## What Finance Panel Needs to See

### For Non-Member Registrations:
✅ **Transaction Record:**
- Date of registration
- Non-member name & contact
- Event name
- Amount paid (¥X.XX)
- Payment method (proof upload)
- Verification code
- Payment proof image
- Who verified/approved (treasurer name)
- Approval timestamp

✅ **Status Tracking:**
- Payment pending
- Payment approved
- Payment rejected
- Refunded (with reason)

✅ **Refund Information:**
- Refund amount
- Refund date
- Refund reason
- Who processed refund
- Refund proof (if uploaded)

✅ **Audit Trail:**
- Created by (system/user)
- Verified by (treasurer)
- Approved by (treasurer)
- Refunded by (treasurer)
- All timestamps

## Implementation Steps

### Step 1: Add API Endpoint for Combined Financial Report
**File:** `/app/api/treasurer/financial-summary/route.ts`

Returns:
```json
{
  "memberPayments": {
    "count": 150,
    "totalAmount": 15000.00,
    "transactions": [...]
  },
  "nonMemberPayments": {
    "count": 25,
    "totalAmount": 125.00,
    "transactions": [...]
  },
  "loans": {
    "disbursed": 50000.00,
    "repaid": 30000.00,
    "outstanding": 20000.00
  },
  "refunds": {
    "count": 3,
    "totalAmount": 15.00,
    "details": [...]
  }
}
```

### Step 2: Update Treasurer Dashboard
Add "Non-Member Payments" tab that shows:
- List of all non-member payments
- Approval status
- Amount paid
- Event information
- Quick actions (view, download proof)

### Step 3: Enhance Financial Reports
Update `/api/treasurer/reports` to include:
- Non-member payment section
- Refund transactions
- Combined revenue summary

**Excel Report Sections:**
1. Executive Summary (includes non-member revenue)
2. Member Payments
3. **Non-Member Payments** ← NEW
4. **Refunds** ← NEW
5. Loans
6. Budget
7. Analytics

### Step 4: Create Financial Summary Dashboard
**New Component:** `FinancialSummaryPanel`

Displays:
- Total revenue (members + non-members)
- Payment breakdown by source
- Refund tracking
- Monthly trends
- Event-based revenue

## Database Views Needed

### For Efficient Reporting:
```sql
-- View: all_payments
CREATE VIEW all_payments AS
SELECT 
  'member' as payment_type,
  id,
  student_id as payer_id,
  amount,
  status,
  payment_method,
  created_at,
  collector_id,
  NULL as event_id
FROM payments
UNION ALL
SELECT 
  'non_member' as payment_type,
  id,
  NULL as payer_id,
  amount_paid as amount,
  status,
  'proof_upload' as payment_method,
  registered_at as created_at,
  NULL as collector_id,
  event_id
FROM non_member_registrations
WHERE amount_paid IS NOT NULL;
```

### For Refund Tracking:
```sql
-- View: all_refunds
SELECT 
  'non_member' as refund_type,
  id,
  refund_amount as amount,
  refund_reason as reason,
  refunded_by,
  refunded_at,
  refund_proof_url
FROM non_member_registrations
WHERE refunded_at IS NOT NULL;
```

## UI Components Needed

### 1. Financial Summary Cards
```typescript
<div className="grid grid-cols-4 gap-4">
  <StatCard 
    title="Total Revenue"
    value="¥15,125.00"
    change="+12% vs last month"
    icon={<DollarSign />}
  />
  <StatCard 
    title="Member Payments"
    value="¥15,000.00"
    subtitle="150 payments"
  />
  <StatCard 
    title="Non-Member Payments"
    value="¥125.00"
    subtitle="25 registrations"
  />
  <StatCard 
    title="Refunds Processed"
    value="¥15.00"
    subtitle="3 refunds"
  />
</div>
```

### 2. Combined Transaction Table
Shows all financial transactions in one view:
- Type (Member/Non-Member/Loan/Refund)
- Date
- Amount
- Status
- Actions

### 3. Revenue Chart
- Line chart showing member vs non-member revenue over time
- Bar chart comparing payment methods
- Pie chart of revenue by source

## Reports to Generate

### 1. Monthly Financial Report
- Total revenue breakdown
- Payment source analysis
- Refund summary
- Outstanding items

### 2. Event Revenue Report
- Revenue per event
- Non-member registrations per event
- Average ticket price
- Refund rate per event

### 3. Audit Report
- All status changes
- Who approved/rejected
- Refund justifications
- Payment verification timeline

## Access Control

### Treasurer Role:
✅ View all member payments
✅ View all non-member payments
✅ Verify and approve payments
✅ Process refunds
✅ Generate financial reports
✅ Export data

### Finance/Admin Role (if separate):
✅ View all transactions (read-only)
✅ Generate reports
✅ Export data
❌ Cannot approve/reject
❌ Cannot process refunds

### Secretary Role:
✅ View approved non-member registrations
❌ No access to financial reports
❌ No access to payment amounts
❌ No refund processing

## Key Metrics for Finance Panel

### Revenue Metrics:
- Total revenue (all sources)
- Revenue by source (member vs non-member)
- Average payment amount
- Collection rate

### Performance Metrics:
- Payment approval time
- Refund processing time
- Digital vs manual payment ratio
- Event revenue per participant

### Audit Metrics:
- Pending approvals count
- Rejected payment count
- Refund rate
- Outstanding verifications

## Export Formats

### Excel Export Includes:
1. Summary sheet (all revenue sources)
2. Member payments sheet
3. Non-member payments sheet (with event details)
4. Refunds sheet (with reasons)
5. Audit trail sheet

### PDF Export Includes:
1. Executive summary (one page)
2. Revenue breakdown
3. Key statistics
4. Charts and graphs
5. Recommendations

## Next Steps

1. **Immediate:** Add non-member payments to treasurer reports API
2. **Short-term:** Create financial summary component in treasurer dashboard
3. **Medium-term:** Build dedicated finance panel with unified view
4. **Long-term:** Create automated monthly reports with email notifications

## Benefits of Integration

✅ **Single Source of Truth** - All financial data in one place
✅ **Better Audit Trail** - Complete transaction history
✅ **Improved Reporting** - Unified reports with all revenue sources
✅ **Easier Reconciliation** - Match payments to events and activities
✅ **Better Insights** - See complete financial picture
✅ **Compliance Ready** - Full audit trail for all transactions
