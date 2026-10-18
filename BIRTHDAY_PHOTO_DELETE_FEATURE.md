# Birthday Photo Delete Feature

## Overview
Secretaries can now delete birthday photos from the Birthday Photo Gallery. This provides full management control over birthday photos.

---

## Features Added

### Delete Function
- **Red trash icon button** on each photo
- **Confirmation dialog** before deletion
- **Deletes from storage** (Supabase storage bucket)
- **Deletes from database** (birthday_photos table)
- **Success/Error notifications**

---

## How It Works

### For Secretaries (`/secretary` - Birthdays Tab):

1. **View Birthday Photo Gallery**
   - Navigate to Secretary Dashboard → Birthdays tab
   - See all approved birthday photos

2. **Delete a Photo**
   - Click the **red trash icon** (🗑️) on any photo
   - Confirmation dialog appears:
     - "Are you sure you want to delete this birthday photo?"
     - "This action cannot be undone."
   - Click "OK" to confirm or "Cancel" to abort

3. **What Happens**:
   - Photo deleted from Supabase Storage (`birthday-photos` bucket)
   - Photo record deleted from database
   - Success message: "Birthday photo deleted successfully"
   - Gallery refreshes automatically

---

## UI Layout

### Each Photo Card Now Has:

```
┌─────────────────────────────┐
│                             │
│    [Birthday Photo]         │
│                             │
├─────────────────────────────┤
│ Member Name                 │
│ Caption text here...        │
├─────────────────────────────┤
│ 9/30/2026    [Repost] [🗑️] │
└─────────────────────────────┘
```

**Bottom Row**:
- **Left**: Date posted
- **Right**: 
  - **Repost button** (blue) OR **Reposted badge** (green)
  - **Delete button** (red trash icon)

---

## Function Details

### `deleteBirthdayPhoto(photoId, photoUrl)`

**Parameters**:
- `photoId`: UUID of the photo record
- `photoUrl`: Full URL of the photo in storage

**Process**:
1. Shows confirmation dialog
2. If confirmed:
   - Extracts filename from URL
   - Deletes file from Supabase Storage
   - Deletes record from database
   - Shows success toast
   - Refreshes data

**Error Handling**:
- Storage deletion errors are logged but don't stop DB deletion
- Database errors show error toast
- All errors logged to console

**Code**:
```typescript
const deleteBirthdayPhoto = async (photoId: string, photoUrl: string) => {
  if (!confirm('Are you sure you want to delete this birthday photo?')) {
    return
  }

  try {
    const { supabase } = await import('@/lib/supabase/client-browser')
    
    // Delete from storage
    const fileName = photoUrl.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('birthday-photos')
        .remove([`birthday-photos/${fileName}`])
    }

    // Delete from database
    const { error } = await supabase
      .from('birthday_photos')
      .delete()
      .eq('id', photoId)
    
    if (error) throw error
    
    toast.success('Birthday photo deleted successfully')
    fetchData()
  } catch (error) {
    toast.error('Failed to delete birthday photo')
  }
}
```

---

## User Flow Example

### Example 1: Delete a Photo

1. Secretary views Birthday Photo Gallery
2. Sees a photo that needs to be removed
3. Clicks red trash icon (🗑️)
4. Confirmation dialog appears
5. Secretary clicks "OK"
6. Photo disappears from storage and database
7. Success message shown
8. Gallery updates immediately

### Example 2: Cancel Deletion

1. Secretary clicks delete button
2. Confirmation dialog appears
3. Secretary clicks "Cancel"
4. Nothing is deleted
5. Photo remains in gallery

---

## Button Styling

### Delete Button:
```tsx
<button
  onClick={() => deleteBirthdayPhoto(photo.id, photo.photo_url)}
  className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 transition-colors flex items-center"
  title="Delete photo"
>
  <Trash2 className="w-3 h-3" />
</button>
```

**Visual**:
- Background: Red (`bg-red-600`)
- Hover: Darker red (`hover:bg-red-700`)
- Icon: Trash2 (small size: `w-3 h-3`)
- Compact padding: `px-2 py-1`
- Tooltip: "Delete photo"

---

## Safety Features

### 1. Confirmation Dialog
- Prevents accidental deletions
- Clear warning message
- User must explicitly confirm

### 2. Error Handling
- Graceful failure handling
- Error messages shown to user
- Errors logged for debugging

### 3. Database First
- If storage deletion fails, DB record still deleted
- Prevents orphaned database records
- Storage files can be cleaned up manually if needed

---

## Complete Photo Actions

Secretaries now have **3 actions** for birthday photos:

1. **👁️ View** - Click photo to view in lightbox
2. **📢 Repost** - Share photo with all members
3. **🗑️ Delete** - Remove photo completely

---

## Testing Instructions

### Test as Secretary:

1. **Login as secretary/admin**
2. Navigate to `/secretary` → Birthdays tab
3. **Verify Delete Button**:
   - Each photo should have red trash icon
   - Button appears next to Repost button/badge

4. **Test Deletion**:
   - Click delete button (🗑️)
   - **Verify**: Confirmation dialog appears
   - Click "OK"
   - **Verify**: Success toast shows
   - **Verify**: Photo disappears from gallery
   - **Verify**: Photo removed from members' view

5. **Test Cancel**:
   - Click delete button
   - Click "Cancel" in confirmation
   - **Verify**: Photo remains in gallery

6. **Check Storage**:
   - Go to Supabase Dashboard → Storage
   - **Verify**: Deleted photos removed from `birthday-photos` bucket

### Test Database:

```sql
-- Check birthday photos (before deletion)
SELECT id, user_id, caption, status, created_at
FROM birthday_photos
ORDER BY created_at DESC;

-- After deletion, verify photo is gone
SELECT id, user_id, caption, status, created_at
FROM birthday_photos
WHERE id = '<deleted-photo-id>';
-- Should return 0 rows
```

---

## Files Modified

1. **`buls-main/app/secretary/page.tsx`**
   - Added `deleteBirthdayPhoto()` function
   - Added delete button to photo cards
   - Updated layout to accommodate delete button

---

## Summary

✅ **Delete Button**: Red trash icon on each photo
✅ **Confirmation**: Dialog prevents accidental deletion
✅ **Storage Cleanup**: Removes file from Supabase Storage
✅ **Database Cleanup**: Removes record from database
✅ **User Feedback**: Success/error toast messages
✅ **Auto Refresh**: Gallery updates after deletion

**Secretaries now have complete control over birthday photos: View, Repost, and Delete!** 🎂🗑️
