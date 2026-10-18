# QR Scanner Debug Guide

## Changes Made (Latest Fix)

### 1. Enhanced Debug Logging
Added comprehensive console logs throughout the scanner lifecycle:
- Button click events
- useEffect triggers
- DOM element detection
- Library import status
- Camera initialization
- Error details (name and message)

### 2. Improved State Management
- Increased DOM ready delay from 100ms to 300ms
- Added `showQRScanner` and `scanning` to useCallback dependencies
- Fixed useEffect dependency array to prevent size changes
- Proper cleanup of scanner on hide/unmount

### 3. Camera Configuration
- Added `aspectRatio: 1.0` to camera config
- Default camera: `environment` (back camera) on mobile
- Camera switch button to toggle between front/back

### 4. Error Handling
- More detailed error messages with error.name and error.message
- Silent handling of AbortError (normal browser behavior)
- Specific messages for each error type

## How to Test

1. **Open Browser Console** (F12 or Right-click → Inspect → Console)

2. **Navigate to Check-In Page**
   - Go to: http://localhost:3000/secretary/events/4/checkin
   
3. **Click "Scan QR Code" Button**
   - Watch the console for debug logs
   
4. **Expected Console Output** (if working):
   ```
   🔘 Button clicked - Current showQRScanner: false
   Showing scanner...
   🔄 useEffect triggered - showQRScanner: true scanning: false scannerKey: 1
   ⏰ Setting timer to start scanner...
   ⏰ Timer fired, calling startQRScanner()
   🎬 Starting QR scanner...
   Current state - showQRScanner: true scanning: false
   QR reader element: <div id="qr-reader">...</div>
   ✅ QR reader element found, importing library...
   ✅ Html5Qrcode imported successfully
   ✅ Html5Qrcode instance created
   📹 Requesting camera with facing mode: environment
   ✅ Camera started successfully!
   ```

5. **Troubleshooting Based on Console Output**

   **If you see: "❌ QR reader element not found"**
   - Issue: DOM not ready
   - Solution: Increase timeout in useEffect (currently 300ms)
   
   **If you see: "NotAllowedError"**
   - Issue: Camera permission denied
   - Solution: Check browser permissions (click padlock icon in address bar)
   
   **If you see: "NotFoundError"**
   - Issue: No camera on device
   - Solution: Test on device with camera or allow virtual camera
   
   **If you see: "NotReadableError"**
   - Issue: Camera already in use
   - Solution: Close other apps using camera
   
   **If you see: "AbortError - camera access cancelled"**
   - This is NORMAL browser behavior
   - Browser automatically cancels previous camera requests
   - Scanner should still work on next attempt
   
   **If logs stop after "📹 Requesting camera..."**
   - Issue: Camera start hanging
   - Possible causes:
     - Browser permission prompt waiting for user
     - Camera hardware issue
     - Conflicting camera usage
   - Solution: Check for permission prompts, restart browser

## Camera Permissions

### Chrome/Edge
1. Click padlock icon in address bar
2. Click "Site settings"
3. Find "Camera" → Allow
4. Refresh page

### Firefox
1. Click icon in address bar (shield or padlock)
2. Click ">" next to "Blocked" or "Permissions"
3. Set Camera to "Allow"
4. Refresh page

### Safari (Mobile)
1. iOS Settings → Safari → Camera
2. Set to "Ask" or "Allow"
3. Refresh page in Safari

## Common Issues & Solutions

### Issue 1: Scanner UI Shows But Camera Doesn't Start
**Symptoms:** White/gray box appears but no camera preview
**Possible Causes:**
- Permission not granted
- startQRScanner() not being called
- Library import failing
- Camera hardware busy

**Debug Steps:**
1. Check console for logs - which step fails?
2. Check browser permissions
3. Try clicking button again
4. Try "Stop" then start again
5. Refresh page and retry

### Issue 2: "The fetching process... was aborted" (AbortError)
**Status:** This is NORMAL browser behavior
**Explanation:** When camera initialization is cancelled or a new request is made, browser aborts previous requests
**Action Required:** None - this is expected and documented

### Issue 3: Scanner Works Once, Then Stops
**Symptoms:** First scan works, subsequent attempts fail
**Cause:** Previous scanner instance not properly cleaned up
**Solution:** 
- Use "Stop" button before closing
- Refresh page if scanner won't restart
- Check console for cleanup logs

### Issue 4: Wrong Camera (Front Instead of Back on Mobile)
**Solution:** 
- Click the 🔄 button while scanning
- This switches between front ('user') and back ('environment') cameras
- Default is back camera for easier QR scanning

## Code Flow

```
User clicks "Scan QR Code"
  ↓
Button onClick handler
  - Sets showQRScanner = true
  - Increments scannerKey (forces re-render)
  ↓
useEffect triggers (deps: showQRScanner, scannerKey, scanning, startQRScanner)
  - Checks: showQRScanner && !scanning
  - Sets 300ms timeout
  ↓
setTimeout callback fires
  - Calls startQRScanner()
  ↓
startQRScanner function
  - Waits 300ms for DOM
  - Finds #qr-reader element
  - Imports Html5Qrcode library
  - Creates scanner instance
  - Sets scanning = true
  - Calls html5QrCode.start() with camera config
  ↓
Camera starts
  - Shows camera preview in #qr-reader div
  - Scans for QR codes at 10 fps
  - Calls onScanSuccess when QR detected
  ↓
QR Code Detected
  - Stops scanner
  - Parses QR data (JSON)
  - Validates event_id
  - Finds attendee
  - Calls handleCheckIn()
```

## Testing Checklist

- [ ] Server running at http://localhost:3000
- [ ] Browser console open (F12)
- [ ] Camera permissions granted
- [ ] No other apps using camera
- [ ] Test device has working camera
- [ ] HTTPS or localhost (required for camera access)
- [ ] Click "Scan QR Code" button
- [ ] Check console logs appear
- [ ] Camera preview shows in box
- [ ] Test with QR code (or use test QR generator)

## Next Steps If Still Not Working

1. **Copy full console output** when clicking button
2. **Take screenshot** of scanner UI state
3. **Report which log message is the last one** before failure
4. **Test on different browser** (Chrome, Firefox, Edge)
5. **Test on mobile device** (might work better than desktop)

## Files Modified
- `app/secretary/events/[id]/checkin/page.tsx` - Main QR scanner implementation
- Lines 30-180 contain all scanner logic

## Key State Variables
- `showQRScanner` - Boolean: should scanner UI be visible?
- `scanning` - Boolean: is camera actively scanning?
- `html5QrCodeRef` - Reference to Html5Qrcode instance
- `scannerKey` - Number: incremented to force re-mount
- `cameraFacing` - String: 'environment' (back) or 'user' (front)
