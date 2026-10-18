'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, UserPlus, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminRegisterStudent() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    university: '',
    scholarshipType: 'self_support',
    address: '',
    age: '',
    role: 'member',
    status: 'active'
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Check admin access
  useState(() => {
    const checkAdmin = async () => {
      if (!userId) return

      try {
        const { supabase } = await import('@/lib/supabase/client-browser')
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', userId)
          .single()

        if (error || !userData) {
          toast.error('Access denied')
          router.push('/dashboard')
          return
        }

        if (userData.role !== 'admin') {
          toast.error('Admin access required')
          router.push('/dashboard')
          return
        }

        setUser(userData)
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/dashboard')
      }
    }

    checkAdmin()
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Photo size must be less than 5MB')
        return
      }

      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const registerStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create user in Clerk via Backend API
      const clerkResponse = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password || generateTempPassword(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          status: formData.status
        })
      })

      if (!clerkResponse.ok) {
        const error = await clerkResponse.json()
        throw new Error(error.message || 'Failed to create user in Clerk')
      }

      const clerkData = await clerkResponse.json()
      const clerkUserId = clerkData.user.id

      toast.success('User created successfully!')

      // Step 2: Upload photo if provided
      let photoUrl = ''
      if (photoFile) {
        const { supabase } = await import('@/lib/supabase/client-browser')
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${clerkUserId}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoFile)

        if (!uploadError) {
          const { data } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName)
          photoUrl = data.publicUrl
        }
      }

      // Step 3: Get the user created by direct sync (no webhook wait needed)
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { data: createdUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single()

      if (fetchError || !createdUser) {
        console.error('User sync error:', fetchError)
        toast.error('User created but profile setup failed. Please try again.')
        router.push('/admin')
        return
      }

      // Create member profile
      const { error: profileError } = await supabase
        .from('members_profile')
        .insert({
          user_id: createdUser.id,
          photo_url: photoUrl,
          age: formData.age ? parseInt(formData.age) : null,
          phone: formData.phone,
          university: formData.university,
          address: formData.address
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        toast.error('User created but profile setup failed. Please update profile manually.')
      } else {
        toast.success('Student registered successfully!')
      }

      // Reset form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        university: '',
        scholarshipType: 'self_support',
        address: '',
        age: '',
        role: 'member',
        status: 'active'
      })
      setPhotoFile(null)
      setPhotoPreview(null)

      // Navigate to admin panel
      router.push('/admin')

    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to register student')
    } finally {
      setLoading(false)
    }
  }

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  if (!user) {
    return (
      <DashboardLayout userRole="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Register New Student</h1>
          <p className="text-gray-600">Create a new student account in the system</p>
        </div>

        <form onSubmit={registerStudent} className="space-y-6">
          {/* Account Information */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Account Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  placeholder="student@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (Leave empty for auto-generated)
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="finance">Finance</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="secretary">Secretary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Profile Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo
                </label>
                {photoPreview ? (
                  <div className="flex items-center space-x-4">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  placeholder="+86 xxx xxxx xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  University
                </label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  placeholder="University name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scholarship Type
                </label>
                <select
                  name="scholarshipType"
                  value={formData.scholarshipType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                >
                  <option value="self_support">Self Support</option>
                  <option value="government">Government Scholarship</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  placeholder="Current address in China"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2 px-8 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Register Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
