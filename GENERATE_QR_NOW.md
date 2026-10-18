# Generate QR Codes - Quick Instructions

## Step-by-Step to Generate QR Codes:

### 1. Go to Treasurer Tickets Page
Open your browser and go to:
```
http://localhost:3000/treasurer/tickets
```

### 2. Look for the Banner
You should see a beautiful purple/blue gradient banner that says:
- **"Generate Missing QR Codes"**
- "Create QR codes for all approved tickets that don't have them yet"

### 3. Click the Button
Click the **"Generate QR Codes"** button on the right side of the banner

### 4. Confirm in Modal
A modal will pop up with:
- Purple/blue gradient header
- Information about what will happen
- Two buttons at the bottom

Click the **"Generate QR Codes"** button in the modal (the purple one)

### 5. Wait for Success
You'll see a toast notification saying:
- "✅ Successfully generated X QR codes!" OR
- "ℹ️ No tickets needed QR code generation"

### 6. Refresh the Page
Refresh the treasurer tickets page

### 7. View a Ticket
- Click the "View" (👁️) button on any PAID ticket
- Click on the ticket card to flip it
- You should now see the QR code on the back!

---

## If It's Still Not Working:

### Option A: Check Browser Console
1. Press F12 to open browser developer tools
2. Go to "Console" tab
3. Click the "Generate QR Codes" button
4. Look for any error messages
5. Take a screenshot and show me

### Option B: Check Network Tab
1. Press F12 to open browser developer tools
2. Go to "Network" tab
3. Click the "Generate QR Codes" button
4. Look for a request to `/api/tickets/generate-qr`
5. Click on it and check the "Response" tab
6. Tell me what it says

### Option C: Manual Database Check
Run this SQL in Supabase:

```sql
-- Check if QR codes exist
SELECT 
  id,
  payment_status,
  qr_code_url,
  CASE 
    WHEN qr_code_url IS NULL THEN '❌ No QR Code'
    ELSE '✅ Has QR Code'
  END as qr_status
FROM ticket_purchases
WHERE payment_status = 'paid'
LIMIT 10;
```

This will show you if QR codes are actually in the database.

---

## Alternative: Approve a New Ticket

If you have any pending tickets:

1. Go to **Pending** tab
2. Click **Approve** (✓) on a ticket
3. It will auto-generate QR code
4. Go to **Approved** tab
5. Click **View** on that ticket
6. Flip the ticket card
7. QR code should appear!

---

## What the QR Code Contains:

When scanned, the QR code contains:
```json
{
  "ticketNumber": "TKT7054636640",
  "purchaseId": "uuid",
  "eventId": "uuid",
  "userId": "uuid",
  "quantity": 1,
  "validatedAt": null
}
```

---

## Still Having Issues?

Tell me:
1. Did you see the purple banner?
2. Did the modal open when you clicked?
3. What message did you see after clicking "Generate QR Codes"?
4. Did you check an approved ticket or a pending one?

I'll help you debug further!
