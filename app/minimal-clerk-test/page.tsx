'use client'

import { ClerkProvider, SignIn } from '@clerk/nextjs'

export default function MinimalClerkTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Minimal Clerk Test</h1>
      
      <div className="mb-6">
        <p className="mb-4">This page uses the bare minimum Clerk setup to test if Clerk works.</p>
        
        <div className="p-4 border rounded-lg">
          <h2 className="font-bold mb-2">Clerk SignIn Component:</h2>
          <div className="p-4 bg-gray-50 rounded">
            <SignIn 
              routing="hash"
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700'
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-bold mb-2">Debug Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Open browser console (F12)</li>
          <li>Go to Network tab</li>
          <li>Filter by "Fetch/XHR"</li>
          <li>Look for requests to "clerk" domains</li>
          <li>Check which request returns non-JSON data</li>
          <li>Look at the Response tab for that request</li>
        </ol>
      </div>

      <div className="mt-6">
        <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
      </div>
    </div>
  )
}