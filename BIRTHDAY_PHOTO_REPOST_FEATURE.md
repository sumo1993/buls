# Birthday Photo Repost Feature

## Overview
Secretaries can now repost birthday photos so that ALL members can see them on the Birthdays page. This creates a shared birthday gallery visible to the entire organization.

---

## Features Added

### 1. **Secretary Can Repost Birthday Photos**
- Secretaries view approved birthday photos in their dashboard
- Each photo has a "Repost" button
- Once reposted, the photo becomes visible to all members
- Reposted photos show a green "Reposted" badge

### 2. **Members See Only Reposted Photos**
- Members visit `/birthdays` page
- They see ONLY photos that secretaries have reposted
- This filters out private birthday photos
- Creates a curated public birthday gallery

### 3. **Database Tracking**
- Tracks which photos are reposted
- Records who reposted (secretary ID)
- Records when it was reposted (timestamp)

---

## Database Changes

### New Columns Added to `birthday_photos` Table:

```sql
is_reposted     BOOLEAN          -- Whether photo is reposted (default: FALSE)
reposted_by     UUID            -- User ID of secretary who reposted
reposted_at     TIMESTAMP       -- When the photo was reposted
```

### Migration Script:
Run the SQL file: `ADD_BIRTHDAY_PHOTO_REPOST.sql`

```bash
# Apply migration to database
psql -h <host> -U <user> -d <database> -f ADD_BIRTHDAY_PHOTO_REPOST.sql
```

---

## How It Works

### For Secretaries (`/secretary` - Birthdays Tab):

1. **View Approved Photos**
   - Navigate to Secretary Dashboard → Birthdays tab
   - See "Birthday Photo Gallery" section
   - All approved photos are displayed

2. **Repost a Photo**
   - Click the blue "Repost" button on any photo
   - Photo is marked as reposted
   - Success message: "Birthday photo reposted! All members can now see it."
   - Button changes to green "Reposted" badge

3. **Visual Indicators**
   - **Not Reposted**: Blue "Repost" button with megaphone icon
   - **Already Reposted**: Green "Reposted" badge with megaphone icon

### For Members (`/birthdays` page):

1. **View Public Birthday Gallery**
   - Navigate to Birthdays page
   - See "Birthday Gallery" section
   - Only reposted photos appear here

2. **What Members See**
   - Member name and profile picture
   - Birthday photo
   - Birthday date
   - Caption (if provided)
   - Upload timestamp

3. **If No Photos Reposted**
   - Shows empty state message
   - "No birthday photos yet"
   - "Be the first to share your birthday celebration!"

---

## UI Components

### Secretary Birthday Photo Gallery

**Layout**: 3-column responsive grid

**Each Photo Card Shows**:
- **Photo**: Large image (h-48, full width)
- **Name**: Member's full name
- **Caption**: Birthday message (if provided)
- **Date**: Posted date
- **Status Button**:
  - If not reposted: Blue "Repost" button
  - If reposted: Green "Reposted" badge

**Code Structure**:
```tsx
<button
  onClick={() => repostBirthdayPhoto(photo.id)}
  className="bg-blue-600 text-white px-3 py-1 rounded-lg"
>
  <Megaphone className="w-3 h-3" />
  <span>Repost</span>
</button>

// OR

<span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
  <Megaphone className="w-3 h-3 mr-1" />
  Reposted
</span>
```

### Member Birthday Gallery

**Layout**: 3-column responsive grid

**Each Photo Card Shows**:
- **Photo**: Large image (h-64)
- **Profile Picture**: Circular avatar
- **Name**: Member's full name
- **Birthday Date**: With calendar icon
- **Caption**: Birthday message (italic)
- **Upload Date**: Small gray text

---

## API/Functions

### `repostBirthdayPhoto(photoId: string)`

**Location**: `buls-main/app/secretary/page.tsx`

**Purpose**: Mark a birthday photo as reposted

**Process**:
1. Updates `birthday_photos` table
2. Sets `is_reposted = true`
3. Sets `reposted_by = current_user_id`
4. Sets `reposted_at = current_timestamp`
5. Shows success toast
6. Refreshes data

**Code**:
```typescript
const repostBirthdayPhoto = async (photoId: string) => {
  const { supabase } = await import('@/lib/supabase/client-browser')
  
  const { error } = await supabase
    .from('birthday_photos')
    .update({ 
      is_reposted: true,
      reposted_by: user.id,
      reposted_at: new Date().toISOString()
    })
    .eq('id', photoId)
  
  if (error) throw error
  
  toast.success('Birthday photo reposted! All members can now see it.')
  fetchData()
}
```

### Fetch Reposted Photos (Members)

