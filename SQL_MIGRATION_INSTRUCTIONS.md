# SQL Migration Instructions

## Step-by-Step Guide

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration

1. Open the file: `COMPLETE_SQL_MIGRATION.sql`
2. Copy the **entire content**
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify Installation

After running, you should see output like:
```
Dues Structures Count: 12
Union Ranks Count: 7
Users with Ranks: 0 (or more if you assigned ranks)
Financial Reports Table Exists: YES
```

---

## What This Migration Does

### ✅ Creates Tables
- `union_ranks` - For President, VP, Treasurer, etc.
- `dues_structure` - Matrix of scholarship × rank dues
- `financial_reports` - For generating reports

### ✅ Adds Columns
- `users.union_rank_id` - Links user to their rank
- `payments.collected_by` - Treasurer who collected payment
- `payments.collected_at` - When payment was collected
- `payments.collection_method` - How payment was collected
- `payments.receipt_number` - Finance-generated receipt
- `payments.payment_source` - Origin of payment

### ✅ Creates Functions
- `calculate_monthly_due(user_id)` - Auto-calculate dues
- `get_user_due_info(user_id)` - Get complete due info
- `is_executive_rank(rank_level)` - Check if executive
- `generate_receipt_number(year)` - Create receipt numbers

### ✅ Inserts Default Data
- 7 default union ranks (President → Member)
- 12 default dues structures (6 scholarships × 2 rank types)

---

## Testing the Installation

### Test 1: Check Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('union_ranks', 'dues_structure', 'financial_reports');
```

Expected: 3 rows

### Test 2: View Union Ranks
```sql
SELECT rank_name, rank_level, description 
FROM union_ranks 
ORDER BY rank_level DESC;
```

Expected: 7 ranks from President (100) to Member (10)

### Test 3: View Dues Structure
```sql
SELECT 
  scholarship_type,
  CASE WHEN is_executive THEN 'Executive' ELSE 'Member' END as rank_type,
  monthly_amount,
  description
FROM dues_structure
ORDER BY scholarship_type, is_executive DESC;
```

Expected: 12 rows showing all dues combinations

### Test 4: Test Calculation (with actual user)
```sql
-- Replace 'USER_UUID_HERE' with a real user ID from your users table
SELECT * FROM get_user_due_info('USER_UUID_HERE');
```

Expected: Returns user's scholarship, rank, and calculated due

---

## Default Dues Matrix

After migration, these rates will be active:

| Scholarship Type | Regular Member | Executive (Rank ≥ 60) |
|------------------|----------------|-----------------------|
| CSC | ¥15/month | ¥25/month |
| Government | ¥20/month | ¥30/month |
| Self-support | ¥100/month | ¥110/month |
| Partial | ¥50/month | ¥60/month |
| University | ¥30/month | ¥40/month |
| Other | ¥100/month | ¥100/month |

---

## Troubleshooting

### Error: "type 'payment_status' does not exist"
**Solution:** Your database might not have the base schema. Run `database/schema.sql` first.

### Error: "relation 'users' does not exist"
**Solution:** Run the base schema first: `database/schema.sql`

### Error: "relation 'members_profile' does not exist"  
**Solution:** Run the base schema first: `database/schema.sql`

### Error: "column 'union_rank_id' already exists"
**Solution:** This is fine! The migration is designed to be safe to run multiple times.

### Error: "constraint 'check_payment_source' already exists"
**Solution:** This is fine! The migration checks for existing constraints.

---

## Rolling Back (If Needed)

If you need to undo the migration:

```sql
-- WARNING: This will delete all dues and ranks data!

-- Drop tables
DROP TABLE IF EXISTS financial_reports CASCADE;
DROP TABLE IF EXISTS dues_structure CASCADE;
DROP TABLE IF EXISTS union_ranks CASCADE;

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS union_rank_id;

-- Remove columns from payments
ALTER TABLE payments DROP COLUMN IF EXISTS collected_by;
ALTER TABLE payments DROP COLUMN IF EXISTS collected_at;
ALTER TABLE payments DROP COLUMN IF EXISTS collection_method;
ALTER TABLE payments DROP COLUMN IF EXISTS collection_notes;
ALTER TABLE payments DROP COLUMN IF EXISTS receipt_number;
ALTER TABLE payments DROP COLUMN IF EXISTS recorded_by;
ALTER TABLE payments DROP COLUMN IF EXISTS recorded_at;
ALTER TABLE payments DROP COLUMN IF EXISTS payment_source;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_monthly_due(UUID);
DROP FUNCTION IF EXISTS get_user_due_info(UUID);
DROP FUNCTION IF EXISTS is_executive_rank(INTEGER);
DROP FUNCTION IF EXISTS get_all_dues_structures();
DROP FUNCTION IF EXISTS generate_receipt_number(INTEGER);
DROP FUNCTION IF EXISTS update_member_due_amount();
DROP FUNCTION IF EXISTS update_union_ranks_updated_at();
```

---

## After Migration

### Assign Ranks to Users

1. Go to `/admin` in your application
2. Click "View" on any user
3. Select their rank from "Union Rank" dropdown
4. The system will auto-calculate their monthly due

### Manage Dues Structure

1. Go to `/admin/dues`
2. Edit any monthly amount
3. Changes take effect immediately for new payments

### Test Payment Flow

1. Student goes to `/payments`
2. Amount is auto-filled based on their scholarship + rank
3. They can see: "Auto-calculated: ¥25/month (csc, Executive)"

---

## Quick Reference Commands

```sql
-- Get a user's calculated due
SELECT calculate_monthly_due('user-uuid-here');

-- Get complete due information
SELECT * FROM get_user_due_info('user-uuid-here');

-- Check if a rank is executive
SELECT is_executive_rank(100); -- TRUE (President)
SELECT is_executive_rank(10);  -- FALSE (Member)

-- View all dues structures
SELECT * FROM get_all_dues_structures();

-- Update a specific due amount
UPDATE dues_structure 
SET monthly_amount = 30.00 
WHERE scholarship_type = 'csc' AND is_executive = TRUE;

-- Assign rank to user
UPDATE users 
SET union_rank_id = (SELECT id FROM union_ranks WHERE rank_name = 'President')
WHERE id = 'user-uuid-here';
```

---

## Migration File Location

📁 **File:** `lsub-management/COMPLETE_SQL_MIGRATION.sql`

**Total Lines:** ~400+  
**Execution Time:** ~2-5 seconds  
**Safe to Re-run:** Yes (uses IF NOT EXISTS and ON CONFLICT)

---

## Support

If you encounter any issues:

1. Check the error message carefully
2. Verify you have the base schema installed
3. Try running individual sections of the migration
4. Contact the development team with the error details

---

**Last Updated:** September 30, 2026  
**Version:** 1.0
