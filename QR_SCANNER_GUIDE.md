# 📱 QR Scanner User Guide

## ✅ Enhanced QR Scanner Features

The check-in page now has a fully functional QR code scanner with camera controls!

---

## 🎯 How to Use

### 1. **Start Scanning**
- Go to the check-in page: `/secretary/events/[id]/checkin`
- Click the **"Scan QR Code"** button
- **Allow camera access** when your browser asks

### 2. **Switch Camera (Mobile Phones)**
When the scanner is active, you'll see two extra buttons:

- **🔄 Button** - Switch between cameras
  - Click to toggle between:
    - 📱 **Back Camera** (environment) - Default, best for scanning
    - 🤳 **Front Camera** (user) - For selfie mode
  
- **⏹️ Stop Button** - Stop scanning
  - Click to immediately stop the camera
  - Camera light turns off
  - Scanner is closed

### 3. **Scan QR Code**
- Point the camera at a ticket QR code
- Keep the QR code centered in the scan box (250x250px)
- Make sure there's good lighting
- Scanner automatically stops after successful scan
- Member is checked in instantly

---

## 📱 Mobile Phone Usage

### Default Behavior:
- **Back camera is used by default** (`facingMode: 'environment'`)
- This is the best camera for scanning QR codes
- Works on all modern mobile browsers

### Switching Cameras:
1. Click the **🔄 button** to switch
2. Scanner restarts with the other camera
3. Current camera is shown below the scanner:
   - "📱 Back Camera" or "🤳 Front Camera"

### Tips for Mobile:
- Hold phone steady
- Ensure QR code fills most of the scan box
- Use good lighting (not too bright, not too dark)
- Avoid glare on the QR code
- Distance: 10-30cm from QR code

---

## ⏹️ How to Stop the Scanner

### Method 1: Stop Button
- Click the red **⏹️ Stop** button
- Camera stops immediately
- Scanner closes

### Method 2: Hide Scanner
- Click **"Hide QR Scanner"** button
- Camera stops automatically
- Scanner closes

### Method 3: Navigate Away
- Navigate to another page
- Scanner auto-stops on page unload
- Camera is released automatically

---

## 🔧 Technical Details

### Camera Settings:
- **FPS:** 10 frames per second (balanced performance)
- **Scan Box:** 250×250 pixels
- **Camera:** Environment (back) by default
- **Switching:** Instant camera toggle

### QR Code Format Expected:
```json
{
  "event_id": 4,
  "user_id": "uuid-here",
  "ticket_number": "TKT1234567890",
  "attendee_name": "Grace C Zeah"
}
```

### Security Features:
- ✅ Validates event ID matches current event
- ✅ Verifies attendee is registered
- ✅ Prevents duplicate check-ins
- ✅ Only works with valid JSON QR codes

---

## 🎨 UI Elements

### Main Button (Black):
- **"Scan QR Code"** - Opens scanner
- **"Hide QR Scanner"** - Closes scanner

### Control Buttons (When Scanning):
- **🔄 Switch Camera** (Gray) - Toggle front/back camera
- **⏹️ Stop** (Red) - Stop scanning immediately

### Scanner Status:
- Shows current camera being used
- Tips for better scanning
- Real-time feedback

---

## 🚀 Workflow Example

**On Desktop/Laptop:**
```
1. Click "Scan QR Code"
2. Allow camera access
3. Uses webcam (usually front camera)
4. Point at QR code on phone screen
5. Auto check-in → Scanner stops
```

**On Mobile Phone:**
```
1. Click "Scan QR Code"
2. Allow camera access
3. Uses back camera automatically
4. Point at QR code on paper ticket
5. Auto check-in → Scanner stops
```

**If you need to switch:**
```
1. Click 🔄 button
2. Scanner restarts with other camera
3. Continue scanning
```

---

## 🐛 Troubleshooting

### Camera Not Working?
- **Allow camera permissions** in browser
- Check if another app is using the camera
- Try refreshing the page
- Click Stop and try again

### Wrong Camera?
- Click the **🔄 switch button**
- Scanner will restart with the other camera

### QR Code Not Scanning?
- Make sure QR code is **well-lit**
- Hold steady at **10-30cm distance**
- Ensure QR code is **centered** in the box
- Try adjusting angle to reduce glare

### Scanner Won't Stop?
- Click the red **⏹️ Stop button**
- Or click **"Hide QR Scanner"**
- Or refresh the page

---

## 📊 Auto Check-In Process

When QR code is successfully scanned:
1. ✅ Scanner stops automatically
2. ✅ QR data is validated
3. ✅ Event ID is checked
4. ✅ Attendee is found in list
5. ✅ Check-in is recorded
6. ✅ Success message shows
7. ✅ Stats update in real-time
8. ✅ Row turns green in table

---

## 💡 Pro Tips

1. **For fastest check-in:** Use back camera on mobile
2. **For demo/testing:** Use front camera to scan QR on computer screen
3. **For batch check-ins:** Leave scanner running, scan multiple codes
4. **For manual backup:** Use the manual check-in buttons in the table
5. **For troubleshooting:** Stop and restart scanner with different camera

---

## 🎉 Features Summary

✅ **One-click start** - Simple button to begin  
✅ **Back camera default** - Best for mobile phones  
✅ **Camera switching** - Toggle front/back instantly  
✅ **Stop button** - Full control over scanner  
✅ **Auto check-in** - No extra clicks needed  
✅ **Visual feedback** - Shows current camera and tips  
✅ **Clean shutdown** - Proper camera release  
✅ **Error handling** - Helpful messages for issues  

---

**Last Updated:** October 6, 2026  
**Feature Status:** ✅ Fully Functional
