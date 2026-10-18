'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#00205B] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🇱🇷</div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join BULS today</p>
        </div>

        <SignUp 
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'shadow-none',
              card: 'shadow-none bg-transparent p-0',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary: 'bg-[#D62828] hover:bg-red-700',
              footer: 'hidden'
            }
          }}
        />

        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
