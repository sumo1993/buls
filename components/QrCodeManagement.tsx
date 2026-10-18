'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import { Upload, Trash2, Plus, QrCode, Edit } from 'lucide-react'

interface QrCode {
  id: string
  role: 'admin' | 'treasurer' | 'secretary' | 'finance' | 'embassy'
  qr_code_url: string
  payment_method: 'wechat' | 'alipay' | 'bank_transfer'
  title: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export function QrCodeManagement() {
  const { user: authUser } = useAuth()
  const [qrCodes, setQrCodes] = useState<QrCode[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingQrCode, setEditingQrCode] = useState<QrCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const [form, setForm] = useState({
    id: '' as string,
    role: 'admin' as 'admin' | 'treasurer' | 'secretary' | 'finance' | 'embassy',
    qr_code_url: '',
    payment_method: 'wechat' as 'wechat' | 'alipay' | 'bank_transfer',
    title: '',
    description: '',
    selectedFile: null as File | null
  })

  // Fetch QR codes
  const fetchQrCodes = async () => {
    try {
      const response = await fetch('/api/qr-codes')
      const data = await response.json()
      if (response.ok) {
        setQrCodes(data.qrCodes)
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error)
      toast.error('Failed to load QR codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQrCodes()
  }, [])

  // Handle QR code upload
  const handleQrUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.qr_code_url && !form.selectedFile) {
      toast.error('Please select a QR code image or enter a URL')
      return
    }

    setUploading(true)
    try {
      let qrCodeUrl = form.qr_code_url

      // If file selected, convert to Base64
      if (form.selectedFile) {
        qrCodeUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const result = event.target?.result as string
            console.log('File loaded, result length:', result.length)
            resolve(result)
          }
          reader.onerror = (error) => {
            reject(error)
          }
          reader.readAsDataURL(form.selectedFile)
        })
        console.log('Base64 URL ready:', qrCodeUrl.substring(0, 50) + '...')
      }

      await submitQrCode(qrCodeUrl)
    } catch (error: any) {
      console.error('Error uploading QR code:', error)
      toast.error(error.message || 'Failed to upload QR code')
      setUploading(false)
    }
  }

  const submitQrCode = async (qrCodeUrl: string) => {
    try {
      console.log('Submitting QR code (POST):', { role: form.role, payment_method: form.payment_method, title: form.title, hasUrl: !!qrCodeUrl })
      
      const response = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          qr_code_url: qrCodeUrl,
          payment_method: form.payment_method,
          title: form.title,
          description: form.description
        })
      })

      console.log('Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        const message = response.status === 200 ? 'QR code updated successfully!' : 'QR code uploaded successfully!'
        toast.success(message)
        setShowModal(false)
        setEditingQrCode(null)
        fetchQrCodes()
        setForm({
          id: '',
          role: 'admin',
          qr_code_url: '',
          payment_method: 'wechat',
          title: '',
          description: '',
          selectedFile: null
        })
      } else {
        const errorMessage = data.error || `Failed to save QR code: ${response.statusText}`
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error('Error submitting QR code:', error)
      toast.error(error.message || 'Failed to save QR code')
    } finally {
      setUploading(false)
    }
  }

  // Handle edit QR code
  const handleEditQrCode = (qrCode: QrCode) => {
    // Pre-fill form for editing, but POST will automatically update
    setEditingQrCode(qrCode)
    setForm({
      id: qrCode.id,
      role: qrCode.role as any,
      qr_code_url: qrCode.qr_code_url,
      payment_method: qrCode.payment_method as any,
      title: qrCode.title || '',
      description: qrCode.description || '',
      selectedFile: null
    })
    setShowModal(true)
  }

  // Handle QR code delete
  const handleQrDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return

    try {
      const response = await fetch('/api/qr-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        toast.success('QR code deleted successfully!')
        fetchQrCodes()
      } else {
        toast.error('Failed to delete QR code')
      }
    } catch (error) {
      console.error('Error deleting QR code:', error)
      toast.error('Failed to delete QR code')
    }
  }

  // Get display name for payment method
  const getPaymentMethodName = (method: string) => {
    const names = {
      wechat: 'WeChat Pay',
      alipay: 'Alipay',
      bank_transfer: 'Bank Transfer'
    }
    return names[method as keyof typeof names] || method
  }

  // Get display name for role
  const getRoleName = (role: string) => {
    const names = {
      admin: 'Admin',
      treasurer: 'Treasurer',
      secretary: 'Secretary',
      finance: 'Finance',
      embassy: 'Embassy',
    }
    return names[role as keyof typeof names] || role
  }

  // Get color class for role
  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      treasurer: 'bg-green-100 text-green-800',
      secretary: 'bg-blue-100 text-blue-800',
      finance: 'bg-orange-100 text-orange-800',
      embassy: 'bg-red-100 text-red-800',
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QR Code Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage payment QR codes for WeChat, Alipay, and Bank Transfer
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Upload QR Code</span>
        </button>
      </div>

      {/* QR Codes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No QR codes uploaded</h3>
          <p className="text-gray-500 mt-2">Upload a QR code to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(qrCode.role)}`}>
                      {getRoleName(qrCode.role)}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {getPaymentMethodName(qrCode.payment_method)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditQrCode(qrCode)}
                      className="text-gray-400 hover:text-blue-600 p-1"
                      title="Edit QR code"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleQrDelete(qrCode.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete QR code"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* QR Code Image */}
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center mb-4">
                  {qrCode.qr_code_url.startsWith('data:') || qrCode.qr_code_url.includes('.png') || qrCode.qr_code_url.includes('.jpg') ? (
                    <img
                      src={qrCode.qr_code_url}
                      alt="QR Code"
                      className="max-w-full max-h-48 object-contain"
                    />
                  ) : (
                    <div className="text-sm text-gray-500 text-center">
                      {qrCode.qr_code_url}
                    </div>
                  )}
                </div>

                {/* Details */}
                {(qrCode.title || qrCode.description) && (
                  <div className="space-y-2">
                    {qrCode.title && (
                      <p className="text-sm font-medium text-gray-900">
                        <strong>Title:</strong> {qrCode.title}
                      </p>
                    )}
                    {qrCode.description && (
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {qrCode.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-4">
                  <p>Added: {new Date(qrCode.created_at).toLocaleDateString()}</p>
                  {qrCode.updated_at !== qrCode.created_at && (
                    <p>Updated: {new Date(qrCode.updated_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Upload QR Code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleQrUpload} className="p-6 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  For Which Role?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['admin', 'treasurer', 'secretary', 'finance', 'embassy'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm({ ...form, role: role as any })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        form.role === role
                          ? getRoleColor(role).replace('text-', 'bg-').replace('100', '600').replace('800', 'text-white')
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {getRoleName(role)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="wechat">WeChat Pay</option>
                  <option value="alipay">Alipay</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Treasurer WeChat Payment"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              {/* QR Code Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Image *
                </label>
                <div className="space-y-2">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setForm({ ...form, selectedFile: e.target.files[0] })
                        }
                      }}
                      className="hidden"
                      id="qr-file-upload"
                    />
                    <label htmlFor="qr-file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload image
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        or drag and drop
                      </p>
                    </label>
                  </div>

                  {form.selectedFile && (
                    <p className="text-sm text-green-600 flex items-center">
                      <span className="mr-2">✓</span>
                      Selected: {form.selectedFile.name}
                    </p>
                  )}

                  {/* URL Input */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or enter URL
                    </label>
                    <input
                      type="text"
                      value={form.qr_code_url}
                      onChange={(e) => setForm({ ...form, qr_code_url: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="https://example.com/qr-code.png"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {uploading ? 'Uploading...' : 'Upload QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



