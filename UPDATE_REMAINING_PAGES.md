# Quick Guide: Update Remaining Pages to Use Supabase Auth

## Files That Still Need Updating

All files in the following list currently import from `@clerk/nextjs` and need to be updated:

1. `/app/payments/page.tsx`
2. `/app/loans/page.tsx`
3. `/app/events/page.tsx`
4. `/app/announcements/page.tsx`
5. `/app/birthdays/page.tsx`
6. `/app/settings/page.tsx`
7. `/app/admin/page.tsx`
8. `/app/admin/register/page.tsx`
9. `/app/admin/ranks/page.tsx`
10. `/app/admin/dues/page.tsx`
11. `/app/finance/page.tsx`
12. `/app/treasurer/page.tsx`
13. `/app/treasurer/page-backup.tsx`
14. `/app/secretary/page.tsx`
15. `/app/payment-history/page.tsx`
16. `/app/test-user/page.tsx`

## Simple Find & Replace

For each file, make these changes:

### 1. Update Import Statement

**Find:**
```typescript
import { useAuth } from '@clerk/nextjs'
```

**Replace with:**
```typescript
import { useAuth } from '@/components/AuthProvider'
```

### 2. Update Usage in Component

**Find:**
```typescript
const { userId } = useAuth()
```

**Replace with:**
```typescript
const { user: authUser } = useAuth()
```

**Then find all instances of:**
```typescript
userId
```

**Replace with:**
```typescript
authUser?.id
```

### 3. For Settings Page (has useUser)

**Find:**
```typescript
import { useAuth, useUser } from '@clerk/nextjs'
```

**Replace with:**
```typescript
import { useAuth } from '@/components/AuthProvider'
```

**Then find:**
```typescript
const { user } = useUser()
```

**Replace with:**
```typescript
const { user: authUser } = useAuth()
```

**And update references:**
```typescript
user?.primaryEmailAddress?.emailAddress
```

**Replace with:**
```typescript
authUser?.email
```

## Database Query Updates

Some pages query the database using `clerk_id`. Update these queries:

**Find:**
```typescript
.eq('clerk_id', userId)
```

**Replace with:**
```typescript
.eq('id', authUser?.id)
```

## Example: Full Page Update

### Before (Clerk):
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'

export default function PaymentsPage() {
  const { userId } = useAuth()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    const { supabase } = await import('@/lib/supabase/client-browser')
    
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()
    
    setUser(userData)
  }

  // ... rest of component
}
```

### After (Supabase):
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import DashboardLayout from '@/components/DashboardLayout'

export default function PaymentsPage() {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (authUser) {
      fetchData()
    }
  }, [authUser])

  const fetchData = async () => {
    const { supabase } = await import('@/lib/supabase/client-browser')
    
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    setUser(userData)
  }

  // ... rest of component
}
```

## Batch Update Command (Optional)

If you're comfortable with command line:

```bash
# From project root
find app -name "*.tsx" -type f -exec sed -i '' 's/@clerk\/nextjs/@\/components\/AuthProvider/g' {} +
```

**Warning**: This only updates the import. You'll still need to manually update the destructuring and usage.

## Testing Each Page

After updating each page:
1. Start the dev server: `npm run dev`
2. Navigate to the page
3. Check for console errors
4. Verify the page loads correctly
5. Test any user-specific functionality

## Common Issues

### Issue: "Cannot read property 'id' of null"
**Solution**: Add null checks when using authUser:
```typescript
if (!authUser) return

// or

authUser?.id
```

### Issue: useEffect infinite loop
**Solution**: Add authUser to dependency array:
```typescript
useEffect(() => {
  if (authUser) {
    fetchData()
  }
}, [authUser])
```

### Issue: "user is not defined"
**Solution**: Rename local variables that conflict with authUser:
```typescript
const { user: authUser } = useAuth()  // Auth user from Supabase
const [userData, setUserData] = useState(null)  // User data from database
```

## Priority Order

Update in this order for best results:
1. Payments page (most used)
2. Dashboard-related pages
3. Admin pages
4. Test pages last

## Need Help?

If you encounter issues:
1. Check the console for specific error messages
2. Compare with `dashboard/page.tsx` (already updated)
3. Verify imports and destructuring match examples above
