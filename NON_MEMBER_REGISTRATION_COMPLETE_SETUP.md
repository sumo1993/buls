# Non-Member Event Registration System - Complete Setup Guide

## ✅ Completed Features

### 1. **5-Digit Verification Code System**
- Unique code generated for each registration
- Code displayed to user after successful registration
- Can copy code to clipboard
- Stored in database for verification

### 2. **Status Check on Homepage**
- Non-members can check their registration status at `/` (homepage)
- Enter 5-digit code to view:
  - Registration details
  - Event information
  - Current status (Pending, Payment Pending, Approved, Rejected)
  - Status-specific messages

### 3. **Two QR Code Payment Options**
- WeChat Pay
- Alipay
- User selects preferred payment method
- Real logos from loan system

### 4. **Clean Professional Design**
- White backgrounds
- Minimal colors (gray, blue, red accents)
- Professional appearance

### 5. **Payment Proof Upload**
- Image upload (max 5MB)
- Preview before submission
- Base64 encoding

## 📋 Required Setup Steps

### Step 1: Run SQL Migration for Verification Code

Go to **Supabase SQL Editor** and run:

```sql
-- Add verification_code column to non_member_registrations table
ALTER TABLE non_member_registrations 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(5) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_non_member_verification_code 
ON non_member_registrations(verification_code);

-- Verify
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'non_member_registrations' 
AND column_name = 'verification_code';
```

### Step 2: Upload QR Codes in Admin Panel

1. Go to `/admin` → **QR Code Management**
2. Upload **two** QR codes:
   - **WeChat Pay QR** (set `payment_method` = 'wechat')
   - **Alipay QR** (set `payment_method` = 'alipay')

## 🔄 Complete User Flow

### For Non-Members:

1. **Visit** `/events` page
2. **Click** "Register as Non-Member" button on any event
3. **Fill** personal information form:
   - Full name, email, phone
   - Country (195+ countries available)
   - City (auto-populated based on country)
   - Address
   - Education level
   - Optional message
4. **Click** "Next" → proceeds to payment step
5. **Select** payment method (WeChat or Alipay)
6. **Scan** QR code with phone
7. **Pay** through app
8. **Take** screenshot of payment confirmation
9. **Upload** screenshot
10. **Submit** registration
11. **Receive** 5-digit verification code
12. **Save** code (can copy to clipboard)
13. **Check status** anytime at homepage (`/`) by entering code

### Status Flow:

- **Initial**: `payment_pending` (if payment proof uploaded) or `pending` (if no proof)
- **After Review**:
  - `approved` → Can attend event
  - `rejected` → Notified to contact organizers

## 👥 Admin/Staff Workflow

### Secretary Responsibilities:
- Receives notification of new non-member registrations
- Reviews registration details
- Verifies information is complete
- Approves or rejects registration

### Treasurer Responsibilities:
- Receives notification of payment submissions
- Verifies payment proof screenshot
- Confirms payment amount
- Updates payment status

### Approval Process:
1. Treasurer verifies payment proof
2. Secretary reviews registration details
3. Both approve → status changes to `approved`
4. Any rejection → status changes to `rejected`

## 🔍 Database Schema

```sql
non_member_registrations:
- id (uuid, primary key)
- event_id (uuid, foreign key → events)
- full_name (text)
- email (text)
- phone (text)
- country (text)
- city (text)
- address (text)
- education_level (text)
- message (text, optional)
- payment_proof_url (text, base64 image)
- verification_code (varchar(5), unique)
- status ('pending' | 'approved' | 'rejected' | 'payment_pending')
- registered_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

## 📁 Files Created/Modified

### New Files:
- `/app/api/non-member-registrations/route.ts` - Registration & status check API
- `/app/api/public-qr-code/route.ts` - Fetch WeChat/Alipay QR codes
- `/lib/countries-cities.ts` - 195+ countries with cities
- `ADD_VERIFICATION_CODE.sql` - Migration SQL
- `FIX_NON_MEMBER_CONSTRAINT.sql` - Fix constraint issue

### Modified Files:
- `/app/events/page.tsx` - Two-step registration form + verification code modal
- `/app/page.tsx` - Added status check section on homepage

## 🎯 Features Summary

| Feature | Status |
|---------|--------|
| 5-digit verification code generation | ✅ |
| Verification code modal after registration | ✅ |
| Copy code to clipboard | ✅ |
| Status check on homepage | ✅ |
| Two QR code support (WeChat + Alipay) | ✅ |
| Real payment logos | ✅ |
| Clean white design | ✅ |
| Payment proof upload | ✅ |
| Country/city dropdowns | ✅ |
| Two-step registration flow | ✅ |
| Mobile responsive | ✅ |

## 🚀 Testing Checklist

- [ ] Run SQL migration for verification_code column
- [ ] Upload WeChat QR code in admin panel
- [ ] Upload Alipay QR code in admin panel
- [ ] Test non-member registration flow end-to-end
- [ ] Verify 5-digit code is generated and displayed
- [ ] Test copying code to clipboard
- [ ] Test status check on homepage with generated code
- [ ] Verify secretary can see registration in admin panel
- [ ] Verify treasurer can see payment proof
- [ ] Test approval/rejection workflow

## 📞 Support

For issues or questions, contact the development team or check the admin panel documentation.

---

**Last Updated**: December 2024
**Version**: 1.0.0
