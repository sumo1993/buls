# Non-Member Registration Refund Feature

## Overview
The refund feature allows treasurers and admins to process refunds for non-member event registrations. This includes tracking the refund amount, reason, proof of refund, and who processed it.

## Database Changes

### SQL Migration
Run this SQL in Supabase SQL Editor:
```sql
-- File: ADD_NON_MEMBER_REFUND_COLUMNS.sql
```

This adds the following columns to `non_member_registrations`:
- `refunded_by` (UUID) - References users(id), tracks who processed the refund
- `refunded_at` (TIMESTAMPTZ) - When the refund was processed
- `refund_reason` (TEXT) - Explanation for the refund
- `refund_amount` (DECIMAL) - Amount refunded
- `refund_proof_url` (TEXT) - URL to refund receipt/proof image

Also adds 'refunded' as a valid status in the status check constraint.

## API Endpoint

### POST `/api/treasurer/non-member-refunds`
Processes a refund for a non-member registration.

**Request Body:**
```json
{
  "registration_id": "uuid",
  "refund_amount": 5.00,
  "refund_reason": "Event cancelled",
  "refund_proof_url": "https://..." // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": { ... }
}
```

**Validations:**
- Only treasurer and admin can process refunds
- Registration must exist and not be already refunded
- Refund amount cannot exceed amount paid
- Reason is required

## UI Features

### Treasurer Page (`/treasurer/non-member-payments`)
1. **Refund Status Badge** - Purple badge showing "Refunded" status
2. **Refund Button** - Appears in table for approved/verified registrations that haven't been refunded
3. **Refund Modal** - Form to process refund with:
   - Display of registration details
   - Refund amount input (max = amount paid)
   - Refund reason textarea (required)
   - Optional refund proof file upload
   - Cancel and Process buttons

4. **Refund Information in Detail View** - Shows refund details in purple box:
   - Refund amount
   - Refunded at timestamp
   - Refund reason
   - Refund proof image (if uploaded)

### Secretary Page (`/secretary/non-member-registrations`)
1. **View Refund Status** - Can see "Refunded" badge in table
2. **View Refund Details** - Can see full refund information in detail modal
3. **Cannot Process Refunds** - Secretary can only view, not process refunds

## Workflow

1. **Payment Verified** - Registration is in 'pending' or 'approved' status
2. **Treasurer Opens Refund Modal** - Clicks "Refund" button next to registration
3. **Enter Refund Details**:
   - Amount (defaults to full amount paid)
   - Reason for refund (required)
   - Upload refund proof (optional - receipt, transaction screenshot, etc.)
4. **Process Refund** - Click "Process Refund" button
5. **Confirmation** - Success message shown, table refreshes
6. **Status Updated** - Registration status changes to 'refunded'
7. **Visible to All** - Secretary and admin can see refund details

## Access Control

- **Treasurer**: Can view and process refunds
- **Admin**: Can view and process refunds
- **Secretary**: Can view refund status and details only
- **Students/Members**: Cannot access these pages

## Storage
Refund proof images are stored in Supabase Storage bucket: `event-assets/refund-proofs/`

## Status Flow
```
pending → refunded
approved → refunded
```

Refunded registrations cannot be approved/rejected after refund is processed.

## Filter Options
Both treasurer and secretary pages now include "Refunded" filter option to view only refunded registrations.

## Notes
- Refunds are permanent - once processed, they cannot be undone (would need admin database access)
- Refund amount can be partial (less than amount paid)
- Original payment proof remains visible alongside refund information
- Refund tracking includes timestamp and user who processed it for audit trail
