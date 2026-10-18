/**
 * Liberian Embassy Beijing consular cases.
 * Embassy fees are handled by Embassy staff only; BULS Treasurer is not involved.
 */

export const EMBASSY_SERVICE_TYPES = [
  'passport_renewal',
  'passport_new',
  't_visa',
  'student_visa_cancellation',
  'document_request',
] as const

export type EmbassyServiceType = (typeof EMBASSY_SERVICE_TYPES)[number]

export const EMBASSY_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'docs_requested',
  'awaiting_payment_proof',
  'in_progress',
  'ready',
  'completed',
  'rejected',
  'cancelled',
] as const

export type EmbassyCaseStatus = (typeof EMBASSY_STATUSES)[number]

export const EMBASSY_PAYMENT_CHANNELS = [
  'none',
  'embassy_direct',
  'liberia_lra',
  'overseas_official',
  'other',
] as const

export type EmbassyPaymentChannel = (typeof EMBASSY_PAYMENT_CHANNELS)[number]

export const EMBASSY_FEE_STATUSES = [
  'not_required',
  'unpaid',
  'proof_uploaded',
  'verified_by_embassy',
] as const

export type EmbassyFeeStatus = (typeof EMBASSY_FEE_STATUSES)[number]

export const EMBASSY_DOC_TYPES = [
  'passport_bio',
  'photo',
  'receipt',
  'university_letter',
  'residence_permit',
  'other',
] as const

export type EmbassyDocType = (typeof EMBASSY_DOC_TYPES)[number]

export const SERVICE_LABELS: Record<EmbassyServiceType, string> = {
  passport_renewal: 'Passport Renewal',
  passport_new: 'New / Replacement Passport',
  t_visa: 'T-Visa Support',
  student_visa_cancellation: 'Student Visa Cancellation',
  document_request: 'Document Request',
}

export const STATUS_LABELS: Record<EmbassyCaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  docs_requested: 'Documents Requested',
  awaiting_payment_proof: 'Awaiting Payment Proof',
  in_progress: 'In Progress',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

/** Official MFA passport application (renew / new / replacement) */
export const OFFICIAL_PASSPORT_URL =
  'https://secure.liberiapassports.com/Application.aspx'
export const OFFICIAL_LRA_BILL_URL = 'https://secure.liberiapassports.com/lrabilling/'
export const OFFICIAL_RECEIPT_VERIFY_URL =
  'https://secure.liberiapassports.com/renew/verifybill.aspx'

export function isEmbassyStaff(role: string | null | undefined): boolean {
  return role === 'embassy' || role === 'admin'
}

/** Strip staff-only fields before returning a case to a member. */
export function sanitizeCaseForMember<T extends Record<string, any>>(row: T): Omit<T, 'embassy_internal_notes'> {
  const { embassy_internal_notes: _omit, ...rest } = row
  return rest
}

export function validatePayload(
  serviceType: EmbassyServiceType,
  payload: Record<string, any>
): string | null {
  const p = payload || {}
  if (serviceType === 'passport_renewal' || serviceType === 'passport_new') {
    if (!p.full_name?.trim()) return 'Full name is required'
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.phone?.trim()) return 'Phone is required'
    if (!p.china_address?.trim()) return 'China address is required'
  }
  if (serviceType === 't_visa') {
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.reason?.trim()) return 'Reason for T-visa is required'
    if (!p.immigration_address?.trim()) return 'Immigration / residence address is required'
    if (!p.university?.trim()) return 'University is required'
    if (!p.teacher_name?.trim()) return 'Teacher / advisor name is required'
  }
  if (serviceType === 'student_visa_cancellation') {
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.university?.trim()) return 'University is required'
    if (!p.city?.trim()) return 'City is required'
    if (!p.reason?.trim()) return 'Reason is required'
  }
  if (serviceType === 'document_request') {
    if (!p.document_type?.trim()) return 'Document type is required'
    if (!p.purpose?.trim()) return 'Purpose is required'
  }
  return null
}
