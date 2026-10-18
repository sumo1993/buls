'use client'

/**
 * Member Embassy Services — consular case tracking.
 * Embassy fees are handled by Embassy staff only; BULS Treasurer is not involved.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Fraunces, Outfit } from 'next/font/google'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Loader2,
  Plus,
  ArrowLeft,
  ExternalLink,
  Upload,
  FileText,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  EMBASSY_SERVICE_TYPES,
  OFFICIAL_LRA_BILL_URL,
  OFFICIAL_PASSPORT_URL,
  OFFICIAL_RECEIPT_VERIFY_URL,
  SERVICE_LABELS,
  STATUS_LABELS,
  type EmbassyServiceType,
} from '@/lib/embassy'
import styles from './embassy.module.css'

const embassySans = Outfit({
  subsets: ['latin'],
  variable: '--font-embassy-sans',
  display: 'swap',
})

const embassyDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-embassy-display',
  display: 'swap',
})

type View = 'list' | 'new' | 'detail'

const emptyPayload = () => ({
  full_name: '',
  date_of_birth: '',
  passport_number: '',
  passport_issue_date: '',
  passport_expiration_date: '',
  phone: '',
  china_address: '',
  pickup_location: 'beijing',
  liberia_contact_1_name: '',
  liberia_contact_1_phone: '',
  liberia_contact_2_name: '',
  liberia_contact_2_phone: '',
  reason: '',
  immigration_address: '',
  university: '',
  teacher_name: '',
  teacher_phone: '',
  city: '',
  expected_date: '',
  document_type: '',
  purpose: '',
})

export default function EmbassyMemberPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [serviceType, setServiceType] = useState<EmbassyServiceType>('passport_renewal')
  const [payload, setPayload] = useState(emptyPayload())
  const [memberNotes, setMemberNotes] = useState('')
  const [paymentChannel, setPaymentChannel] = useState('none')
  const [lraBill, setLraBill] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [officialTxn, setOfficialTxn] = useState('')
  const [pendingFiles, setPendingFiles] = useState<{ file: File; docType: string }[]>([])

  useEffect(() => {
    if (userId) load()
  }, [userId])

  const load = async () => {
    try {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()
      setUser(userData)

      const res = await fetch('/api/embassy/cases')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load cases')
      setCases(data.cases || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const openNew = async () => {
    setServiceType('passport_renewal')
    setPayload(emptyPayload())
    setMemberNotes('')
    setPaymentChannel('none')
    setLraBill('')
    setReceiptNumber('')
    setOfficialTxn('')
    setPendingFiles([])
    setView('new')
    try {
      const res = await fetch('/api/embassy/profile-prefill')
      if (res.ok) {
        const p = await res.json()
        setPayload((prev) => ({
          ...prev,
          full_name: p.full_name || '',
          passport_number: p.passport_number || '',
          passport_issue_date: p.passport_issue_date || '',
          passport_expiration_date: p.passport_expiration_date || '',
          date_of_birth: p.date_of_birth || '',
          phone: p.phone || '',
          china_address: p.china_address || '',
          university: p.university || '',
        }))
      }
    } catch {
      /* ignore */
    }
  }

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/embassy/cases/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load case')
      setSelected(data.case)
      setView('detail')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const setField = (key: string, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  const isPassport =
    serviceType === 'passport_renewal' || serviceType === 'passport_new'

  const submitCase = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/embassy/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          payload,
          member_notes: memberNotes,
          payment_channel: isPassport ? paymentChannel : 'none',
          lra_bill_number: lraBill || null,
          payment_receipt_number: receiptNumber || null,
          official_transaction_id: officialTxn || null,
          status: 'submitted',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')

      const caseId = data.case.id
      for (const item of pendingFiles) {
        await uploadAndAttach(caseId, item.file, item.docType)
      }

      toast.success('Request submitted to Embassy')
      await load()
      await openDetail(caseId)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const uploadAndAttach = async (caseId: string, file: File, docType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('caseId', caseId)
    form.append('docType', docType)
    const up = await fetch('/api/upload-embassy-document', { method: 'POST', body: form })
    const upData = await up.json()
    if (!up.ok) throw new Error(upData.error || 'Upload failed')

    const att = await fetch(`/api/embassy/cases/${caseId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type: docType,
        file_url: upData.url,
        file_name: upData.fileName,
      }),
    })
    const attData = await att.json()
    if (!att.ok) throw new Error(attData.error || 'Failed to attach document')
  }

  const uploadToExisting = async (file: File, docType: string) => {
    if (!selected?.id) return
    setUploading(true)
    try {
      await uploadAndAttach(selected.id, file, docType)
      if (docType === 'receipt') {
        await fetch(`/api/embassy/cases/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mark_proof_uploaded: true }),
        })
      }
      toast.success('Document uploaded')
      await openDetail(selected.id)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const resubmit = async () => {
    if (!selected?.id) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/embassy/cases/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Resubmitted for review')
      await openDetail(selected.id)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const savePaymentProof = async () => {
    if (!selected?.id) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/embassy/cases/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lra_bill_number: lraBill || selected.lra_bill_number,
          payment_receipt_number: receiptNumber || selected.payment_receipt_number,
          official_transaction_id: officialTxn || selected.official_transaction_id,
          payment_channel: paymentChannel !== 'none' ? paymentChannel : selected.payment_channel,
          mark_proof_uploaded: true,
          status:
            selected.status === 'awaiting_payment_proof' ? 'submitted' : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Payment details saved')
      await openDetail(selected.id)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const goList = () => {
    setView('list')
    setSelected(null)
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className={`${embassySans.variable} ${embassyDisplay.variable} ${styles.page}`}>
          <div className={styles.loadingWrap}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--emb-navy)' }} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className={`${embassySans.variable} ${embassyDisplay.variable} ${styles.page}`}>
        <header className={styles.hero}>
          <div className={styles.heroMedia} aria-hidden />
          <div className={styles.heroContent}>
            <p className={styles.brand}>Embassy Services</p>
            <p className={styles.headline}>Consular help for Liberian students in Beijing</p>
            <p className={styles.support}>
              Passport, T-visa, visa cancellation, and documents — tracked here. Official MFA/LRA
              fees are paid outside BULS.
            </p>
            <div className={styles.ctaRow}>
              {view === 'list' ? (
                <button type="button" onClick={openNew} className={styles.btnPrimary}>
                  <Plus className="w-4 h-4" /> New request
                </button>
              ) : (
                <button type="button" onClick={goList} className={styles.btnGhost}>
                  <ArrowLeft className="w-4 h-4" /> Back to requests
                </button>
              )}
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {view === 'list' && (
            <section>
              <h2 className={styles.sectionTitle}>Your requests</h2>
              <p className={styles.sectionSub}>Open a case to see status, timeline, and documents.</p>
              {cases.length === 0 ? (
                <div className={styles.empty}>
                  No requests yet. Start one when you need Embassy support.
                </div>
              ) : (
                <div className={styles.caseList}>
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openDetail(c.id)}
                      className={styles.caseRow}
                    >
                      <div>
                        <p className={styles.caseTitle}>
                          {SERVICE_LABELS[c.service_type as EmbassyServiceType] || c.service_type}
                        </p>
                        <p className={styles.caseMeta}>
                          {new Date(c.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={styles.status}>
                        {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] || c.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {view === 'new' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>New request</h2>
                <button type="button" onClick={goList} className={styles.btnLink}>
                  <ArrowLeft className="w-4 h-4" /> Cancel
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={styles.fieldLabel}>Service</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as EmbassyServiceType)}
                    className={styles.select}
                  >
                    {EMBASSY_SERVICE_TYPES.filter((t) => t !== 'passport_new').map((t) => (
                      <option key={t} value={t}>
                        {SERVICE_LABELS[t]}
                      </option>
                    ))}
                    <option value="passport_new">{SERVICE_LABELS.passport_new}</option>
                  </select>
                </div>

                {isPassport && (
                  <div className={styles.checklist}>
                    <p className={styles.checklistTitle}>Passport checklist</p>
                    <p>
                      BULS tracks your case and documents. Official fees are paid on MFA/LRA
                      portals — not through BULS Treasurer.
                    </p>
                    <ul>
                      <li>
                        <a href={OFFICIAL_PASSPORT_URL} target="_blank" rel="noreferrer">
                          Start passport application (renew / new){' '}
                          <ExternalLink className="inline w-3 h-3" />
                        </a>
                      </li>
                      <li>
                        <a href={OFFICIAL_LRA_BILL_URL} target="_blank" rel="noreferrer">
                          LRA Billing (Bill No.) <ExternalLink className="inline w-3 h-3" />
                        </a>
                      </li>
                      <li>
                        Pay in Liberia via MTN <code>*156*4*1#</code> / Orange{' '}
                        <code>*144*1*5#</code> or bank, then upload the receipt.
                      </li>
                      <li>
                        <a href={OFFICIAL_RECEIPT_VERIFY_URL} target="_blank" rel="noreferrer">
                          Verify LRA receipt <ExternalLink className="inline w-3 h-3" />
                        </a>
                      </li>
                    </ul>
                  </div>
                )}

                {(isPassport ||
                  serviceType === 't_visa' ||
                  serviceType === 'student_visa_cancellation') && (
                  <div className={styles.grid2}>
                    {isPassport && (
                      <>
                        <Field
                          label="Full name"
                          value={payload.full_name}
                          onChange={(v) => setField('full_name', v)}
                        />
                        <Field
                          label="Date of birth"
                          type="date"
                          value={payload.date_of_birth}
                          onChange={(v) => setField('date_of_birth', v)}
                        />
                      </>
                    )}
                    <Field
                      label="Passport number"
                      value={payload.passport_number}
                      onChange={(v) => setField('passport_number', v)}
                    />
                    {isPassport && (
                      <>
                        <Field
                          label="Passport expiry"
                          type="date"
                          value={payload.passport_expiration_date}
                          onChange={(v) => setField('passport_expiration_date', v)}
                        />
                        <Field
                          label="Phone (China)"
                          value={payload.phone}
                          onChange={(v) => setField('phone', v)}
                        />
                        <div className={styles.span2}>
                          <Field
                            label="China address"
                            value={payload.china_address}
                            onChange={(v) => setField('china_address', v)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isPassport && (
                  <div>
                    <hr className={styles.divider} />
                    <label className={styles.fieldLabel}>Payment channel</label>
                    <select
                      value={paymentChannel}
                      onChange={(e) => setPaymentChannel(e.target.value)}
                      className={styles.select}
                    >
                      <option value="none">Not paid yet / not required</option>
                      <option value="liberia_lra">Paid in Liberia (LRA Bill / wall bill)</option>
                      <option value="overseas_official">Paid on Liberiapassports.com</option>
                      <option value="embassy_direct">Will pay / paid at Embassy</option>
                      <option value="other">Other</option>
                    </select>
                    {(paymentChannel === 'liberia_lra' || paymentChannel === 'overseas_official') && (
                      <div className={`${styles.grid2} mt-3`}>
                        <Field label="LRA Bill No." value={lraBill} onChange={setLraBill} />
                        <Field
                          label="Payment receipt No."
                          value={receiptNumber}
                          onChange={setReceiptNumber}
                        />
                        <Field
                          label="Official Transaction ID"
                          value={officialTxn}
                          onChange={setOfficialTxn}
                        />
                      </div>
                    )}
                    {paymentChannel === 'liberia_lra' && (
                      <p className="text-xs mt-2" style={{ color: 'var(--emb-muted)' }}>
                        After paying the LRA Bill, upload your payment receipt so Embassy can
                        proceed.
                      </p>
                    )}
                    <div className={`${styles.grid2} mt-4`}>
                      <div className={styles.span2}>
                        <label className={styles.fieldLabel}>Pickup</label>
                        <select
                          value={payload.pickup_location}
                          onChange={(e) => setField('pickup_location', e.target.value)}
                          className={styles.select}
                        >
                          <option value="beijing">Beijing Embassy</option>
                          <option value="monrovia">Monrovia (Liberia)</option>
                        </select>
                      </div>
                      {payload.pickup_location === 'monrovia' && (
                        <>
                          <Field
                            label="Liberia contact 1 name"
                            value={payload.liberia_contact_1_name}
                            onChange={(v) => setField('liberia_contact_1_name', v)}
                          />
                          <Field
                            label="Liberia contact 1 phone"
                            value={payload.liberia_contact_1_phone}
                            onChange={(v) => setField('liberia_contact_1_phone', v)}
                          />
                          <Field
                            label="Liberia contact 2 name"
                            value={payload.liberia_contact_2_name}
                            onChange={(v) => setField('liberia_contact_2_name', v)}
                          />
                          <Field
                            label="Liberia contact 2 phone"
                            value={payload.liberia_contact_2_phone}
                            onChange={(v) => setField('liberia_contact_2_phone', v)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {serviceType === 't_visa' && (
                  <div className={styles.grid2}>
                    <div className={styles.span2}>
                      <Field
                        label="Reason for T-visa"
                        value={payload.reason}
                        onChange={(v) => setField('reason', v)}
                      />
                    </div>
                    <div className={styles.span2}>
                      <Field
                        label="Immigration / residence address"
                        value={payload.immigration_address}
                        onChange={(v) => setField('immigration_address', v)}
                      />
                    </div>
                    <Field
                      label="University"
                      value={payload.university}
                      onChange={(v) => setField('university', v)}
                    />
                    <Field
                      label="Teacher / advisor name"
                      value={payload.teacher_name}
                      onChange={(v) => setField('teacher_name', v)}
                    />
                    <Field
                      label="Teacher phone (optional)"
                      value={payload.teacher_phone}
                      onChange={(v) => setField('teacher_phone', v)}
                    />
                  </div>
                )}

                {serviceType === 'student_visa_cancellation' && (
                  <div className={styles.grid2}>
                    <Field
                      label="University"
                      value={payload.university}
                      onChange={(v) => setField('university', v)}
                    />
                    <Field
                      label="City"
                      value={payload.city}
                      onChange={(v) => setField('city', v)}
                    />
                    <Field
                      label="Expected date"
                      type="date"
                      value={payload.expected_date}
                      onChange={(v) => setField('expected_date', v)}
                    />
                    <div className={styles.span2}>
                      <Field
                        label="Reason"
                        value={payload.reason}
                        onChange={(v) => setField('reason', v)}
                      />
                    </div>
                  </div>
                )}

                {serviceType === 'document_request' && (
                  <div className={styles.grid2}>
                    <Field
                      label="Document type"
                      value={payload.document_type}
                      onChange={(v) => setField('document_type', v)}
                    />
                    <div className={styles.span2}>
                      <Field
                        label="Purpose"
                        value={payload.purpose}
                        onChange={(v) => setField('purpose', v)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={styles.fieldLabel}>Notes for Embassy</label>
                  <textarea
                    value={memberNotes}
                    onChange={(e) => setMemberNotes(e.target.value)}
                    rows={3}
                    className={styles.textarea}
                  />
                </div>

                <div className="space-y-2">
                  <p className={styles.fieldLabel}>Attachments (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    <FilePicker
                      label="Passport bio page"
                      docType="passport_bio"
                      onPick={(file, docType) =>
                        setPendingFiles((p) => [...p, { file, docType }])
                      }
                    />
                    <FilePicker
                      label="Photo"
                      docType="photo"
                      onPick={(file, docType) =>
                        setPendingFiles((p) => [...p, { file, docType }])
                      }
                    />
                    {(paymentChannel === 'liberia_lra' ||
                      paymentChannel === 'overseas_official') && (
                      <FilePicker
                        label="Payment receipt"
                        docType="receipt"
                        onPick={(file, docType) =>
                          setPendingFiles((p) => [...p, { file, docType }])
                        }
                      />
                    )}
                    {serviceType === 'student_visa_cancellation' && (
                      <FilePicker
                        label="Residence permit (optional)"
                        docType="residence_permit"
                        onPick={(file, docType) =>
                          setPendingFiles((p) => [...p, { file, docType }])
                        }
                      />
                    )}
                  </div>
                  {pendingFiles.length > 0 && (
                    <ul className="text-xs space-y-1" style={{ color: 'var(--emb-muted)' }}>
                      {pendingFiles.map((f, i) => (
                        <li key={i}>
                          {f.docType}: {f.file.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitCase}
                  className={styles.btnNavy}
                >
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </section>
          )}

          {view === 'detail' && selected && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>
                    {SERVICE_LABELS[selected.service_type as EmbassyServiceType] ||
                      selected.service_type}
                  </h2>
                  <p className={styles.caseMeta} style={{ marginTop: '0.35rem' }}>
                    Fee status:{' '}
                    <strong>{selected.embassy_fee_status || 'not_required'}</strong>
                    {selected.payment_channel && selected.payment_channel !== 'none' && (
                      <> · Channel: {selected.payment_channel}</>
                    )}
                  </p>
                </div>
                <span className={styles.status}>
                  {STATUS_LABELS[selected.status as keyof typeof STATUS_LABELS] ||
                    selected.status}
                </span>
              </div>

              {selected.lra_bill_number && (
                <p className="text-sm mb-3">LRA Bill No.: {selected.lra_bill_number}</p>
              )}
              {selected.member_notes && (
                <p className="text-sm mb-4" style={{ color: 'var(--emb-muted)' }}>
                  Your notes: {selected.member_notes}
                </p>
              )}

              <div className="mb-6">
                <h3 className={`${styles.fieldLabel} flex items-center gap-1`}>
                  <Clock className="w-4 h-4" /> Timeline
                </h3>
                <ul className={styles.timeline}>
                  {(selected.history || []).map((h: any) => (
                    <li key={h.id} className={styles.timelineItem}>
                      <span className="font-semibold text-sm">
                        {STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] ||
                          h.to_status}
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--emb-muted)' }}>
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                      {h.note && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--emb-muted)' }}>
                          {h.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className={`${styles.fieldLabel} flex items-center gap-1`}>
                  <FileText className="w-4 h-4" /> Documents
                </h3>
                <ul className="space-y-1 text-sm mb-3">
                  {(selected.documents || []).length === 0 && (
                    <li style={{ color: 'var(--emb-muted)' }}>No documents yet</li>
                  )}
                  {(selected.documents || []).map((d: any) => (
                    <li key={d.id}>
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-2"
                        style={{ color: 'var(--emb-navy-mid)' }}
                      >
                        {d.doc_type}: {d.file_name || 'file'}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <FilePicker
                    label="Upload document"
                    docType="other"
                    busy={uploading}
                    onPick={(file, docType) => uploadToExisting(file, docType)}
                  />
                  <FilePicker
                    label="Upload receipt"
                    docType="receipt"
                    busy={uploading}
                    onPick={(file, docType) => uploadToExisting(file, docType)}
                  />
                </div>
              </div>

              {(selected.status === 'awaiting_payment_proof' ||
                selected.status === 'docs_requested' ||
                selected.embassy_fee_status === 'unpaid') && (
                <div>
                  <hr className={styles.divider} />
                  <p className={styles.fieldLabel}>Update payment proof / documents</p>
                  <div className={styles.grid2}>
                    <Field
                      label="LRA Bill No."
                      value={lraBill || selected.lra_bill_number || ''}
                      onChange={setLraBill}
                    />
                    <Field
                      label="Receipt No."
                      value={receiptNumber || selected.payment_receipt_number || ''}
                      onChange={setReceiptNumber}
                    />
                    <Field
                      label="Transaction ID"
                      value={officialTxn || selected.official_transaction_id || ''}
                      onChange={setOfficialTxn}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={savePaymentProof}
                      disabled={submitting}
                      className={styles.btnNavy}
                    >
                      Save payment details
                    </button>
                    {selected.status === 'docs_requested' && (
                      <button
                        type="button"
                        onClick={resubmit}
                        disabled={submitting}
                        className={styles.btnPrimary}
                      >
                        Resubmit for review
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
      />
    </div>
  )
}

function FilePicker({
  label,
  docType,
  onPick,
  busy,
}: {
  label: string
  docType: string
  onPick: (file: File, docType: string) => void
  busy?: boolean
}) {
  return (
    <label className={styles.fileBtn}>
      <Upload className="w-4 h-4" />
      {busy ? 'Uploading…' : label}
      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f, docType)
          e.target.value = ''
        }}
      />
    </label>
  )
}
