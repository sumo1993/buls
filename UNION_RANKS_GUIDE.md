# Union Ranks System - Implementation Guide

## Overview
The Union Ranks system allows you to assign positions/titles to members (President, Vice President, Treasurer, etc.) and create custom ranks as needed.

---

## Default Union Ranks

The system comes with these pre-configured ranks:

| Rank | Level | Description |
|------|-------|-------------|
| President | 100 | Union President - Highest authority |
| Vice President | 90 | Union Vice President - Second in command |
| Treasurer | 80 | Union Treasurer - Financial officer |
| Finance Secretary | 70 | Finance Secretary - Financial records |
| General Secretary | 70 | General Secretary - Administrative head |
| Secretary | 60 | Secretary - Administrative support |
| Member | 10 | Regular Union Member |

---

## Who Can Manage Ranks?

✅ **Admin** - Can create, edit, delete ranks  
✅ **Secretary** - Can create, edit, delete ranks  
❌ **Other roles** - Cannot manage ranks  

---

## How to Use

### Access Rank Management

**Option 1: Via Admin Panel**
1. Login as Admin or Secretary
2. Go to `/admin/ranks`
3. View, create, edit, or delete ranks

**Option 2: Direct URL**
- Navigate to: `http://localhost:3000/admin/ranks`

---

### Create New Rank

1. Click **"Create New Rank"** button
2. Fill in:
   - **Rank Name** (required) - e.g., "Assistant Treasurer"
   - **Rank Level** (1-100) - Higher = more authority
   - **Description** (optional) - Responsibilities

3. Click **"Create Rank"**

**Examples:**
```
Rank: Assistant Treasurer
Level: 75
Description: Assists Treasurer with financial duties
```

```
Rank: Event Coordinator
Level: 50
Description: Manages union events and activities
```

---

### Edit Existing Rank

1. Find the rank in the list
2. Click **"Edit"** button
3. Update name, level, or description
4. Click **"Update Rank"**

---

### Delete Rank

1. Find the rank in the list
2. Click **"Delete"** button
3. Confirm deletion

**Note:** Cannot delete if members are assigned to that rank.

**Default ranks cannot be deleted** (President, VP, Treasurer, etc.)

---

## Assigning Ranks to Members

### Via Admin Panel

1. Go to `/admin` (main admin panel)
2. Find the member in the user list
3. Click **"Assign Rank"** dropdown
4. Select the rank
5. Rank is immediately assigned

### Via Secretary Panel

1. Go to `/secretary`
2. Find member in directory
3. Click **"Assign Rank"**
4. Select rank from dropdown

---

## Rank Hierarchy System

### How Levels Work

- **100** = Highest (President)
- **90** = Vice President
- **80** = Treasurer
- **70** = Secretaries
- **60** = Supporting roles
- **10** = Member (lowest)

**Usage:**
- Higher levels have more authority
- System can use levels for permissions
- Display in order by rank_level

---

## Database Structure

### `union_ranks` Table

```sql
id              UUID (Primary Key)
rank_name       TEXT (Unique)
rank_level      INTEGER (1-100)
description     TEXT
permissions     JSONB
created_by      UUID
created_at      TIMESTAMP
updated_at      TIMESTAMP
is_active       BOOLEAN
```

### `users` Table Addition

```sql
union_rank_id   UUID (Foreign Key → union_ranks.id)
```

---

## API Endpoints

### Get All Ranks
```
GET /api/ranks
Response: { ranks: [...] }
```

### Create Rank (Admin/Secretary only)
```
POST /api/admin/ranks
Body: { rank_name, rank_level, description }
```

### Assign Rank to User
```
POST /api/admin/assign-rank
Body: { targetUserId, rankId }
```

---

## UI Locations

### Rank Management Page
- **URL:** `/admin/ranks`
- **Access:** Admin, Secretary
- **Features:** Create, edit, delete ranks

### Admin User List
- **URL:** `/admin`
- **Features:** Assign ranks to users via dropdown

### Secretary Member Directory
- **URL:** `/secretary`
- **Features:** View member ranks, assign ranks

### User Profile
- **Displays:** User's assigned rank
- **Shows:** Rank badge and level

---

## Example Scenarios

### Scenario 1: Create "Assistant Secretary"

1. Admin goes to `/admin/ranks`
2. Clicks "Create New Rank"
3. Enters:
   - Name: "Assistant Secretary"
   - Level: 55
   - Description: "Supports Secretary with administrative tasks"
4. Clicks "Create Rank"
5. New rank appears in list

### Scenario 2: Assign President

1. Admin goes to `/admin`
2. Finds user "John Doe"
3. Clicks rank dropdown
4. Selects "President"
5. John now has President rank

### Scenario 3: Member View

1. Member logs in
2. Goes to `/dashboard`
3. Sees profile card showing:
   - Name: John Doe
   - Union Rank: President
   - Level: 100

---

## Permissions by Rank (Future Enhancement)

The `permissions` JSONB field can store:

```json
{
  "can_approve_payments": true,
  "can_create_events": true,
  "can_manage_members": false,
  "max_loan_amount": 500
}
```

---

## Benefits

✅ **Flexible** - Create unlimited custom ranks  
✅ **Hierarchical** - Clear authority levels  
✅ **Searchable** - Filter members by rank  
✅ **Professional** - Official titles for members  
✅ **Organized** - Clear structure  

---

## Testing Checklist

- [ ] Run SQL migration
- [ ] Check `/admin/ranks` page loads
- [ ] Create a test rank
- [ ] Edit a test rank
- [ ] Assign rank to a member
- [ ] Verify rank displays on profile
- [ ] Delete test rank (if no members assigned)

---

## SQL Migration

Run this in Supabase SQL Editor:
- File: `database/migration_union_ranks.sql`

Or use the complete migration:
- File: `COMPLETE_MIGRATION_WITH_RANKS.sql`

---

## Next Steps After Implementation

1. **Assign existing officers:**
   - Assign President rank
   - Assign Vice President rank
   - Assign Treasurer rank
   - Assign Secretaries

2. **Create custom ranks** (if needed):
   - Event Coordinator
   - Assistant Treasurer
   - Committee Heads
   - etc.

3. **Update permissions** (future):
   - Define what each rank can do
   - Set access levels
   - Configure workflows

---

**Status:** ✅ Ready to implement
**Migration:** Run SQL → Access `/admin/ranks`
