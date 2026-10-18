# Budget Proposal Workflow

## Overview
The budget proposal system has two distinct roles with different responsibilities:

### 1. Secretary Role
**Purpose:** Assign budget proposal tasks to committee members

**What Secretary Does:**
- Selects a committee
- Assigns a Budget Proposal Head (a committee member who will be responsible)
- Creates the assignment

**What Secretary DOES NOT Do:**
- Fill in proposal title
- Fill in proposal description
- Add line items
- Specify budget amounts

**UI Location:** Secretary Dashboard > Budget Proposals Tab > "Assign Budget Proposal" button

### 2. Budget Proposal Head Role (Assigned Member)
**Purpose:** Create the actual budget proposal details

**What Budget Head Does:**
- Logs into their account
- Sees their assigned budget proposals
- Fills in the proposal title
- Adds description
- Creates line items with quantities and costs
- Submits the proposal for review

**UI Location:** Member Dashboard > My Budget Proposals (to be created)

## Workflow Steps

1. **Assignment (Secretary)**
   ```
   Secretary → Budget Proposals Tab → Assign Budget Proposal
   ↓
   Select Committee
   ↓
   Select Budget Proposal Head
   ↓
   Click "Assign Budget Proposal"
   ↓
   Assignment created with status "draft"
   ```

2. **Fill Details (Budget Head)**
   ```
   Budget Head logs in
   ↓
   Views assigned proposals (status: "Pending Details")
   ↓
   Clicks "Edit" on their assignment
   ↓
   Fills in:
   - Title
   - Description
   - Line Items (name, quantity, unit cost)
   ↓
   Saves proposal
   ↓
   Submits for review
   ```

3. **Approval Workflow**
   ```
   Budget Head submits → Status: "Pending Review"
   ↓
   Secretary reviews → Status: "Approved" or "Rejected"
   ↓
   If approved → Treasurer can record payment → Status: "Paid"
   ```

## Database Changes Required

Run the migration file: `ADD_BUDGET_HEAD_COLUMN.sql`

This adds:
- `budget_head_id` column to `budget_proposals` table
- RLS policies for budget heads to read/edit their assigned proposals
- Policy for secretary to create assignments

## API Changes

### POST `/api/budget-proposals`
**Secretary Mode:**
- Requires: `committee_id`, `budget_head_id`
- Optional: `title` (defaults to "Pending Details")
- Creates assignment with status "draft"

**Budget Head Mode:**
- Requires: `committee_id`, `title`
- Optional: `budget_head_id`, `description`, `items`
- Creates full proposal

## Next Steps

### 1. Run the Database Migration

Execute the SQL migration to add the `budget_head_id` column:

```bash
# Connect to your Supabase database and run:
# File: ADD_BUDGET_HEAD_COLUMN.sql
```

### 2. Test the Complete Workflow

**As Secretary:**
1. Go to Secretary Dashboard → Budget Proposals tab
2. Click "Assign Budget Proposal"
3. Select a committee
4. Select a budget proposal head (member)
5. Click "Assign Budget Proposal"

**As Budget Head (Assigned Member):**
1. Log into your account
2. You'll see assigned proposals on the Dashboard
3. Click "Fill Details" or go to "My Budget Proposals" (add to navigation)
4. Fill in:
   - Title (required)
   - Description (optional)
   - Budget Items (required - at least one)
     - Item name
     - Description (optional)
     - Quantity
     - Unit cost
5. Click "Save Draft" (saves without submitting) or "Submit for Review"

**As Secretary (Review):**
1. View submitted proposals
2. Approve or reject
3. If approved, treasurer can record payment

### 3. Add Navigation Links

Add these links to the member navigation:
- "My Budget Proposals" → `/my-budget-proposals`

### Files Created

**Frontend Pages:**
- `/app/budget-proposals/[id]/page.tsx` - View proposal (read-only)
- `/app/budget-proposals/[id]/edit/page.tsx` - Edit proposal form
- `/app/my-budget-proposals/page.tsx` - List all assigned proposals

**API Endpoints:**
- `/app/api/my-budget-proposals/route.ts` - Fetch user's assigned proposals
- `/app/api/budget-proposals/[id]/route.ts` - Fetch single proposal

**Modified Files:**
- `/app/secretary/page.tsx` - Simplified form to only assign
- `/app/api/budget-proposals/route.ts` - Updated POST for assignments
- `/app/dashboard/page.tsx` - Added assigned proposals section
- `/app/api/dashboard-data/route.ts` - Fetch assigned proposals

**Database Migration:**
- `ADD_BUDGET_HEAD_COLUMN.sql` - Adds budget_head_id and RLS policies
