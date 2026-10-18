'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
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
  QrCode
} from 'lucide-react'
import { useState, useMemo } from 'react'
import RegistrationCheck from './RegistrationCheck'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: string
}

// Define navigation outside component to prevent recreation on every render
const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Registration', href: '/registration', icon: User, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['admin'] },
  { name: 'Manage Ranks', href: '/admin/ranks', icon: Users, roles: ['admin', 'secretary'] },
  { name: 'Manage Dues', href: '/admin/dues', icon: CreditCard, roles: ['admin'] },
  { name: 'QR Codes', href: '/admin/qr-codes', icon: QrCode, roles: ['admin'] },
  { name: 'Finance Panel', href: '/finance', icon: FileText, roles: ['admin', 'finance'] },
  { name: 'Treasurer Panel', href: '/treasurer', icon: Banknote, roles: ['admin', 'treasurer'] },
  { name: 'Ticket Approvals', href: '/treasurer/tickets', icon: Ticket, roles: ['admin', 'treasurer'] },
  { name: 'Secretary Panel', href: '/secretary', icon: FileText, roles: ['admin', 'secretary'] },
  { name: 'Meetings', href: '/meetings', icon: CalendarIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Events', href: '/events', icon: CalendarIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'My Tickets', href: '/my-tickets', icon: Ticket, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Birthday Photos', href: '/birthdays', icon: Cake, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, roles: ['admin', 'finance', 'treasurer', 'secretary', 'member'] },
] as const

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Filter navigation based on user's actual role
  const filteredNavigation = useMemo(() => {
    const roleToCheck = (userRole || 'member') as 'admin' | 'finance' | 'treasurer' | 'secretary' | 'member'
    return NAVIGATION_ITEMS.filter(item => item.roles.includes(roleToCheck))
  }, [userRole])

  // ... rest of the component
}

