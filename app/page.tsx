'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CountyFlags from '@/components/CountyFlags'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { isLoaded, userId, isSignedIn } = useAuth()
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [registration, setRegistration] = useState<any>(null)
  
  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, router])

  const checkRegistrationStatus = async () => {
    if (!verificationCode || verificationCode.length !== 5) {
      toast.error('Please enter a 5-digit verification code')
      return
    }

    setChecking(true)
    try {
      const response = await fetch(`/api/non-member-registrations?code=${verificationCode}`)
      
      if (!response.ok) {
        throw new Error('Registration not found')
      }

      const data = await response.json()
      setRegistration(data.registration)
      toast.success('Registration found!')
    } catch (error: any) {
      toast.error(error.message || 'Registration not found')
      setRegistration(null)
    } finally {
      setChecking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'payment_pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'payment_pending': return 'Payment Pending'
      default: return 'Pending Review'
    }
  }
  
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#00205B] text-white py-4 px-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🇱🇷</span>
            <div>
              <h1 className="text-xl font-bold">BULS</h1>
              <p className="text-xs opacity-80">Beijing Union of Liberian Students</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
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
              <div className="text-sm">Loading...</div>
            ) : !isSignedIn ? (
              <>
                <Link href="/auth/signin" className="hover:opacity-80 transition-opacity font-medium">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="bg-[#EF3340] px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md">
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

      {/* Hero Section */}
      <main className="flex-1 flex">
        {/* Left Side - Content */}
        <div className="w-1/2 flex flex-col justify-center px-12 py-16">
          <div className="inline-block bg-[#EF3340]/10 text-[#EF3340] px-4 py-2 rounded-full text-sm font-bold mb-6 w-fit">
            🎓 Empowering Liberian Students in China
          </div>
          
          <h1 className="text-5xl font-black text-[#00205B] mb-4 leading-tight">
            Welcome to BULS
          </h1>
          <h2 className="text-2xl text-[#EF3340] font-bold mb-8">
            Beijing Union of Liberian Students
          </h2>
          
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Join our vibrant community of Liberian students in Beijing. Connect, collaborate, and grow together 
            while representing our beautiful homeland across all 15 counties. We're building bridges between 
            Liberia and China through education, culture, and unity.
          </p>

          <div className="space-y-4 mb-12">
            <Link 
              href="/auth/signup"
              className="inline-block bg-[#00205B] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-900 transition-colors shadow-lg hover:shadow-xl"
            >
              Join Our Community
            </Link>
            
            <Link
              href="/about"
              className="inline-block border-2 border-[#00205B] text-[#00205B] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#00205B] hover:text-white transition-colors ml-4"
            >
              Learn More
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg">
              <div className="text-3xl font-bold text-[#00205B]">15</div>
              <div className="text-sm text-gray-500 font-medium">Counties</div>
            </div>
            <div className="text-center p-4 rounded-lg">
              <div className="text-3xl font-bold text-[#EF3340]">100+</div>
              <div className="text-sm text-gray-500 font-medium">Members</div>
            </div>
            <div className="text-center p-4 rounded-lg">
              <div className="text-3xl font-bold text-[#00205B]">50+</div>
              <div className="text-sm text-gray-500 font-medium">Events</div>
            </div>
          </div>
        </div>

        {/* Right Side - County Flags Animation */}
        <div className="w-1/2 flex items-center justify-center bg-white">
          <CountyFlags />
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#00205B] mb-4">Why Join BULS?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover the benefits of being part of our growing community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Networking</h3>
              <p className="text-gray-600">
                Connect with fellow Liberian students, alumni, and professionals in China and beyond
              </p>
            </div>

            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Academic Support</h3>
              <p className="text-gray-600">
                Access study resources, mentorship programs, and academic guidance from experienced members
              </p>
            </div>

            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Cultural Events</h3>
              <p className="text-gray-600">
                Celebrate Liberian culture through festivals, national holidays, and community gatherings
              </p>
            </div>

            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Career Opportunities</h3>
              <p className="text-gray-600">
                Get access to job opportunities, internships, and career development resources
              </p>
            </div>

            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Leadership</h3>
              <p className="text-gray-600">
                Develop leadership skills through committee roles and organizational management
              </p>
            </div>

            <div className="p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-[#00205B] mb-3">Global Connections</h3>
              <p className="text-gray-600">
                Build relationships with Liberian communities worldwide and international organizations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Status Check Section */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#00205B] mb-4">Check Event Registration Status</h2>
            <p className="text-gray-600">
              Enter your 5-digit verification code to check your non-member event registration status
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter 5-digit code"
                maxLength={5}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={checkRegistrationStatus}
                disabled={checking || verificationCode.length !== 5}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center gap-2"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Check Status
                  </>
                )}
              </button>
            </div>

            {registration && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Registration Details</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(registration.status)}`}>
                    {getStatusText(registration.status)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium text-gray-900">{registration.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{registration.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium text-gray-900">{registration.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Event:</span>
                    <p className="font-medium text-gray-900">{registration.events?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Event Date:</span>
                    <p className="font-medium text-gray-900">
                      {(registration.events?.event_date || registration.events?.start_date)
                        ? new Date(registration.events.event_date || registration.events.start_date).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Location:</span>
                    <p className="font-medium text-gray-900">{registration.events?.location || 'N/A'}</p>
                  </div>
                </div>

                {registration.status === 'payment_pending' && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⏳ Your payment is being verified. You will be notified once approved.
                    </p>
                  </div>
                )}

                {registration.status === 'approved' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Your registration has been approved! We look forward to seeing you at the event.
                    </p>
                  </div>
                )}

                {registration.status === 'rejected' && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ Your registration was not approved. Please contact us for more information.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#00205B] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Join Our Community?</h2>
          <p className="text-white/80 mb-8 text-lg">
            Become part of a growing network of Liberian students in Beijing. Sign up today and start connecting!
          </p>
          <Link 
            href="/auth/signup"
            className="inline-block bg-[#EF3340] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#001a4d] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">🇱🇷</span>
                <div>
                  <h3 className="text-xl font-bold">BULS</h3>
                  <p className="text-xs opacity-80">Beijing Union of Liberian Students</p>
                </div>
              </div>
              <p className="text-sm opacity-80">
                Connecting Liberian students in China through unity, education, and cultural exchange.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/" className="hover:opacity-100 hover:text-[#EF3340]">Home</Link></li>
                <li><Link href="/about" className="hover:opacity-100 hover:text-[#EF3340]">About Us</Link></li>
                <li><Link href="/events" className="hover:opacity-100 hover:text-[#EF3340]">Events</Link></li>
                <li><Link href="/members" className="hover:opacity-100 hover:text-[#EF3340]">Members</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/faq" className="hover:opacity-100 hover:text-[#EF3340]">FAQ</Link></li>
                <li><Link href="/contact" className="hover:opacity-100 hover:text-[#EF3340]">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Contact Us</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li>📍 Beijing, China</li>
                <li>📧 contact@buls.org</li>
                <li>📱 +86 XXX XXXX XXXX</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm opacity-80">
              © {new Date().getFullYear()} Beijing Union of Liberian Students. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link href="#" className="text-white/80 hover:text-white text-sm">Privacy Policy</Link>
              <Link href="#" className="text-white/80 hover:text-white text-sm">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}