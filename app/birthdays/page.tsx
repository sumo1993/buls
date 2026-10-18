'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Cake, 
  Upload, 
  Loader2,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  Trash2,
  Edit,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { cachedFetch, clientCache } from '@/lib/cache'

export default function BirthdaysPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [birthdayPhotos, setBirthdayPhotos] = useState<any[]>([])
  const [myPhotos, setMyPhotos] = useState<any[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [birthdayDate, setBirthdayDate] = useState('')
  const [editingPhoto, setEditingPhoto] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<{id: string, url: string} | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState<any>(null)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Use cached fetch for faster loading
      const result = await cachedFetch(
        `birthdays-${userId}`,
        async () => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', userId)
            .single()

          if (userError || !userData) {
            throw new Error('Failed to load user data')
          }

          const { data: profileData } = await supabase
            .from('members_profile')
            .select('*')
            .eq('user_id', userData.id)
            .single()

          // Fetch all birthday photos (only reposted ones for members)
          const { data: photosData, error: photosError } = await supabase
            .from('birthday_photos')
            .select('*, users:user_id(full_name, email)')
            .eq('status', 'approved')
            .eq('is_reposted', true)
            .order('reposted_at', { ascending: false })

          if (photosError) {
            console.error('Error fetching birthday photos:', photosError)
          }

          return { userData, profileData, photosWithUsers: photosData || [] }
        },
        10000 // Cache for 10 seconds
      )

      setUser(result.userData)
      
      if (result.profileData) {
        setProfile(result.profileData)
        if (result.profileData.date_of_birth) {
          setBirthdayDate(result.profileData.date_of_birth)
        }
      }

      setBirthdayPhotos(result.photosWithUsers)
      
      // Filter my photos
      const myPhotosList = result.photosWithUsers.filter(
        (p: any) => p.user_id === result.userData.id
      )
      setMyPhotos(myPhotosList)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load birthday photos')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Photo must be less than 10MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
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

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    setPhotoToDelete({ id: photoId, url: photoUrl })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!photoToDelete) return

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Delete from storage
      const fileName = photoToDelete.url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('birthday-photos')
          .remove([`birthday-photos/${fileName}`])
      }

      // Delete from database
      const { error } = await supabase
        .from('birthday_photos')
        .delete()
        .eq('id', photoToDelete.id)

      if (error) throw error

      toast.success('Photo deleted successfully')
      setShowDeleteModal(false)
      setPhotoToDelete(null)
      fetchData()
    } catch (error: any) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  const openEditModal = (photo: any) => {
    setEditingPhoto(photo)
    setCaption(photo.caption || '')
    setBirthdayDate(photo.birthday_date || '')
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingPhoto(null)
    setShowEditModal(false)
    setCaption('')
    setBirthdayDate('')
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const openLightbox = (photo: any) => {
    setCurrentPhoto(photo)
    setShowLightbox(true)
  }

  const closeLightbox = () => {
    setShowLightbox(false)
    setCurrentPhoto(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPhoto) return

    setUploading(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const updateData: any = {
        caption,
        birthday_date: birthdayDate
      }

      // Upload new photo if changed
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `birthday-photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('birthday-photos')
          .upload(filePath, photoFile)

        if (uploadError) throw new Error('Failed to upload photo: ' + uploadError.message)

        const { data: { publicUrl } } = supabase.storage
          .from('birthday-photos')
          .getPublicUrl(filePath)

        updateData.photo_url = publicUrl

        // Delete old photo
        const oldFileName = editingPhoto.photo_url.split('/').pop()
        if (oldFileName) {
          await supabase.storage
            .from('birthday-photos')
            .remove([`birthday-photos/${oldFileName}`])
        }
      }

      const { error } = await supabase
        .from('birthday_photos')
        .update(updateData)
        .eq('id', editingPhoto.id)

      if (error) throw error

      toast.success('Photo updated successfully!')
      closeEditModal()
      fetchData()
    } catch (error: any) {
      console.error('Error updating photo:', error)
      toast.error(error.message || 'Failed to update photo')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!photoFile) {
      toast.error('Please select a photo to upload')
      return
    }

    if (!birthdayDate) {
      toast.error('Please set your birthday date')
      return
    }

    setUploading(true)

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Upload photo to storage
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `birthday-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('birthday-photos')
        .upload(filePath, photoFile)

      if (uploadError) {
        throw new Error('Failed to upload photo: ' + uploadError.message)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('birthday-photos')
        .getPublicUrl(filePath)

      // Save birthday photo record
      const { error: insertError } = await supabase
        .from('birthday_photos')
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          caption: caption,
          birthday_date: birthdayDate,
          status: 'pending'
        })

      if (insertError) throw insertError

      toast.success('Birthday photo submitted! Waiting for secretary approval.')
      
      // Reset form
      setPhotoFile(null)
      setPhotoPreview('')
      setCaption('')
      
      // Refresh photos
      fetchData()
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast.error(error.message || 'Failed to upload birthday photo')
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center mr-4">
                <Cake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Birthday Celebrations</h1>
                <p className="text-gray-600 mt-1">Celebrate our members' special moments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-[#003366]" />
            Upload Your Birthday Photo
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Your Birthday
                </label>
                <input
                  type="date"
                  value={birthdayDate}
                  onChange={(e) => setBirthdayDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#003366] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a birthday message..."
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#003366] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birthday Photo
              </label>
              
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full max-w-md max-h-96 rounded-lg object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null)
                      setPhotoPreview('')
                    }}
                    className="absolute top-2 right-2 bg-white text-gray-700 rounded-full p-2 hover:bg-gray-50 transition-colors shadow"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center hover:bg-gray-100 transition-all cursor-pointer">
                  <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <label className="inline-flex items-center px-6 py-3 bg-[#003366] text-white rounded-lg cursor-pointer hover:bg-[#004080] transition-colors">
                    <Upload className="w-5 h-5 mr-2" />
                    Choose Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-3">
                    JPG, PNG or GIF. Max size 10MB.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || !photoFile}
                className="px-6 py-3 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Submit Photo
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* My Uploads */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-[#003366]" />
            My Uploads
          </h2>
          
          {myPhotos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos uploaded yet</h3>
              <p className="text-gray-600">Upload your first birthday photo above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPhotos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <div className="relative">
                    <img 
                      src={photo.photo_url} 
                      alt="Your birthday photo"
                      className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openLightbox(photo)}
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(photo.status)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(photo.birthday_date)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(photo)}
                          className="px-3 py-1 bg-[#003366] text-white rounded hover:bg-[#004080] transition-colors text-sm font-medium"
                          title="Change photo"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => deletePhoto(photo.id, photo.photo_url)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Delete photo"
                        >
                          Recall
                        </button>
                      </div>
                    </div>
                    {photo.caption && (
                      <p className="text-gray-700 text-sm italic mb-2">"{photo.caption}"</p>
                    )}
                    {photo.rejection_reason && (
                      <div className="p-2 bg-red-50 rounded text-sm text-red-700 mb-2">
                        <strong>Reason:</strong> {photo.rejection_reason}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Uploaded {formatDate(photo.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Birthday Photos Gallery */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Cake className="w-6 h-6 mr-2 text-[#003366]" />
            Birthday Gallery
          </h2>
          
          {birthdayPhotos.length === 0 ? (
            <div className="bg-white rounded-lg text-center py-16 shadow-sm">
              <Cake className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No birthday photos yet</h3>
              <p className="text-gray-600">Be the first to share your birthday celebration!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {birthdayPhotos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img 
                      src={photo.photo_url} 
                      alt={`${photo.users?.full_name || 'Unknown'}'s birthday`}
                      className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openLightbox(photo)}
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(photo.status)}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 mr-3 shadow-sm">
                        {photo.users?.members_profile?.[0]?.photo_url ? (
                          <img
                            src={photo.users.members_profile[0].photo_url}
                            alt={photo.users.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#003366]">
                            <span className="text-white font-bold text-lg">
                              {photo.users?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{photo.users?.full_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(photo.birthday_date)}
                        </p>
                      </div>
                    </div>
                    {photo.caption && (
                      <p className="text-gray-700 text-sm italic mb-3">"{photo.caption}"</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Uploaded {formatDate(photo.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Birthday Photo</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday Date
                </label>
                <input
                  type="date"
                  value={birthdayDate}
                  onChange={(e) => setBirthdayDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#003366] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a birthday message..."
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#003366] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Photo (Optional)
                </label>
                
                {photoPreview ? (
                  <div className="relative mb-2">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full max-h-48 rounded-lg object-cover shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview('')
                      }}
                      className="absolute top-2 right-2 bg-white text-gray-700 rounded-full p-1 hover:bg-gray-50 transition-colors shadow"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose New Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors flex items-center disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Photo</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this birthday photo? This will permanently remove it from the gallery.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setPhotoToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightbox && currentPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={closeLightbox}>
          <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeLightbox}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
              title="Close (or click outside)"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative flex-1 flex items-center justify-center overflow-hidden rounded-lg">
              <img
                src={currentPhoto.photo_url}
                alt="Birthday photo"
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 rounded-b-lg">
                <div className="text-white">
                  <h3 className="text-lg font-semibold mb-1">
                    {currentPhoto.users?.full_name || 'Unknown'}'s Birthday
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(currentPhoto.birthday_date)}
                    </span>
                    {currentPhoto.caption && (
                      <span className="italic">"{currentPhoto.caption}"</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
