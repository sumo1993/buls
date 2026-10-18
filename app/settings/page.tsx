'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Calendar,
  Save,
  AlertCircle,
  Lock
} from 'lucide-react'

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  nationality: '',
  county: '',
  passport_number: '',
  passport_issue_date: '',
  passport_expiration_date: '',
  university: '',
  campus: '',
  student_id: '',
  degree_level: '',
  major: '',
  year_of_study: '',
  expected_graduation_year: '',
  scholarship_status: '',
  chinese_phone_number: '',
  whatsapp: '',
  wechat: '',
  email_address: '',
  beijing_address: '',
  home_address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  relationship_to_student: '',
}

/** "THEO MEAYEYAN" / "theo meayeyan" → "Theo Meayeyan" */
function toTitleCaseName(name: string) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase()
      // Keep short particles lowercase when not first word (handled by caller order)
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export default function SettingsPage() {
  const { user: clerkUser } = useUser()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dbUser, setDbUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [showSuccess, setShowSuccess] = useState(false)

  const isEmbassy = dbUser?.role === 'embassy'

  useEffect(() => {
    if (clerkUser) {
      fetchData()
    }
  }, [clerkUser])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser?.id)
        .maybeSingle()

      if (userError || !userRow) {
        console.log('User not found in database', userError)
        setFormData({
          ...emptyForm,
          full_name: toTitleCaseName(
            `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() ||
              ''
          ),
          email: clerkUser?.emailAddresses?.[0]?.emailAddress || '',
          email_address: clerkUser?.emailAddresses?.[0]?.emailAddress || '',
        })
        setLoading(false)
        return
      }

      setDbUser(userRow)

      const { data: profileRow } = await supabase
        .from('members_profile')
        .select('*')
        .eq('user_id', userRow.id)
        .maybeSingle()

      if (profileRow) {
        setProfile(profileRow)
        setFormData({
          ...emptyForm,
          full_name: toTitleCaseName(userRow.full_name || ''),
          email: userRow.email || '',
          phone: profileRow.phone || '',
          gender: profileRow.gender || '',
          date_of_birth: profileRow.date_of_birth || '',
          nationality: profileRow.nationality || 'Liberia',
          county: profileRow.county || profileRow.county_of_origin || '',
          passport_number: profileRow.passport_number || '',
          passport_issue_date: profileRow.passport_issue_date || '',
          passport_expiration_date: profileRow.passport_expiration_date || '',
          university: profileRow.university || '',
          campus: profileRow.campus || profileRow.university_campus || '',
          student_id: profileRow.student_id || '',
          degree_level: profileRow.degree_level || profileRow.current_degree_level || '',
          major: profileRow.major || profileRow.major_program || '',
          year_of_study: profileRow.year_of_study || '',
          expected_graduation_year:
            profileRow.expected_graduation_year?.toString() || '',
          scholarship_status: profileRow.scholarship_status || '',
          chinese_phone_number:
            profileRow.chinese_phone_number || profileRow.phone || '',
          whatsapp: profileRow.whatsapp || profileRow.whatsapp_number || '',
          wechat: profileRow.wechat || profileRow.wechat_id || '',
          email_address: profileRow.email_address || userRow.email || '',
          beijing_address: profileRow.beijing_address || '',
          home_address: profileRow.home_address || profileRow.address || '',
          emergency_contact_name: toTitleCaseName(profileRow.emergency_contact_name || ''),
          emergency_contact_phone: profileRow.emergency_contact_phone || '',
          relationship_to_student: profileRow.relationship_to_student || '',
        })
      } else {
        setFormData({
          ...emptyForm,
          full_name: toTitleCaseName(userRow.full_name || ''),
          email: userRow.email || '',
          email_address: userRow.email || '',
          phone: userRow.phone_number || '',
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name !== 'full_name' && name !== 'emergency_contact_name') return
    const titled = toTitleCaseName(value)
    if (titled !== value) {
      setFormData((prev) => ({ ...prev, [name]: titled }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dbUser?.id) {
      alert('User account not found. Contact Admin.')
      return
    }
    setSaving(true)
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const titledName = toTitleCaseName(formData.full_name)
      setFormData((prev) => ({ ...prev, full_name: titledName }))

      await supabase
        .from('users')
        .update({ full_name: titledName })
        .eq('id', dbUser.id)

      // Embassy staff: name + contact only (no full member profile required)
      if (isEmbassy) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
        return
      }

      const profilePayload = {
        user_id: dbUser.id,
        phone: formData.phone,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality,
        county_of_origin: formData.county,
        passport_number: formData.passport_number,
        passport_issue_date: formData.passport_issue_date || null,
        passport_expiration_date: formData.passport_expiration_date || null,
        university: formData.university,
        university_campus: formData.campus,
        current_degree_level: formData.degree_level,
        major_program: formData.major,
        year_of_study: formData.year_of_study,
        expected_graduation_year: formData.expected_graduation_year
          ? parseInt(formData.expected_graduation_year, 10)
          : null,
        scholarship_status: formData.scholarship_status,
        whatsapp_number: formData.whatsapp,
        wechat_id: formData.wechat,
        beijing_address: formData.beijing_address,
        address: formData.home_address,
        emergency_contact_name: toTitleCaseName(formData.emergency_contact_name),
        emergency_contact_phone: formData.emergency_contact_phone,
        relationship_to_student: formData.relationship_to_student,
      }

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to save profile (${response.status})`)
      }
      
      const result = await response.json()
      setProfile(result.profile)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole={dbUser?.role || 'member'}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={dbUser?.role || 'member'}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#003366]">Settings</h1>
          <p className="text-gray-600">
            {isEmbassy
              ? 'Update your display name and change your login password.'
              : 'Manage your profile information'}
          </p>
        </div>

        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Save className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Saved successfully</span>
          </div>
        )}

        {isEmbassy && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#003366] mt-0.5" />
            <div>
              <h3 className="font-medium text-[#003366]">Password</h3>
              <p className="text-sm text-gray-700 mt-1">
                Change the temporary password Admin gave you after first login.
              </p>
              <p className="mt-2 text-sm font-medium text-[#003366]">
                Use the Clerk user menu (top right / account) → Security → Password
              </p>
            </div>
          </div>
        )}

        {!profile && !isEmbassy && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-yellow-800 font-medium">Profile Incomplete</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Your profile is incomplete. Please fill in the fields below or complete registration.
                </p>
                <button 
                  onClick={() => router.push('/registration')}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Go to Registration →
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
              <User className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    onBlur={handleNameBlur}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                  />
                </div>
              </div>

              {!isEmbassy && (
                <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="e.g., Liberia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">County of Origin</label>
                <input
                  type="text"
                  name="county"
                  value={formData.county}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>
                </>
              )}
            </div>
          </div>

          {!isEmbassy && (
          <>
          {/* Educational Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
              <GraduationCap className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Educational Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <input
                  type="text"
                  name="campus"
                  value={formData.campus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                <select
                  name="degree_level"
                  value={formData.degree_level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                >
                  <option value="">Select Degree Level</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                  <option value="PhD">PhD</option>
                  <option value="Exchange">Exchange</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Major/Program</label>
                <input
                  type="text"
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                <input
                  type="text"
                  name="year_of_study"
                  value={formData.year_of_study}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Graduation Year</label>
                <input
                  type="number"
                  name="expected_graduation_year"
                  value={formData.expected_graduation_year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship Status</label>
                <select
                  name="scholarship_status"
                  value={formData.scholarship_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                >
                  <option value="">Select Scholarship Status</option>
                  <option value="CSC">CSC</option>
                  <option value="MOFCOM">MOFCOM</option>
                  <option value="BILATERAL">Bilateral</option>
                  <option value="Self-Financed">Self-Financed</option>
                  <option value="Partial Scholarship">Partial Scholarship</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
              <Phone className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Contact Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Phone Number</label>
                <input
                  type="tel"
                  name="chinese_phone_number"
                  value={formData.chinese_phone_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WeChat ID</label>
                <input
                  type="text"
                  name="wechat"
                  value={formData.wechat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
              <MapPin className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Address Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beijing Address</label>
                <textarea
                  name="beijing_address"
                  value={formData.beijing_address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                <textarea
                  name="home_address"
                  value={formData.home_address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
              <Lock className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Emergency Contact</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  onBlur={handleNameBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <input
                  type="text"
                  name="relationship_to_student"
                  value={formData.relationship_to_student}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                />
              </div>
            </div>
          </div>

          </>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {saving && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#003366]"></div>
              )}
              <span className="text-gray-600 text-sm">
                {saving ? 'Saving…' : 'Click Save to update your details'}
              </span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#003366] text-white rounded-lg font-medium hover:bg-[#002244] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
