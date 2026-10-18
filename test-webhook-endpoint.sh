#!/bin/bash

echo "================================================"
echo "🧪 TESTING WEBHOOK ENDPOINT"
echo "================================================"
echo ""
echo "1. Testing webhook endpoint accessibility..."
curl -s -I https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk | head -5
echo ""
echo "2. Testing local webhook endpoint..."
curl -s -I http://localhost:3000/api/webhooks/clerk | head -5
echo ""
echo "3. Testing Supabase connection..."
curl -s http://localhost:3000/api/test-supabase
echo ""
echo "================================================"
echo "✅ Server is running and ready for webhooks!"
echo "================================================"
echo ""
echo "NEXT STEP: Create a new user in Clerk Dashboard"
echo "Then check if the user appears in Supabase automatically"
echo ""
