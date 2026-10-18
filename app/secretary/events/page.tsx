'use client'

import { useRouter } from 'next/navigation'

export default function EventsPage() {
  const router = useRouter()
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Events Management</h1>
      <p className="text-gray-600 mt-2">This is a placeholder for events management page.</p>
      <button 
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
      >
        Go Back
      </button>
    </div>
  )
}