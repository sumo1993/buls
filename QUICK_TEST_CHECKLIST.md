# ⚡ Quick Test Checklist - Batch Payment System

## 🚀 Before You Start

### 1. RUN THIS SQL FIRST! (Required)
```bash
# Open Supabase Dashboard → SQL Editor → New Query
# Copy and paste contents from: database/ADD_BATCH_TRACKING.sql
# Click "Run"
```

**Why?** Adds `batch_id`, `batch_size`, `batch_sequence` columns to payments table.

---

## ✅ What Changed (Visual Summary)

### Modal Width
- **Before**: `max-w-4xl` (narrow)
- **After**: `max-w-6xl` (wider) ✅

### Month Selection
- **Before**: Ctrl+Click checkboxes (confusing)
- **After**: Two dropdowns "From → To" (like booking flights) ✅

### Amount Display
- **Before**: Only shows ¥10 (per-month)
- **After**: Shows **¥10 × 7 = ¥70.00** in big green box ✅

### Period Display in Tables
- **Before**: 7 separate rows
- **After**: One row showing "01-2026 to 07-2026 (7)" ✅

---

## 🧪 Quick Test (30 seconds)

1. **Open Cash Payment Modal**
   - Click "Record Cash Payment" button

2. **Select Student**
   - Choose any active student

3. **Select Date Range**
   - From Month: January
   - To Month: July

4. **Verify You See:**
   ```
   ┌─────────────────────────────────────────┐
   │  Payment Calculation                    │
   │  ¥10 × 7 months                         │
   │                          Total: ¥70.00  │
   └─────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────┐
   │  Selected Range       Total Months: 7   │
   │  January to July 2026                   │
   │  Months: January, February, March...    │
   └─────────────────────────────────────────┘
   ```

5. **Submit Payment**

6. **Check Result:**
   - Look at "Collected Payments" table
   - Should show: **"01-2026 to 07-2026 (7)"** with badge

---

## 🎯 Expected Results

| Test | Expected |
|------|----------|
| Select Jan-Jan (1 month) | ¥10 × 1 = ¥10.00 |
| Select Jan-Jul (7 months) | ¥10 × 7 = ¥70.00 |
| Display format | "01-2026 to 07-2026 (7)" |
| Database records | 7 individual payments |
| Total revenue | Previous + ¥70 |

---

## 🔴 Common Issues

### ❌ "Column batch_id does not exist"
**Fix**: Run the SQL migration in Supabase!

### ❌ "Amount still shows ¥10"
**Fix**: Make sure you selected BOTH From and To months

### ❌ "Can't select multiple months"
**Fix**: Use the two dropdowns, not Ctrl+Click

### ❌ "Modal too small"
**Fix**: Changes already applied, refresh page

---

## 📸 Visual Indicators (Success)

✅ **Modal is wider** (you can tell immediately)
✅ **Two dropdowns** visible side-by-side
✅ **Green calculation box** with big ¥70.00
✅ **Blue summary box** showing month range
✅ **Period shows as range** in table (not 7 rows)

---

## 🎓 How It Works (Simple Explanation)

```
User selects: January → July (7 months)
              ↓
System calculates: ¥10 × 7 = ¥70
              ↓
Creates 7 database records (1 per month)
              ↓
Groups them with same batch_id
              ↓
UI displays as: "01-2026 to 07-2026 (7)"
```

**Result**: Clean display + full audit trail! 🎉

---

## 📋 Files Changed

1. `app/treasurer/page.tsx`
   - Modal width: `max-w-6xl`
   - Calculation box added
   - Range selector implemented

2. `database/ADD_BATCH_TRACKING.sql`
   - Ready to run in Supabase
   - Adds batch tracking columns

---

## ⏱️ 1-Minute Verification

```bash
# 1. Start server (if not running)
npm run dev

# 2. Open browser
http://localhost:3000/treasurer

# 3. Click "Record Cash Payment"

# 4. Check these 3 things:
#    - Modal is wider? ✅
#    - Two dropdowns visible? ✅
#    - Calculation shows ¥10 × X months? ✅

# 5. Select Jan-Jul, should show ¥70.00

# Done! 🎉
```

---

**Quick Access**: 
- Full guide: `BATCH_PAYMENT_SETUP_GUIDE.md`
- SQL file: `database/ADD_BATCH_TRACKING.sql`
- Code: `app/treasurer/page.tsx`
