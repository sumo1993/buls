# Update Admin Navigation for QR Codes

To add QR Codes link to the admin sidebar, update `components/DashboardLayout.tsx`:

## Find the NAVIGATION_ITEMS array (around line 40-50)

Add this item after 'Manage Dues':
```typescript
{ name: 'QR Codes', href: '/admin/qr-codes', icon: QrCode, roles: ['admin'] },
```

## Also add the QrCode import at the top

In the imports section, add `QrCode` to the list:
```typescript
import { 
  LayoutDashboard, 
  CreditCard,
  // ... other icons
  QrCode,  // <- Add this
  // ... other icons
} from 'lucide-react'
```

## Full updated NAVIGATION_ITEMS example:
```typescript
const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Registration', href: '/registration', icon: User, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['admin'] },
  { name: 'Manage Ranks', href: '/admin/ranks', icon: Users, roles: ['admin', 'secretary'] },
  { name: 'Manage Dues', href: '/admin/dues', icon: CreditCard, roles: ['admin'] },
  { name: 'QR Codes', href: '/admin/qr-codes', icon: QrCode, roles: ['admin'] },
  { name: 'Finance Panel', href: '/finance', icon: FileText, roles: ['admin', 'finance'] },
  { name: 'Treasurer Panel', href: '/treasurer', icon: Banknote, roles: ['admin', 'treasurer'] },
  // ... rest of items
] as const
```
