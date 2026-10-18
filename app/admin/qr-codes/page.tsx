'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { QrCodeManagement } from '@/components/QrCodeManagement'

export default function AdminQrCodesPage() {
  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">QR Code Management</h1>
        <p className="text-gray-600">Upload and manage payment QR codes for WeChat, Alipay, and Bank Transfer</p>
        <QrCodeManagement />
      </div>
    </DashboardLayout>
  )
}
