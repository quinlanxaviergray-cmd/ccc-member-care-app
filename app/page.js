"use client";

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const CARE_TYPES = [
  { value: 'medical', label: 'Medical', color: '#7a4a35', bg: '#efe1da' },
  { value: 'grief', label: 'Grief', color: '#4f6b57', bg: '#e3ece5' },
  { value: 'pregnancy', label: 'Pregnancy', color: '#8c7740', bg: '#f4ecd7' },
  { value: 'other', label: 'Other', color: '#3f4a56', bg: '#e6ebf0' },
]

function getCareType(value) {
  return CARE_TYPES.find((t) => t.value === value) || CARE_TYPES[3]
}

function formatDate(date) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isNeedsAttention(card) {
  if (card.status !== 'active') return false
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const now = new Date()
  const diff = (now - last) / (1000 * 60 * 60 * 24)

  if (card.follow_up_interval === 'daily') return diff >= 1
  if (card.follow_up_interval === 'weekly') return diff >= 7
  if (card.follow_up_interval === 'monthly') return diff >= 30

  return false
}

function getLocalDateTimeValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function Modal({ children, onClose, width = '600px' }) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 40, 33, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 100,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fbfaf7',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          border: '1px solid #d9e2d6',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function CardForm({ initial, onSave, onClose }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState(
    initial || {
      name: '',
      phone: '',
      care_type: 'medical',
      care_title: '',
      location: '',
      notes: '',
      follow_up_interval: 'weekly',
      status: 'active',
    }
  )

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    if (!form.name.trim() || !form.care_title.trim()) {
      setError('Name and Care Title are required.')
      return
    }

    setSaving(true)
    setError('')
    
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: '0.8rem',
    border: error ? '2px solid #dc2626' : '1px solid #cfd8cc',
    fontSize: '1rem',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{initial ? 'Edit Card' : 'New Care Card'}</h2>
        <button 
          type="button"
          onClick={onClose} 
          style={{ 
            border: 'none', 
            background: 'transparent', 
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem'
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="name">Member Name *</label>
          <input
            id="name"
            style={inputStyle}
            placeholder="Member Name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            style={inputStyle}
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="care_type">Care Type</label>
          <select
            id="care_type"
            style={inputStyle}
            value={form.care_type}
            onChange={(e) => update('care_type', e.target.value)}
          >
            {CARE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="care_title">Care Title *</label>
          <input
            id="care_title"
            style={inputStyle}
            placeholder="Care Title"
            value={form.care_title}
            onChange={(e) => update('care_title', e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="location">Location</label>
          <input
            id="location"
            style={inputStyle}
            placeholder="Location"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="follow_up">Follow-up Frequency</label>
          <select
            id="follow_up"
            style={inputStyle}
            value={form.follow_up_interval}
            onChange={(e) => update('follow_up_interval', e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving || !form.name.trim() || !form.care_title.trim()}
          style={{
            background: '#6f8f73',
            color: 'white',
            padding: '1rem',
            border: 'none',
            borderRadius: '0.8rem',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  )
}

function InteractionForm({ cardId, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'Visit',
    notes: '',
    interacted_at: getLocalDateTimeValue(),
  })

  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    if (!form.notes.trim()) {
      alert('Please add interaction notes.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        care_card_id: cardId,
        type: form.type,
        notes: form.notes.trim(),
        interacted_at: new Date(form.interacted_at).toISOString(),
      }

      const { error } = await supabase.from('interactions').insert([payload])

      if (error) throw error

      // Reset form
      setForm({
        type: 'Visit',
        notes: '',
        interacted_at: getLocalDateTimeValue(),
      })

      await onSaved()
    } catch (error) {
      alert(error.message || 'Failed to save interaction')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: '0.8rem',
    border: '1px solid #cfd8cc',
    fontSize: '1rem',
    background: 'white',
    outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #d9e2d6' }}>
      <h3 style={{ marginTop: 0 }}>Add Interaction</h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="interaction-type">Type</label>
          <select
            id="interaction-type"
            style={inputStyle}
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {['Visit', 'Phone Call', 'Text', 'Email', 'Other'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="interaction-date">Date & Time</label>
          <input
            id="interaction-date"
            type="datetime-local"
            style={inputStyle}
            value={form.interacted_at}
            onChange={(e) => setForm((prev) => ({ ...prev, interacted_at: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="interaction-notes">Notes *</label>
          <textarea
            id="interaction-notes"
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            placeholder="Write notes about this interaction"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            background: '#4f6b57',
            color: 'white',
            padding: '1rem',
            border: 'none',
            borderRadius: '0.8rem',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Add Interaction'}
        </button>
      </div>
    </form>
  )
}

function CareCard({ card, onClick }) {
  const type = getCareType(card.care_type)
  const overdue = isNeedsAttention(card)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        // PROMINENT CARD BOX
        background: 'white',
        border: overdue 
          ? '4px solid #dc2626' 
          : '3px solid #d9e2d6',
        borderRadius: '1.25rem',
        padding: '1.75rem 1.5rem',
        boxShadow: overdue 
          ? '0 20px 40px rgba(220, 38, 38, 0.15)' 
          : '0 16px 32px rgba(0, 0, 0, 0.12)',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* TOP BADGE - Makes it feel like a card */}
      <div style={{
        position: 'absolute',
        top: '-1rem',
        left: '1.5rem',
        background: 'white',
        padding: '0 1rem 0 0.75rem',
        borderRadius: '0 1rem 1rem 0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        fontWeight: '700',
        fontSize: '0.85rem',
        color: overdue ? '#dc2626' : '#6f8f73',
      }}>
        {type.label}
      </div>

      {/* OVERDUE BADGE */}
      {overdue && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: '#fee2e2',
          color: '#dc2626',
          padding: '0.4rem 0.8rem',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: '800',
          boxShadow: '0 4px 12px rgba(220,38,38,0.2)',
        }}>
          ⏰ NEEDS ATTENTION
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* NAME */}
        <div style={{ 
          fontSize: '1.25rem', 
          fontWeight: '800', 
          lineHeight: '1.3',
          color: '#1f2937',
          marginTop: '0.25rem'
        }}>
          {card.name}
        </div>

        {/* TITLE */}
        <div style={{ 
          fontSize: '1.1rem', 
          fontWeight: '700', 
          color: '#374151',
          padding: '0.75rem 1rem',
          background: overdue ? '#fef2f2' : '#f9fafb',
          borderRadius: '0.75rem',
          borderLeft: `4px solid ${overdue ? '#dc2626' : '#6f8f73'}`,
        }}>
          {card.care_title}
        </div>

        {/* LOCATION & PHONE - BOTTOM BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 0 0.25rem 0',
          borderTop: '1px solid #e5e7eb',
          marginTop: 'auto',
          fontSize: '0.95rem',
        }}>
          <div style={{ color: '#6b7280' }}>
            📍 {card.location || 'No location'}
          </div>
          <div style={{ 
            color: overdue ? '#dc2626' : '#6f8f73',
            fontWeight: '600'
          }}>
            Last: {formatDate(card.last_interaction_at)}
          </div>
        </div>
      </div>

      {/* CARE TYPE TAG - BOTTOM LEFT */}
      <div style={{
        alignSelf: 'flex-start',
        background: type.bg,
        color: type.color,
        padding: '0.4rem 1rem',
        borderRadius: '999px',
        fontSize: '0.85rem',
        fontWeight: '700',
        border: `1px solid ${type.color}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        {type.label} {card.status === 'completed' && '(Archived)'}
      </div>
    </div>
  )
}

function CardDetail({ card, onClose, refreshCards, onEdit, onComplete }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const loadInteractions = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('care_card_id', card.id)
        .order('interacted_at', { ascending: false })

      if (error) throw error
      setInteractions(data || [])
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }, [card.id])

  useEffect(() => {
    loadInteractions()
  }, [loadInteractions])

  const deleteCard = async () => {
    if (!confirm('Are you sure you want to delete this card? This cannot be undone.')) return

    setDeleting(true)
    try {
      const { error } = await supabase.from('care_cards').delete().eq('id', card.id)
      if (error) throw error
      onClose()
      refreshCards()
    } catch (error) {
      alert(error.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal onClose={onClose} width="800px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{card.name}</h2>
          <div style={{ color: '#5f6b63', fontSize: '1.1rem', marginTop: '0.25rem' }}>
            {card.care_title}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {card.status === 'active' && (
            <button
              onClick={() => onComplete(card.id)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ✅ Complete
            </button>
          )}
          <button
            onClick={() => onEdit(card)}
            style={{
              background: '#6f8f73',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>

          <button
            onClick={deleteCard}
            disabled={deleting}
            style={{
              background: deleting ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: '600',
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>

          <button 
            onClick={onClose}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              fontSize: '1.5rem',
              padding: '0.5rem',
              cursor: 'pointer'
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f7f2', borderRadius: '0.75rem' }}>
        <div style={{ fontSize: '1rem', color: '#5f6b63' }}>
          📞 {card.phone || 'No phone number'} • 📍 {card.location || 'No location'}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{card.notes}</div>
        {card.status === 'completed' && (
          <div style={{ marginTop: '0.5rem', color: '#10b981', fontWeight: '600' }}>
            ✅ Completed and archived
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Interaction History</h3>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63' }}>
            Loading interactions...
          </div>
        ) : interactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63', fontStyle: 'italic' }}>
            No interactions yet. Add one below!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            {interactions.map((i) => (
              <div
                key={i.id}
                style={{
                  borderLeft: '4px solid #6f8f73',
                  padding: '1rem 1.25rem',
                  background: '#f8faf6',
                  borderRadius: '0.75rem',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{i.type}</div>
                  <div style={{ fontSize: '0.85rem', color: '#5f6b63' }}>
                    {formatDate(i.interacted_at)}
                  </div>
                </div>
                <div>{i.notes}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InteractionForm cardId={card.id} onSaved={loadInteractions} />
    </Modal>
  )
}

export default function Home() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showAddCard, setShowAddCard] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [editingCard, setEditingCard] = useState(null)

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError('')
    
    try {
      // Get all care cards (both active and completed)
      const { data: cardsData, error: cardsError } = await supabase
        .from('care_cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (cardsError) throw cardsError

      // Get interactions for all cards to calculate last_interaction_at
      if (cardsData?.length > 0) {
        const cardIds = cardsData.map(card => card.id)
        
        const { data: interactionsData, error: interactionsError } = await supabase
          .from('interactions')
          .select('care_card_id, interacted_at')
          .in('care_card_id', cardIds)
          .order('interacted_at', { ascending: false })

        if (interactionsError) throw interactionsError

        // Group interactions by card and get most recent
        const latestInteractions = {}
        interactionsData?.forEach(interaction => {
          if (!latestInteractions[interaction.care_card_id]) {
            latestInteractions[interaction.care_card_id] = interaction.interacted_at
          }
        })

        // Add last_interaction_at to each card
        const cardsWithLastInteraction = cardsData.map(card => ({
          ...card,
          last_interaction_at: latestInteractions[card.id] || null
        }))

        setCards(cardsWithLastInteraction)
      } else {
        setCards([])
      }
    } catch (err) {
      console.error('Failed to load cards:', err)
      setError('Failed to load cards. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const activeCards = useMemo(() => cards.filter(c => c.status === 'active'), [cards])
  const completedCards = useMemo(() => cards.filter(c => c.status === 'completed'), [cards])
  const needsAttention = useMemo(() => 
    activeCards.filter(isNeedsAttention), [activeCards]
  )

  const tabs = useMemo(() => [
    { id: 'all', label: 'All Active', count: activeCards.length },
    { id: 'archive', label: 'Archive', count: completedCards.length },
    { id: 'medical', label: 'Medical', count: activeCards.filter((c) => c.care_type === 'medical').length },
    { id: 'grief', label: 'Grief', count: activeCards.filter((c) => c.care_type === 'grief').length },
    { id: 'pregnancy', label: 'Pregnancy', count: activeCards.filter((c) => c.care_type === 'pregnancy').length },
    { id: 'other', label: 'Other', count: activeCards.filter((c) => c.care_type === 'other').length },
    { id: 'followup', label: 'Needs Attention', count: needsAttention.length },
  ], [activeCards.length, completedCards.length, needsAttention.length])

  const visibleCards = useMemo(() => {
    if (activeTab === 'all') return activeCards
    if (activeTab === 'archive') return completedCards
    if (activeTab === 'followup') return needsAttention
    return activeCards.filter((c) => c.care_type === activeTab)
  }, [activeCards, completedCards, needsAttention, activeTab])

const completeCard = async (cardId) => {
  if (!confirm('Mark this card as completed and move to Archive?')) return

  try {
    const { error } = await supabase
      .from('care_cards')
      .update({ 
        status: 'completed'
        // removed updated_at since column doesn't exist
      })
      .eq('id', cardId)

    if (error) throw error
    
    // Reload cards
    await loadCards()
  } catch (error) {
    alert('Failed to complete card: ' + error.message)
  }
}


const saveCard = async (form) => {
  try {
    if (editingCard?.id) {
      const { error } = await supabase
        .from('care_cards')
        .update({ ...form }) // removed updated_at
        .eq('id', editingCard.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('care_cards').insert([form])
      if (error) throw error
    }
    
    setShowAddCard(false)
    setEditingCard(null)
    await loadCards()
  } catch (error) {
    throw new Error(error.message)
  }
}

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f8f3',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <h1 style={{ color: '#dc2626' }}>Error</h1>
        <p>{error}</p>
        <button 
          onClick={loadCards}
          style={{
            background: '#6f8f73',
            color: 'white',
            padding: '1rem 2rem',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)',
        color: '#26312b',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <header style={{ padding: '1.5rem 1rem 1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid #d9e2d6',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>Member Care</h1>
            <div style={{ color: '#5f6b63', marginTop: '0.5rem', fontSize: '1.1rem' }}>
              Track care requests and follow-ups
            </div>
          </div>

          <button
            onClick={() => {
              setEditingCard(null)
              setShowAddCard(true)
            }}
            style={{
              background: '#6f8f73',
              color: 'white',
              padding: '1rem 1.5rem',
              border: 'none',
              borderRadius: '1rem',
              fontWeight: '700',
              fontSize: '1.05rem',
              boxShadow: '0 8px 24px rgba(111, 143, 115, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            + New Care Card
          </button>
        </div>
      </header>

      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '999px',
              border: activeTab === tab.id ? '2px solid #6f8f73' : '1px solid #d9e2d6',
              background: activeTab === tab.id ? '#6f8f73' : 'rgba(255,255,255,0.95)',
              color: activeTab === tab.id ? 'white' : '#2f3a34',
              fontWeight: '700',
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(44, 57, 49, 0.08)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              minHeight: '52px',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <main style={{ padding: '0 1rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            color: '#5f6b63',
            fontSize: '1.1rem'
          }}>
            Loading care cards...
          </div>
        ) : visibleCards.length === 0 ? (
          <div style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            color: '#5f6b63',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '1rem',
            border: '1px dashed #d9e2d6'
          }}>
            <h3 style={{ marginBottom: '0.5rem' }}>
              {activeTab === 'archive' ? 'No archived cards' : 'No cards yet'}
            </h3>
            <p>
              {activeTab === 'archive' 
                ? 'Complete some cards to see them here!' 
                : 'Create your first care card above to get started!'
              }
            </p>
          </div>
        ) : (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.5rem' 
            }}
          >
            {visibleCards.map((card) => (
              <CareCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
            ))}
          </div>
        )}
      </main>

      {showAddCard && (
        <Modal onClose={() => {
          setShowAddCard(false)
          setEditingCard(null)
        }}>
          <CardForm
            initial={editingCard}
            onSave={saveCard}
            onClose={() => {
              setShowAddCard(false)
              setEditingCard(null)
            }}
          />
        </Modal>
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          refreshCards={loadCards}
          onEdit={(card) => {
            setSelectedCard(null)
            setEditingCard(card)
            setShowAddCard(true)
          }}
          onComplete={completeCard}
        />
      )}
    </div>
  )
}