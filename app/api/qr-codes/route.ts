import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/qr-codes - Get all QR codes for the current user's role
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // Get user's role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const userRole = userData.role
    
    // Build query based on role
    let query = adminClient.from('qr_codes').select(`
      id,
      role,
      qr_code_url,
      payment_method,
      title,
      description,
      created_at,
      updated_at,
      created_by
    `)
    
    // Payment QR codes (wechat, alipay) are visible to everyone
    // They are static payment QR codes for the organization, not role-specific
    // Other QR codes are role-specific
    if (userRole === 'admin') {
      // Admins see everything
    } else {
      // Everyone can see:
      // 1. Their own role's QR codes (if any)
      // 2. All payment QR codes (wechat, alipay) - these are static for the organization
      query = query.or(`role.eq.${userRole},payment_method.in.(wechat,alipay)`)
    }
    
    const { data: qrCodes, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ qrCodes }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QR codes: ' + error.message },
      { status: 500 }
    )
  }
}

// POST /api/qr-codes - Upload a new QR code
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // Get user's role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const userRole = userData.role
    
    // Get request body
    const body = await request.json()
    const { role, qr_code_url, payment_method, title, description } = body
    
    // Validate required fields
    if (!qr_code_url || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: qr_code_url and payment_method are required' },
        { status: 400 }
      )
    }
    
    // Validate payment method
    const validPaymentMethods = ['wechat', 'alipay', 'bank_transfer']
    if (!validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Check if role has permission
    // Admins can upload for any role (incl. embassy), others can only upload for their own role
    const targetRole = role || userRole
    const allowedRoles = ['admin', 'treasurer', 'secretary', 'finance', 'embassy']
    if (!allowedRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }
    
    if (userRole !== 'admin' && targetRole !== userRole) {
      return NextResponse.json(
        { error: 'Permission denied. You can only upload QR codes for your own role.' },
        { status: 403 }
      )
    }
    
    // Check if QR code already exists for this role and payment method
    const { data: existingQrCode, error: checkError } = await adminClient
      .from('qr_codes')
      .select('*')
      .eq('role', targetRole)
      .eq('payment_method', payment_method)
      .single()
    
    // If QR code exists, update it instead of creating a new one
    if (existingQrCode) {
      console.log('QR code already exists, updating instead of creating')
      
      const { data: updatedQrCode, error: updateError } = await adminClient
        .from('qr_codes')
        .update({
          qr_code_url: qr_code_url || existingQrCode.qr_code_url,
          payment_method: payment_method || existingQrCode.payment_method,
          title: title ?? existingQrCode.title,
          description: description ?? existingQrCode.description,
        })
        .eq('id', existingQrCode.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating QR code:', updateError)
        throw updateError
      }
      
      console.log('✅ QR code updated successfully:', updatedQrCode)
      return NextResponse.json({ qrCode: updatedQrCode }, { status: 200 })
    }
    
    // Insert new QR code - use clerk_id directly since created_by might be TEXT now
    const { data: newQrCode, error: insertError } = await adminClient
      .from('qr_codes')
      .insert({
        role: targetRole,
        qr_code_url,
        payment_method,
        title: title || null,
        description: description || null,
        created_by: userId // Clerk user ID (string like "user_xxxx")
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting QR code:', insertError)
      throw insertError
    }
    
    console.log('✅ QR code uploaded successfully:', newQrCode)
    return NextResponse.json({ qrCode: newQrCode }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading QR code:', error)
    return NextResponse.json(
      { error: 'Failed to upload QR code: ' + error.message },
      { status: 500 }
    )
  }
}

// PUT /api/qr-codes - Update an existing QR code
export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // Get user's role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const userRole = userData.role
    
    // Get request body
    const body = await request.json()
    const { id, qr_code_url, payment_method, title, description } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'QR code ID is required' },
        { status: 400 }
      )
    }
    
    // Check if QR code exists
    const { data: existingQrCode, error: checkError } = await adminClient
      .from('qr_codes')
      .select('role')
      .eq('id', id)
      .single()
    
    if (checkError || !existingQrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      )
    }
    
    // Check permission
    if (userRole !== 'admin' && existingQrCode.role !== userRole) {
      return NextResponse.json(
        { error: 'Permission denied. You can only update your own QR codes.' },
        { status: 403 }
      )
    }
    
    // Update QR code
    const { data: updatedQrCode, error: updateError } = await adminClient
      .from('qr_codes')
      .update({
        qr_code_url: qr_code_url || existingQrCode.qr_code_url,
        payment_method: payment_method || existingQrCode.payment_method,
        title: title ?? existingQrCode.title,
        description: description ?? existingQrCode.description,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating QR code:', updateError)
      throw updateError
    }
    
    console.log('✅ QR code updated successfully:', updatedQrCode)
    return NextResponse.json({ qrCode: updatedQrCode }, { status: 200 })
  } catch (error: any) {
    console.error('Error updating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to update QR code: ' + error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/qr-codes - Delete a QR code
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // Get user's role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const userRole = userData.role
    
    // Get request body
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'QR code ID is required' },
        { status: 400 }
      )
    }
    
    // Check if QR code exists
    const { data: existingQrCode, error: checkError } = await adminClient
      .from('qr_codes')
      .select('role')
      .eq('id', id)
      .single()
    
    if (checkError || !existingQrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      )
    }
    
    // Check permission
    if (userRole !== 'admin' && existingQrCode.role !== userRole) {
      return NextResponse.json(
        { error: 'Permission denied. You can only delete your own QR codes.' },
        { status: 403 }
      )
    }
    
    // Delete QR code
    const { error: deleteError } = await adminClient
      .from('qr_codes')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting QR code:', deleteError)
      throw deleteError
    }
    
    console.log('✅ QR code deleted successfully:', id)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error deleting QR code:', error)
    return NextResponse.json(
      { error: 'Failed to delete QR code: ' + error.message },
      { status: 500 }
    )
  }
}
