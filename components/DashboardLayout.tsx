'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { 
  LayoutDashboard, 
  CreditCard, 
  Calendar as CalendarIcon,
  Megaphone,
  Banknote,
  History,
  Cake,
  Settings as SettingsIcon,
  Users,
  User,
  X,
  Menu,
  FileText,
  LogOut,
  Ticket,
  Building2,
  Inbox
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import RegistrationCheck from './RegistrationCheck'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: string
}

/**
 * Staff role `embassy` gets a slim consular nav only — not member dues/loans/tickets.
 * Admin keeps full nav + Embassy Desk.
 */
const NAVIGATION_ITEMS = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Registration', href: '/registration', icon: User, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Loans', href: '/loans', icon: Banknote, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Payment History', href: '/payment-history', icon: History, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Meetings', href: '/meetings', icon: CalendarIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Events', href: '/events', icon: CalendarIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'My Tickets', href: '/my-tickets', icon: Ticket, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Embassy Services', href: '/embassy', icon: FileText, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['admin', 'finance', 'treasurer', 'secretary', 'embassy', 'member'] },
    { name: 'Birthday Photos', href: '/birthdays', icon: Cake, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
    // Regular members only see this when they are a committee/budget head (checked dynamically below)
    { name: 'Budget Proposals', href: '/my-budget-proposals', icon: FileText, roles: ['admin', 'finance', 'treasurer', 'secretary'] },
    { name: 'Settings', href: '/settings', icon: SettingsIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'embassy', 'member'] },
    { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['admin'] },
    { name: 'Manage Ranks', href: '/admin/ranks', icon: Users, roles: ['admin', 'secretary'] },
    { name: 'Manage Dues', href: '/admin/dues', icon: CreditCard, roles: ['admin'] },
    { name: 'Finance Panel', href: '/finance', icon: FileText, roles: ['admin', 'finance'] },
    { name: 'Treasurer Panel', href: '/treasurer', icon: Banknote, roles: ['admin', 'treasurer'] },
    { name: 'Secretary Panel', href: '/secretary', icon: FileText, roles: ['admin', 'secretary'] },
    // Embassy staff home + case queue
    { name: 'Case Queue', href: '/embassy/desk', icon: Inbox, roles: ['admin', 'embassy'] },
  ] as const

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const { user: clerkUser } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasCompletedRegistration, setHasCompletedRegistration] = useState(false)

  // Registration check once per session (layout remounts on every page — don't re-hit DB)
  useEffect(() => {
    if (!clerkUser) return

    const cacheKey = `buls_registered_${clerkUser.id}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached != null) {
        setHasCompletedRegistration(cached === '1')
        return
      }
    } catch {
      /* ignore */
    }

    let cancelled = false
    ;(async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client-browser')
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkUser.id)
          .maybeSingle()

        if (!userData || cancelled) return

        const { data: profile } = await supabase
          .from('members_profile')
          .select('member_id')
          .eq('user_id', userData.id)
          .maybeSingle()

        const isRegistered = !!profile?.member_id
        if (cancelled) return
        setHasCompletedRegistration(isRegistered)
        try {
          sessionStorage.setItem(cacheKey, isRegistered ? '1' : '0')
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('Error checking registration:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clerkUser])

  const isEmbassyStaff = userRole === 'embassy'

  // Budget Proposals: staff only in nav (no per-page API). Committee heads use /my-budget-proposals directly.
  const filteredNavigation = useMemo(() => {
    const roleToCheck = (userRole || 'member') as 'admin' | 'finance' | 'treasurer' | 'secretary' | 'embassy' | 'member'
    return NAVIGATION_ITEMS.filter(item => {
      if (item.name === 'Registration' && hasCompletedRegistration) {
        return false
      }
      return item.roles.includes(roleToCheck)
    })
  }, [userRole, hasCompletedRegistration])

  const brandTitle = isEmbassyStaff ? 'Embassy Desk' : 'BULS Beijing'
  const BrandIcon = isEmbassyStaff ? Building2 : Users

  const linkIsActive = (href: string) =>
    pathname === href ||
    (href === '/embassy/desk' && pathname?.startsWith('/embassy/desk')) ||
    (href === '/my-budget-proposals' && pathname?.startsWith('/budget-proposals'))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Registration check — skipped for embassy staff inside component */}
      <RegistrationCheck />
      
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 ${isEmbassyStaff ? 'bg-[#003366]' : 'bg-[#D62828]'} rounded-lg flex items-center justify-center`}>
                  <BrandIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[#003366]">{brandTitle}</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {filteredNavigation.map((item) => {
                const isActive = linkIsActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#003366] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 ${isEmbassyStaff ? 'bg-[#003366]' : 'bg-[#D62828]'} rounded-lg flex items-center justify-center`}>
                <BrandIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="block text-lg font-bold text-[#003366] leading-tight">{brandTitle}</span>
                {isEmbassyStaff && (
                  <span className="block text-[10px] uppercase tracking-wide text-gray-500">Liberia · Beijing</span>
                )}
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = linkIsActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#003366] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 shadow-sm">
          <button
            className="px-4 text-gray-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center justify-between flex-1 px-4">
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <button
                onClick={async () => {
                  await signOut()
                  router.push('/')
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="px-4 mx-auto max-w-[1600px] sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
