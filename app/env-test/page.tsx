'use client'

import { useEffect, useState } from 'react'

export default function EnvTestPage() {
  const [envInfo, setEnvInfo] = useState<any>({})
  const [clerkLoaded, setClerkLoaded] = useState(false)

  useEffect(() => {
    // Get environment variable info (client-side safe)
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
    
    setEnvInfo({
      hasClerkKey: !!clerkKey,
      keyLength: clerkKey.length,
      keyFirst10: clerkKey.substring(0, 10),
      keyLast10: clerkKey.length > 10 ? clerkKey.substring(clerkKey.length - 10) : 'n/a',
      keyEndsWithDollar: clerkKey.endsWith('$'),
      keyEndsWithQ: clerkKey.endsWith('Q'),
      keyEndsWithDiQ: clerkKey.endsWith('iQ'),
      keyRaw: clerkKey,
      nodeEnv: process.env.NODE_ENV,
    })

    // Check if Clerk script loads
    const checkClerk = setInterval(() => {
      const clerkScript = document.querySelector('script[src*="clerk"]')
      if (clerkScript) {
        setClerkLoaded(true)
        clearInterval(checkClerk)
      }
    }, 100)

    // Cleanup
    return () => clearInterval(checkClerk)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Environment Variable Test</h1>
      
      <div className="space-y-6">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="font-bold mb-2">Clerk Key Analysis:</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(envInfo).map(([key, value]) => (
              <div key={key} className="p-2 bg-white rounded border">
                <div className="text-sm font-medium text-gray-500">{key}:</div>
                <div className={`font-mono text-sm ${typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : ''}`}>
                  {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-bold mb-2">Clerk Script Status:</h2>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${clerkLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Clerk Script Loaded: {clerkLoaded ? '✅ Yes' : '❌ No'}</span>
          </div>
          {!clerkLoaded && (
            <div className="mt-2 text-sm text-red-600">
              Clerk script not loading. Check browser console (F12) for errors.
            </div>
          )}
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg">
          <h2 className="font-bold mb-2">Expected Values:</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>hasClerkKey:</strong> Should be <span className="text-green-600">true</span></li>
            <li><strong>keyLength:</strong> Should be ~100 characters</li>
            <li><strong>keyFirst10:</strong> Should be <code>pk_test_b3B</code></li>
            <li><strong>keyEndsWithQ:</strong> Should be <span className="text-green-600">true</span> (ends with "Q")</li>
            <li><strong>clerkLoaded:</strong> Should be <span className="text-green-600">true</span></li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="font-bold mb-2">Troubleshooting:</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>If <code>hasClerkKey</code> is false, check <code>.env.local</code> file</li>
            <li>If key length is wrong, the key might be corrupted</li>
            <li>If Clerk script not loaded, check browser console errors</li>
            <li>Restart server after changing <code>.env.local</code></li>
            <li>Check server logs for environment loading errors</li>
          </ol>
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
          <a 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}