**Location**: `buls-main/app/birthdays/page.tsx`

**Query**:
```typescript
const { data: photosData } = await supabase
  .from('birthday_photos')
  .select('*, users:user_id(full_name, email)')
  .eq('status', 'approved')
  .eq('is_reposted', true)
  .order('reposted_at', { ascending: false })
```

**Filters**:
- Status = 'approved' (only approved photos)
- is_reposted = true (only reposted photos)
- Ordered by reposted_at (newest first)

### Fetch All Approved Photos (Secretary)

**Location**: `buls-main/app/secretary/page.tsx`

**Query**:
```typescript
const { data: photosData } = await supabase
  .from('birthday_photos')
  .select('*, users:user_id(full_name, email)')
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
```

---

## User Flow Examples

### Example 1: Secretary Reposts a Photo

1. Joe uploads his birthday photo
2. Secretary approves the photo
3. Photo appears in "Birthday Photo Gallery" (secretary view)
4. Secretary clicks "Repost" button
5. Success message appears
6. Button changes to green "Reposted" badge
7. Photo now visible to ALL members on `/birthdays` page

### Example 2: Member Views Birthday Gallery

1. Member navigates to `/birthdays` page
2. Sees "Birthday Gallery" section
3. Only reposted photos are displayed
4. Member can click on photo to open lightbox
5. See member's name, birthday date, caption

### Example 3: No Photos Reposted Yet

1. Secretary has approved some photos but hasn't reposted any
2. Member visits `/birthdays` page
3. Sees empty state:
   - Cake icon
   - "No birthday photos yet"
   - "Be the first to share your birthday celebration!"

---

## Benefits

### 1. **Privacy Control**
- Not all birthday photos are public by default
- Secretary curates which photos to share
- Members have control over privacy

### 2. **Community Building**
- Shared birthday gallery creates community spirit
- Celebrates members publicly
- Encourages participation

### 3. **Content Moderation**
- Secretary reviews before reposting
- Ensures appropriate content
- Maintains professional standards

### 4. **Engagement**
- Members are motivated to upload photos
- Knowing photos can be featured publicly
- Creates shared experiences

---

## Testing Instructions

### Test as Secretary:

1. **Login as secretary/admin**
2. Navigate to `/secretary` → Birthdays tab
3. **Verify**:
   - See "Birthday Photo Gallery" section
   - Approved photos are listed
   - Each photo has "Repost" button OR "Reposted" badge

4. **Test Repost**:
   - Click "Repost" button on a photo
   - **Verify**: Success toast appears
   - **Verify**: Button changes to green "Reposted" badge
   - **Verify**: Photo appears on members' birthdays page

### Test as Member:

1. **Login as regular member**
2. Navigate to `/birthdays` page
3. **Verify**:
   - See "Birthday Gallery" section
   - Only reposted photos are shown
   - Can click on photos to view in lightbox

4. **Test Empty State**:
   - If no photos reposted
   - **Verify**: Empty state message displays
   - **Verify**: Cake icon and friendly message shown

### Test Database:

```sql
-- Check reposted photos
SELECT id, caption, is_reposted, reposted_by, reposted_at
FROM birthday_photos
WHERE is_reposted = TRUE;

-- Check who reposted
SELECT 
  bp.id,
  bp.caption,
  u.full_name AS reposted_by_name,
  bp.reposted_at
FROM birthday_photos bp
LEFT JOIN users u ON bp.reposted_by = u.id
WHERE bp.is_reposted = TRUE;
```

---

## Files Modified

1. **`buls-main/app/secretary/page.tsx`**
   - Added `repostBirthdayPhoto()` function
   - Updated birthday photo gallery UI
   - Added repost button/badge
   - Added fetch of birthday photos in fetchData()

2. **`buls-main/app/birthdays/page.tsx`**
   - Updated query to filter only reposted photos
   - Shows only `is_reposted = true` photos
   - Simplified photo fetching with joins

3. **`buls-main/ADD_BIRTHDAY_PHOTO_REPOST.sql`** (NEW)
   - Migration script for database changes
   - Adds repost columns
   - Creates indexes

---

## Summary

✅ **Secretary Can Repost**: Blue "Repost" button on approved photos
✅ **Reposted Badge**: Green badge shows which photos are reposted  
✅ **Members See Reposted**: Only reposted photos appear on `/birthdays`
✅ **Database Tracking**: Tracks repost status, who reposted, when
✅ **Privacy Control**: Secretary curates public birthday gallery
✅ **Better UI**: Responsive 3-column grid, better photo cards

**Members can now celebrate birthdays together with a shared, curated gallery!** 🎂🎉
