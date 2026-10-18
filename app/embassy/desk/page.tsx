'use client'

/**
 * Embassy staff dashboard — consular case queue.
 * Fees verified by Embassy staff only (not Treasurer).
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Fraunces, Outfit } from 'next/font/google'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Inbox,
  Search,
  UserPlus,
  Printer,
  Mail,
  FileText,
  Clock,
  CalendarDays,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  EMBASSY_SERVICE_TYPES,
  EMBASSY_STATUSES,
  OFFICIAL_PASSPORT_URL,
  OFFICIAL_RECEIPT_VERIFY_URL,
  SERVICE_LABELS,
  STATUS_LABELS,
  type EmbassyCaseStatus,
  type EmbassyServiceType,
} from '@/lib/embassy'
import styles from './desk.module.css'

const deskSans = Outfit({
  subsets: ['latin'],
  variable: '--font-embassy-sans',
  display: 'swap',
})

const deskDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-embassy-display',
  display: 'swap',
})

type QueueChip =
  | 'action'
  | 'submitted'
  | 'docs'
  | 'payment'
  | 'progress'
  | 'ready'
  | 'completed'
  | 'all'

const PAYLOAD_LABELS: Record<string, string> = {
  full_name: 'Full name',
  date_of_birth: 'Date of birth',
  passport_number: 'Passport number',
  passport_issue_date: 'Passport issue date',
  passport_expiration_date: 'Passport expiry',
  phone: 'Phone (China)',
  china_address: 'China address',
  pickup_location: 'Pickup location',
  liberia_contact_1_name: 'Liberia contact 1 name',
  liberia_contact_1_phone: 'Liberia contact 1 phone',
  liberia_contact_2_name: 'Liberia contact 2 name',
  liberia_contact_2_phone: 'Liberia contact 2 phone',
  reason: 'Reason',
  immigration_address: 'Immigration / residence address',
  university: 'University',
  teacher_name: 'Teacher / advisor',
  teacher_phone: 'Teacher phone',
  city: 'City',
  expected_date: 'Expected date',
  document_type: 'Document type',
  purpose: 'Purpose',
}

function formatValue(key: string, value: unknown) {
  if (value == null || value === '') return '—'
  if (key === 'pickup_location') {
    if (value === 'beijing') return 'Beijing Embassy'
    if (value === 'monrovia') return 'Monrovia (Liberia)'
  }
  return String(value)
}

function matchesQueue(c: any, chip: QueueChip) {
  if (chip === 'all') return true
  if (chip === 'submitted') return c.status === 'submitted'
  if (chip === 'docs') return c.status === 'docs_requested'
  if (chip === 'payment') {
    return (
      c.status === 'awaiting_payment_proof' ||
      c.embassy_fee_status === 'proof_uploaded' ||
      c.embassy_fee_status === 'unpaid'
    )
  }
  if (chip === 'progress') {
    return c.status === 'under_review' || c.status === 'in_progress'
  }
  if (chip === 'ready') return c.status === 'ready'
  if (chip === 'completed') return c.status === 'completed'
  // action = needs staff attention
  return [
    'submitted',
    'under_review',
    'docs_requested',
    'awaiting_payment_proof',
    'in_progress',
  ].includes(c.status)
}

export default function EmbassyDeskPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [queueChip, setQueueChip] = useState<QueueChip>('action')
  const [filterService, setFilterService] = useState('')
  const [search, setSearch] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [deskTab, setDeskTab] = useState<'cases' | 'expiry'>('cases')
  const [membersExpiry, setMembersExpiry] = useState<any[]>([])
  const [expiryLoading, setExpiryLoading] = useState(false)
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'attention' | 'passport' | 'visa'>(
    'attention'
  )
  const [expirySearch, setExpirySearch] = useState('')

  useEffect(() => {
    if (userId) bootstrap()
  }, [userId])

  const bootstrap = async () => {
    try {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      if (!userData || (userData.role !== 'admin' && userData.role !== 'embassy')) {
        toast.error('Access denied. Embassy panel requires embassy or admin role.')
        router.push('/dashboard')
        return
      }
      setUser(userData)
      await loadCases()
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadCases = async () => {
    const params = new URLSearchParams()
    if (filterService) params.set('service_type', filterService)
    const res = await fetch(`/api/embassy/cases?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load cases')
    setCases(data.cases || [])
  }

  const loadMembersExpiry = async () => {
    setExpiryLoading(true)
    try {
      const res = await fetch('/api/embassy/members-expiry')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load members')
      setMembersExpiry(data.members || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load passport/visa table')
    } finally {
      setExpiryLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadCases().catch((e) => toast.error(e.message))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterService, user?.id])

  useEffect(() => {
    if (user && deskTab === 'expiry' && membersExpiry.length === 0) {
      loadMembersExpiry()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskTab, user?.id])

  const filteredExpiry = useMemo(() => {
    const q = expirySearch.trim().toLowerCase()
    return membersExpiry.filter((m) => {
      if (expiryFilter === 'attention') {
        const needs =
          m.passport_urgency === 'expired' ||
          m.passport_urgency === 'critical' ||
          m.passport_urgency === 'soon' ||
          m.visa_urgency === 'expired' ||
          m.visa_urgency === 'critical' ||
          m.visa_urgency === 'soon' ||
          m.passport_urgency === 'unknown' ||
          m.visa_urgency === 'unknown'
        if (!needs) return false
      }
      if (expiryFilter === 'passport') {
        if (
          !(
            m.passport_urgency === 'expired' ||
            m.passport_urgency === 'critical' ||
            m.passport_urgency === 'soon'
          )
        ) {
          return false
        }
      }
      if (expiryFilter === 'visa') {
        if (
          !(
            m.visa_urgency === 'expired' ||
            m.visa_urgency === 'critical' ||
            m.visa_urgency === 'soon'
          )
        ) {
          return false
        }
      }
      if (!q) return true
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.passport_number?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.university?.toLowerCase().includes(q)
      )
    })
  }, [membersExpiry, expiryFilter, expirySearch])

  const counts = useMemo(() => {
    const n = (chip: QueueChip) => cases.filter((c) => matchesQueue(c, chip)).length
    return {
      action: n('action'),
      submitted: n('submitted'),
      docs: n('docs'),
      payment: n('payment'),
      progress: n('progress'),
      ready: n('ready'),
      completed: n('completed'),
      all: cases.length,
    }
  }, [cases])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = cases.filter((c) => matchesQueue(c, queueChip))

    if (q) {
      list = list.filter((c) => {
        const name = c.member?.full_name?.toLowerCase() || ''
        const email = c.member?.email?.toLowerCase() || ''
        const phone = c.member?.phone_number?.toLowerCase() || ''
        const passport = String(c.payload?.passport_number || '').toLowerCase()
        const lra = String(c.lra_bill_number || '').toLowerCase()
        const receipt = String(c.payment_receipt_number || '').toLowerCase()
        const service = (
          SERVICE_LABELS[c.service_type as EmbassyServiceType] || c.service_type
        ).toLowerCase()
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          passport.includes(q) ||
          lra.includes(q) ||
          receipt.includes(q) ||
          service.includes(q)
        )
      })
    }

    // Oldest first in work queues
    return [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [cases, queueChip, search])

  const openCase = async (id: string) => {
    try {
      const res = await fetch(`/api/embassy/cases/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSelected(data.case)
      setProfile(data.profile)
      setInternalNotes(data.case.embassy_internal_notes || '')
      setStatusNote('')
      setMobileShowDetail(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const patchCase = async (body: Record<string, any>) => {
    if (!selected?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/embassy/cases/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setSelected(data.case)
      setInternalNotes(data.case.embassy_internal_notes || '')
      toast.success(
        body.status
          ? 'Status updated — use Email member to notify'
          : 'Updated'
      )
      await loadCases()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const openMemberEmail = (c: any = selected) => {
    if (!c?.member?.email) {
      toast.error('No member email on file')
      return
    }
    const service =
      SERVICE_LABELS[c.service_type as EmbassyServiceType] || c.service_type
    const status = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] || c.status
    const subject = encodeURIComponent(`Embassy case update: ${service}`)
    const body = encodeURIComponent(
      `Dear ${c.member.full_name || 'Member'},\n\n` +
        `Your Liberian Embassy Beijing case (${service}) is now: ${status}.\n` +
        (statusNote ? `\nNote: ${statusNote}\n` : '') +
        `\nPlease check Embassy Services in BULS for documents and next steps.\n\n` +
        `Liberian Embassy · Beijing`
    )
    window.open(`mailto:${c.member.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const printCase = () => {
    if (!selected) return
    window.print()
  }

  const payloadEntries = useMemo(() => {
    const p = selected?.payload || {}
    const keys = Object.keys(PAYLOAD_LABELS).filter(
      (k) => p[k] != null && String(p[k]).trim() !== ''
    )
    // Also include any extra payload keys
    Object.keys(p).forEach((k) => {
      if (!keys.includes(k) && p[k] != null && String(p[k]).trim() !== '') keys.push(k)
    })
    return keys.map((k) => ({
      key: k,
      label: PAYLOAD_LABELS[k] || k.replace(/_/g, ' '),
      value: formatValue(k, p[k]),
    }))
  }, [selected])

  const receiptDocs = (selected?.documents || []).filter(
    (d: any) => d.doc_type === 'receipt'
  )

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role || 'embassy'}>
        <div className={`${deskSans.variable} ${deskDisplay.variable} ${styles.page}`}>
          <div className={styles.loadingWrap}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--emb-navy)' }} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className={`${deskSans.variable} ${deskDisplay.variable} ${styles.page}`}>
        <header className={styles.hero}>
          <div className={styles.heroMedia} aria-hidden />
          <div className={styles.heroInner}>
            <h1 className={styles.brand}>Consular Case Desk</h1>
            <p className={styles.sub}>
              Liberian Embassy · Beijing — review requests, verify LRA/passport proofs, and
              track member passport &amp; visa expiry so you know who needs help.
            </p>
            <div className={`${styles.deskTabs} noPrint`}>
              <button
                type="button"
                className={`${styles.deskTab} ${deskTab === 'cases' ? styles.deskTabActive : ''}`}
                onClick={() => setDeskTab('cases')}
              >
                Case queue
              </button>
              <button
                type="button"
                className={`${styles.deskTab} ${deskTab === 'expiry' ? styles.deskTabActive : ''}`}
                onClick={() => setDeskTab('expiry')}
              >
                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                Passport &amp; visa
              </button>
            </div>
            {deskTab === 'cases' && (
              <div className={`${styles.chips} noPrint`}>
                {(
                  [
                    ['action', 'Needs action', false],
                    ['submitted', 'New', false],
                    ['docs', 'Docs', false],
                    ['payment', 'Payment', true],
                    ['progress', 'In progress', false],
                    ['ready', 'Ready', false],
                    ['completed', 'Completed', false],
                    ['all', 'All', false],
                  ] as [QueueChip, string, boolean][]
                ).map(([id, label, warn]) => (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.chip} ${warn ? styles.chipWarn : ''} ${
                      queueChip === id ? styles.chipActive : ''
                    }`}
                    onClick={() => setQueueChip(id)}
                  >
                    {label}
                    <span className={styles.chipCount}>{counts[id]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className={styles.body}>
          {deskTab === 'expiry' ? (
            <>
              <div className={`${styles.toolbar} noPrint`}>
                <div className="relative flex-1 min-w-[180px]">
                  <Search
                    className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--emb-muted)' }}
                  />
                  <input
                    className={styles.search}
                    style={{ paddingLeft: '2rem' }}
                    placeholder="Search member, passport, email, university…"
                    value={expirySearch}
                    onChange={(e) => setExpirySearch(e.target.value)}
                  />
                </div>
                <select
                  className={styles.select}
                  value={expiryFilter}
                  onChange={(e) =>
                    setExpiryFilter(e.target.value as typeof expiryFilter)
                  }
                >
                  <option value="attention">Needs attention</option>
                  <option value="passport">Passport soon / expired</option>
                  <option value="visa">Visa soon / expired</option>
                  <option value="all">All members</option>
                </select>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => loadMembersExpiry()}
                  disabled={expiryLoading}
                >
                  {expiryLoading ? 'Loading…' : 'Refresh'}
                </button>
                <a
                  href={OFFICIAL_PASSPORT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.btnGhost}
                >
                  Passport application <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--emb-muted)' }}>
                Showing {filteredExpiry.length} of {membersExpiry.length} members · sorted by
                soonest expiry · help tip suggests renew / T-visa / cancellation
              </p>
              <div className={styles.tableWrap}>
                {expiryLoading && membersExpiry.length === 0 ? (
                  <div className={styles.loadingWrap}>
                    <Loader2
                      className="w-7 h-7 animate-spin"
                      style={{ color: 'var(--emb-navy)' }}
                    />
                  </div>
                ) : filteredExpiry.length === 0 ? (
                  <div className={styles.emptyDetail}>
                    <strong>No members match</strong>
                    <span className="text-sm">Try “All members” or clear search.</span>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Passport #</th>
                        <th>Passport expiry</th>
                        <th>Visa / residence expiry</th>
                        <th>How to help</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpiry.map((m) => (
                        <tr key={m.user_id}>
                          <td>
                            <div className="font-semibold" style={{ color: 'var(--emb-navy)' }}>
                              {m.full_name}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--emb-muted)' }}>
                              {m.email}
                              {m.phone ? ` · ${m.phone}` : ''}
                            </div>
                            {m.university && (
                              <div className="text-xs" style={{ color: 'var(--emb-muted)' }}>
                                {m.university}
                              </div>
                            )}
                          </td>
                          <td>{m.passport_number || '—'}</td>
                          <td>
                            <div>{formatDate(m.passport_expiration_date)}</div>
                            <UrgencyBadge
                              urgency={m.passport_urgency}
                              days={m.passport_days}
                            />
                          </td>
                          <td>
                            <div>{formatDate(m.chinese_visa_expiration_date)}</div>
                            <UrgencyBadge urgency={m.visa_urgency} days={m.visa_days} />
                          </td>
                          <td>
                            <span className={styles.hint}>{m.help_hint}</span>
                          </td>
                          <td>
                            {m.email && (
                              <a
                                href={`mailto:${m.email}?subject=${encodeURIComponent(
                                  'Embassy: passport / visa reminder'
                                )}&body=${encodeURIComponent(
                                  `Dear ${m.full_name},\n\n` +
                                    `This is a reminder from Liberian Embassy Beijing regarding your documents:\n` +
                                    `- Passport expiry: ${formatDate(m.passport_expiration_date)}\n` +
                                    `- Visa/residence expiry: ${formatDate(m.chinese_visa_expiration_date)}\n\n` +
                                    `${m.help_hint}\n\n` +
                                    `You can start a passport application at ${OFFICIAL_PASSPORT_URL}\n` +
                                    `or submit a request in BULS → Embassy Services.\n\n` +
                                    `Liberian Embassy · Beijing`
                                )}`}
                                className={styles.btnLink}
                              >
                                Email
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
          <div className={`${styles.toolbar} noPrint`}>
            <div className="relative flex-1 min-w-[180px]">
              <Search
                className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--emb-muted)' }}
              />
              <input
                className={styles.search}
                style={{ paddingLeft: '2rem' }}
                placeholder="Search name, email, passport, LRA bill…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={styles.select}
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
            >
              <option value="">All services</option>
              {EMBASSY_SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.split}>
            <aside
              className={`${styles.queue} ${
                mobileShowDetail && selected ? styles.hideQueueOnDetail : ''
              }`}
            >
              <div className={styles.queueHead}>
                <span>Queue</span>
                <span>
                  {filtered.length} case{filtered.length === 1 ? '' : 's'} · oldest first
                </span>
              </div>
              {filtered.length === 0 ? (
                <div className={styles.emptyDetail}>
                  <Inbox className="w-8 h-8 mb-2 opacity-40" />
                  <strong>No cases in this queue</strong>
                  <span className="text-sm">Try another filter or clear search.</span>
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCase(c.id)}
                    className={`${styles.caseRow} ${
                      selected?.id === c.id ? styles.caseRowActive : ''
                    }`}
                  >
                    <p className={styles.caseName}>
                      {c.member?.full_name || 'Member'}
                    </p>
                    <p className={styles.caseMeta}>
                      {SERVICE_LABELS[c.service_type as EmbassyServiceType] || c.service_type}
                      {' · '}
                      {new Date(c.created_at).toLocaleDateString()}
                      {c.assignee?.full_name && <> · {c.assignee.full_name}</>}
                      {c.lra_bill_number && <> · LRA {c.lra_bill_number}</>}
                    </p>
                    <span className={styles.status}>
                      {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] || c.status}
                    </span>
                  </button>
                ))
              )}
            </aside>

            <section className={styles.detail}>
              {!selected ? (
                <div className={styles.emptyDetail}>
                  <strong>Select a case</strong>
                  <span className="text-sm">
                    Open a request from the queue to review details and take action.
                  </span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.mobileBack}
                    onClick={() => {
                      setMobileShowDetail(false)
                      setSelected(null)
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to queue
                  </button>

                  <div className={styles.printOnly}>
                    <h1>Embassy Case Sheet</h1>
                    <p>Liberian Embassy · Beijing · BULS Consular Desk</p>
                    <p>Printed {new Date().toLocaleString()}</p>
                  </div>

                  <div className={styles.detailHead}>
                    <div>
                      <h2 className={styles.title}>
                        {SERVICE_LABELS[selected.service_type as EmbassyServiceType] ||
                          selected.service_type}
                      </h2>
                      <p className={styles.caseMeta}>
                        <strong>{selected.member?.full_name}</strong>
                        {selected.member?.email && <> · {selected.member.email}</>}
                        {selected.assignee?.full_name && (
                          <> · Assigned: {selected.assignee.full_name}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={styles.status}>
                        {STATUS_LABELS[selected.status as keyof typeof STATUS_LABELS] ||
                          selected.status}
                      </span>
                      <div className={`${styles.btnRow} noPrint`} style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          disabled={saving}
                          onClick={() => patchCase({ assign_to_me: true })}
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Assign to me
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => openMemberEmail()}
                        >
                          <Mail className="w-3.5 h-3.5" /> Email member
                        </button>
                        <button type="button" className={styles.btnGhost} onClick={printCase}>
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Profile snapshot */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Member profile</h3>
                    <div className={styles.grid2}>
                      <Info
                        label="Date of birth"
                        value={
                          profile?.date_of_birth ||
                          selected.payload?.date_of_birth ||
                          '—'
                        }
                      />
                      <Info
                        label="Passport number"
                        value={
                          profile?.passport_number ||
                          selected.payload?.passport_number ||
                          '—'
                        }
                      />
                      <Info
                        label="Passport expiry"
                        value={
                          profile?.passport_expiration_date ||
                          selected.payload?.passport_expiration_date ||
                          '—'
                        }
                      />
                      <Info
                        label="Phone"
                        value={
                          profile?.phone ||
                          selected.payload?.phone ||
                          selected.member?.phone_number ||
                          '—'
                        }
                      />
                      <Info
                        label="China address"
                        value={
                          profile?.china_address || selected.payload?.china_address || '—'
                        }
                      />
                      <Info
                        label="University"
                        value={profile?.university || selected.payload?.university || '—'}
                      />
                    </div>
                  </div>

                  {/* Request details — labeled, not JSON */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <FileText className="w-4 h-4" /> Request details
                    </h3>
                    {payloadEntries.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--emb-muted)' }}>
                        No details submitted.
                      </p>
                    ) : (
                      <div className={styles.grid2}>
                        {payloadEntries.map((e) => (
                          <Info key={e.key} label={e.label} value={e.value} />
                        ))}
                      </div>
                    )}
                    {selected.member_notes && (
                      <p className="text-sm mt-3">
                        <span className={styles.fieldLabel}>Member notes</span>
                        <span className={styles.fieldValue}>{selected.member_notes}</span>
                      </p>
                    )}
                  </div>

                  {/* Payment workflow */}
                  <div className={`${styles.payBox} noPrint`}>
                    <h3 className={styles.sectionTitle}>Payment verification</h3>
                    <div className={styles.grid2}>
                      <Info label="Channel" value={selected.payment_channel || 'none'} />
                      <Info label="Fee status" value={selected.embassy_fee_status || '—'} />
                      <Info label="LRA Bill No." value={selected.lra_bill_number || '—'} />
                      <Info
                        label="Receipt No."
                        value={selected.payment_receipt_number || '—'}
                      />
                      <Info
                        label="Transaction ID"
                        value={selected.official_transaction_id || '—'}
                      />
                    </div>
                    {receiptDocs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className={styles.fieldLabel}>Uploaded receipts</span>
                        {receiptDocs.map((d: any) => (
                          <div key={d.id}>
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.btnLink}
                            >
                              {d.file_name || 'Receipt'} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.btnRow}>
                      <a
                        href={OFFICIAL_RECEIPT_VERIFY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.btnGhost}
                      >
                        Verify on LRA <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={OFFICIAL_PASSPORT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.btnGhost}
                      >
                        Passport application <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        disabled={
                          saving || selected.embassy_fee_status === 'verified_by_embassy'
                        }
                        className={styles.btnPrimary}
                        onClick={() =>
                          patchCase({
                            verify_payment: true,
                            assign_to_me: true,
                            status_note:
                              statusNote || 'Payment proof verified by Embassy',
                          })
                        }
                      >
                        <CheckCircle className="w-4 h-4" />
                        {selected.embassy_fee_status === 'verified_by_embassy'
                          ? 'Payment verified'
                          : 'Mark verified'}
                      </button>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Documents</h3>
                    <ul className="space-y-1 text-sm">
                      {(selected.documents || []).length === 0 && (
                        <li style={{ color: 'var(--emb-muted)' }}>None uploaded</li>
                      )}
                      {(selected.documents || []).map((d: any) => (
                        <li key={d.id}>
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.btnLink}
                          >
                            {d.doc_type}: {d.file_name || 'file'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Timeline */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <Clock className="w-4 h-4" /> Timeline
                    </h3>
                    <ul className={styles.timeline}>
                      {(selected.history || []).map((h: any) => (
                        <li key={h.id} className={styles.timelineItem}>
                          <span className="text-sm font-semibold">
                            {STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] ||
                              h.to_status}
                          </span>
                          <span
                            className="text-xs ml-2"
                            style={{ color: 'var(--emb-muted)' }}
                          >
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                          {h.note && (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: 'var(--emb-muted)' }}
                            >
                              {h.note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className={`${styles.section} noPrint`}>
                    <h3 className={styles.sectionTitle}>Actions</h3>
                    <input
                      className={styles.input}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Status note (optional — included in email)"
                    />
                    <div className={styles.btnRow}>
                      <select
                        className={styles.select}
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value as EmbassyCaseStatus
                          if (!v) return
                          patchCase({
                            status: v,
                            status_note: statusNote || undefined,
                            assign_to_me: true,
                          })
                          e.target.value = ''
                        }}
                      >
                        <option value="">Set status…</option>
                        {EMBASSY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      {(
                        [
                          ['under_review', 'Under review'],
                          ['docs_requested', 'Docs requested'],
                          ['awaiting_payment_proof', 'Awaiting payment'],
                          ['in_progress', 'In progress'],
                          ['ready', 'Ready'],
                          ['completed', 'Completed'],
                          ['rejected', 'Rejected'],
                        ] as [EmbassyCaseStatus, string][]
                      ).map(([status, label]) => (
                        <button
                          key={status}
                          type="button"
                          disabled={saving}
                          className={styles.btnGhost}
                          onClick={() =>
                            patchCase({
                              status,
                              assign_to_me: true,
                              status_note:
                                statusNote ||
                                (status === 'docs_requested'
                                  ? 'Additional documents requested'
                                  : status === 'rejected'
                                    ? 'Rejected'
                                    : undefined),
                              ...(status === 'awaiting_payment_proof'
                                ? {
                                    embassy_fee_status:
                                      selected.embassy_fee_status ===
                                      'verified_by_embassy'
                                        ? 'verified_by_embassy'
                                        : 'unpaid',
                                  }
                                : {}),
                            })
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${styles.section} noPrint`}>
                    <h3 className={styles.sectionTitle}>Internal notes (staff only)</h3>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                    <div className={styles.btnRow}>
                      <button
                        type="button"
                        disabled={saving}
                        className={styles.btnNavy}
                        onClick={() =>
                          patchCase({
                            embassy_internal_notes: internalNotes,
                            assign_to_me: true,
                          })
                        }
                      >
                        Save internal notes
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

function UrgencyBadge({
  urgency,
  days,
}: {
  urgency: string
  days: number | null
}) {
  if (urgency === 'unknown' || days == null) {
    return <span className={styles.badgeUnknown}>No date</span>
  }
  const label =
    days < 0
      ? `Expired ${Math.abs(days)}d`
      : days === 0
        ? 'Today'
        : `${days}d left`
  const cls =
    urgency === 'expired'
      ? styles.badgeExpired
      : urgency === 'critical'
        ? styles.badgeCritical
        : urgency === 'soon'
          ? styles.badgeSoon
          : styles.badgeOk
  return <span className={cls}>{label}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  )
}
