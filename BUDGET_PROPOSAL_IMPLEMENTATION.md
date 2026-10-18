# Budget Proposals Implementation Summary

## Overview
Implemented a complete multi-level budget proposal approval workflow for the BULS Secretary panel.

## Database Schema

### budget_proposals Table
- `id` - UUID primary key
- `committee_id` - References committees table
- `title`, `description`, `status` (draft/pending_review/approved/rejected/paid)
- `total_amount` - Calculated from line items
- Timestamps for workflow stages:
  - `created_at`, `submitted_at`
  - `secretary_approved_at`
  - `treasurer_processed_at`, `treasurer_approved_at`
  - `paid_at`
- `review_notes`, `payment_reference`

### budget_proposal_items Table
- `id`, `proposal_id`
- `item_name`, `description`, `quantity`, `unit_cost`, `total_cost`
- Auto-calculated total cost per item

### payment_records Table
- `id`, `proposal_id`
- `amount`, `payment_method`, `payment_reference`
- `paid_to_committee_id`, `paid_to_name`, `paid_to_account`
- `payment_date`, `recorded_by`
- `notes`

## API Routes

### `/api/budget-proposals` (GET, POST, PUT, DELETE)
- Fetch all budget proposals
- Create new proposal with committee and items
- Update proposal (draft state only)
- Delete draft proposal

### `/api/budget-proposals-items` (GET, POST, DELETE)
- Fetch items for a proposal
- Add items to draft proposals
- Delete items from draft proposals

### `/api/payment-records` (GET, POST, DELETE)
- Fetch all payment records
- Create payment record (links to approved proposal)
- Delete own payment records

## Workflow

1. **Committee creates proposal** (draft status)
   - Select committee
   - Add title and description
   - Add line items with quantity and unit cost
   - Auto-calculates total

2. **Submit for Secretary Review**
   - Button changes status to 'pending_review'
   - Timestamp `submitted_at` set

3. **Secretary reviews**
   - Approve (status: 'approved', timestamp set)
   - Reject (status: 'rejected', review_notes)
   - Sends back to committee

4. **Treasurer processes payment**
   - View approved proposals
   - Click "Record Payment"
   - Enter payment details
   - Creates payment record
   - Updates proposal status to 'paid'

5. **Finance records**
   - View all proposals
   - Record payments
   - Track payment history

## UI Changes

### Secretary Panel
- New tab: "Budget Proposals"
- Committee Members tab enhanced to see budget proposal activity
- New modals:
  - Budget Proposal Modal (create/edit)
  - Payment Modal (record payment)
- Line item management with auto-calculation

### Treasurer Panel
- New tab: "Budget Proposals"
- View all proposals with status badges
- Record Payment functionality
- Links to proposal details

### Finance Panel
- New tab: "Budget Proposals"
- View all proposals requiring finance review
- Payment recording capability

## RLS Policies

- **Committee members**: Can create/edit their own draft proposals
- **Secretary**: Full read/write access
- **Treasurer**: Read all proposals, create payment records
- **Finance**: Read all proposals and payment records

## Next Steps

1. Run the SQL migration:
```sql
-- Run ADD_BUDGET_PROPOSALS.sql
```

2. Test the workflow:
   - Create a budget proposal as a committee member
   - Submit for review
   - Approve as secretary
   - Record payment as treasurer
   - View in finance

## Files Modified

- `app/secretary/page.tsx` - Budget Proposals tab and modals
- `app/treasurer/page.tsx` - Budget Proposals tab
- `app/finance/page.tsx` - Budget Proposals tab
- `app/api/budget-proposals/route.ts` - New API
- `app/api/budget-proposals-items/route.ts` - New API
- `app/api/payment-records/route.ts` - New API
- `ADD_BUDGET_PROPOSALS.sql` - Database migration