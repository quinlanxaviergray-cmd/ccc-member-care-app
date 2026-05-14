"use client";

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const CARE_TYPES = [
  { value: 'short_term_medical', label: 'Short-Term Medical', color: '#7a4a35', bg: '#efe1da' },
  { value: 'long_term_medical', label: 'Long-Term Medical', color: '#a0522d', bg: '#f5e6dc' },
  { value: 'grief', label: 'Grief', color: '#4f6b57', bg: '#e3ece5' },
  { value: 'pregnancy', label: 'Pregnancy', color: '#8c7740', bg: '#f4ecd7' },
  { value: 'homebound', label: 'Homebound', color: '#5a4a7a', bg: '#eae4f4' },
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

// Midnight-aware: a "day" boundary is calendar date, not 24-hour rolling window
function isNeedsAttention(card) {
  if (card.status === 'completed') return false
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const now = new Date()

  if (card.follow_up_interval === 'daily') {
    // needs attention if last interaction was on a previous calendar day
    const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate())
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return todayDate > lastDate
  }

  const diffMs = now - last
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (card.follow_up_interval === 'weekly') return diffDays >= 7
  if (card.follow_up_interval === 'monthly') return diffDays >= 30

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
        className="modal-content modal-desktop"
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

      <div
        className="modal-content modal-mobile"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ display: 'none' }}
      >
        <div style={{
          width: '40px',
          height: '4px',
          background: '#c4d4c7',
          borderRadius: '999px',
          margin: '0 auto 1rem',
        }} />
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
      care_type: 'short_term_medical',
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
    boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{initial ? 'Edit Card' : 'New Care Card'}</h2>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }} aria-label="Close">✕</button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="name">Member Name *</label>
          <input id="name" style={inputStyle} placeholder="Member Name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="phone">Phone Number</label>
          <input id="phone" style={inputStyle} placeholder="Phone Number" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div>
          <label htmlFor="care_type">Care Type</label>
          <select id="care_type" style={inputStyle} value={form.care_type} onChange={(e) => update('care_type', e.target.value)}>
            {CARE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="care_title">Care Title *</label>
          <input id="care_title" style={inputStyle} placeholder="Care Title" value={form.care_title} onChange={(e) => update('care_title', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" style={inputStyle} placeholder="Location" value={form.location} onChange={(e) => update('location', e.target.value)} />
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }} placeholder="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        <div>
          <label htmlFor="follow_up">Follow-up Frequency</label>
          <select id="follow_up" style={inputStyle} value={form.follow_up_interval} onChange={(e) => update('follow_up_interval', e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving || !form.name.trim() || !form.care_title.trim()}
          style={{ background: '#6f8f73', color: 'white', padding: '1rem', border: 'none', borderRadius: '0.8rem', fontWeight: '700', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  )
}

function InteractionForm({ cardId, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'Visit', notes: '', interacted_at: getLocalDateTimeValue() })

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.notes.trim()) { alert('Please add interaction notes.'); return }
    setSaving(true)
    try {
      const payload = { care_card_id: cardId, type: form.type, notes: form.notes.trim(), interacted_at: new Date(form.interacted_at).toISOString() }
      const { error } = await supabase.from('interactions').insert([payload])
      if (error) throw error
      setForm({ type: 'Visit', notes: '', interacted_at: getLocalDateTimeValue() })
      await onSaved()
    } catch (error) {
      alert(error.message || 'Failed to save interaction')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '0.95rem 1rem', borderRadius: '0.8rem', border: '1px solid #cfd8cc', fontSize: '1rem', background: 'white', outline: 'none', boxSizing: 'border-box' }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #d9e2d6' }}>
      <h3 style={{ marginTop: 0 }}>Add Interaction</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="interaction-type">Type</label>
          <select id="interaction-type" style={inputStyle} value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
            {['Visit', 'Phone Call', 'Text', 'Email', 'Other'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="interaction-date">Date & Time</label>
          <input id="interaction-date" type="datetime-local" style={inputStyle} value={form.interacted_at} onChange={(e) => setForm((prev) => ({ ...prev, interacted_at: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="interaction-notes">Notes *</label>
          <textarea id="interaction-notes" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="Write notes about this interaction" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} required />
        </div>
        <button type="submit" disabled={saving} style={{ background: '#4f6b57', color: 'white', padding: '1rem', border: 'none', borderRadius: '0.8rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Add Interaction'}
        </button>
      </div>
    </form>
  )
}

function InteractionEditForm({ interaction, onSaved, onCancel }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: interaction.type, notes: interaction.notes, interacted_at: getLocalDateTimeValue(new Date(interaction.interacted_at)) })

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.8rem', border: '1px solid #cfd8cc', fontSize: '1rem', background: 'white', outline: 'none', boxSizing: 'border-box' }

  const handleSave = async () => {
    if (!form.notes.trim()) { alert('Notes are required.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('interactions').update({ type: form.type, notes: form.notes.trim(), interacted_at: new Date(form.interacted_at).toISOString() }).eq('id', interaction.id)
      if (error) throw error
      await onSaved()
    } catch (err) {
      alert(err.message || 'Failed to update interaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#eef4ee', border: '1px solid #c4d4c7', borderRadius: '0.75rem', padding: '1rem', display: 'grid', gap: '0.75rem' }}>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57' }}>Type</label>
        <select style={inputStyle} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
          {['Visit', 'Phone Call', 'Text', 'Email', 'Other'].map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57' }}>Date & Time</label>
        <input type="datetime-local" style={inputStyle} value={form.interacted_at} onChange={(e) => setForm((p) => ({ ...p, interacted_at: e.target.value }))} />
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57' }}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={handleSave} disabled={saving} style={{ background: '#4f6b57', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: '0.95rem' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} style={{ background: 'white', color: '#5f6b63', border: '1px solid #cfd8cc', padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function CareCard({ card, onClick, onComplete }) {
  const type = getCareType(card.care_type)
  const overdue = isNeedsAttention(card)
  const isCompleted = card.status === 'completed'
  const [completing, setCompleting] = useState(false)

  const handleComplete = async (e) => {
    e.stopPropagation()
    if (!confirm('Mark this care card as complete? It will move to the Completed tab.')) return
    setCompleting(true)
    try { await onComplete(card.id) } finally { setCompleting(false) }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      style={{
        background: isCompleted ? '#f3f7f1' : 'white',
        border: isCompleted ? '3px solid #a8c4ab' : overdue ? '4px solid #dc2626' : '3px solid #d9e2d6',
        borderRadius: '1.25rem',
        padding: '1.75rem 1.5rem',
        boxShadow: isCompleted ? '0 8px 24px rgba(0,0,0,0.06)' : overdue ? '0 20px 40px rgba(220, 38, 38, 0.15)' : '0 16px 32px rgba(0, 0, 0, 0.12)',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        opacity: isCompleted ? 0.85 : 1,
      }}
    >
      {/* TOP BADGE */}
      <div style={{
        position: 'absolute', top: '-1rem', left: '1.5rem',
        background: 'white', padding: '0 1rem 0 0.75rem',
        borderRadius: '0 1rem 1rem 0', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        fontWeight: '700', fontSize: '0.85rem',
        color: isCompleted ? '#4f6b57' : overdue ? '#dc2626' : '#6f8f73',
      }}>
        {type.label}
      </div>

      {/* STATUS BADGES */}
      {isCompleted && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#dcf0dc', color: '#2d6a35', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', boxShadow: '0 4px 12px rgba(45,106,53,0.15)' }}>
          ✓ COMPLETED
        </div>
      )}

      {/* Needs attention: compact red circle with alarm clock icon only */}
      {!isCompleted && overdue && (
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          width: '32px', height: '32px',
          background: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
          flexShrink: 0,
        }}>
          ⏰
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '800', lineHeight: '1.3', color: '#1f2937', marginTop: '0.25rem' }}>
          {card.name}
        </div>

        <div style={{
          fontSize: '1.1rem', fontWeight: '700', color: '#374151',
          padding: '0.75rem 1rem', background: isCompleted ? '#eaf4ea' : overdue ? '#fef2f2' : '#f9fafb',
          borderRadius: '0.75rem', borderLeft: `4px solid ${isCompleted ? '#4f6b57' : overdue ? '#dc2626' : '#6f8f73'}`,
        }}>
          {card.care_title}
        </div>

        {/* Location and Last Contacted stacked vertically */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.35rem',
          padding: '0.75rem 0 0.25rem 0',
          borderTop: '1px solid #e5e7eb',
          marginTop: 'auto',
          fontSize: '0.95rem',
        }}>
          <div style={{ color: '#6b7280' }}>
            📍 {card.location || 'No location'}
          </div>
          <div style={{ color: isCompleted ? '#4f6b57' : overdue ? '#dc2626' : '#6f8f73', fontWeight: '600' }}>
            Last contacted: {formatDate(card.last_interaction_at)}
          </div>
        </div>
      </div>

      {/* BOTTOM STACK: category tag + complete button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{
          background: type.bg, color: type.color,
          padding: '0.5rem 1rem', borderRadius: '0.6rem',
          fontSize: '0.9rem', fontWeight: '700',
          border: `1px solid ${type.color}`,
          textAlign: 'center', width: '100%', boxSizing: 'border-box',
        }}>
          {type.label}
        </div>

        {!isCompleted && (
          <button
            onClick={handleComplete}
            disabled={completing}
            style={{
              background: completing ? '#9ca3af' : '#4f6b57',
              color: 'white', border: 'none',
              padding: '0.5rem 1rem', borderRadius: '0.6rem',
              fontSize: '0.9rem', fontWeight: '700',
              cursor: completing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              width: '100%', textAlign: 'center', boxSizing: 'border-box',
            }}
          >
            {completing ? 'Completing...' : '✓ Click to Complete'}
          </button>
        )}
      </div>
    </div>
  )
}

function CardDetail({ card, onClose, refreshCards, onEdit }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [editingInteractionId, setEditingInteractionId] = useState(null)
  const [deletingInteractionId, setDeletingInteractionId] = useState(null)

  const isCompleted = card.status === 'completed'

  const loadInteractions = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('interactions').select('*').eq('care_card_id', card.id).order('interacted_at', { ascending: false })
      if (error) throw error
      setInteractions(data || [])
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }, [card.id])

  useEffect(() => { loadInteractions() }, [loadInteractions])

  const deleteCard = async () => {
    if (!confirm('Are you sure you want to delete this card? This cannot be undone.')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('care_cards').delete().eq('id', card.id)
      if (error) throw error
      onClose(); refreshCards()
    } catch (error) { alert(error.message) } finally { setDeleting(false) }
  }

  const completeCard = async () => {
    if (!confirm('Mark this care card as complete? It will move to the Completed tab.')) return
    setCompleting(true)
    try {
      const { error } = await supabase.from('care_cards').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', card.id)
      if (error) throw error
      onClose(); refreshCards()
    } catch (error) { alert(error.message) } finally { setCompleting(false) }
  }

  const deleteInteraction = async (interactionId) => {
    if (!confirm('Delete this interaction? This cannot be undone.')) return
    setDeletingInteractionId(interactionId)
    try {
      const { error } = await supabase.from('interactions').delete().eq('id', interactionId)
      if (error) throw error
      await loadInteractions()
    } catch (error) { alert(error.message) } finally { setDeletingInteractionId(null) }
  }

  return (
    <Modal onClose={onClose} width="800px">
      <button className="close-btn-mobile" onClick={onClose} style={{ display: 'none', alignItems: 'center', gap: '0.4rem', border: '1px solid #c4d4c7', background: '#eef4ee', color: '#4f6b57', fontWeight: '700', fontSize: '0.9rem', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', marginBottom: '1rem' }} aria-label="Close">
        ← Close
      </button>

      <div className="card-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{card.name}</h2>
            {isCompleted && (
              <span style={{ background: '#dcf0dc', color: '#2d6a35', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800' }}>✓ COMPLETED</span>
            )}
          </div>
          <div style={{ color: '#5f6b63', fontSize: '1.1rem', marginTop: '0.25rem' }}>{card.care_title}</div>
        </div>

        <div className="card-detail-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isCompleted && (
            <button onClick={completeCard} disabled={completing} style={{ background: completing ? '#9ca3af' : '#4f6b57', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.7 : 1 }}>
              {completing ? 'Completing...' : '✓ Click to Complete'}
            </button>
          )}
          <button onClick={() => onEdit(card)} style={{ background: '#6f8f73', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
          <button onClick={deleteCard} disabled={deleting} style={{ background: deleting ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer' }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button className="close-btn-desktop" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', padding: '0.5rem', cursor: 'pointer' }} aria-label="Close">✕</button>
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f7f2', borderRadius: '0.75rem' }}>
        <div style={{ fontSize: '1rem', color: '#5f6b63' }}>📞 {card.phone || 'No phone number'} • 📍 {card.location || 'No location'}</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{card.notes}</div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Interaction History</h3>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63' }}>Loading interactions...</div>
        ) : interactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63', fontStyle: 'italic' }}>No interactions yet. Add one below!</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            {interactions.map((i) => (
              <div key={i.id}>
                {editingInteractionId === i.id ? (
                  <InteractionEditForm interaction={i} onSaved={async () => { setEditingInteractionId(null); await loadInteractions() }} onCancel={() => setEditingInteractionId(null)} />
                ) : (
                  <div style={{ borderLeft: '4px solid #6f8f73', padding: '1rem 1.25rem', background: '#f8faf6', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#1f2937' }}>{i.type}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>{formatDate(i.interacted_at)}</div>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.5', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5ede6' }}>{i.notes}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingInteractionId(i.id)} style={{ background: '#eef4ee', color: '#4f6b57', border: '1px solid #c4d4c7', padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>✏️ Edit</button>
                      <button onClick={() => deleteInteraction(i.id)} disabled={deletingInteractionId === i.id} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: deletingInteractionId === i.id ? 'not-allowed' : 'pointer', opacity: deletingInteractionId === i.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                        {deletingInteractionId === i.id ? '...' : '🗑 Delete'}
                      </button>
                    </div>
                  </div>
                )}
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
      const { data: cardsData, error: cardsError } = await supabase.from('care_cards').select('*').order('created_at', { ascending: false })
      if (cardsError) throw cardsError

      if (cardsData?.length > 0) {
        const cardIds = cardsData.map((card) => card.id)
        const { data: interactionsData, error: interactionsError } = await supabase.from('interactions').select('care_card_id, interacted_at').in('care_card_id', cardIds).order('interacted_at', { ascending: false })
        if (interactionsError) throw interactionsError

        const latestInteractions = {}
        interactionsData?.forEach((interaction) => {
          if (!latestInteractions[interaction.care_card_id]) {
            latestInteractions[interaction.care_card_id] = interaction.interacted_at
          }
        })

        setCards(cardsData.map((card) => ({ ...card, last_interaction_at: latestInteractions[card.id] || null })))
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

  useEffect(() => { loadCards() }, [loadCards])

  const handleComplete = useCallback(async (cardId) => {
    try {
      const { error } = await supabase.from('care_cards').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', cardId)
      if (error) throw error
      await loadCards()
    } catch (err) {
      alert(err.message || 'Failed to complete card')
    }
  }, [loadCards])

  const activeCards = useMemo(() => cards.filter((c) => c.status !== 'completed'), [cards])
  const completedCards = useMemo(() => cards.filter((c) => c.status === 'completed'), [cards])
  const needsAttention = useMemo(() => activeCards.filter(isNeedsAttention), [activeCards])

  const tabs = useMemo(() => [
    { id: 'all', label: 'All', count: activeCards.length },
    { id: 'short_term_medical', label: 'Short-Term Medical', count: activeCards.filter((c) => c.care_type === 'short_term_medical').length },
    { id: 'long_term_medical', label: 'Long-Term Medical', count: activeCards.filter((c) => c.care_type === 'long_term_medical').length },
    { id: 'grief', label: 'Grief', count: activeCards.filter((c) => c.care_type === 'grief').length },
    { id: 'pregnancy', label: 'Pregnancy', count: activeCards.filter((c) => c.care_type === 'pregnancy').length },
    { id: 'homebound', label: 'Homebound', count: activeCards.filter((c) => c.care_type === 'homebound').length },
    { id: 'other', label: 'Other', count: activeCards.filter((c) => c.care_type === 'other').length },
    { id: 'followup', label: 'Needs Attention', count: needsAttention.length },
    { id: 'completed', label: 'Completed', count: completedCards.length },
  ], [activeCards, needsAttention, completedCards])

  const visibleCards = useMemo(() => {
    if (activeTab === 'all') return activeCards
    if (activeTab === 'followup') return needsAttention
    if (activeTab === 'completed') return completedCards
    return activeCards.filter((c) => c.care_type === activeTab)
  }, [activeCards, needsAttention, completedCards, activeTab])

  const saveCard = async (form) => {
    try {
      if (editingCard?.id) {
        const { error } = await supabase.from('care_cards').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingCard.id)
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8f3', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <h1 style={{ color: '#dc2626' }}>Error</h1>
        <p>{error}</p>
        <button onClick={loadCards} style={{ background: '#6f8f73', color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>Try Again</button>
      </div>
    )
  }

  const selectStyle = {
    padding: '0.85rem 2.5rem 0.85rem 1rem',
    borderRadius: '0.9rem',
    border: '2px solid #6f8f73',
    background: 'white',
    color: '#2f3a34',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236f8f73' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    minWidth: '200px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', color: '#26312b', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        @media (max-width: 640px) {
          .header-inner { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; padding: 1rem !important; }
          .header-inner h1 { font-size: 1.5rem !important; }
          .header-title-block { align-items: flex-start !important; }
          .new-card-btn { width: 100% !important; text-align: center !important; padding: 0.85rem 1rem !important; font-size: 1rem !important; }
          .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .modal-desktop { display: none !important; }
          .modal-mobile { display: block !important; width: 100% !important; max-height: 92vh !important; overflow-y: auto !important; background: #fbfaf7 !important; border-radius: 1.25rem 1.25rem 0 0 !important; padding: 1rem 1rem 2rem !important; box-shadow: 0 -8px 40px rgba(0,0,0,0.18) !important; border: 1px solid #d9e2d6 !important; border-bottom: none !important; }
          .close-btn-mobile { display: flex !important; }
          .close-btn-desktop { display: none !important; }
          .cards-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .card-detail-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .card-detail-actions { flex-wrap: wrap !important; width: 100% !important; }
          .card-detail-actions button { flex: 1 !important; min-width: 80px !important; }
        }
      `}</style>

      <header style={{ padding: '1.5rem 1rem 1rem' }}>
        <div
          className="header-inner"
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
          {/* Centered title block */}
          <div className="header-title-block" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>BurdenBear</h1>
            <div style={{ color: '#5f6b63', marginTop: '0.4rem', fontSize: '1rem', fontStyle: 'italic' }}>
              "Bear one another's burdens, and so fulfill the law of Christ." (Gal. 6:2)
            </div>
          </div>

          <button
            className="new-card-btn"
            onClick={() => { setEditingCard(null); setShowAddCard(true) }}
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
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + New Care Card
          </button>
        </div>
      </header>

      {/* TABS — dropdown on all screen sizes */}
      <div style={{ padding: '0 1rem 1rem' }}>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          style={selectStyle}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label} ({tab.count})
            </option>
          ))}
        </select>
      </div>

      <main style={{ padding: '0 1rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#5f6b63', fontSize: '1.1rem' }}>
            Loading care cards...
          </div>
        ) : visibleCards.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#5f6b63', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', border: '1px dashed #d9e2d6' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>{activeTab === 'completed' ? 'No completed cards yet' : 'No cards yet'}</h3>
            <p>{activeTab === 'completed' ? 'Cards marked complete will appear here.' : 'Create your first care card above to get started!'}</p>
          </div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {visibleCards.map((card) => (
              <CareCard key={card.id} card={card} onClick={() => setSelectedCard(card)} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </main>

      {showAddCard && (
        <Modal onClose={() => { setShowAddCard(false); setEditingCard(null) }}>
          <CardForm initial={editingCard} onSave={saveCard} onClose={() => { setShowAddCard(false); setEditingCard(null) }} />
        </Modal>
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          refreshCards={loadCards}
          onEdit={(card) => { setSelectedCard(null); setEditingCard(card); setShowAddCard(true) }}
        />
      )}
    </div>
  )
}