'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Upload, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function RegistrationPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const editMode = searchParams.get('edit')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editMemberId, setEditMemberId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false
  })
  
  const [formData, setFormData] = useState<{
    full_name: string
    gender: string
    date_of_birth: string
    county_of_origin: string
    custom_county: string
    passport_number: string
    passport_issue_date: string
    passport_expiration_date: string
    chinese_visa_expiration_date: string
    university_name: string
    university_campus: string
    current_degree_level: string
    major_program: string
    year_of_study: string
    expected_graduation_year: string
    scholarship_status: string
    chinese_phone_number: string
    whatsapp_number: string
    wechat_id: string
    email_address: string
    beijing_address: string
    emergency_contact_name: string
    relationship_to_student: string
    emergency_contact_phone: string
    emergency_contact_social: string
    emergency_contact_country: string
    current_buls_member: string
    buls_support_areas: string[]
    participate_in_activities: string
    skills_talents: string
    consent_to_registration: boolean
    date_of_registration: string
    age: string
    phone: string
    university: string
    address: string
    photo_url: string
    manual_member_id: string
  }>({
    // Personal Information
    full_name: '',
    gender: '',
    date_of_birth: '',
    county_of_origin: '',
    custom_county: '',
    // Passport & Travel Document Information
    passport_number: '',
    passport_issue_date: '',
    passport_expiration_date: '',
    chinese_visa_expiration_date: '',
    
    // Educational Information
    university_name: '',
    university_campus: '',
    current_degree_level: '',
    major_program: '',
    year_of_study: '',
    expected_graduation_year: '',
    scholarship_status: '',
    
    // Contact Information
    chinese_phone_number: '',
    whatsapp_number: '',
    wechat_id: '',
    email_address: '',
    beijing_address: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    relationship_to_student: '',
    emergency_contact_phone: '',
    emergency_contact_social: '',
    emergency_contact_country: '',
    
    // BULS Membership
    current_buls_member: '',
    buls_support_areas: [] as string[],
    participate_in_activities: '',
    skills_talents: '',
    
    // Declaration & Consent
    consent_to_registration: false,
    date_of_registration: new Date().toISOString().split('T')[0],
    
    // Legacy fields
    age: '',
    phone: '',
    university: '',
    address: '',
    photo_url: '',
    manual_member_id: ''
  })

  // Log when age changes
  useEffect(() => {
    console.log('formData.age changed to:', formData.age)
  }, [formData.age])

  useEffect(() => {
    if (editMode && editMemberId) {
      loadMemberData(editMemberId)
    } else {
      checkProfile()
    }
  }, [editMode, editMemberId, isLoaded, isSignedIn, clerkUser])

  const loadMemberData = async (memberId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      console.log('Loading member data for ID:', memberId)
      
      const { data: memberData, error: memberError } = await supabase
        .from('users')
        .select('*, members_profile(*)')
        .eq('id', memberId)
        .single()
      
      if (memberError) throw memberError
      
      console.log('Member data loaded:', memberData)
      
      if (memberData) {
        const profile = Array.isArray(memberData.members_profile) 
          ? memberData.members_profile[0] 
          : memberData.members_profile
        console.log('Profile data:', profile)
        
        const newFormData = {
          full_name: memberData.full_name || '',
          gender: profile?.gender || '',
          date_of_birth: profile?.date_of_birth || '',
          county_of_origin: profile?.county_of_origin || '',
          custom_county: '',
          passport_number: profile?.passport_number || '',
          passport_issue_date: profile?.passport_issue_date || '',
          passport_expiration_date: profile?.passport_expiration_date || '',
          chinese_visa_expiration_date: profile?.chinese_visa_expiration_date || '',
          university_name: profile?.university || '',
          university_campus: profile?.university_campus || '',
          current_degree_level: profile?.current_degree_level || '',
          major_program: profile?.major_program || '',
          year_of_study: profile?.year_of_study || '',
          expected_graduation_year: profile?.expected_graduation_year?.toString() || '',
          scholarship_status: (profile?.scholarship_status as string) || '',
          chinese_phone_number: profile?.phone || '',
          whatsapp_number: profile?.whatsapp_number || '',
          wechat_id: profile?.wechat_id || '',
          email_address: memberData.email || '',
          beijing_address: profile?.beijing_address || profile?.address || '',
          emergency_contact_name: profile?.emergency_contact_name || '',
          relationship_to_student: profile?.relationship_to_student || '',
          emergency_contact_phone: profile?.emergency_contact_phone || '',
          emergency_contact_social: profile?.emergency_contact_social || '',
          emergency_contact_country: profile?.emergency_contact_country || '',
          current_buls_member: profile?.current_buls_member || '',
          buls_support_areas: Array.isArray(profile?.buls_support_areas) ? profile.buls_support_areas : [],
          participate_in_activities: profile?.participate_in_activities || '',
          skills_talents: profile?.skills_talents || '',
          consent_to_registration: true,
          date_of_registration: profile?.date_of_registration || new Date().toISOString().split('T')[0],
          age: profile?.age?.toString() || '',
          phone: profile?.phone || '',
          university: profile?.university || '',
          address: profile?.beijing_address || profile?.address || '',
          photo_url: profile?.photo_url || '',
          manual_member_id: ''
        }
        
        console.log('Setting form data:', newFormData)
        setFormData(newFormData)
      }
    } catch (error) {
      console.error('Error loading member data:', error)
      toast.error('Failed to load member data')
    } finally {
      setChecking(false)
    }
  }

  const checkProfile = async () => {
    if (!clerkUser?.emailAddresses[0]?.emailAddress) {
      setChecking(false)
      return
    }
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      console.log('Checking profile for email:', clerkUser?.emailAddresses[0]?.emailAddress)
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', clerkUser?.emailAddresses[0]?.emailAddress)
        .maybeSingle()
      
      console.log('User data:', userData)
      console.log('User error:', userError)
      
      if (!userError && userData) {
        // User exists, now check if profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('members_profile')
          .select('id')
          .eq('user_id', userData.id)
          .maybeSingle()
        
        console.log('Profile data:', profileData)
        console.log('Profile error:', profileError)
        
        if (!profileError && profileData) {
          // Both user and profile exist, redirect to dashboard
          console.log('User and profile exist, redirecting to dashboard...')
          router.push('/dashboard')
          return
        }
        
        // User exists but no profile, allow them to complete registration
        console.log('User exists but no profile, showing registration form')
        setIsEditMode(false)
      } else {
        // User doesn't exist, allow registration
        console.log('User does not exist, showing registration form')
      }
    } catch (error) {
      console.error('Error checking profile:', error)
    } finally {
      setChecking(false)
    }
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      if (name === 'consent_to_registration') {
        setFormData(prev => ({ ...prev, [name]: checked }))
      } else {
        // Handle multiple checkboxes for buls_support_areas
        const currentValues = formData.buls_support_areas
        setFormData(prev => ({
          ...prev,
          buls_support_areas: checked
            ? [...currentValues, value]
            : currentValues.filter(v => v !== value)
        }))
      }
    } else {
      // Auto-capitalize passport number
      const processedValue = name === 'passport_number' ? value.toUpperCase() : value
      
      // Auto-calculate age when date_of_birth changes
      if (name === 'date_of_birth' && value) {
        const birthDate = new Date(value)
        const today = new Date()
        const calculatedAge = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? calculatedAge - 1 
          : calculatedAge
        console.log('Date of birth changed:', value)
        console.log('Calculated age:', finalAge)
        setFormData(prev => ({ ...prev, [name]: processedValue, age: String(finalAge) }))
      } else {
        setFormData(prev => ({ ...prev, [name]: processedValue }))
      }
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // In a real application, you would upload to a storage service (e.g., Supabase Storage, AWS S3)
    // For now, we'll use a placeholder
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        photo_url: reader.result as string
      }))
      toast.success('Photo uploaded successfully')
    }
    reader.readAsDataURL(file)
  }

  const calculateDuePayment = async (scholarshipStatus: string, userEmail: string): Promise<number> => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Load scholarship amounts from settings
      const { data: paymentData, error: paymentError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_amounts')
        .single()

      // Load rank amounts from settings
      const { data: rankData, error: rankError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'rank_amounts')
        .single()

      // Get user's union rank
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('union_rank_id')
        .eq('email', userEmail)
        .single()

      let scholarshipAmount = 100 // Default
      let rankAmount = 0 // Default

      // Get scholarship amount
      if (!paymentError && paymentData && scholarshipStatus) {
        const statusKey = scholarshipStatus.toLowerCase()
        scholarshipAmount = paymentData.value[statusKey] || 100
      }

      // Get rank amount
      if (!userError && userData?.union_rank_id) {
        const { data: rankInfo } = await supabase
          .from('union_ranks')
          .select('rank_name')
          .eq('id', userData.union_rank_id)
          .single()
        
        if (rankInfo && rankData) {
          const rankName = rankInfo.rank_name.toLowerCase().replace(' ', '_')
          rankAmount = rankData.value[rankName] || 0
        }
      }

      // Return the higher of scholarship or rank amount
      return Math.max(scholarshipAmount, rankAmount)
    } catch (error) {
      console.error('Error calculating due payment:', error)
      return 100 // Default fallback
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditMode && editMemberId) {
        // Update existing member
        const { supabase } = await import('@/lib/supabase/client-browser')
        
        console.log('Edit mode - editMemberId:', editMemberId)
        console.log('Form data:', formData)
        
        // Update user
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            email: formData.email_address
          })
          .eq('id', editMemberId)
        
        if (userError) {
          console.error('User update error:', userError)
          throw userError
        }
        
        console.log('User updated successfully')
        
        // Update or create profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('members_profile')
          .select('*')
          .eq('user_id', editMemberId)
          .single()
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Fetch profile error:', fetchError)
          throw fetchError
        }
        
        console.log('Existing profile:', existingProfile)
        
        const profileData = {
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
          age: formData.age ? parseInt(formData.age) : null,
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
          date_of_registration: formData.date_of_registration
        }
        
        console.log('Profile data to save:', profileData)
        
        if (existingProfile) {
          console.log('Updating existing profile, ID:', existingProfile.id)
          const { error: profileError } = await supabase
            .from('members_profile')
            .update(profileData)
            .eq('id', existingProfile.id)
          
          if (profileError) {
            console.error('Profile update error:', profileError)
            throw profileError
          }
          console.log('Profile updated successfully')
        } else {
          console.log('Creating new profile')
          const { error: profileError } = await supabase
            .from('members_profile')
            .insert({
              user_id: editMemberId,
              member_id: 'EDIT-' + Date.now(),
              ...profileData
            })
          
          if (profileError) {
            console.error('Profile insert error:', profileError)
            throw profileError
          }
          console.log('Profile created successfully')
        }
        
        toast.success('Member updated successfully')
        router.push('/secretary')
      } else {
        // Create new profile using Supabase directly
        const requiredFields = [
          'full_name', 'gender', 'date_of_birth', 'passport_number',
          'passport_issue_date', 'passport_expiration_date', 'chinese_visa_expiration_date',
          'university_name', 'university_campus', 'current_degree_level', 'major_program',
          'year_of_study', 'expected_graduation_year', 'scholarship_status',
          'chinese_phone_number', 'wechat_id', 'email_address', 'beijing_address',
          'emergency_contact_name', 'relationship_to_student', 'emergency_contact_phone',
          'emergency_contact_country', 'current_buls_member', 'participate_in_activities'
        ]

        for (const field of requiredFields) {
          if (!formData[field as keyof typeof formData]) {
            toast.error(`Please fill in: ${field.replace(/_/g, ' ')}`)
            setLoading(false)
            return
          }
        }

        // Validate full_name is not a placeholder
        const invalidNames = ['committee', 'admin', 'test', 'user', 'member', 'name', 'placeholder', 'unknown']
        const nameToCheck = formData.full_name.toLowerCase().trim()
        if (invalidNames.some(invalid => nameToCheck === invalid)) {
          toast.error('Please enter your real full name, not a placeholder')
          setLoading(false)
          return
        }

        // Validate full_name has at least 2 characters
        if (formData.full_name.trim().length < 2) {
          toast.error('Please enter your full name (at least 2 characters)')
          setLoading(false)
          return
        }

        if (!formData.consent_to_registration) {
          toast.error('Please provide consent to registration')
          setLoading(false)
          return
        }

        // Validate passport validity (max 6 years)
        if (formData.passport_issue_date && formData.passport_expiration_date) {
          const issueDate = new Date(formData.passport_issue_date)
          const expirationDate = new Date(formData.passport_expiration_date)
          const maxValidityDate = new Date(issueDate)
          maxValidityDate.setFullYear(maxValidityDate.getFullYear() + 6)

          if (expirationDate > maxValidityDate) {
            toast.error('Passport cannot be valid for more than 6 years from issue date')
            setLoading(false)
            return
          }
        }

        // Get user data from Clerk
        if (!clerkUser?.emailAddresses[0]?.emailAddress) {
          throw new Error('Not authenticated. Please sign in again.')
        }
        
        console.log('Creating profile for email:', clerkUser.emailAddresses[0]?.emailAddress)
        
        // Get Supabase client
        const { supabase } = await import('@/lib/supabase/client-browser')
        
        // Check if user record exists in users table
        const { data: existingUser, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', clerkUser.emailAddresses[0]?.emailAddress)
          .single()
        
        let userData: any
        
        if (userFetchError && userFetchError.code === 'PGRST116') {
          // User doesn't exist, create it
          console.log('User not found in database, creating...')
          
          const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert({
              clerk_id: clerkUser.id, // ✅ ADD CLERK_ID
              email: formData.email_address,
              full_name: formData.full_name,
              role: 'member',
              status: 'pending'
            })
            .select()
            .single()
          
          if (createUserError) {
            console.error('Failed to create user:', createUserError)
            throw new Error('Failed to create user account. Please contact support.')
          }
          
          userData = newUser
          console.log('User created:', userData)
        } else if (userFetchError) {
          console.error('Error fetching user:', userFetchError)
          throw new Error('Failed to fetch user data')
        } else {
          userData = existingUser
          
          // Update user record including clerk_id if missing
          const { error: updateError } = await supabase
            .from('users')
            .update({
              clerk_id: clerkUser.id, // ✅ ENSURE CLERK_ID IS SET
              email: formData.email_address,
              full_name: formData.full_name
            })
            .eq('id', userData.id)
          
          if (updateError) {
            console.error('Failed to update user:', updateError)
          }
        }
        
        console.log('User data:', userData)

        // Use manual member ID if provided, otherwise auto-generate
        let memberId: string
        if (formData.manual_member_id && formData.manual_member_id.trim()) {
          // Validate manual member ID
          const { data: isValid, error: validationError } = await supabase
            .rpc('validate_member_id', { p_member_id: formData.manual_member_id.trim() })

          if (validationError || !isValid) {
            toast.error('Member ID already exists or is invalid')
            setLoading(false)
            return
          }
          memberId = formData.manual_member_id.trim()
        } else {
          // Generate member ID using database function
          const { data: memberIdData, error: memberIdError } = await supabase
            .rpc('generate_member_id')

          if (memberIdError) {
            console.error('Error generating member ID:', memberIdError)
            throw new Error('Failed to generate member ID')
          }

          memberId = memberIdData as string
        }

        // Check for duplicate passport number
        if (formData.passport_number && formData.passport_number.trim()) {
          const { data: existingPassport } = await supabase
            .from('members_profile')
            .select('id')
            .eq('passport_number', formData.passport_number.trim())
            .maybeSingle()

          if (existingPassport) {
            toast.error('Passport number already registered to another member')
            setLoading(false)
            return
          }
        }

        // Check for duplicate phone number
        if (formData.chinese_phone_number && formData.chinese_phone_number.trim()) {
          const { data: existingPhone } = await supabase
            .from('members_profile')
            .select('id')
            .eq('phone', formData.chinese_phone_number.trim())
            .maybeSingle()

          if (existingPhone) {
            toast.error('Phone number already registered to another member')
            setLoading(false)
            return
          }
        }

        // Check for duplicate email in users table (excluding current user)
        const { data: existingEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email_address)
          .neq('id', userData.id)
          .maybeSingle()

        if (existingEmail) {
          toast.error('Email already registered to another account')
          setLoading(false)
          return
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
        
        if (profileError) throw profileError

        toast.success(`Profile created! Your Member ID is: ${memberId}`)
        
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
      
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00205B] to-[#EF3340]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, 
            #00205B 0%, 
            #00205B 25%, 
            #FFFFFF 25%, 
            #FFFFFF 50%, 
            #EF3340 50%, 
            #EF3340 75%,
            #00205B 75%,
            #00205B 100%
          )`,
        backgroundSize: '80px 80px'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-transparent to-red-900/30 pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-8 bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-4 border-white">
          <h1 className="text-4xl font-bold text-[#00205B] mb-2">
            {isEditMode ? 'Edit Member Profile' : 'BULS Membership Registration'}
          </h1>
          <p className="text-[#EF3340] font-semibold text-lg mb-2">
            {isEditMode ? 'Update member information' : 'Academic Year 2026/2027'}
          </p>
          <p className="text-sm text-gray-700 max-w-3xl mx-auto leading-relaxed">
            {isEditMode 
              ? 'Edit the member information below. Changes will be saved to the database.'
              : 'This registration form establishes an accurate database of Liberian students in Beijing for identification, communication, academic support, emergency coordination, and Union activities.'
            }
          </p>
          {isEditMode && (
            <button
              type="button"
              onClick={() => router.push('/secretary')}
              className="mt-4 text-[#00205B] underline hover:text-[#EF3340] font-medium transition-colors"
            >
              ← Back to Secretary Panel
            </button>
          )}
        </div>

        <div className="bg-white/98 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border-4 border-[#00205B]">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Personal Information */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(1)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">1. Personal Information</h2>
                {expandedSections[1] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[1] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      {formData.photo_url ? (
                        <img
                          src={formData.photo_url}
                          alt="Member Photo"
                          className="w-32 h-32 rounded-full object-cover border-4 border-[#00205B]"
                        />
                      ) : (
                        <img
                          src="https://flagcdn.com/w320/lr.png"
                          alt="Liberia Flag"
                          className="w-32 h-32 rounded-full object-cover border-4 border-[#00205B]"
                        />
                      )}
                      <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-[#EF3340] text-white p-2 rounded-full cursor-pointer hover:bg-[#c92a2a] transition-colors">
                        <Upload className="w-4 h-4" />
                      </label>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Upload member photo</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member ID (Optional - Leave blank for auto-generation)
                    </label>
                    <input
                      type="text"
                      name="manual_member_id"
                      value={formData.manual_member_id}
                      onChange={handleChange}
                      placeholder="Format: BULSYYMMXX (e.g., BULS260145)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">For past leadership members only. New members should leave blank for auto-generated ID.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name as Appearing on Passport *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="e.g., Grace C Zeah"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <DatePicker
                        selected={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                        onChange={(date: Date | null) => handleChange({ target: { name: 'date_of_birth', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                        dateFormat="yyyy-MM-dd"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        placeholderText="Select date"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age (Auto-calculated)
                      </label>
                      <input
                        type="text"
                        name="age"
                        value={formData.age}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                        placeholder="Age will be calculated automatically"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      County of Origin in Liberia
                    </label>
                    <select
                      name="county_of_origin"
                      value={formData.county_of_origin}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    >
                      <option value="">Select County</option>
                      <option value="Bomi">Bomi</option>
                      <option value="Bong">Bong</option>
                      <option value="Gbarpolu">Gbarpolu</option>
                      <option value="Grand Bassa">Grand Bassa</option>
                      <option value="Grand Cape Mount">Grand Cape Mount</option>
                      <option value="Grand Gedeh">Grand Gedeh</option>
                      <option value="Grand Kru">Grand Kru</option>
                      <option value="Lofa">Lofa</option>
                      <option value="Margibi">Margibi</option>
                      <option value="Maryland">Maryland</option>
                      <option value="Montserrado">Montserrado</option>
                      <option value="Nimba">Nimba</option>
                      <option value="River Cess">River Cess</option>
                      <option value="River Gee">River Gee</option>
                      <option value="Sinoe">Sinoe</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {formData.county_of_origin === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specify County *
                      </label>
                      <input
                        type="text"
                        name="custom_county"
                        value={formData.custom_county}
                        onChange={handleChange}
                        required
                        placeholder="Enter county name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Passport & Travel Document Information */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(2)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">2. Passport & Travel Document Information</h2>
                {expandedSections[2] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[2] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      name="passport_number"
                      required
                      value={formData.passport_number}
                      onChange={handleChange}
                      pattern="^[Pp]{1,2}\d{7}$"
                      placeholder="Format: P1234567 or PP1234567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: P or PP followed by 7 digits (e.g., P1234567)</p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passport Issue Date *
                      </label>
                      <DatePicker
                        selected={formData.passport_issue_date ? new Date(formData.passport_issue_date) : null}
                        onChange={(date: Date | null) => handleChange({ target: { name: 'passport_issue_date', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                        dateFormat="yyyy-MM-dd"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        placeholderText="Select date"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passport Expiration Date *
                      </label>
                      <DatePicker
                        selected={formData.passport_expiration_date ? new Date(formData.passport_expiration_date) : null}
                        onChange={(date: Date | null) => handleChange({ target: { name: 'passport_expiration_date', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                        dateFormat="yyyy-MM-dd"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        placeholderText="Select date"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chinese Visa Expiration *
                      </label>
                      <DatePicker
                        selected={formData.chinese_visa_expiration_date ? new Date(formData.chinese_visa_expiration_date) : null}
                        onChange={(date: Date | null) => handleChange({ target: { name: 'chinese_visa_expiration_date', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                        dateFormat="yyyy-MM-dd"
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        placeholderText="Select date"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Educational Information */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(3)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">3. Educational Information</h2>
                {expandedSections[3] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[3] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name of University/Institution *
                      </label>
                      <input
                        type="text"
                        name="university_name"
                        required
                        value={formData.university_name}
                        onChange={handleChange}
                        placeholder="e.g., Tsinghua University"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        University Campus/Location *
                      </label>
                      <input
                        type="text"
                        name="university_campus"
                        required
                        value={formData.university_campus}
                        onChange={handleChange}
                        placeholder="e.g., Main Campus, Haidian District"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Degree Level *
                      </label>
                      <select
                        name="current_degree_level"
                        required
                        value={formData.current_degree_level}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      >
                        <option value="">Select Degree Level</option>
                        <option value="Bachelor's">Bachelor's</option>
                        <option value="Master's">Master's</option>
                        <option value="PhD">PhD</option>
                        <option value="Diploma/Certificate">Diploma/Certificate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Major/Program of Study *
                      </label>
                      <input
                        type="text"
                        name="major_program"
                        required
                        value={formData.major_program}
                        onChange={handleChange}
                        placeholder="e.g., Computer Science"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year of Study *
                      </label>
                      <select
                        name="year_of_study"
                        required
                        value={formData.year_of_study}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      >
                        <option value="">Select Year</option>
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                        <option value="3rd">3rd</option>
                        <option value="4th">4th</option>
                        <option value="5th">5th</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Graduation Year *
                      </label>
                      <DatePicker
                        selected={formData.expected_graduation_year ? new Date(parseInt(formData.expected_graduation_year), 0, 1) : null}
                        onChange={(date: Date | null) => handleChange({ target: { name: 'expected_graduation_year', value: date ? date.getFullYear().toString() : '' } } as any)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                        showYearPicker
                        dateFormat="yyyy"
                        yearDropdownItemNumber={100}
                        placeholderText="Select year"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scholarship Status *
                      </label>
                      <select
                        name="scholarship_status"
                        required
                        value={formData.scholarship_status}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      >
                        <option value="">Select Status</option>
                        <option value="CSC">CSC (China Scholarship Council)</option>
                        <option value="MOFCOM">MOFCOM (Ministry of Commerce)</option>
                        <option value="BILATERAL">Bilateral Scholarship</option>
                        <option value="SELF">Self-Sponsored</option>
                        <option value="PARTIAL">Partial Scholarship</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Contact Information */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(4)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">4. Contact Information</h2>
                {expandedSections[4] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[4] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chinese Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="chinese_phone_number"
                        required
                        value={formData.chinese_phone_number}
                        onChange={handleChange}
                        placeholder="+86 xxx xxxx xxxx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        name="whatsapp_number"
                        value={formData.whatsapp_number}
                        onChange={handleChange}
                        placeholder="+231 xxx xxx xxx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WeChat ID *
                      </label>
                      <input
                        type="text"
                        name="wechat_id"
                        required
                        value={formData.wechat_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email_address"
                        required
                        value={formData.email_address}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Beijing Resident Address *
                    </label>
                    <textarea
                      name="beijing_address"
                      required
                      rows={3}
                      value={formData.beijing_address}
                      onChange={handleChange}
                      placeholder="Your complete address in Beijing"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(5)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">5. Emergency Contact</h2>
                {expandedSections[5] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[5] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact Full Name *
                      </label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        required
                        value={formData.emergency_contact_name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship to Student *
                      </label>
                      <input
                        type="text"
                        name="relationship_to_student"
                        required
                        value={formData.relationship_to_student}
                        onChange={handleChange}
                        placeholder="e.g., Parent, Sibling, Spouse"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        required
                        value={formData.emergency_contact_phone}
                        onChange={handleChange}
                        placeholder="+231 xxx xxx xxx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact WhatsApp/WeChat
                      </label>
                      <input
                        type="text"
                        name="emergency_contact_social"
                        value={formData.emergency_contact_social}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact's Country *
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_country"
                      required
                      value={formData.emergency_contact_country}
                      onChange={handleChange}
                      placeholder="e.g., Liberia, USA, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 6: BULS Membership */}
            <div className="border-2 border-[#00205B] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(6)}
                className="w-full bg-[#00205B] text-white px-6 py-4 flex justify-between items-center hover:bg-[#001640] transition-colors"
              >
                <h2 className="text-xl font-bold">6. BULS Membership</h2>
                {expandedSections[6] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[6] && (
                <div className="p-6 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Are you currently a member of BULS? *
                    </label>
                    <select
                      name="current_buls_member"
                      required
                      value={formData.current_buls_member}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    >
                      <option value="">Select Option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Areas where you would like BULS support (select all that apply)
                    </label>
                    <div className="space-y-2">
                      {['Academic Support', 'Student Welfare', 'Sports & Recreation', 'Cultural Activities', 
                        'Career Development', 'Networking', 'Accommodation Guidance', 'Emergency Assistance', 'Other'].map((area) => (
                        <label key={area} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="buls_support_areas"
                            value={area}
                            checked={formData.buls_support_areas.includes(area)}
                            onChange={handleChange}
                            className="w-4 h-4 text-[#EF3340] border-gray-300 rounded focus:ring-[#EF3340]"
                          />
                          <span className="text-sm text-gray-700">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Would you like to participate in BULS activities and programs? *
                    </label>
                    <select
                      name="participate_in_activities"
                      required
                      value={formData.participate_in_activities}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    >
                      <option value="">Select Option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Maybe">Maybe</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skills/Talents/Professional Areas
                    </label>
                    <textarea
                      name="skills_talents"
                      rows={3}
                      value={formData.skills_talents}
                      onChange={handleChange}
                      placeholder="Please share any skills or talents you'd like to contribute to BULS"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 7: Declaration & Consent */}
            <div className="border-2 border-[#EF3340] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(7)}
                className="w-full bg-[#EF3340] text-white px-6 py-4 flex justify-between items-center hover:bg-[#d42a36] transition-colors"
              >
                <h2 className="text-xl font-bold">7. Declaration & Consent *</h2>
                {expandedSections[7] ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections[7] && (
                <div className="p-6 space-y-4 bg-red-50">
                  <div className="bg-white p-4 rounded-lg border border-gray-300">
                    <p className="text-sm text-gray-700 mb-4">
                      I confirm that all the information provided above is accurate and complete to the best of my knowledge. 
                      I understand that BULS will use this information for legitimate administrative purposes, including student 
                      identification, communication, welfare support, emergency coordination, and Union activities. I consent to 
                      BULS storing and processing this information in accordance with applicable data protection regulations.
                    </p>
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        name="consent_to_registration"
                        required
                        checked={formData.consent_to_registration}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#EF3340] border-gray-300 rounded focus:ring-[#EF3340] mt-0.5"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        I confirm that I have read and understood the above declaration and consent to the collection 
                        and use of my information for legitimate BULS administrative purposes. *
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Registration *
                    </label>
                    <DatePicker
                      selected={formData.date_of_registration ? new Date(formData.date_of_registration) : null}
                      onChange={(date: Date | null) => handleChange({ target: { name: 'date_of_registration', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF3340] focus:border-transparent"
                      dateFormat="yyyy-MM-dd"
                      showYearDropdown
                      scrollableYearDropdown
                      yearDropdownItemNumber={100}
                      placeholderText="Select date"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00205B] to-[#EF3340] text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-[#001640] hover:to-[#C42830] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Submitting...'}
                  </span>
                ) : (
                  isEditMode ? 'Update Member Profile' : 'Complete Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
