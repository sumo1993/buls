# 🚀 Server Startup Guide

## Issue: Server Not Starting

If you're having trouble starting the development server, follow these steps:

## Quick Fix

### Option 1: Kill All Node Processes and Restart
```bash
# Kill all node processes
pkill -9 node

# Wait 2 seconds
sleep 2

# Start fresh
npm run dev
```

### Option 2: Clean Next.js Cache
```bash
# Remove Next.js cache
rm -rf .next

# Start server
npm run dev
```

### Option 3: Check Port Usage
```bash
# Check if port 3000 is in use
lsof -ti:3000

# If it returns a number, kill that process
kill -9 $(lsof -ti:3000)

# Start server
npm run dev
```

## Common Issues & Solutions

### Issue 1: "Port 3000 is in use"

**Cause:** Another Node process is running on port 3000

**Solution:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use port 3001 automatically
npm run dev
# Server will use port 3001 instead
```

### Issue 2: "Another next dev server is already running"

**Cause:** Stale lock files or zombie processes

**Solution:**
```bash
# Remove lock files
rm -rf .next/dev

# Kill all node processes
pkill -9 node

# Wait and restart
sleep 3
npm run dev
```

### Issue 3: Server starts but can't be accessed

**Cause:** Server not binding to correct interface

**Solution:**
```bash
# Start with explicit host
npm run dev -- -H localhost

# Or use 0.0.0.0 to accept all connections
npm run dev -- -H 0.0.0.0
```

### Issue 4: "Module not found" errors

**Cause:** Dependencies not installed

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install

# Start server
npm run dev
```

## Manual Server Start (If Above Don't Work)

### Step 1: Check Current Directory
```bash
# Ensure you're in the project root
pwd
# Should show: /Users/apple/Documents/BULS/lsub-management

# If not, navigate there
cd /Users/apple/Documents/BULS/lsub-management
```

### Step 2: Check Node Version
```bash
# Check Node version
node --version
# Should be v18 or higher

# Check npm version
npm --version
```

### Step 3: Clean Everything
```bash
# Remove all generated files
rm -rf .next node_modules

# Reinstall dependencies
npm install
```

### Step 4: Start Server
```bash
# Start in foreground to see logs
npm run dev
```

### Step 5: Verify Server is Running
```bash
# In another terminal, test the connection
curl http://localhost:3000

# Should return HTML
```

## Accessing the Server

Once server is running:

- **Local:** http://localhost:3000
- **Network:** http://192.168.0.101:3000 (if on same network)

If port 3000 is busy, Next.js will use:
- **Port 3001:** http://localhost:3001

## Debug Mode

To see detailed logs:

```bash
# Set debug mode
export NODE_OPTIONS='--inspect'

# Start server
npm run dev
```

Then open Chrome DevTools → Node.js icon to debug.

## Production Build

If dev server still won't start, try production build:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Check

Make sure `.env.local` exists and has all required variables:

```bash
# Check file exists
ls -la .env.local

# Should show the file with these variables:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...
# CLERK_WEBHOOK_SECRET=...
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# DATABASE_URL=...
```

## Getting Help

If none of the above works:

1. **Check error logs:**
   ```bash
   npm run dev 2>&1 | tee server.log
   ```

2. **Try with verbose output:**
   ```bash
   npm run dev --verbose
   ```

3. **Check system resources:**
   ```bash
   # Check if system is low on memory
   top
   
   # Check disk space
   df -h
   ```

4. **Restart computer** (sometimes helps with zombie processes)

## Server Status Check

Create a script to check if server is running:

```bash
# Save as check-server.sh
#!/bin/bash
echo "Checking server status..."

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Server is running on port 3000"
    curl -s http://localhost:3000 > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Server is responding"
    else
        echo "❌ Server is not responding"
    fi
else
    echo "❌ No server running on port 3000"
fi

if lsof -ti:3001 > /dev/null 2>&1; then
    echo "✅ Server is running on port 3001"
fi
```

Make it executable:
```bash
chmod +x check-server.sh
./check-server.sh
```

## Quick Reference Commands

```bash
# Kill all node processes
pkill -9 node

# Kill process on specific port
kill -9 $(lsof -ti:3000)

# Clean and restart
rm -rf .next && npm run dev

# Check what's using port 3000
lsof -i:3000

# Start on different port
npm run dev -- -p 3002
```

---

**Most Common Solution:**
```bash
pkill -9 node && sleep 2 && npm run dev
```

This kills all Node processes, waits, and starts fresh.
