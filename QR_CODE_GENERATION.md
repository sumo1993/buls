# QR Code Generation for Tickets

## ✅ What Was Implemented

### 1. **Automatic QR Code Generation on Approval**
When a treasurer approves a ticket purchase, a QR code is now automatically generated and saved to the database.

### 2. **Bulk QR Code Generation for Existing Tickets**
Added a button on the treasurer tickets page to generate QR codes for all paid tickets that don't have them yet.

### 3. **QR Code Package Installed**
- Installed `qrcode` npm package
- Generates QR codes as base64 data URLs
- Stores directly in database

---

## 🎯 How It Works

### Automatic Generation (On Approval)

1. **Treasurer approves a ticket**
   - Goes to Treasurer → Tickets
   - Clicks "Approve" (✓) button
   - Confirms approval

2. **Backend generates QR code**
   - Creates ticket number (e.g., `TKT7054636640`)
   - Generates QR data with:
     - Ticket number
     - Purchase ID
     - Event ID
     - User ID
     - Quantity
     - Validation status
   - Converts to base64 image (300x300px)
   - Saves to `ticket_purchases.qr_code_url`

3. **QR code is now available**
   - Shows on ticket view
   - Can be flipped to on ticket card
   - Scannable for verification

### Manual Bulk Generation

1. **Navigate to Treasurer → Tickets**
2. **Look for blue banner** at top of page:
   ```
   Generate Missing QR Codes
   Generate QR codes for paid tickets that don't have them yet
   [Generate QR Codes] button
   ```
3. **Click "Generate QR Codes" button**
4. **Confirm the action**
5. **System processes all paid tickets without QR codes**
6. **Success message shows** how many were generated

---

## 🔧 Technical Implementation

### API Endpoints

#### 1. Approve Endpoint (Updated)
**File**: `app/api/tickets/approve/route.ts`

```typescript
import QRCode from 'qrcode'

// On approval
const ticketNumber = `TKT${purchase_id.replace(/[^0-9]/g, '').slice(0, 10).padEnd(10, '0')}`
const qrData = JSON.stringify({
  ticketNumber,
  purchaseId: purchase_id,
  eventId: purchase.event_id,
  userId: purchase.user_id,
  quantity: purchase.quantity,
  validatedAt: null
})

const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  width: 300,
  margin: 2
})

updateData.qr_code_url = qrCodeDataUrl
```

#### 2. Generate QR Endpoint (New)
**File**: `app/api/tickets/generate-qr/route.ts`

- **Method**: POST
- **Auth**: Requires treasurer or admin role
- **Action**: Finds all paid tickets without QR codes and generates them
- **Returns**: Count of successful and failed generations

### QR Code Data Structure

```json
{
  "ticketNumber": "TKT7054636640",
  "purchaseId": "a705abc4-6366-40c0-af92-b1dbfcf92d97",
  "eventId": "event-uuid",
  "userId": "user-uuid",
  "quantity": 1,
  "validatedAt": null
}
```

### QR Code Specifications

- **Format**: PNG image (base64 data URL)
- **Size**: 300x300 pixels
- **Error Correction**: Medium (M level)
- **Margin**: 2 modules
- **Storage**: Stored as base64 string in database

---

## 📱 User Experience

### For Treasurer:

**Approving New Tickets:**
1. Go to Treasurer → Tickets → Pending tab
2. Review ticket details
3. Click Approve (✓)
4. QR code auto-generated ✅
5. Ticket moves to Approved tab with QR code

**Generating for Existing Tickets:**
1. Go to Treasurer → Tickets
2. See blue "Generate Missing QR Codes" banner
3. Click "Generate QR Codes" button
4. Confirm action
5. Wait for success message
6. All paid tickets now have QR codes ✅

### For Members:

**Viewing Their Tickets:**
1. Go to My Tickets
2. Click on a ticket
3. See ticket details
4. **Click ticket card to flip**
5. **Back shows QR code** (large, scannable)
6. Can be scanned at event entrance

---

## 🎨 QR Code Display

### In Ticket View Modal:

```
FRONT (Click to flip)          BACK (Click to flip back)
┌─────────────────────┐       ┌─────────────────────┐
│ EVENT TICKET [PAID] │       │   Scan QR Code      │
│ Annual BULS Event   │       │                     │
│ Normal              │       │   ┌───────────┐     │
├─────────────────────┤       │   │           │     │
│ THEO MEAYEYAN       │       │   │  QR CODE  │     │
│ 1 Ticket            │       │   │           │     │
├─────────────────────┤       │   └───────────┘     │
│ ¥10.00              │       │                     │
│ TKT7054636640       │       │  TKT7054636640      │
├─────────────────────┤       └─────────────────────┘
│ Oct 6, 2026         │
│     🔄 Tap to flip  │
└─────────────────────┘
```

