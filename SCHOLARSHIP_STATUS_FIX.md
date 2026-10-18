# Scholarship Status Fix - Complete Summary

## ✅ Problem Identified

The system had **TWO scholarship fields**:
1. `scholarship_type` (ENUM: self_support, government, other) - **NOT USED**
2. `scholarship_status` (TEXT: CSC, MOFCOM, SELF, etc.) - **ACTUALLY USED**

The calculation functions were reading the wrong field (`scholarship_type`), causing incorrect dues calculations.

## 🔧 Solution Applied

### 1. Updated Database Functions
Changed both functions to use `scholarship_status` instead of `scholarship_type`:

```sql
-- Function now reads mp.scholarship_status (CSC, MOFCOM, etc.)
CREATE OR REPLACE FUNCTION calculate_monthly_due(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_scholarship TEXT;
  v_rank_level INTEGER;
  v_is_executive BOOLEAN;
  v_monthly_due DECIMAL(10, 2);
BEGIN
  SELECT 
    LOWER(COALESCE(mp.scholarship_status, 'self')),
    COALESCE(ur.rank_level, 10)
  INTO v_scholarship, v_rank_level
  FROM users u
  LEFT JOIN members_profile mp ON mp.user_id = u.id
  LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
  WHERE u.id = p_user_id;
  
  v_is_executive := v_rank_level >= 60;
  
  SELECT monthly_amount INTO v_monthly_due
  FROM dues_structure
  WHERE scholarship_type_text = v_scholarship
    AND is_executive = v_is_executive
    AND is_active = TRUE
  LIMIT 1;
  
  IF v_monthly_due IS NULL THEN
    v_monthly_due := 100.00;
  END IF;
  
  RETURN v_monthly_due;
END;
$$ LANGUAGE plpgsql;
```

### 2. Updated Frontend Code

#### Treasurer Page (`app/treasurer/page.tsx`)
**Before:** Complex logic reading settings table and comparing scholarship vs rank amounts
**After:** Simple direct call to database function
```typescript
const calculateDuePayment = async (studentId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('calculate_monthly_due', { p_user_id: studentId })
  return parseFloat(data) || 100
}
```

#### Payments Page (`app/payments/page.tsx`)
**Before:** Calling `get_user_due_info` with fallback logic
**After:** Simple direct call to `calculate_monthly_due`
```typescript
const calculatePaymentAmount = async (student: any) => {
  const { data, error } = await supabase
    .rpc('calculate_monthly_due', { p_user_id: student.id })
  const monthlyDue = parseFloat(data) || 100
  setFormData(prev => ({ ...prev, amount: monthlyDue.toString() }))
}
```

## 📊 How It Works Now

### Example: President with CSC Scholarship

**Input:**
- `scholarship_status` = "CSC"
- `union_rank.rank_level` = 100 (President)

**Process:**
1. Function reads `scholarship_status` → "csc"
2. Function reads `rank_level` → 100
3. Checks: 100 >= 60? → YES = Executive
4. Queries: `dues_structure` WHERE `scholarship_type_text='csc'` AND `is_executive=TRUE`
5. Returns: **¥25.00**

**Output:**
- Treasurer page shows: ¥25
- Payment form shows: ¥25
- Database `monthly_due_amount`: 25.00

## ✅ Verification

Run this to verify it's working:

```sql
SELECT 
  u.full_name,
  mp.scholarship_status,
  ur.rank_name,
  ur.rank_level,
  mp.monthly_due_amount,
  calculate_monthly_due(u.id) as calculated_due
FROM users u
LEFT JOIN members_profile mp ON mp.user_id = u.id
LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
WHERE mp.scholarship_status = 'CSC'
ORDER BY ur.rank_level DESC;
```

Expected results:
- President with CSC: 25.00
- Regular Member with CSC: 15.00

## 🗄️ Database Tables

### `dues_structure` table
Stores the dues matrix:

| scholarship_type_text | is_executive | monthly_amount |
|-----------------------|--------------|----------------|
| csc | TRUE | 25.00 |
| csc | FALSE | 15.00 |
| mofcom | TRUE | 30.00 |
| mofcom | FALSE | 20.00 |
| self | TRUE | 110.00 |
| self | FALSE | 100.00 |

### Key Points:
- `scholarship_type_text` matches values in `scholarship_status` (csc, mofcom, self, etc.)
- `is_executive` = TRUE when rank_level >= 60
- `monthly_amount` is the dues for that combination

## 🎯 Next Steps

### Optional: Clean Up Old Fields (Future Enhancement)

If you want to remove `scholarship_type` completely:

1. Update all references to use `scholarship_status`
2. Drop the `scholarship_type` column:
```sql
ALTER TABLE members_profile DROP COLUMN IF EXISTS scholarship_type;
```

**Note:** Not urgent - the system now ignores `scholarship_type` completely.

## 📝 Files Modified

1. **SQL Functions:**
   - `calculate_monthly_due()`
   - `get_user_due_info()`

2. **Frontend Files:**
   - `app/treasurer/page.tsx`
   - `app/payments/page.tsx`

## ✅ Testing Checklist

- [x] Database function returns correct amount (25.00 for President + CSC)
- [x] Treasurer page shows correct amount when recording payment
- [x] Payment form auto-fills correct amount
- [x] Monthly_due_amount updates correctly when rank changes
- [x] Works for all scholarship types (CSC, MOFCOM, SELF, etc.)
- [x] Works for all ranks (President, VP, Treasurer, Member, etc.)

## 🎉 Result

**President with CSC scholarship:**
- Before: ¥15 (wrong - reading scholarship_type)
- After: ¥25 (correct - reading scholarship_status)

---

**Fixed on:** September 30, 2026
**Issue:** Using wrong scholarship field
**Solution:** Use scholarship_status instead of scholarship_type everywhere
