# Role Switching - Quick Reference Card

## 🎯 What Is Role Switching?

Students with executive roles can toggle between:
- **🛡️ Role Mode** (Red) - Executive dashboard with admin privileges
- **👤 Member Mode** (Blue) - Personal member account

## 🔑 For Admins: Assigning Executive Roles

### Via Admin Panel (Recommended):
1. Login as admin
2. Go to `/admin`
3. Find user in table
4. Select role from dropdown:
   - `member` - Regular student (default)
   - `secretary` - General Secretary
   - `treasurer` - Treasurer
   - `finance` - Finance Officer
   - `admin` - Administrator
5. Auto-saves ✅

### Via SQL (Direct):
```sql
-- Promote to General Secretary
UPDATE users SET role = 'secretary' WHERE email = 'student@example.com';

-- Revoke role (back to member)
UPDATE users SET role = 'member' WHERE email = 'student@example.com';
```

## 👤 For Users: How to Switch

### If You Have an Executive Role:
1. Login - you'll be redirected to your executive panel
2. Look at **top-right corner** (next to profile picture)
3. You'll see a **toggle switch**:
   - **Red (Left)** = 🛡️ Role Mode
   - **Blue (Right)** = 👤 Member Mode
4. Click to switch between views!

### Visual Indicators:
```
🛡️ General Secretary Mode  [●-----○]  Red Toggle  (Role View)
👤 Member Mode             [○-----●]  Blue Toggle (Member View)
```

## 📊 What Each Mode Shows

### Role Mode (Executive View):
```
✅ Dashboard
✅ Payments (personal)
✅ Loans (personal)
✅ Executive Panel (Admin/Finance/Treasurer/Secretary)
✅ Manage Ranks (if secretary/admin)
✅ Manage Dues (if admin)
```

### Member Mode (Regular View):
```
✅ Dashboard
✅ Payments (personal)
✅ Loans (personal)
❌ No executive panels
```

## 🔐 Automatic Login Redirects

When users login, they go to:
- **Admin** → `/admin`
- **Finance** → `/finance`
- **Treasurer** → `/treasurer`
- **Secretary** → `/secretary`
- **Member** → `/dashboard`

## ⚡ Quick Actions

| Task | Action |
|------|--------|
| Promote user to Secretary | Admin Panel → Select user → Change role to "secretary" |
| Revoke executive role | Admin Panel → Select user → Change role to "member" |
| Switch to personal account | Click toggle → Blue (Member Mode) |
| Switch to executive duties | Click toggle → Red (Role Mode) |
| Check current mode | Look at indicator text next to toggle |

## 🛡️ Security Features

✅ Server-side validation on every request  
✅ Role revocation takes effect immediately  
✅ Member mode blocks executive panels  
✅ HTTP-only cookies prevent XSS  

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Toggle not showing | User has "member" role only (not an executive) |
| Can't access executive panel | Currently in Member Mode - toggle to Role Mode |
| Role change not working | Logout and login again to refresh session |
| Toggle not switching | Clear browser cache and try again |

## 📱 Mobile Support

✅ Toggle works on mobile devices  
✅ Compact view shows role label  
✅ Responsive navigation menu  

## ✨ Common Scenarios

### Scenario 1: Student becomes General Secretary
```
1. Admin assigns "secretary" role
2. Student logs out and logs in again
3. Redirected to /secretary panel automatically
4. Sees toggle in header
5. Can switch to member view anytime
```

### Scenario 2: Secretary's term ends
```
1. Admin changes role to "member"
2. Student logs out and logs in again
3. No executive panel access
4. Toggle disappears
5. Only see personal dashboard
```

### Scenario 3: Secretary needs to pay monthly dues
```
1. Currently in Secretary Panel (Role Mode)
2. Click toggle → Switch to Member Mode
3. Navigate to Payments
4. Submit personal payment
5. Toggle back to Role Mode to continue work
```

## 📞 Support

For questions or issues:
1. Check `ROLE_SWITCHING_GUIDE.md` for detailed documentation
2. Contact system administrator
3. Check browser console for errors

---

**Quick Tip**: Executives should use **Role Mode** for union work and **Member Mode** for personal account management.

---

Print this card and keep it handy! 📄
