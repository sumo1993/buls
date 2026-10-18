'use client'

import { useEffect, useState } from 'react'

export default function DebugClerkPage() {
  const [clerkLoaded, setClerkLoaded] = useState(false)
  const [clerkError, setClerkError] = useState<string | null>(null)
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    // Check if Clerk script loads
    const checkClerk = () => {
      const clerkScript = document.querySelector('script[src*="clerk"]')
      if (clerkScript) {
        setClerkLoaded(true)
      }
      
      // Check for Clerk errors in console
      const originalConsoleError = console.error
      console.error = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('Clerk')) {
          setClerkError(args.join(' '))
        }
        originalConsoleError.apply(console, args)
      }
    }

    checkClerk()
    
    // Get environment variables (client-side safe)
    setEnvVars({
      hasClerkKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkKeyLength: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0,
      clerkKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10) || 'none',
      nodeEnv: process.env.NODE_ENV,
    })

    // Clean up
    return () => {
      console.error = console.error
    }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Clerk Debug Page</h1>
      
      <div className="space-y-6">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="font-bold mb-2">Clerk Status:</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${clerkLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Clerk Script Loaded: {clerkLoaded ? '✅ Yes' : '❌ No'}</span>
            </div>
            {clerkError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <strong className="text-red-700">Clerk Error:</strong>
                <pre className="text-sm mt-1 text-red-600">{clerkError}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-bold mb-2">Environment Variables:</h2>
          <pre className="text-sm bg-white p-3 rounded border">
            {JSON.stringify(envVars, null, 2)}
          </pre>
          <p className="text-sm text-gray-600 mt-2">
            Clerk key should start with "pk_" and be about 100+ characters
          </p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg">
          <h2 className="font-bold mb-2">Troubleshooting Steps:</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Check Console</strong> (F12) for detailed errors</li>
            <li><strong>Check Network tab</strong> for failed requests to Clerk</li>
            <li><strong>Verify .env.local</strong> file exists with Clerk keys</li>
            <li><strong>Restart server</strong> if environment variables were updated</li>
            <li><strong>Test direct URL</strong>: http://localhost:3000/auth/signin</li>
          </ol>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="font-bold mb-2">Quick Tests:</h2>
          <div className="space-y-2">
            <a 
              href="/auth/signin" 
              className="block px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700"
            >
              Test Sign In Page
            </a>
            <a 
              href="/api/test-clerk-auth" 
              className="block px-4 py-2 bg-green-600 text-white rounded text-center hover:bg-green-700"
            >
              Test Clerk API
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}