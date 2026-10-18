# Non-Member Registration Workflow

## Complete Payment & Registration Flow

### Overview
Treasurer has full authority over non-member registration approvals. Secretary views approved registrations for event management.

## Step-by-Step Process

### 1. Non-Member Submits Registration
- Fills out registration form on public event page
- Uploads payment proof image
- Receives verification code (5 digits)
- Status: `payment_pending` (Awaiting Verification)

### 2. Treasurer Reviews & Approves
**Page:** `/treasurer/non-member-payments`

**Actions:**
- View payment proof image
- Download payment proof for records
- Click "Verify & Approve" → Status becomes `approved`
- OR Click "Reject Payment" → Status becomes `rejected`
- OR Click "Refund" → Process refund → Status becomes `refunded`

**Statuses Treasurer Sees:**
- 🟡 Awaiting Verification (payment_pending)
- 🟢 Approved (approved)
- 🔴 Rejected (rejected)
- 🟣 Refunded (refunded)

### 3. Secretary Views Approved Registrations
**Page:** `/secretary/non-member-registrations`

**What Secretary Can Do:**
- ✅ View all registrations (approved, rejected, refunded)
- ✅ See registration details
- ✅ Download payment proofs
- ✅ Filter by status
- ✅ Search by code/phone
- ❌ Cannot approve/reject (treasurer only)

**Purpose:**
- Check attendance at events
- Verify non-member access
- Coordinate event logistics
- View contact information

### 4. Finance Panel (Future)
**Purpose:**
- View all payment transactions
- Generate financial reports
- Audit trail for accounting
- Track refunds and rejected payments

## Role Permissions

### Treasurer
- ✅ View all non-member registrations
- ✅ Verify & approve payments
- ✅ Reject payments
- ✅ Process refunds
- ✅ Download payment proofs
- ✅ Full financial authority

### Secretary
- ✅ View approved registrations
- ✅ View registration details
- ✅ Download payment proofs
- ✅ Search and filter
- ❌ Cannot approve/reject
- ❌ Cannot process refunds

### Admin
- ✅ All treasurer permissions
- ✅ All secretary permissions
- ✅ Full system access

## Status Flow

```
┌─────────────────┐
│ Non-Member      │
│ Submits Form    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ payment_pending     │
│ (Awaiting)          │
└────┬───────┬────────┘
     │       │
     │       └──────────────┐
     ▼                      ▼
┌──────────┐         ┌──────────┐
│ approved │         │ rejected │
└──────┬───┘         └──────────┘
       │
       ▼
┌──────────┐
│ refunded │ (if needed)
└──────────┘
```

## Database Fields

### non_member_registrations table
- `status` - payment_pending | approved | rejected | refunded
- `amount_paid` - Payment amount (e.g., 5.00)
- `payment_proof_url` - URL to uploaded payment image
- `verification_code` - 5-digit code (e.g., 78439)
- `refunded_at` - Timestamp if refunded
- `refunded_by` - User who processed refund
- `refund_amount` - Amount refunded
- `refund_reason` - Reason for refund
- `refund_proof_url` - URL to refund receipt

## UI Features

### Treasurer Dashboard
**Table Columns:**
- Code (verification code)
- Name
- Event
- Contact
- Amount Paid (¥X.XX)
- Status
- Date
- Actions (View, Refund)

**Detail Modal:**
- All registration details
- Payment proof with download button
- "Verify & Approve" button (green)
- "Reject Payment" button (red)
- Refund information (if refunded)

**Refund Modal:**
- Registration summary
- Refund amount input
- Refund reason (required)
- Optional refund proof upload
- Process/Cancel buttons

### Secretary Dashboard
**Table Columns:**
- Same as treasurer (view-only)

**Detail Modal:**
- All registration details
- Payment proof with download button
- Refund information (if refunded)
- No approve/reject buttons
- Note: "Only treasurer can approve or reject registrations"

## Search & Filter

### Both Pages Support:
- Search by last 3 digits of verification code
- Search by phone number (full or partial)
- Filter by status
- Sort by registration date

## Key Differences from Member Registrations

| Feature | Members | Non-Members |
|---------|---------|-------------|
| Authentication | Required | Not required |
| Payment | Through system | Manual upload proof |
| Verification | Automatic | Manual by treasurer |
| Approval | Automatic | Manual by treasurer |
| Refunds | System processed | Manual with reason |

## Benefits of This Workflow

### For Treasurer:
- Single point of payment authority
- No waiting for secretary approval
- Direct refund capability
- Complete financial control

### For Secretary:
- No payment responsibility
- Focus on event management
- Quick access to approved list
- No financial liability

### For Organization:
- Clear responsibility separation
- Faster approval process
- Better audit trail
- Reduced approval steps

## Future Enhancements

### Finance Panel
- Transaction history report
- Monthly payment summary
- Refund tracking dashboard
- Export to accounting software
- Revenue analytics
- Payment method breakdown

### Attendance Tracking
- QR code scanning at events
- Check-in status
- Attendance reports
- Integration with secretary dashboard

### Email Notifications
- Approval confirmation
- Rejection notification
- Refund confirmation
- Verification code reminder

## Security Notes

- Only authenticated treasurer/admin can approve
- Payment proofs stored securely in Supabase Storage
- Refund actions logged with user ID and timestamp
- All status changes create audit trail
- Download function doesn't expose sensitive storage URLs

## Support for Audit

### Fields Tracked:
- Who approved (system user)
- When approved (updated_at)
- Payment proof (permanent URL)
- Refund details (who, when, why, how much)
- Status change history

### Reports Available:
- All payments by date range
- Refunded registrations with reasons
- Rejected payments with proofs
- Approval timeline per registration