---

## 🔒 Security & Validation

### QR Code Contains:
- ✅ Unique ticket number
- ✅ Purchase ID (UUID)
- ✅ Event ID (for validation)
- ✅ User ID (owner verification)
- ✅ Quantity (for multi-ticket purchases)
- ✅ Validation timestamp (null until scanned)

### Validation Process (Future):
1. Scan QR code at event entrance
2. Decode JSON data
3. Verify ticket exists in database
4. Check if already validated
5. Check if belongs to correct event
6. Mark as validated with timestamp
7. Allow/deny entry

---

## 🧪 Testing Steps

### Test 1: Generate for Existing Tickets
1. Go to `/treasurer/tickets`
2. Click "Generate QR Codes" button
3. Confirm
4. ✅ Should see success message with count
5. Refresh page
6. View any approved ticket
7. Flip to back
8. ✅ Should see QR code

### Test 2: Approve New Ticket
1. Have a member purchase a ticket
2. Go to Treasurer → Tickets → Pending
3. Click Approve on the ticket
4. ✅ Should approve successfully
5. Go to Approved tab
6. Click View on the ticket
7. Flip to back
8. ✅ Should see QR code

### Test 3: Scan QR Code
1. View an approved ticket
2. Flip to QR code
3. Use phone camera or QR scanner app
4. ✅ Should decode to JSON with ticket data

---

## 📊 Database Schema

### ticket_purchases table:
```sql
CREATE TABLE ticket_purchases (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  ticket_id UUID REFERENCES event_tickets(id),
  user_id UUID REFERENCES users(id),
  quantity INTEGER,
  payment_status TEXT,
  qr_code_url TEXT,  -- ✅ Stores base64 QR code
  created_at TIMESTAMP,
  paid_at TIMESTAMP,
  ...
);
```

---

## ✨ Benefits

1. **Automated** - QR codes generate automatically on approval
2. **Batch Processing** - Can generate for all existing tickets at once
3. **No External Service** - Uses npm package, no API calls needed
4. **Stored in Database** - Base64 string, easy to retrieve
5. **Scannable** - Standard QR code format, works with any scanner
6. **Secure** - Contains verification data for event entrance
7. **User Friendly** - Large, easy to scan QR codes

---

## 🚀 Next Steps (Future Enhancements)

1. **QR Code Scanning App**
   - Mobile app for event staff
   - Scan and validate tickets at entrance
   - Mark as used/validated

2. **Validation API**
   - Endpoint to validate QR code
   - Check if ticket is valid
   - Prevent duplicate scans

3. **Download QR Code**
   - Button to download QR code as PNG
   - For printing physical tickets

4. **Email QR Code**
   - Auto-email QR code to member after approval
   - Include in ticket confirmation

5. **Print Ticket**
   - Print-friendly ticket format
   - Include QR code and details

---

## 📝 Files Modified/Created

### Modified:
1. `app/api/tickets/approve/route.ts` - Added QR generation on approval
2. `app/treasurer/tickets/page.tsx` - Added bulk generate button

### Created:
3. `app/api/tickets/generate-qr/route.ts` - Bulk QR generation endpoint
4. `QR_CODE_GENERATION.md` - This documentation

### Installed:
5. `qrcode` npm package

---

## ✨ Status

**IMPLEMENTED** ✅

- QR codes generate automatically on ticket approval
- Bulk generate button available for existing tickets
- QR codes display on flipped ticket cards
- Ready for event validation system

---

## 🆘 Troubleshooting

### QR Code Not Showing?
1. Check if ticket is approved (payment_status = 'paid')
2. Run bulk generate: `/treasurer/tickets` → "Generate QR Codes"
3. Refresh the page
4. Flip ticket card to see QR code

### Bulk Generate Not Working?
1. Check console for errors
2. Ensure you're logged in as treasurer/admin
3. Check network tab for API response
4. Verify `qrcode` package is installed

### QR Code Won't Scan?
1. Ensure it's a standard QR code (should be)
2. Try different QR scanner app
3. Check if image is clear (not pixelated)
4. View full size QR code (click to enlarge)
