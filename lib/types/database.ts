export type UserRole = 'admin' | 'finance' | 'treasurer' | 'secretary' | 'embassy' | 'member'
export type UserStatus = 'pending' | 'active' | 'transferred' | 'dropped' | 'graduated'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'wechat' | 'alipay' | 'bank'
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'repaid'
export type ActionType = 
  | 'payment_approved' 
  | 'payment_rejected' 
  | 'user_approved' 
  | 'user_rejected'
  | 'loan_approved' 
  | 'loan_rejected'
  | 'loan_repaid'
  | 'role_changed'
  | 'status_changed'

export interface User {
  id: string
  clerk_id: string
  full_name: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface MemberProfile {
  id: string
  user_id: string
  member_id: string
  photo_url?: string
  age?: number
  phone?: string
  university?: string
  address?: string
  monthly_due_amount: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  month: string
  year: number
  amount: number
  payment_method: PaymentMethod
  proof_url: string
  reference_code: string
  status: PaymentStatus
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  locked: boolean
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  user_id: string
  amount: number
  reason: string
  status: LoanStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  repaid_at?: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  action_type: ActionType
  performed_by: string
  target_id: string
  details?: any
  timestamp: string
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

export type Month = typeof MONTHS[number]
