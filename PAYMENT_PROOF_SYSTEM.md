# Payment Proof System - Complete Documentation

## Overview
The system tracks payment proofs at TWO levels:
1. **Ticket Purchase Level** - Member's payment proof (stored in `ticket_purchases.payment_proof_url`)
2. **Guest Level** - Individual guest payment proofs (stored in `ticket_guests.payment_proof_url`)

## Workflow

### 1. Member Buys Ticket (Before Approval)
- Member goes to Events page
- Clicks "Buy Ticket"
- Selects payment method (WeChat, Alipay, Bank, Cash)
- **UPLOADS PAYMENT PROOF** screenshot showing they paid
- Clicks "Purchase Ticket"
- Status: `pending` approval

### 2. Treasurer Reviews (Approval Process)
Location: `/treasurer/tickets` → **Pending Approval** tab

**What Treasurer Sees:**
- Member name, email
- Quantity, amount
- Payment method
- **💳 Payment Screenshot** (member's proof)
- Member notes

**Treasurer Actions:**
1. **Click ticket card** to view full Purchase Details modal
2. **Review payment proof** on left side
3. **Verify amount matches** the proof
4. Click "✓ Approve" or "✗ Reject"

### 3. After Approval - Adding Guests

#### Scenario A: Guest Pays with Member (GCZ Case)
- Member pays for guest in their own account
- Member uploads ONE proof showing both amounts
- Guest added with: `payment_status: 'paid_online'` or `'paid'`
- **Same proof** shows in both:
  - Member's payment screenshot
  - Guest's record (linked to same ticket purchase)

#### Scenario B: Guest Pays at Door (Prince Case)
- Guest arrives at event without paying
- Treasurer collects payment at gate
- Treasurer clicks guest → "Mark as Paid"
- System records in `payment_notes`: "Payment collected by treasurer via cash"
- `updated_at` timestamp shows when payment was collected
- No payment proof image (collected in person)

#### Scenario C: Guest Gets Refunded (GCZ Refund Case)
- Guest cannot attend
- Treasurer clicks guest → "Refund"
- Enters refund reason
- If **refund proof** exists (bank transfer screenshot), it should be uploaded
- Stored in `ticket_guests.payment_proof_url`
- `refund_reason` explains why
- `refunded_at` shows when
- Status changes to `refunded`

## Database Structure

### ticket_purchases table
```sql
- id
- user_id (member who bought)
- event_id
- quantity
- unit_price
- total_price
- payment_method (wechat, alipay, bank, cash)
- payment_status (pending, paid, refunded)
- payment_proof_url ← MEMBER'S PROOF
- notes (member's notes)
- created_at
- approved_at
- approved_by
```

### ticket_guests table
```sql
- id
- ticket_purchase_id (links to member's purchase)
- full_name
- email
- phone
- payment_status (paid, paid_at_door, paid_online, pending, refunded, complimentary)
- amount_paid
- payment_method
- payment_proof_url ← GUEST'S PROOF (if separate)
- payment_notes (who collected, how)
- refund_amount
- refund_reason
- refunded_at
- refunded_by
- created_at
- updated_at (when payment collected)
```

## Where Payment Proofs Are Displayed

### 1. Treasurer Tickets Page - Pending Tab
Shows member's payment proof in card view before approval

### 2. Treasurer Tickets Page - Approved Tab
Shows member's payment proof in card view after approval

### 3. Purchase Details Modal (Click any ticket)
**Left Side:**
- Member's payment screenshot (large, clickable)

**Right Side → Guest Information:**
For each guest shows:
- Payment status badge
- Amount paid
- Payment notes (if collected by treasurer)
- **Guest's payment proof image** (if exists)
- Refund details (if refunded)
- Refund proof (if exists)

### 4. Edit Guest Modal (Click guest name)
**Payment Information Card:**
- Status (with color)
- Amount
- Method
- Payment notes
- Timeline (added, updated, refunded)
- Refund reason

**Member's Payment Proof** (purple card):
- Shows ticket purchase proof
- Proves guest was paid in member's account

**Guest's Own Payment Proof** (green card):
- Shows if guest uploaded separate proof
- Shows refund proof if refunded

## Payment History for Each Guest

When treasurer clicks on a guest (Prince or GCZ), they see:

### Payment Information:
- **Status**: Paid/Pending/Refunded/Complimentary
- **Amount**: ¥X
- **Method**: WeChat/Alipay/Cash/etc
- **Payment Notes**: Who collected and how
  - Example: "Payment collected by treasurer via cash"
  - Example: "Payment method: already_paid"

### Timeline:
- **Guest Added**: When they were registered
- **Last Updated**: When payment was collected/updated
- **Refunded**: When refund was processed (if applicable)

### Proofs:
1. **Ticket Purchase Proof** (purple card)
   - Member's original payment screenshot
   - Shows if guest was included in member's payment

2. **Guest Payment Proof** (green card)
   - Guest's own proof (if uploaded separately)
   - Refund proof (if refunded)

## Example Cases

### THEO's Ticket Purchase:
- **THEO** uploads proof showing payment for ticket + 2 guests
- Treasurer sees proof in Pending tab
- Treasurer approves ticket
- **Prince** added as guest, paid at door:
  - `payment_status: 'paid_at_door'`
  - `payment_notes: "Payment collected by treasurer via cash"`
  - No proof image (in-person payment)
  
- **GCZ** added as guest, paid by THEO:
  - `payment_status: 'paid_online'`
  - Shows THEO's original proof (ticket purchase proof)
  
- **GCZ** gets refunded:
  - `payment_status: 'refunded'`
  - `refund_reason: "Cannot attend"`
  - If refund proof uploaded: shows in `payment_proof_url`

## Migration Required

To enable guest payment proofs, run:
```sql
-- Add payment_proof_url to ticket_guests
ALTER TABLE ticket_guests 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

COMMENT ON COLUMN ticket_guests.payment_proof_url IS 'URL/path to guest uploaded payment proof/screenshot or refund proof';
```

## APIs Used

1. **GET /api/tickets/purchase** - Fetch all ticket purchases with payment proofs
2. **GET /api/tickets/[id]/guests** - Fetch guests for a ticket with their proofs
3. **PUT /api/tickets/[id]/guests** - Update guest info (mark as paid, etc)
4. **POST /api/admin/guests/[id]/collect-payment** - Collect payment at door

## Current Status

✅ **Working:**
- Member payment proofs display correctly
- Guest payment info displays (status, amount, notes)
- Payment collection at door works
- Refund tracking works

❌ **Missing (Need to Add):**
- Guest payment proof upload functionality
- Refund proof upload when processing refund
- Guest payment proof display in Purchase Details modal ✅ FIXED
- Guest payment proof display in Edit Guest modal ✅ FIXED

✅ **Just Fixed:**
- Added guest payment proof display in Purchase Details modal
- Added guest payment proof display in Edit Guest modal
- Added payment notes display
- Added complete payment timeline
