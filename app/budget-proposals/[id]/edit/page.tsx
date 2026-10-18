'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Plus, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditBudgetProposalPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [proposal, setProposal] = useState<any>(null)
  const [userRole, setUserRole] = useState('member')
  const [form, setForm] = useState({
    title: '',
    description: '',
    items: [] as any[]
  })

  useEffect(() => {
    if (userId && proposalId) {
      fetchProposal()
    }
  }, [userId, proposalId])

  const fetchProposal = async () => {
    try {
      const [response, userRes] = await Promise.all([
        fetch(`/api/budget-proposals/${proposalId}`),
        fetch('/api/user'),
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUserRole(userData.role || 'member')
      }

      if (response.ok) {
        const data = await response.json()
        if (!data.access?.canEditAsMember && !data.access?.isStaff) {
          toast.error('You do not have permission to edit this proposal')
          router.push(`/budget-proposals/${proposalId}`)
          return
        }
        if (data.proposal.status !== 'draft' && !data.access?.isStaff) {
          toast.error('Only draft proposals can be edited')
          router.push(`/budget-proposals/${proposalId}`)
          return
        }
        setProposal(data.proposal)
        setForm({
          title: data.proposal.title === 'Pending Details' ? '' : data.proposal.title || '',
          description: data.proposal.description || '',
          items: data.proposal.budget_proposal_items || []
        })
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load proposal')
        router.push('/my-budget-proposals')
      }
    } catch (error) {
      console.error('Error fetching proposal:', error)
      toast.error('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate
    if (!form.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (form.items.length === 0) {
      toast.error('Please add at least one budget item')
      return
    }

    setSaving(true)
    try {
      const totalAmount = form.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)

      const response = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proposalId,
          title: form.title,
          description: form.description,
          items: form.items,
          total_amount: totalAmount
        })
      })

      if (response.ok) {
        toast.success('Proposal saved successfully')
        router.push('/my-budget-proposals')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save proposal')
      }
    } catch (error) {
      console.error('Error saving proposal:', error)
      toast.error('Failed to save proposal')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    // Validate
    if (!form.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (form.items.length === 0) {
      toast.error('Please add at least one budget item')
      return
    }

    setSaving(true)
    try {
      const totalAmount = form.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)

      const response = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proposalId,
          title: form.title,
          description: form.description,
          items: form.items,
          total_amount: totalAmount,
          status: 'pending_review'
        })
      })

      if (response.ok) {
        toast.success('Proposal submitted for review')
        router.push('/my-budget-proposals')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit proposal')
      }
    } catch (error) {
      console.error('Error submitting proposal:', error)
      toast.error('Failed to submit proposal')
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [{ item_name: '', description: '', quantity: 1, unit_cost: 0, total_cost: 0 }, ...prev.items]
    }))
    
    // Scroll to the items section after adding
    setTimeout(() => {
      const itemsSection = document.querySelector('[data-items-section]')
      if (itemsSection) {
        itemsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items]
    newItems[index][field] = value

    // Recalculate total_cost if quantity or unit_cost changes
    if (field === 'quantity' || field === 'unit_cost') {
      const quantity = parseFloat(newItems[index].quantity) || 0
      const unitCost = parseFloat(newItems[index].unit_cost) || 0
      newItems[index].total_cost = quantity * unitCost
    }

    setForm(prev => ({ ...prev, items: newItems }))
  }

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const totalAmount = form.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)

  if (loading) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!proposal) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="p-8">
          <p>Proposal not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={userRole}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/my-budget-proposals')}
            className="btn-outline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Edit Budget Proposal</h1>
            <p className="text-gray-600 mt-1">
              Committee: {proposal.committees?.committee_name || 'N/A'}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> As budget head or committee head, fill in the title, description,
            and budget items. Then click &quot;Submit for Review&quot; to send it to the secretary.
          </p>
        </div>

        {/* Form */}
        <div className="card space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Annual Festival Budget 2024"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Brief description of this budget proposal"
            />
          </div>

          {/* Line Items */}
          <div data-items-section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Budget Items <span className="text-red-500">*</span>
              </label>
              <button
                onClick={addItem}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {form.items.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500 mb-2">No budget items yet</p>
                <button
                  onClick={addItem}
                  className="btn-primary text-sm"
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Item name (e.g., Venue Rental)"
                        required
                      />
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-800 px-3 py-2"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Description (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Qty"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit Cost (¥)</label>
                        <input
                          type="number"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Unit Cost"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Total</label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-medium">
                          ¥{item.total_cost?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-700">Total Budget Amount:</span>
              <span className="text-2xl font-bold text-[#003366]">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => router.push('/my-budget-proposals')}
              className="btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-outline"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
