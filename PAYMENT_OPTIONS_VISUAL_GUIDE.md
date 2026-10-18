# Guest Payment Options - Visual Guide

## 🎯 The Problem We Solved

**User Request:**
> "If done by treasurer, they can have option of free, VIP special guest, or pay full payment. If member is adding by themselves, they must pay except event is free."

## ✅ The Solution

### 1️⃣ Treasurer/Admin View (Full Control)

```
┌─────────────────────────────────────────────────────┐
│ 👤 Guest Management                            [×]  │
│ For "Annual BULS Event" 🎫 Ticket Only              │
│ Managed by Treasurer                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ℹ️ Guest Payment Options                            │
│    As treasurer/admin, you can require full         │
│    payment (¥10), set as complimentary guest,       │
│    or VIP special guest                             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ➕ Add New Guest                                     │
│                                                     │
│ [Full Name*]  [John Doe          ]                  │
│ [Email]       [john@example.com  ]                  │
│ [Phone]       [+1234567890       ]                  │
│                                                     │
│ ┌─── Payment Option ──────────────────────────┐    │
│ │ Guest Fee: ¥10                              │    │
│ │                                             │    │
│ │ ◉ 💰 Full Payment Required                  │    │
│ │   Guest pays ¥10 at door                    │    │
│ │                                             │    │
│ │ ○ 🎁 Complimentary Guest                    │    │
│ │   Payment waived - free entry               │    │
│ │                                             │    │
│ │ ○ ⭐ VIP Special Guest                       │    │
│ │   Payment waived - VIP status               │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│                    [Cancel] [Add Guest]             │
└─────────────────────────────────────────────────────┘
```

### 2️⃣ Regular Member View (Payment Required)

```
┌─────────────────────────────────────────────────────┐
│ 👤 Guest Management                            [×]  │
│ For "Annual BULS Event" 🎫 Ticket Only              │
│ Managed by Member                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ℹ️ Guest Payment Options                            │
│    Guests must pay full price (¥10) at door.       │
│    Only treasurers can waive payments.              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ➕ Add New Guest                                     │
│                                                     │
│ [Full Name*]  [Jane Smith        ]                  │
│ [Email]       [jane@example.com  ]                  │
│ [Phone]       [+9876543210       ]                  │
│                                                     │
│ ┌─── Payment Option ──────────────────────────┐    │
│ │ ℹ️ Full Payment Required: ¥10               │    │
│ │                                             │    │
│ │ Your guest will need to pay at the door.    │    │
│ │ Only treasurers can waive payments.         │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│                    [Cancel] [Add Guest]             │
└─────────────────────────────────────────────────────┘
```

### 3️⃣ Free Event View (No Payment)

```
┌─────────────────────────────────────────────────────┐
│ 👤 Guest Management                            [×]  │
│ For "Community Meetup" 🆓 Free Event                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ℹ️ This is a free event - no payment required      │
│    for guests                                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ➕ Add New Guest                                     │
│                                                     │
│ [Full Name*]  [Bob Wilson        ]                  │
│ [Email]       [bob@example.com   ]                  │
│ [Phone]       [+1122334455       ]                  │
│                                                     │
│ ┌─────────────────────────────────────────────┐    │
│ │ ✓ Free Event - No payment required          │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│                    [Cancel] [Add Guest]             │
└─────────────────────────────────────────────────────┘
```

## 📋 Guest List Display

### After Adding Guests

```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Guests (3) / 10 limit                                    │
├──────────────┬─────────────────┬────────────┬──────────────┤
│ Name         │ Contact         │ Status     │ Actions      │
├──────────────┼─────────────────┼────────────┼──────────────┤
│ John Doe     │ john@email.com  │ ✗ Not      │ [Check In]   │
│ 👫 Friend    │ 💰 Payment Due: │   Checked  │ [Remove]     │
│              │    ¥10          │            │ [Collect $]  │
├──────────────┼─────────────────┼────────────┼──────────────┤
│ Jane Smith   │ jane@email.com  │ ✗ Not      │ [Check In]   │
│ 👨‍👩‍👧 Family   │ 🎁 Complimentary│   Checked  │ [Remove]     │
├──────────────┼─────────────────┼────────────┼──────────────┤
│ Bob Wilson   │ bob@email.com   │ ✗ Not      │ [Check In]   │
│ 💼 Colleague │ ⭐ VIP Guest     │   Checked  │ [Remove]     │
└──────────────┴─────────────────┴────────────┴──────────────┘
```

## 🏷️ Badge Guide

| Badge | Color | Meaning |
|-------|-------|---------|
| ⭐ VIP Guest | Purple | VIP special guest - payment waived |
| 🎁 Complimentary | Blue | Complimentary guest - payment waived |
| 💰 Payment Due: ¥X | Yellow | Guest needs to pay at door |
| ✓ Paid at Door | Green | Payment collected |

## 🔐 Permission Matrix

| Role | Full Payment | Complimentary | VIP | Free Event |
|------|-------------|---------------|-----|------------|
| Treasurer/Admin | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Secretary | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Member | ✅ Yes | ❌ No | ❌ No | ✅ Yes |

## 🎭 Use Cases

### Use Case 1: Treasurer Adding Regular Guest
1. Click 👤 icon
2. Select **💰 Full Payment Required**
3. Add guest
4. Guest shows "💰 Payment Due: ¥10"

### Use Case 2: Treasurer Adding Family Friend (No Charge)
1. Click 👤 icon
2. Select **🎁 Complimentary Guest**
3. Add guest
4. Guest shows "🎁 Complimentary"

### Use Case 3: Treasurer Adding VIP Speaker
1. Click 👤 icon
2. Select **⭐ VIP Special Guest**
3. Add guest
4. Guest shows "⭐ VIP Guest"

### Use Case 4: Member Adding Their Friend
1. Click 👤 icon
2. See "Full Payment Required" (no choice)
3. Add guest
4. Guest shows "💰 Payment Due: ¥10"

### Use Case 5: Free Event (Anyone)
1. Click 👤 icon
2. See "Free Event - No payment required"
3. Add guest
4. No payment badge shown

## ✨ Success Messages

| Scenario | Message |
|----------|---------|
| Full payment | ✓ John Doe added. Payment required: ¥10 |
| Complimentary | ✓ John Doe added as complimentary guest (Payment waived) |
| VIP | ✓ John Doe added as VIP guest (Payment waived) |
| Free event | ✓ John Doe added successfully (Free event) |

## 🚀 Getting Started

### Step 1: Run Migration
```bash
# In your database client (psql, pgAdmin, etc.)
\i ADD_GUEST_TYPE_COLUMN.sql
```

### Step 2: Restart Server
```bash
npm run dev
```

### Step 3: Test It Out!
1. Login as treasurer
2. Go to event check-in page
3. Click 👤 icon next to an attendee
4. Try all three payment options
5. Watch the badges appear! 🎉
