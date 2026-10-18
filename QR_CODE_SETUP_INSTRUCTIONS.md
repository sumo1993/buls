# QR Code Setup Instructions

## ⚠️ Database Migration Required

The QR code feature requires a new column in the database. Follow these steps:

## Step 1: Add QR Code Column to Database

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL from `ADD_QR_CODE_COLUMN.sql`:

```sql
-- Add qr_code_url column to ticket_purchases table
ALTER TABLE ticket_purchases 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN ticket_purchases.qr_code_url IS 'Base64-encoded QR code image (data URL) for ticket validation';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_qr_code_url 
ON ticket_purchases(qr_code_url) 
WHERE qr_code_url IS NULL;
```

5. Click **Run** button
6. Verify success message appears

### Option B: Using psql Command Line

```bash
psql -h [your-supabase-host] -U postgres -d postgres -f ADD_QR_CODE_COLUMN.sql
```

---

## Step 2: Verify Column Was Added

Run this query in SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_purchases' 
AND column_name = 'qr_code_url';
```

You should see:
```
column_name    | data_type
---------------+----------
qr_code_url    | text
```

---

## Step 3: Restart the Server

After adding the column:

1. Stop the server (Ctrl+C in terminal)
2. Run: `npm run dev`
3. Go to `/my-tickets`
4. QR codes will auto-generate!

---

## How It Works Now

### For NEW Tickets:
1. Treasurer approves ticket
2. **QR code generates automatically**
3. Member sees QR code immediately in `/my-tickets`

### For OLD Tickets (Already Approved):
1. Member visits `/my-tickets`
2. System detects missing QR code
3. **Auto-generates QR code in background**
4. QR code appears within 2-3 seconds
5. If slow, click "Refresh Page" button

---

## Troubleshooting

### QR Code Still Not Showing?

1. **Check if column exists:**
   ```sql
   \d ticket_purchases
   ```
   
2. **Check server logs** for errors

3. **Manual generation (as treasurer):**
   - Go to `/treasurer/tickets`
   - Click "Generate QR Codes" button
   - Confirm in modal

### Get Help

Check server console for errors. Common issues:
- ❌ Column not added: Run the SQL migration
- ❌ 500 error: Check .env.local has correct database credentials
- ❌ QR not displaying: Refresh page or click "Refresh Page" button

---

## Database Schema

After migration, your `ticket_purchases` table will have:

```
ticket_purchases
├── id (uuid, primary key)
├── event_id (uuid)
├── ticket_id (uuid)
├── user_id (uuid)
├── quantity (integer)
├── payment_status (text: 'pending', 'paid', 'rejected', 'cancelled')
├── payment_method (text)
├── payment_proof_url (text)
├── qr_code_url (text) ← NEW COLUMN
├── approved_by (uuid)
├── paid_at (timestamp)
├── created_at (timestamp)
└── updated_at (timestamp)
```
