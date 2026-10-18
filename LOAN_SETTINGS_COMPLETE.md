# Complete Loan Settings Feature ✅

## What Was Added
Two configurable loan eligibility settings:
1. **Dues Clearance Requirement** - Members must clear all outstanding dues
2. **Minimum Membership Duration** - Members must be registered for X months

---

## 🎯 Settings Available

### 1. Dues Clearance (Checkbox)
- **Default**: Enabled (checked)
- **When Enabled**: Members must have no outstanding monthly dues
- **When Disabled**: Members can apply regardless of dues status

### 2. Minimum Membership Months (Number Input)
- **Default**: 3 months
- **Range**: 0-24 months
- **When 0**: No minimum duration required
- **When > 0**: Members must be registered for at least X months

---

## 📋 How It Works

### Settings Modal
```
┌─────────────────────────────────────────────┐
│ Loan Application Settings            [X]    │
│ Configure eligibility requirements...       │
├─────────────────────────────────────────────┤
│                                             │
│ ☑️ Require dues clearance                   │
│    Members must have no outstanding...      │
│                                             │
│ Minimum membership duration                 │
│ Number of months a member must be...        │
│ [  3  ] months                              │
│ Members must be registered for at least...  │
│                                             │
│                      [Cancel] [Save]        │
└─────────────────────────────────────────────┘
```

### Warning Banner (Shows Active Requirements)
```
┌─────────────────────────────────────────────┐
│ ⚠️  Loan Application Requirements           │
│                                             │
│     • Members must clear all outstanding    │
│       monthly dues                          │
│     • Members must be registered for at     │
│       least 3 months                        │
└─────────────────────────────────────────────┘
```

---

## 🎨 UI Features

### Number Input Controls
- **Range**: 0-24 months
- **Auto-validation**: Can't go below 0 or above 24
- **Live preview**: Shows dynamic text below input
- **Singular/Plural**: Automatically shows "month" or "months"

### Examples:
```
Input: 0  → "No minimum membership duration required"
Input: 1  → "Members must be registered for at least 1 month"
Input: 3  → "Members must be registered for at least 3 months"
Input: 12 → "Members must be registered for at least 12 months"
```

---

## 📁 Database Structure

### Table: `system_settings`
```sql
| setting_key              | setting_value | 
|--------------------------|---------------|
| loan_requires_dues_clear | true/false    |
| loan_minimum_months      | 0-24          |
```

---

## 🔧 Member-Side Implementation

When a member tries to apply for a loan, the system should check:

```typescript
// Example implementation for member loan application

const canApplyForLoan = async (userId: string) => {
  const { supabase } = await import('@/lib/supabase/client-browser')
  
  // 1. Fetch settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['loan_requires_dues_clear', 'loan_minimum_months'])
  
  const requiresDues = settings?.find(s => s.setting_key === 'loan_requires_dues_clear')?.setting_value === 'true'
  const minimumMonths = parseInt(settings?.find(s => s.setting_key === 'loan_minimum_months')?.setting_value || '0')
  
  // 2. Check dues if required
  if (requiresDues) {
    const { data: unpaidDues } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
    
    if (unpaidDues && unpaidDues.length > 0) {
      return {
        canApply: false,
        reason: 'You have unpaid monthly dues. Please clear all dues before requesting a loan.'
      }
    }
  }
  
  // 3. Check membership duration if required
  if (minimumMonths > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single()
    
    if (user) {
      const monthsSinceRegistration = Math.floor(
        (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
      
      if (monthsSinceRegistration < minimumMonths) {
        return {
          canApply: false,
          reason: `You must be a member for at least ${minimumMonths} ${minimumMonths === 1 ? 'month' : 'months'} before applying for a loan. You have been a member for ${monthsSinceRegistration} ${monthsSinceRegistration === 1 ? 'month' : 'months'}.`
        }
      }
    }
  }
  
  return { canApply: true }
}
```

---

## 💾 SQL Migration (Updated)

Run this SQL in Supabase to create/update the table:

```sql
-- Create system_settings table for loan requirements

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default loan requirement settings
INSERT INTO system_settings (setting_key, setting_value)
VALUES 
  ('loan_requires_dues_clear', 'true'),
  ('loan_minimum_months', '3')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key 
ON system_settings(setting_key);
```

---

## ✅ Testing Checklist

### Initial Setup:
- [ ] Run updated SQL migration
- [ ] Refresh browser at `/secretary`
- [ ] Click "Loans" tab
- [ ] See warning banner with 2 requirements

### Settings Modal:
- [ ] Click "Loan Settings" button
- [ ] Modal opens with 2 settings sections
- [ ] Dues checkbox is checked (default)
- [ ] Minimum months shows 3 (default)

### Test Dues Toggle:
- [ ] Uncheck dues clearance
- [ ] Click "Save Settings"
- [ ] Success toast appears
- [ ] Warning banner updates (only shows months requirement)
- [ ] Check again and save
- [ ] Both requirements show in banner

### Test Months Input:
- [ ] Change months to 0
- [ ] See text: "No minimum membership duration required"
- [ ] Save settings
- [ ] Banner shows only dues requirement
- [ ] Change months to 6
- [ ] See text: "at least 6 months"
- [ ] Save settings
- [ ] Banner shows "at least 6 months"

### Test Number Input Validation:
- [ ] Try typing -1 → automatically becomes 0
- [ ] Try typing 100 → automatically becomes 24
- [ ] Try typing text → reverts to previous valid value

### Test Persistence:
- [ ] Set both settings to specific values
- [ ] Save and close modal
- [ ] Refresh entire page
- [ ] Reopen settings modal
- [ ] Values are still saved ✅

---

## 🎯 Common Scenarios

### Scenario 1: Strict Policy
**Settings**:
- ✅ Dues clearance required
- Minimum months: 6

**Result**: Only members with 6+ months membership AND no unpaid dues can apply

### Scenario 2: Flexible Policy
**Settings**:
- ❌ Dues clearance not required
- Minimum months: 0

**Result**: All members can apply immediately

### Scenario 3: New Member Protection
**Settings**:
- ❌ Dues clearance not required
- Minimum months: 3

**Result**: Members must wait 3 months, but dues don't matter

### Scenario 4: Financial Responsibility
**Settings**:
- ✅ Dues clearance required
- Minimum months: 0

**Result**: Members must have clear dues, but no waiting period

---

## 🎉 Summary

**Status**: ✅ **COMPLETE**

Loan settings now include:
- ✅ Dues clearance toggle (checkbox)
- ✅ Minimum membership months (0-24 number input)
- ✅ Smart warning banner showing active requirements
- ✅ Both settings save to database
- ✅ Professional UI with live preview
- ✅ Input validation (0-24 range)
- ✅ Singular/plural text handling
- ✅ Updated SQL migration

**Next Steps:**
1. Run the updated SQL migration
2. Refresh browser and test settings
3. Implement validation on member loan application page
4. Test both requirements working together

Ready to use! 🚀
