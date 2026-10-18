# Member Profile Edit Guide

## 📝 Overview

Members can now edit their own profile information, including their **full name**, through the Settings page. This allows members to fix incorrect names (like "Committee") without needing secretary or admin intervention.

---

## 🔐 How Members Can Edit Their Profile

### Step 1: Login to Your Account
1. Go to the application login page
2. Sign in with your email and password

### Step 2: Navigate to Settings
You have two ways to access Settings:

**Option A: Via Dashboard Menu**
- Click on "Settings" in the main navigation menu
- Or go directly to: `http://localhost:3000/settings`

**Option B: Via Profile Menu**
- Click on your profile icon in the top-right corner
- Select "Settings" from the dropdown menu

### Step 3: Edit Your Profile
1. On the Settings page, you'll see all your profile information
2. Find the **"Full Name"** field in the Personal Information section
3. Update your name with your real name (e.g., "John Doe")
4. The changes are **automatically saved** after 3 seconds
5. You'll see a save indicator showing the status

---

## ✅ Validation Rules

The system now enforces validation to prevent placeholder names:

### ❌ Invalid Names (Will Be Rejected):
- "Committee"
- "Admin"
- "Test"
- "User"
- "Member"
- "Name"
- "Placeholder"
- Any name containing these words

### ✅ Valid Names:
- Must include first AND last name (minimum 2 words)
- Examples:
  - ✅ "John Doe"
  - ✅ "Mary Jane Smith"
  - ✅ "Ahmed Al-Hassan"
  - ❌ "John" (only one word)
  - ❌ "Committee" (placeholder)

---

## 🎯 Features

### Auto-Save Functionality
- Changes are automatically saved after 3 seconds of inactivity
- No need to click a "Save" button
- Visual indicator shows save status:
  - 💾 **Saving...** - Changes being saved
  - ✅ **Saved** - Successfully saved (with timestamp)
  - ❌ **Error** - Save failed (with error message)

### Editable Fields

**Personal Information:**
- ✏️ Full Name (required)
- ✏️ Gender
- ✏️ Date of Birth (auto-calculates age)
- ✏️ County of Origin
- ✏️ Passport Number
- ✏️ Passport Dates
- ✏️ Chinese Visa Expiration

**Educational Information:**
- ✏️ University Name
- ✏️ University Campus
- ✏️ Degree Level
- ✏️ Major/Program
- ✏️ Year of Study
- ✏️ Expected Graduation Year
- ✏️ Scholarship Status

**Contact Information:**
- ✏️ Chinese Phone Number
- ✏️ WhatsApp Number
- ✏️ WeChat ID
- ✏️ Beijing Address

**Emergency Contact:**
- ✏️ Emergency Contact Name
- ✏️ Emergency Contact Phone
- ✏️ Emergency Contact Relationship

**Profile Photo:**
- ✏️ Upload/Update Profile Photo

### Read-Only Fields:
- 🔒 Email Address (cannot be changed)
- 🔒 Member ID (auto-generated, cannot be changed)
- 🔒 Age (auto-calculated from date of birth)

---

## 🛠️ For Members with "Committee" Name

If your name is showing as "Committee" on tickets or elsewhere:

### Step 1: Go to Settings
Navigate to `http://localhost:3000/settings`

### Step 2: Update Your Full Name
1. Find the "Full Name" field
2. Clear the current value ("Committee")
3. Enter your real name (e.g., "John Doe")
4. Wait 3 seconds for auto-save
5. You'll see "Saved ✓" indicator

### Step 3: Verify the Change
1. Go to "My Tickets" page
2. Your name should now display correctly on all tickets
3. If you purchase new tickets, your real name will appear

---

## 🔄 Secretary/Admin Edit Access

Secretaries and Admins can still edit member profiles through:

### Secretary Panel Method:
1. Go to `/secretary`
2. Find the member in the list
3. Click "Edit" button next to their name
4. Update their information
5. Click "Save"

This is useful when:
- A member cannot access their account
- Bulk updates are needed
- Admin verification is required

---

## 📋 Validation Messages

You may see these messages when editing:

### Full Name Validation:
- ❌ "Please enter your real full name, not a placeholder"
  - **Cause**: You entered a placeholder name like "Committee"
  - **Fix**: Enter your actual name (first and last name)

- ❌ "Please enter your full name (first and last name)"
  - **Cause**: You only entered one word
  - **Fix**: Include both first and last name

### Auto-Save Messages:
- ✅ "Changes saved successfully"
  - Your profile has been updated
  
- ❌ "Failed to save changes"
  - **Fix**: Check your internet connection and try again
  
- ❌ "Failed to load profile"
  - **Fix**: Refresh the page or sign in again

---

## 🎨 UI Features

### Helper Text
The full name field now shows a warning:
> ⚠️ Enter your real name (first and last name). Do not use placeholders like "Committee", "Test", or "Member".

### Visual Indicators
- 💾 Save status indicator in top-right
- ⏰ Last saved timestamp
- ✅ Success/error messages
- 🔴 Required field indicators (*)

---

## 💡 Tips

1. **Wait for Save Confirmation**: Always wait for the "Saved ✓" indicator before leaving the page

2. **Check Your Tickets**: After updating your name, verify it appears correctly on your tickets

3. **Complete Your Profile**: Fill out all required fields for full system access

4. **Keep Information Current**: Update your profile when your contact info or address changes

5. **Profile Photo**: Upload a clear photo for better identification at events

---

## 🔧 Troubleshooting

### Problem: Changes Not Saving
**Solutions:**
- Check your internet connection
- Refresh the page and try again
- Clear browser cache
- Try a different browser
- Contact admin if issue persists

### Problem: Can't Access Settings Page
**Solutions:**
- Make sure you're logged in
- Check if your account is approved (status must be "active")
- Try logging out and back in
- Contact admin if account is pending

### Problem: Validation Errors
**Solutions:**
- Read the error message carefully
- Follow the format requirements (first and last name)
- Avoid using placeholder names
- Use actual personal information

---

## 📞 Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Contact BULS Secretary** via WeChat or email
3. **Contact BULS Admin** for account access issues

---

## ✨ Status

**IMPLEMENTED** ✅ - Members can now edit their profiles including full name through the Settings page

## 📂 Related Files

- `app/settings/page.tsx` - Member settings/profile edit page
- `app/registration/page.tsx` - Initial registration form (also updated with validation)
- `app/secretary/page.tsx` - Secretary can edit member profiles
- `COMMITTEE_NAME_FIX.md` - Technical documentation for fixing placeholder names

---

## 🔐 Security & Privacy

- ✅ Members can only edit their own profile
- ✅ Email address cannot be changed (authentication security)
- ✅ Member ID cannot be changed (system integrity)
- ✅ All changes are automatically saved to secure database
- ✅ Secretary/Admin can override if needed for support
