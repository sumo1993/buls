import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET — Payment QR codes for purchase flows.
 * Default role = treasurer (Admin → QR Codes → Treasurer).
 * Falls back to admin, then any wechat/alipay if treasurer codes are missing.
 *
 * Optional: ?role=treasurer|admin|finance|secretary|embassy
 */
export async function GET(req: Request) {
  try {
    const adminClient = createAdminClient()
    const { searchParams } = new URL(req.url)
    const roleParam = (searchParams.get('role') || 'treasurer').toLowerCase()
    const allowed = ['treasurer', 'admin', 'finance', 'secretary', 'embassy']
    const preferredRole = allowed.includes(roleParam) ? roleParam : 'treasurer'

    const pickByMethod = (
      rows: { payment_method: string; qr_code_url?: string | null }[] | null,
      method: string
    ) => rows?.find((qr) => qr.payment_method === method && !!qr.qr_code_url) || null

    // 1) Preferred role (usually treasurer)
    const { data: preferred, error: preferredError } = await adminClient
      .from('qr_codes')
      .select('id, role, qr_code_url, payment_method, title, description')
      .eq('role', preferredRole)
      .in('payment_method', ['wechat', 'alipay', 'bank_transfer'])
      .order('created_at', { ascending: false })

    if (preferredError) {
      console.error('Error fetching preferred QR codes:', preferredError)
      return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
    }

    let wechatQr = pickByMethod(preferred, 'wechat')
    let alipayQr = pickByMethod(preferred, 'alipay')
    let bankQr = pickByMethod(preferred, 'bank_transfer')

    // 2) Fallback: admin role, then any payment QR (so purchase never blanks if codes exist)
    if (!wechatQr || !alipayQr) {
      const { data: allPayment } = await adminClient
        .from('qr_codes')
        .select('id, role, qr_code_url, payment_method, title, description')
        .in('payment_method', ['wechat', 'alipay', 'bank_transfer'])
        .order('created_at', { ascending: false })

      const preferRoles = [preferredRole, 'admin', 'treasurer', 'finance']
      const sorted = [...(allPayment || [])].sort((a, b) => {
        const ai = preferRoles.indexOf(a.role)
        const bi = preferRoles.indexOf(b.role)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

      if (!wechatQr) wechatQr = pickByMethod(sorted, 'wechat')
      if (!alipayQr) alipayQr = pickByMethod(sorted, 'alipay')
      if (!bankQr) bankQr = pickByMethod(sorted, 'bank_transfer')
    }

    const qrCode = wechatQr || alipayQr || bankQr || null

    return NextResponse.json({
      role: preferredRole,
      wechat: wechatQr,
      alipay: alipayQr,
      bank_transfer: bankQr,
      qrCode,
    })
  } catch (error: any) {
    console.error('Error fetching public QR codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
