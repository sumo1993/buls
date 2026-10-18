# QR Code Management System

## Overview
This system allows admins to upload and manage payment QR codes (WeChat, Alipay, Bank Transfer) and grant access to other roles (treasurer, secretary, finance) to upload their own QR codes.

## Files Created

### 1. Database Migration: `CREATE_QR_CODE_MANAGEMENT.sql`
- Creates `qr_codes` table with the following columns:
  - `id` - UUID primary key
  - `role` - Role that owns the QR code (admin, treasurer, secretary, finance)
  - `qr_code_url` - Base64-encoded QR code image or URL
  - `payment_method` - Type of payment method (wechat, alipay, bank_transfer)
  - `title` - Optional title
  - `description` - Optional description
  - `created_by` - User who created it
  - `created_at` and `updated_at` - Timestamps

### 2. API Endpoint: `app/api/qr-codes/route.ts`
- `GET` - Get all QR codes for the current user's role
- `POST` - Upload a new QR code
- `PUT` - Update an existing QR code
- `DELETE` - Delete a QR code

### 3. React Component: `components/QrCodeManagement.tsx`
- Full-featured QR code management UI
- Upload new QR codes with file picker or URL
- Role-based access control
- Display grid of uploaded QR codes
- Delete functionality

## Integration Steps

### Step 1: Run the Database Migration
```sql
-- Run this SQL in your Supabase SQL editor
-- File: CREATE_QR_CODE_MANAGEMENT.sql
```

### Step 2: Add Import to Admin Page
```tsx
// In app/admin/page.tsx, add QrCode to imports
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Users as UsersIcon, 
  UserPlus, 
  Eye, 
  User, 
  Upload,
  QrCode  // <- Add this
} from 'lucide-react'
```

### Step 3: Add State Variables
Add these state variables to the admin page:
```tsx
// QR Codes state
const [qrCodes, setQrCodes] = useState<any[]>([])
const [showQrModal, setShowQrModal] = useState(false)
const [qrCodeForm, setQrCodeForm] = useState({
  role: 'admin' as 'admin' | 'treasurer' | 'secretary' | 'finance',
  qr_code_url: '',
  payment_method: 'wechat' as 'wechat' | 'alipay' | 'bank_transfer',
  title: '',
  description: '',
  selectedFile: null as File | null
})
const [uploadingQr, setUploadingQr] = useState(false)
```

### Step 4: Add Functions
Add these functions to the admin page:

```tsx
// Fetch QR codes
const fetchQrCodes = async () => {
  try {
    const response = await fetch('/api/qr-codes')
    const data = await response.json()
    if (response.ok) {
      setQrCodes(data.qrCodes)
    }
  } catch (error) {
    console.error('Error fetching QR codes:', error)
    toast.error('Failed to load QR codes')
  }
}

// Handle QR code upload
const handleQrUpload = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!qrCodeForm.qr_code_url && !qrCodeForm.selectedFile) {
    toast.error('Please select a QR code image or enter a URL')
    return
  }

  setUploadingQr(true)
  try {
    let qrCodeUrl = qrCodeForm.qr_code_url

    // If file selected, upload it first
    if (qrCodeForm.selectedFile) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        qrCodeUrl = event.target?.result as string
        await submitQrCode(qrCodeUrl)
      }
      reader.readAsDataURL(qrCodeForm.selectedFile)
      return
    } else {
      await submitQrCode(qrCodeUrl)
    }
  } catch (error) {
    console.error('Error uploading QR code:', error)
    toast.error('Failed to upload QR code')
    setUploadingQr(false)
  }
}

const submitQrCode = async (qrCodeUrl: string) => {
  try {
    const response = await fetch('/api/qr-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: qrCodeForm.role,
        qr_code_url: qrCodeUrl,
        payment_method: qrCodeForm.payment_method,
        title: qrCodeForm.title,
        description: qrCodeForm.description
      })
    })

    const data = await response.json()

    if (response.ok) {
      toast.success('QR code uploaded successfully!')
      setShowQrModal(false)
      fetchQrCodes()
      setQrCodeForm({
        role: 'admin',
        qr_code_url: '',
        payment_method: 'wechat',
        title: '',
        description: '',
        selectedFile: null
      })
    } else {
      toast.error(data.error || 'Failed to upload QR code')
    }
  } catch (error) {
    console.error('Error submitting QR code:', error)
    toast.error('Failed to upload QR code')
  } finally {
    setUploadingQr(false)
  }
}

// Handle QR code delete
const handleQrDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this QR code?')) return

  try {
    const response = await fetch('/api/qr-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    if (response.ok) {
      toast.success('QR code deleted successfully!')
      fetchQrCodes()
    } else {
      toast.error('Failed to delete QR code')
    }
  } catch (error) {
    console.error('Error deleting QR code:', error)
    toast.error('Failed to delete QR code')
  }
}
```

### Step 5: Add useEffect to Fetch QR Codes
Add this to the existing useEffect:
```tsx
useEffect(() => {
  if (isLoaded && isSignedIn && clerkUser) {
    fetchData()
  }
}, [isLoaded, isSignedIn, clerkUser])

// Add fetchQrCodes() call after fetchData() in fetchData function
```

### Step 6: Add Tab Button
Add this button in the tab navigation (after 'Files' tab):
```tsx
<button
  onClick={() => setActiveTab('qr-codes')}
  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
    activeTab === 'qr-codes'
      ? 'border-[#D62828] text-[#D62828]'
      : 'border-transparent text-gray-500 hover:text-gray-700'
  }`}
>
  <QrCode className="w-4 h-4 inline mr-2" />
  QR Codes
</button>
```

### Step 7: Add Tab Content
Add this content after the 'files' tab content:
```tsx
{activeTab === 'qr-codes' && (
  <div className="card">
    <QrCodeManagement />
  </div>
)}
```

### Step 8: Import QrCodeManagement Component
At the top of the admin page:
```tsx
import { QrCodeManagement } from '@/components/QrCodeManagement'
```

## Usage

### For Admins
1. Navigate to Admin Panel > QR Codes
2. Click "Upload QR Code" button
3. Select the role for which this QR code is (admin, treasurer, secretary, or finance)
4. Choose the payment method (WeChat, Alipay, or Bank Transfer)
5. Enter an optional title and description
6. Upload a QR code image or enter a URL
7. Click "Upload QR Code"

### For Treasury/Secretary/Finance Roles
These roles can upload their own QR codes:
- Treasury can upload their WeChat/Alipay QR codes
- Secretary can upload their QR codes
- Finance can upload their QR codes

## Permission System
- **Admins**: Can upload and manage QR codes for any role
- **Other roles**: Can only upload and manage QR codes for their own role
- All authenticated users can view QR codes for their role

## Testing
1. Run the SQL migration to create the table
2. Log in as admin
3. Go to Admin Panel > QR Codes
4. Upload a QR code
5. Verify it appears in the list
6. Test delete functionality
7. Log in as a different role and verify they can only see their own QR codes
