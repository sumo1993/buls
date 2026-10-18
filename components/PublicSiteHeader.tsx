'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

export default function PublicSiteHeader() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <nav className="bg-[#00205B] text-white py-4 px-6 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <span className="text-3xl">🇱🇷</span>
          <div>
            <h1 className="text-xl font-bold">BULS</h1>
            <p className="text-xs opacity-80">Beijing Union of Liberian Students</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="hover:text-[#EF3340] transition-colors font-medium">
            Home
          </Link>
          <Link href="/about" className="hover:text-[#EF3340] transition-colors font-medium">
            About
          </Link>
          <Link href="/events" className="hover:text-[#EF3340] transition-colors font-medium">
            Events
          </Link>
          <Link href="/members" className="hover:text-[#EF3340] transition-colors font-medium">
            Members
          </Link>
          <Link href="/contact" className="hover:text-[#EF3340] transition-colors font-medium">
            Contact
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {!isLoaded ? (
            <div className="text-sm opacity-80">Loading...</div>
          ) : !isSignedIn ? (
            <>
              <Link href="/auth/signin" className="hover:opacity-80 transition-opacity font-medium">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[#EF3340] px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity font-medium">
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
