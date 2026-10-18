'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitRegistration(formData: any, userId: string) {
  try {
    if (!userId) {
      return { error: 'Unauthorized - No userId provided' }
    }

    console.log('✅ User authenticated:', userId)

    let supabase
    try {
      supabase = createAdminClient()
      console.log('✅ Supabase client created')
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error)
      return { error: 'Failed to initialize database connection' }
    }

    // Check if user exists in Supabase
    console.log('🔍 Checking if user exists in Supabase...')
    let existingUser, checkError
    try {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()
      existingUser = result.data
      checkError = result.error
    } catch (error) {
      console.error('❌ Error checking user:', error)
      return { error: 'Database query failed' }
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
    }

    let userData

    if (existingUser) {
      console.log('✅ User exists:', existingUser.email)
      userData = existingUser
    } else {
      // Create user from form data (user is already authenticated with Clerk)
      console.log('➕ Creating new user in Supabase...')
      console.log('User data:', {
        clerk_id: userId,
        full_name: formData.full_name,
        email: formData.email_address
      })
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          full_name: formData.full_name,
          email: formData.email_address,
          role: 'member',
          status: 'pending'
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating user:', createError)
        console.error('Error details:', JSON.stringify(createError, null, 2))
        return { error: `Failed to create user record: ${createError.message}` }
      }

      console.log('✅ User created successfully')
      userData = newUser
    }

    console.log('📊 Using userData:', userData?.email)

    // Validate passport validity (max 6 years)
    if (formData.passport_issue_date && formData.passport_expiration_date) {
      const issueDate = new Date(formData.passport_issue_date)
      const expirationDate = new Date(formData.passport_expiration_date)
      const maxValidityDate = new Date(issueDate)
      maxValidityDate.setFullYear(maxValidityDate.getFullYear() + 6)

      if (expirationDate > maxValidityDate) {
        return { error: 'Passport cannot be valid for more than 6 years from issue date' }
      }
    }

    // Generate member ID
    let memberId: string
    if (formData.manual_member_id && formData.manual_member_id.trim()) {
      // Validate manual member ID
      const { data: isValid, error: validationError } = await supabase
        .rpc('validate_member_id', { p_member_id: formData.manual_member_id.trim() })

      if (validationError || !isValid) {
        return { error: 'Member ID already exists or is invalid' }
      }
      memberId = formData.manual_member_id.trim()
    } else {
      // Generate member ID using database function
      const { data: memberIdData, error: memberIdError } = await supabase
        .rpc('generate_member_id')

      if (memberIdError) {
        console.error('Error generating member ID:', memberIdError)
        return { error: 'Failed to generate member ID' }
      }

      memberId = memberIdData as string
    }

    // Check for duplicate passport number
    if (formData.passport_number && formData.passport_number.trim()) {
      const { data: existingPassport } = await supabase
        .from('members_profile')
        .select('id')
        .eq('passport_number', formData.passport_number.trim())
        .single()

      if (existingPassport) {
        return { error: 'Passport number already registered to another member' }
      }
    }

    // Check for duplicate phone number
    if (formData.chinese_phone_number && formData.chinese_phone_number.trim()) {
      const { data: existingPhone } = await supabase
        .from('members_profile')
        .select('id')
        .eq('phone', formData.chinese_phone_number.trim())
        .single()

      if (existingPhone) {
        return { error: 'Phone number already registered to another member' }
      }
    }

    // Check for duplicate email in users table (excluding current user)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', formData.email_address)
      .neq('id', userData.id)
      .single()

    if (existingEmail) {
      return { error: 'Email already registered to another account' }
    }

    // Calculate due payment amount based on scholarship status
    const scholarshipStatus = formData.scholarship_status || 'SELF'
    let monthlyDueAmount = 100 // Default

    // Load payment amounts from settings
    const { data: paymentData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_amounts')
      .single()

    if (paymentData && scholarshipStatus) {
      const statusKey = scholarshipStatus.toLowerCase()
      monthlyDueAmount = paymentData.value[statusKey] || 100
    }

    // Create profile with all fields
    const profileData = {
      user_id: userData.id,
      member_id: memberId,
      university: formData.university_name,
      university_campus: formData.university_campus,
      current_degree_level: formData.current_degree_level,
      major_program: formData.major_program,
      year_of_study: formData.year_of_study,
      expected_graduation_year: formData.expected_graduation_year ? parseInt(formData.expected_graduation_year) : null,
      scholarship_status: formData.scholarship_status,
      phone: formData.chinese_phone_number,
      whatsapp_number: formData.whatsapp_number,
      wechat_id: formData.wechat_id,
      beijing_address: formData.beijing_address,
      address: formData.beijing_address,
      age: new Date().getFullYear() - new Date(formData.date_of_birth).getFullYear(),
      date_of_birth: formData.date_of_birth || null,
      photo_url: formData.photo_url,
      gender: formData.gender,
      county_of_origin: formData.county_of_origin === 'Other' ? formData.custom_county : formData.county_of_origin,
      passport_number: formData.passport_number,
      passport_issue_date: formData.passport_issue_date || null,
      passport_expiration_date: formData.passport_expiration_date || null,
      chinese_visa_expiration_date: formData.chinese_visa_expiration_date || null,
      emergency_contact_name: formData.emergency_contact_name,
      relationship_to_student: formData.relationship_to_student,
      emergency_contact_phone: formData.emergency_contact_phone,
      emergency_contact_social: formData.emergency_contact_social,
      emergency_contact_country: formData.emergency_contact_country,
      current_buls_member: formData.current_buls_member,
      buls_support_areas: formData.buls_support_areas,
      participate_in_activities: formData.participate_in_activities,
      skills_talents: formData.skills_talents,
      consent_to_registration: formData.consent_to_registration,
      date_of_registration: formData.date_of_registration,
      monthly_due_amount: monthlyDueAmount
    }

    const { error: profileError } = await supabase
      .from('members_profile')
      .insert(profileData)

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return { error: 'Failed to create profile' }
    }

    revalidatePath('/dashboard')

    return { success: true, memberId }
  } catch (error) {
    console.error('Registration error:', error)
    return { error: error instanceof Error ? error.message : 'Registration failed' }
  }
}
