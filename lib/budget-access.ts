/** Committee member roles that can fill/edit draft budget proposals */
export const COMMITTEE_HEAD_ROLES = new Set([
  'head',
  'chair',
  'chairman',
  'chairperson',
  'leader',
  'budget_head',
  'coordinator',
  'committee_head',
  'president',
])

/**
 * True for head-like committee roles (e.g. Cooking committee head).
 * Matches exact known roles and any role containing "head" / "chair" / "lead".
 */
export function isCommitteeHeadRole(role?: string | null) {
  if (!role) return false
  const normalized = String(role).toLowerCase().trim()
  if (COMMITTEE_HEAD_ROLES.has(normalized)) return true
  return (
    normalized.includes('head') ||
    normalized.includes('chair') ||
    normalized.includes('lead') ||
    normalized.includes('coordinator')
  )
}

export const STAFF_ROLES = new Set(['admin', 'secretary', 'treasurer', 'finance'])

/** Roles that can see ALL proposals and manage the approval workflow */
export const APPROVAL_STAFF_ROLES = new Set(['admin', 'secretary'])

/** Roles that can see approved/paid proposals and record payments (TREASURER ONLY) */
export const PAYMENT_STAFF_ROLES = new Set(['treasurer'])

/** Roles that can VIEW approved/paid proposals but cannot record payments (FINANCE) */
export const FINANCE_VIEW_ROLES = new Set(['finance'])

export function isStaffRole(role?: string | null) {
  if (!role) return false
  return STAFF_ROLES.has(String(role).toLowerCase().trim())
}

/** True for admin/secretary who manage approval workflow (see all proposals) */
export function isApprovalStaff(role?: string | null) {
  if (!role) return false
  return APPROVAL_STAFF_ROLES.has(String(role).toLowerCase().trim())
}

/** True for treasurer who handles payments (see approved proposals only, can record payments) */
export function isPaymentStaff(role?: string | null) {
  if (!role) return false
  return PAYMENT_STAFF_ROLES.has(String(role).toLowerCase().trim())
}

/** True for finance who views approved proposals (read-only for budget proposals) */
export function isFinanceView(role?: string | null) {
  if (!role) return false
  return FINANCE_VIEW_ROLES.has(String(role).toLowerCase().trim())
}
