# Union Ranks - Quick Implementation

## ✅ What's New

**Union Ranks System** allows you to:
- Assign positions to members (President, VP, Treasurer, etc.)
- Create custom ranks (Event Coordinator, Assistant Secretary, etc.)
- Track rank hierarchy (Level 100 = President, Level 10 = Member)
- Display official titles on member profiles

---

## 🚀 How to Implement

### Step 1: Run Database Migration
```bash
# Open Supabase SQL Editor
# Run: COMPLETE_MIGRATION_WITH_RANKS.sql
```

### Step 2: Access Rank Management
```
Login as Admin or Secretary
Navigate to: http://localhost:3000/admin/ranks
```

### Step 3: Create/Manage Ranks
- Click "Create New Rank"
- Fill in name, level, description
- Submit

### Step 4: Assign Ranks to Members
```
Go to /admin
Find member in user list
Click rank dropdown
Select rank
```

---

## 📋 Default Ranks Included

| Rank | Level | 
|------|-------|
| President | 100 |
| Vice President | 90 |
| Treasurer | 80 |
| Finance Secretary | 70 |
| General Secretary | 70 |
| Secretary | 60 |
| Member | 10 |

---

## 🎨 UI Locations

1. **Rank Management Page**: `/admin/ranks`
   - Create, edit, delete ranks
   
2. **Admin User List**: `/admin`
   - Assign ranks via dropdown
   
3. **Secretary Directory**: `/secretary`
   - View and assign ranks
   
4. **Member Profile**: `/dashboard`
   - Displays assigned rank

---

## ✨ Example Custom Ranks

```
Assistant Treasurer
Level: 75
Description: Supports Treasurer with financial duties

Event Coordinator  
Level: 50
Description: Manages union events and activities

Public Relations Officer
Level: 55
Description: Handles external communications
```

---

## 🔐 Permissions

- ✅ **Admin** can manage ranks
- ✅ **Secretary** can manage ranks
- ❌ Others cannot manage ranks

---

## 📊 Database Fields

**union_ranks table:**
- rank_name (unique)
- rank_level (1-100)
- description
- permissions (JSONB for future use)

**users table addition:**
- union_rank_id (foreign key)

---

## 🎯 Benefits

✅ Official titles for members  
✅ Clear hierarchy  
✅ Customizable positions  
✅ Professional appearance  
✅ Searchable by rank  

---

**Status:** ✅ Ready to implement  
**File:** Run `COMPLETE_MIGRATION_WITH_RANKS.sql`  
**Access:** `/admin/ranks` after migration
