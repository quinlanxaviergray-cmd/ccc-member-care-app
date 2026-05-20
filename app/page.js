"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const SITE_FONT = 'Avenir Next, Avenir, Helvetica, Arial, sans-serif'

const CARE_TYPES = [
  { value: 'short_term_medical', label: 'Short-Term Medical', color: '#7a4a35', bg: '#efe1da' },
  { value: 'long_term_medical', label: 'Long-Term Medical', color: '#a0522d', bg: '#f5e6dc' },
  { value: 'grief', label: 'Grief', color: '#4f6b57', bg: '#e3ece5' },
  { value: 'pregnancy', label: 'Pregnancy', color: '#8c7740', bg: '#f4ecd7' },
  { value: 'homebound', label: 'Homebound', color: '#5a4a7a', bg: '#eae4f4' },
  { value: 'prayer', label: 'On Our Radar', color: '#7a6a35', bg: '#f4f0da' },
  { value: 'other', label: 'Other', color: '#3f4a56', bg: '#e6ebf0' },
]

function getCareType(value) {
  return CARE_TYPES.find((t) => t.value === value) || CARE_TYPES[3]
}

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateToInterval(nextDateStr, lastInteractionAt) {
  if (!nextDateStr || !lastInteractionAt) return 'weekly'
  const last = new Date(lastInteractionAt)
  const next = new Date(nextDateStr)
  const diffDays = Math.round((next - last) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 'daily'
  if (diffDays <= 7) return 'weekly'
  return 'monthly'
}

function formatDate(date) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isDueToday(card) {
  if (card.status === 'completed') return false
  if (card.care_type === 'prayer') return false
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Never contacted → always due
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  const diffDays = (todayDate - lastDate) / (1000 * 60 * 60 * 24)

  if (card.follow_up_interval === 'daily') return diffDays >= 1
  if (card.follow_up_interval === 'weekly') return diffDays >= 7
  if (card.follow_up_interval === 'monthly') return diffDays >= 30
  return false
}

function isDueThisWeek(card) {
  if (card.status === 'completed') return false
  if (card.care_type === 'prayer') return false

  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Find the most recent Monday at 12:01 AM
  const dayOfWeek = todayDate.getDay() // 0 = Sunday, 1 = Monday, ...
  const daysFromMonday = (dayOfWeek + 6) % 7
  const weekStart = new Date(todayDate)
  weekStart.setDate(todayDate.getDate() - daysFromMonday)
  weekStart.setHours(0, 1, 0, 0)

  // Week ends next Monday at 12:00 AM (midnight)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  weekEnd.setHours(0, 0, 0, 0)

  // Never contacted → always needs interaction
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate())

  let nextDueDate = null
  if (card.follow_up_interval === 'daily') {
    nextDueDate = new Date(lastDate)
    nextDueDate.setDate(lastDate.getDate() + 1)
  } else if (card.follow_up_interval === 'weekly') {
    nextDueDate = new Date(lastDate)
    nextDueDate.setDate(lastDate.getDate() + 7)
  } else if (card.follow_up_interval === 'monthly') {
    nextDueDate = new Date(lastDate)
    nextDueDate.setDate(lastDate.getDate() + 30)
  }

  if (!nextDueDate) return false
  return nextDueDate >= weekStart && nextDueDate < weekEnd
}

function isUpcomingSoon(card) {
  return isDueThisWeek(card)
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
          border: '1px solid #d9e2d6',
          fontFamily: SITE_FONT,
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
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#c4d4c7',
            borderRadius: '999px',
            margin: '0 auto 1rem',
          }}
        />
        {children}
      </div>
    </div>
  )
}

function CardForm({ initial, onSave, onClose, profiles = [], onCallUserId = null }) {
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
    assigned_to: '',
    visit_type: '',
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
      const resolved = { ...form }
      if (resolved.assigned_to === 'on_call') {
        resolved.assigned_to = onCallUserId || 'on_call'
      }
      await onSave(resolved)
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
    boxSizing: 'border-box',
    fontFamily: SITE_FONT,
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: SITE_FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: SITE_FONT }}>{initial ? 'Edit Card' : 'New Care Card'}</h2>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', fontFamily: SITE_FONT }} aria-label="Close">✕</button>
      </div>
      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: SITE_FONT }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="name" style={{ fontFamily: SITE_FONT }}>Member Name *</label>
          <input id="name" style={inputStyle} placeholder="Member Name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="phone" style={{ fontFamily: SITE_FONT }}>Phone Number</label>
          <input id="phone" style={inputStyle} placeholder="Phone Number" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div>
          <label htmlFor="care_type" style={{ fontFamily: SITE_FONT }}>Care Type</label>
          <select id="care_type" style={inputStyle} value={form.care_type} onChange={(e) => update('care_type', e.target.value)}>
            {CARE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="care_title" style={{ fontFamily: SITE_FONT }}>Care Title *</label>
          <input id="care_title" style={inputStyle} placeholder="Care Title" value={form.care_title} onChange={(e) => update('care_title', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="visit_type" style={{ fontFamily: SITE_FONT }}>Type of Visit Needed</label>
          <select id="visit_type" style={inputStyle} value={form.visit_type} onChange={(e) => update('visit_type', e.target.value)}>
            <option value="">— None —</option>
            {['Visit', 'Phone Call', 'Text', 'Email', 'Other'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location" style={{ fontFamily: SITE_FONT }}>Location</label>
          <input id="location" style={inputStyle} placeholder="Location" value={form.location} onChange={(e) => update('location', e.target.value)} />
        </div>
        <div>
          <label htmlFor="notes" style={{ fontFamily: SITE_FONT }}>Notes</label>
          <textarea id="notes" style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }} placeholder="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        <div>
<div>
  <label htmlFor="assigned_to" style={{ fontFamily: SITE_FONT }}>Assigned To</label>
  <select
    id="assigned_to"
    style={inputStyle}
    value={form.assigned_to || ''}
    onChange={(e) => update('assigned_to', e.target.value)}
  >
    <option value="">— Unassigned —</option>
    <option value="on_call">
      📞 On Call{onCallUserId && profiles.find((p) => p.id === onCallUserId)
        ? ` (${profiles.find((p) => p.id === onCallUserId).full_name})`
        : ''}
    </option>
    {profiles.map((p) => (
      <option key={p.id} value={p.id}>
        {p.full_name} · {p.role === 'staff' ? 'Staff' : 'Care Team'}
      </option>
    ))}
  </select>
</div>
        </div>
          <div>
            <label htmlFor="follow_up" style={{ fontFamily: SITE_FONT }}>Default Follow-up Frequency</label>
            <select id="follow_up" style={inputStyle} value={form.follow_up_interval} onChange={(e) => update('follow_up_interval', e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.35rem 0 0', fontFamily: SITE_FONT }}>
              This is a background default. Each interaction lets you set the exact next contact date.
            </p>
          </div>
        <button
          type="submit"
          disabled={saving || !form.name.trim() || !form.care_title.trim()}
          style={{ background: '#6f8f73', color: 'white', padding: '1rem', border: 'none', borderRadius: '0.8rem', fontWeight: '700', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: SITE_FONT }}
        >
          {saving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  )
}

function InteractionForm({ cardId, onSaved }) {
  const [saving, setSaving] = useState(false)
  const today = getLocalDateValue()

  const defaultNext = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return getLocalDateValue(d)
  })()

  const [form, setForm] = useState({
    type: 'Visit',
    notes: '',
    interacted_at: getLocalDateTimeValue(),
    next_interaction_date: defaultNext,
  })

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.notes.trim()) { alert('Please add interaction notes.'); return }
    setSaving(true)
    try {
      let loggedBy = ''
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
        if (profile?.full_name) {
          const parts = profile.full_name.trim().split(' ')
          loggedBy = parts[0] + (parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '')
        }
      }

      const payload = {
        care_card_id: cardId,
        type: form.type,
        notes: form.notes.trim(),
        interacted_at: new Date(form.interacted_at).toISOString(),
        logged_by: loggedBy,
      }
      const { error: intError } = await supabase.from('interactions').insert([payload])
      if (intError) throw intError

      // Update follow_up_interval based on chosen next date
      const newInterval = dateToInterval(form.next_interaction_date, form.interacted_at)
      const { error: cardError } = await supabase
        .from('care_cards')
        .update({ follow_up_interval: newInterval, updated_at: new Date().toISOString() })
        .eq('id', cardId)
      if (cardError) throw cardError

      setForm({ type: 'Visit', notes: '', interacted_at: getLocalDateTimeValue(), next_interaction_date: defaultNext })
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
    boxSizing: 'border-box',
    fontFamily: SITE_FONT,
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #d9e2d6', fontFamily: SITE_FONT }}>
      <h3 style={{ marginTop: 0, fontFamily: SITE_FONT }}>Add Interaction</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label htmlFor="interaction-type" style={{ fontFamily: SITE_FONT }}>Type</label>
          <select id="interaction-type" style={inputStyle} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {['Visit', 'Phone Call', 'Text', 'Email', 'Update', 'Other'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="interaction-date" style={{ fontFamily: SITE_FONT }}>Date & Time of Interaction</label>
          <input
            id="interaction-date"
            type="datetime-local"
            style={{ ...inputStyle, maxWidth: '100%' }}
            value={form.interacted_at}
            onChange={(e) => setForm((p) => ({ ...p, interacted_at: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="interaction-notes" style={{ fontFamily: SITE_FONT }}>Notes *</label>
          <textarea
            id="interaction-notes"
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            placeholder="Write notes about this interaction"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="next-interaction-date" style={{ fontFamily: SITE_FONT }}>
            Next Interaction Needed By
          </label>
          <input
            id="next-interaction-date"
            type="date"
            style={inputStyle}
            value={form.next_interaction_date}
            min={today}
            onChange={(e) => setForm((p) => ({ ...p, next_interaction_date: e.target.value }))}
          />
          <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.35rem 0 0', fontFamily: SITE_FONT }}>
            This sets the follow-up schedule automatically.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ background: '#4f6b57', color: 'white', padding: '1rem', border: 'none', borderRadius: '0.8rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: SITE_FONT }}
        >
          {saving ? 'Saving...' : 'Add Interaction'}
        </button>
      </div>
    </form>
  )
}

function InteractionEditForm({ interaction, onSaved, onCancel }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: interaction.type, notes: interaction.notes, interacted_at: getLocalDateTimeValue(new Date(interaction.interacted_at)) })
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.8rem', border: '1px solid #cfd8cc', fontSize: '1rem', background: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: SITE_FONT }

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
    <div style={{ background: '#eef4ee', border: '1px solid #c4d4c7', borderRadius: '0.75rem', padding: '1rem', display: 'grid', gap: '0.75rem', fontFamily: SITE_FONT }}>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57', fontFamily: SITE_FONT }}>Type</label>
        <select style={inputStyle} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
          {['Visit', 'Phone Call', 'Text', 'Email', 'Update', 'Other'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57', fontFamily: SITE_FONT }}>Date & Time</label>
        <input type="datetime-local" style={inputStyle} value={form.interacted_at} onChange={(e) => setForm((p) => ({ ...p, interacted_at: e.target.value }))} />
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f6b57', fontFamily: SITE_FONT }}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={handleSave} disabled={saving} style={{ background: '#4f6b57', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: '0.95rem', fontFamily: SITE_FONT }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} style={{ background: 'white', color: '#5f6b63', border: '1px solid #cfd8cc', padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem', fontFamily: SITE_FONT }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function CareCard({ card, onClick, profiles = [] }) {
  const type = getCareType(card.care_type)
  const overdue = isDueToday(card)
  const soon = isDueThisWeek(card) && !overdue
  const isCompleted = card.status === 'completed'
  const assignedPerson = profiles.find((p) => p.id === card.assigned_to)
  const completing = false // CareCard doesn't handle completing directly; it calls onClick

  let borderColor = '#d9e2d6'
  let borderWidth = '1px'
  if (isCompleted) {
    borderColor = '#a8c4ab'
    borderWidth = '1px'
  } else if (overdue) {
    borderColor = '#dc2626'
    borderWidth = '3px'
  }

  let indicatorBg = '#f9fafb'
  let indicatorBorder = '#6f8f73'
  if (isCompleted) {
    indicatorBg = '#eaf4ea'
    indicatorBorder = '#4f6b57'
  } else if (overdue) {
    indicatorBg = '#fef2f2'
    indicatorBorder = '#dc2626'
  }

  let lastContactColor = '#6f8f73'
  if (isCompleted) lastContactColor = '#4f6b57'
  else if (overdue) lastContactColor = '#dc2626'
  else if (soon) lastContactColor = '#4f6b57'

  // Build the top-right assignment badge label + colors
  const assignmentBadge = (() => {
    if (isCompleted) return null
    if (assignedPerson) {
      const isStaff = assignedPerson.role === 'staff'
      return {
        label: assignedPerson.full_name,
        bg: isStaff ? '#f3e8ff' : '#dbeafe',
        color: isStaff ? '#7c3aed' : '#2563eb',
        border: isStaff ? '#7c3aed' : '#2563eb',
      }
    }
    if (card.assigned_to === 'on_call') {
      return {
        label: '📞 On Call',
        bg: '#fff7ed',
        color: '#c2410c',
        border: '#c2410c',
      }
    }
    return {
      label: 'Unassigned',
      bg: '#f9fafb',
      color: '#9ca3af',
      border: '#d1d5db',
    }
  })()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        background: isCompleted ? '#f3f7f1' : 'white',
        border: `${borderWidth} solid ${borderColor}`,
        borderRadius: '1.25rem',
        padding: '1.5rem 1.5rem',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '170px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        position: 'relative',
        opacity: isCompleted ? 0.9 : 1,
        boxShadow: 'none',
        fontFamily: SITE_FONT,
      }}
    >
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#dcf0dc',
            color: '#2d6a35',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: '800',
            fontFamily: SITE_FONT,
          }}
        >
          ✓ COMPLETED
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
        }}
      >
        {/* Visit Type Badge (top-left) */}
        <div
          style={{
            display: 'inline-block',
            background: '#e8f0e9',
            color: '#4f6b57',
            padding: '0.2rem 0.65rem',
            borderRadius: '0.5rem',
            border: '1px solid #a8c4ab',
            fontSize: '0.78rem',
            fontWeight: '400',
            fontFamily: SITE_FONT,
            flexShrink: 0,
          }}
        >
          {card.visit_type ? ` ${card.visit_type}` : ' Visit Type TBD'}
        </div>

        {/* Assignment Badge (top-right) — shows assigned person name, On Call, or Unassigned */}
        {assignmentBadge && (
          <div
            style={{
              display: 'inline-block',
              background: assignmentBadge.bg,
              color: assignmentBadge.color,
              padding: '0.2rem 0.65rem',
              borderRadius: '0.5rem',
              border: `1px solid ${assignmentBadge.border}`,
              fontSize: '0.78rem',
              fontWeight: '400',
              fontFamily: SITE_FONT,
              flexShrink: 0,
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {assignmentBadge.label}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            lineHeight: '1.25',
            color: '#1f2937',
            fontFamily: SITE_FONT,
          }}
        >
          {card.name}
        </div>

        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#374151',
            padding: '0.7rem 1rem',
            background: indicatorBg,
            borderRadius: '0.75rem',
            borderLeft: `4px solid ${indicatorBorder}`,
            fontFamily: SITE_FONT,
          }}
        >
          {card.care_title}
          {/* Removed assignedPerson inline block here — now lives in the top-right badge */}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            padding: '0.6rem 0 0.15rem 0',
            borderTop: '1px solid #e5e7eb',
            marginTop: '0.15rem',
            fontSize: '0.95rem',
            fontFamily: SITE_FONT,
          }}
        >
          <div style={{ color: '#6b7280' }}>
            📍 {card.location || 'No location'}
          </div>
          <div style={{ color: card.care_type === 'prayer' ? '#6b7280' : lastContactColor, fontWeight: '600', fontFamily: SITE_FONT }}>
            Last contacted: {formatDate(card.last_interaction_at)}
            {card.care_type !== 'prayer' && (
              <div
                style={{
                  color: '#4f6b57',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  fontFamily: SITE_FONT,
                }}
              >
                Next interaction: {getNextInteractionDate(card)}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isCompleted && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          disabled={completing}
          style={{
            background: completing ? '#9ca3af' : '#4f6b57',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: completing ? 'not-allowed' : 'pointer',
            width: '100%',
            textAlign: 'center',
            boxSizing: 'border-box',
            fontFamily: SITE_FONT,
            marginTop: 'auto',
          }}
        >
          + Add Interaction
        </button>
      )}
    </div>
  )
}



function getNextInteractionDate(card) {
  if (card.status === 'completed') return null
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (!card.last_interaction_at) return 'Now — never contacted'

  const last = new Date(card.last_interaction_at)
  const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate())

  let nextDate = null
  if (card.follow_up_interval === 'daily') {
    nextDate = new Date(lastDate)
    nextDate.setDate(lastDate.getDate() + 1)
  } else if (card.follow_up_interval === 'weekly') {
    nextDate = new Date(lastDate)
    nextDate.setDate(lastDate.getDate() + 7)
  } else if (card.follow_up_interval === 'monthly') {
    nextDate = new Date(lastDate)
    nextDate.setDate(lastDate.getDate() + 30)
  } else {
    return null
  }

  if (nextDate < todayDate) return 'Overdue'
  if (nextDate.getTime() === todayDate.getTime()) return 'Today'
  return nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function CardDetail({ card, onClose, refreshCards, onEdit, profiles = [], allVisibleCards = [], currentIndex = 0, onNavigate }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [editingInteractionId, setEditingInteractionId] = useState(null)
  const [deletingInteractionId, setDeletingInteractionId] = useState(null)
  const isCompleted = card.status === 'completed'
  const assignedPerson = profiles.find((p) => p.id === card.assigned_to)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allVisibleCards.length - 1

  const [currentUserName, setCurrentUserName] = useState('')

useEffect(() => {
  const handler = (e) => {
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
    if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    if (e.key === 'Escape') onClose()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [hasPrev, hasNext, currentIndex, onNavigate, onClose])

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
        if (profile?.full_name) {
          const parts = profile.full_name.trim().split(' ')
          const firstName = parts[0]
          const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : ''
          setCurrentUserName(firstName + lastInitial)
        }
      }
    }
    fetchUserName()
  }, [])

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
      onClose()
      refreshCards()
    } catch (error) {
      alert(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const completeCard = async () => {
    if (!confirm('Mark this care card as complete? It will move to the Completed tab.')) return
    setCompleting(true)
    try {
      const { error } = await supabase.from('care_cards').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', card.id)
      if (error) throw error
      onClose()
      refreshCards()
    } catch (error) {
      alert(error.message)
    } finally {
      setCompleting(false)
    }
  }

  const reactivateCard = async () => {
  if (!confirm('Move this card back to active?')) return
  try {
    const { error } = await supabase.from('care_cards').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', card.id)
    if (error) throw error
    onClose()
    refreshCards()
  } catch (error) {
    alert(error.message)
  }
}

  const deleteInteraction = async (interactionId) => {
    if (!confirm('Delete this interaction? This cannot be undone.')) return
    setDeletingInteractionId(interactionId)
    try {
      const { error } = await supabase.from('interactions').delete().eq('id', interactionId)
      if (error) throw error
      await loadInteractions()
    } catch (error) {
      alert(error.message)
    } finally {
      setDeletingInteractionId(null)
    }
  }

  return (
    <Modal onClose={onClose} width="800px">
      <button className="close-btn-mobile" onClick={onClose} style={{ display: 'none', alignItems: 'center', gap: '0.4rem', border: '1px solid #c4d4c7', background: '#eef4ee', color: '#4f6b57', fontWeight: '700', fontSize: '0.9rem', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', marginBottom: '1rem', fontFamily: SITE_FONT }} aria-label="Close">
        ← Close
      </button>
      {allVisibleCards.length > 1 && (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
    <button
      onClick={() => hasPrev && onNavigate(currentIndex - 1)}
      disabled={!hasPrev}
      style={{ background: hasPrev ? 'white' : '#f3f4f6', border: `1px solid ${hasPrev ? '#cfd8cc' : '#e5e7eb'}`, borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasPrev ? 'pointer' : 'not-allowed', fontSize: '1.1rem', color: hasPrev ? '#2f3a34' : '#d1d5db' }}
      aria-label="Previous card"
    >
      ←
    </button>
    <span style={{ fontSize: '0.85rem', color: '#6b7280', fontFamily: SITE_FONT }}>
      {currentIndex + 1} of {allVisibleCards.length}
    </span>
    <button
      onClick={() => hasNext && onNavigate(currentIndex + 1)}
      disabled={!hasNext}
      style={{ background: hasNext ? 'white' : '#f3f4f6', border: `1px solid ${hasNext ? '#cfd8cc' : '#e5e7eb'}`, borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasNext ? 'pointer' : 'not-allowed', fontSize: '1.1rem', color: hasNext ? '#2f3a34' : '#d1d5db' }}
      aria-label="Next card"
    >
      →
    </button>
  </div>
)}
      <div className="card-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', fontFamily: SITE_FONT }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontFamily: SITE_FONT }}>{card.name}</h2>
            {isCompleted && (
              <span style={{ background: '#dcf0dc', color: '#2d6a35', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', fontFamily: SITE_FONT }}>✓ COMPLETED</span>
            )}
          </div>
          <div style={{ color: '#5f6b63', fontSize: '1.1rem', marginTop: '0.25rem', fontFamily: SITE_FONT }}>{card.care_title}</div>
        </div>
        <div className="card-detail-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isCompleted ? (
            <button onClick={completeCard} disabled={completing} style={{ background: completing ? '#9ca3af' : '#4f6b57', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.7 : 1, fontFamily: SITE_FONT }}>
              {completing ? 'Completing...' : 'Click to Complete'}
            </button>
          ) : (
            <button onClick={reactivateCard} style={{ background: '#6f8f73', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', fontFamily: SITE_FONT }}>
              Make Active
            </button>
          )}
          <button onClick={() => onEdit(card)} style={{ background: '#6f8f73', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', fontFamily: SITE_FONT }}>Edit</button>
          <button onClick={deleteCard} disabled={deleting} style={{ background: deleting ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: SITE_FONT }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button className="close-btn-desktop" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', padding: '0.5rem', cursor: 'pointer', fontFamily: SITE_FONT }} aria-label="Close">✕</button>
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f7f2', borderRadius: '0.75rem', fontFamily: SITE_FONT }}>
        <div style={{ fontSize: '1rem', color: '#5f6b63' }}> {card.phone || 'No phone number'} •  {card.location || 'No location'}</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{card.notes}</div>
      </div>

      <div style={{ marginTop: '1.5rem', fontFamily: SITE_FONT }}>
        <h3 style={{ marginBottom: '0.5rem', fontFamily: SITE_FONT }}>Interaction History</h3>
        {!isCompleted && getNextInteractionDate(card) && (
          <div style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: getNextInteractionDate(card) === 'Overdue' ? '#dc2626' : getNextInteractionDate(card) === 'Today' ? '#d97706' : '#4f6b57', fontFamily: SITE_FONT }}>
            Next Interaction Needed By: {getNextInteractionDate(card)}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63', fontFamily: SITE_FONT }}>Loading interactions...</div>
        ) : interactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5f6b63', fontStyle: 'italic', fontFamily: SITE_FONT }}>No interactions yet. Add one below!</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            {interactions.map((i) => (
              <div key={i.id}>
                {editingInteractionId === i.id ? (
                  <InteractionEditForm interaction={i} onSaved={async () => { setEditingInteractionId(null); await loadInteractions() }} onCancel={() => setEditingInteractionId(null)} />
                ) : (
                  <div style={{ borderLeft: '4px solid #6f8f73', padding: '1rem 1.25rem', background: '#f8faf6', borderRadius: '0.75rem', fontFamily: SITE_FONT }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <div style={{ fontWeight: '400', fontSize: '1rem', color: '#1f2937', fontFamily: SITE_FONT }}>
                        {i.type}
                        {i.logged_by && (
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '400', marginLeft: '0.4rem' }}>
                            · {i.logged_by}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', fontFamily: SITE_FONT }}>{formatDate(i.interacted_at)}</div>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.5', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5ede6', fontFamily: SITE_FONT }}>{i.notes}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingInteractionId(i.id)} style={{ background: '#eef4ee', color: '#4f6b57', border: '1px solid #c4d4c7', padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: SITE_FONT }}> Edit</button>
                      <button onClick={() => deleteInteraction(i.id)} disabled={deletingInteractionId === i.id} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: deletingInteractionId === i.id ? 'not-allowed' : 'pointer', opacity: deletingInteractionId === i.id ? 0.6 : 1, whiteSpace: 'nowrap', fontFamily: SITE_FONT }}>
                        {deletingInteractionId === i.id ? '...' : ' Delete'}
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
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('followup')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddCard, setShowAddCard] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [onCallUserId, setOnCallUserId] = useState(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)

useEffect(() => {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
      router.push('/login')
      return
    }
    setSession(session)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_admin')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setCurrentUser(profile)
      if (profile.is_admin) setIsAdmin(true)
    }
  })
}, [])

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: cardsData, error: cardsError } = await supabase.from('care_cards').select('*').order('created_at', { ascending: false })
      if (cardsError) throw cardsError
      if (cardsData?.length > 0) {
        const cardIds = cardsData.map((card) => card.id)
        const { data: interactionsData, error: interactionsError } = await supabase.from('interactions').select('care_card_id, interacted_at').in('care_card_id', cardIds).neq('type', 'Update').order('interacted_at', { ascending: false })
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

  const loadProfiles = useCallback(async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')
  if (data) setProfiles(data)
}, [])

const loadOnCall = useCallback(async () => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'on_call_user_id')
    .single()
  if (data?.value) setOnCallUserId(data.value)
}, [])

  useEffect(() => {
  loadProfiles()
  loadOnCall()
  loadCards()
}, [loadProfiles, loadOnCall, loadCards])

  useEffect(() => {
  const handleClickOutside = (e) => {
  if (!e.target.closest('[data-menu]')) {
    setShowMenu(false)
  }
}
  document.addEventListener('mouseup', handleClickOutside)
return () => document.removeEventListener('mouseup', handleClickOutside)
}, [])

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

const resolvedAssignedTo = useCallback((card) => {
  if (card.assigned_to === 'on_call') return onCallUserId
  return card.assigned_to
}, [onCallUserId])

const visibleCards = useMemo(() => {
  let result

  if (activeTab === 'me') {
    result = activeCards.filter((c) => resolvedAssignedTo(c) === currentUser?.id)
  } else if (activeTab === 'staff') {
    const staffIds = profiles.filter((p) => p.role === 'staff').map((p) => p.id)
    result = activeCards.filter((c) => staffIds.includes(resolvedAssignedTo(c)))
  } else if (activeTab === 'careteam') {
    const careIds = profiles.filter((p) => p.role === 'care_team').map((p) => p.id)
    result = activeCards.filter((c) => careIds.includes(resolvedAssignedTo(c)))
  } else if (activeTab === 'completed') {
    result = completedCards
  } else {
    result = categoryFilter === 'all'
      ? activeCards
      : activeCards.filter((c) => c.care_type === categoryFilter)
  }

  result = [...result].sort((a, b) => {
    const getDueDate = (card) => {
      if (!card.last_interaction_at) return new Date(0)
      const last = new Date(card.last_interaction_at)
      if (card.follow_up_interval === 'daily') last.setDate(last.getDate() + 1)
      else if (card.follow_up_interval === 'weekly') last.setDate(last.getDate() + 7)
      else if (card.follow_up_interval === 'monthly') last.setDate(last.getDate() + 30)
      return last
    }
    return getDueDate(a) - getDueDate(b)
  })

  if (!searchQuery.trim()) return result
  const q = searchQuery.toLowerCase()
  return result.filter((c) =>
    c.name?.toLowerCase().includes(q) ||
    c.care_title?.toLowerCase().includes(q)
  )
}, [activeCards, completedCards, activeTab, categoryFilter, searchQuery, currentUser, profiles, resolvedAssignedTo])
  
const meCount = useMemo(() =>
  activeCards.filter((c) => resolvedAssignedTo(c) === currentUser?.id).length,
  [activeCards, currentUser, resolvedAssignedTo]
)

const staffIds = useMemo(() =>
  profiles.filter((p) => p.role === 'staff').map((p) => p.id),
  [profiles]
)

const careIds = useMemo(() =>
  profiles.filter((p) => p.role === 'care_team').map((p) => p.id),
  [profiles]
)

const staffCount = useMemo(() =>
  activeCards.filter((c) => staffIds.includes(resolvedAssignedTo(c))).length,
  [activeCards, staffIds, resolvedAssignedTo]
)

const careCount = useMemo(() =>
  activeCards.filter((c) => careIds.includes(resolvedAssignedTo(c))).length,
  [activeCards, careIds, resolvedAssignedTo]
)

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

const openCard = (card) => {
  const idx = visibleCards.findIndex((c) => c.id === card.id)
  setSelectedCard(card)
  setSelectedCardIndex(idx >= 0 ? idx : 0)
}

const navigateCard = (newIndex) => {
  const card = visibleCards[newIndex]
  if (card) {
    setSelectedCard(card)
    setSelectedCardIndex(newIndex)
  }
}

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8f3', flexDirection: 'column', gap: '1rem', padding: '2rem', fontFamily: SITE_FONT }}>
        <h1 style={{ color: '#dc2626', fontFamily: SITE_FONT }}>Error</h1>
        <p style={{ fontFamily: SITE_FONT }}>{error}</p>
        <button onClick={loadCards} style={{ background: '#6f8f73', color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', fontFamily: SITE_FONT }}>Try Again</button>
      </div>
    )
  }

  const tabButtonStyle = (active) => ({
    background: active ? '#6f8f73' : 'white',
    color: active ? 'white' : '#2f3a34',
    border: '1px solid #cfd8cc',
    borderRadius: '999px',
    padding: '0.65rem 1.25rem',
    fontWeight: active ? '700' : '400',
    cursor: 'pointer',
    boxShadow: 'none',
    fontFamily: SITE_FONT,
    fontSize: '0.95rem',
    transition: 'all 0.15s ease',
  })

  const dropdownStyle = {
    padding: '0.65rem 2.5rem 0.65rem 1rem',
    borderRadius: '999px',
    border: activeTab === 'browse' ? '1px solid #6f8f73' : '1px solid #cfd8cc',
    backgroundColor: activeTab === 'browse' ? '#6f8f73' : 'white',
    color: activeTab === 'browse' ? 'white' : '#2f3a34',
    fontWeight: activeTab === 'browse' ? '700' : '400',
    fontSize: '0.95rem',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'none',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.85rem center',
    fontFamily: SITE_FONT,
    minWidth: '0',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', color: '#26312b', fontFamily: SITE_FONT }}>
      <style>{`
        * { font-family: 'Avenir Next', Avenir, Helvetica, Arial, sans-serif !important; }
        @media (max-width: 640px) {
          .header-inner { flex-direction: row !important; align-items: center !important; justify-content: space-between !important; flex-wrap: nowrap !important; padding: 1rem !important; }
          .header-inner h1 { font-size: 1.5rem !important; }
          .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .modal-desktop { display: none !important; }
          .modal-mobile { display: block !important; width: 100% !important; max-height: 92vh !important; overflow-y: auto !important; background: #fbfaf7 !important; border-radius: 1.25rem 1.25rem 0 0 !important; padding: 1rem 1rem 2rem !important; border: 1px solid #d9e2d6 !important; border-bottom: none !important; }
          .close-btn-mobile { display: flex !important; }
          .close-btn-desktop { display: none !important; }
          .cards-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
          input[type="datetime-local"] { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
          .card-detail-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .card-detail-actions { flex-wrap: wrap !important; width: 100% !important; }
          .card-detail-actions button { flex: 1 !important; min-width: 80px !important; }
          .completed-tab { display: none !important; }
          .tabs-container {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 0.75rem !important;
}
.search-input {
  order: -1 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  min-width: 0 !important;
}
.tabs-container > .tab-btn {
  width: 100% !important;
}
.tabs-container > .tab-btn select {
  width: 100% !important;
  box-sizing: border-box !important;
  min-width: 0 !important;
}
.tabs-container > div:last-child {
  display: flex !important;
  gap: 0.75rem !important;
  width: 100% !important;
}
.tabs-container > div:last-child button {
  flex: 1 !important;
}
.completed-tab { display: none !important; }
        }
        .tab-btn:hover { font-weight: inherit !important; }
        select option { font-weight: inherit !important; }
      `}</style>

    <header style={{ padding: '1.5rem 1rem 1rem', position: 'relative', zIndex: 100 }}>
      <div className="header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', background: 'rgba(255,255,255,0.85)', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '1.5rem', backdropFilter: 'blur(12px)', boxShadow: 'none' }}>
        
        {/* Title — left side */}
        <div className="header-title-block" style={{ flex: 1 }}>
          <h1 className="burden-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', fontFamily: SITE_FONT, whiteSpace: 'nowrap' }}>BurdenBear</h1>
        </div>

        {/* Right side: On Call pill + buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {onCallUserId && profiles.find((p) => p.id === onCallUserId) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '999px',
              padding: '0.35rem 0.9rem',
              fontSize: '0.92rem',
              fontFamily: SITE_FONT,
              color: '#6b7280',
              whiteSpace: 'nowrap',
            }}>
              📞 On Call:&nbsp;<strong style={{ color: '#c2410c' }}>{profiles.find((p) => p.id === onCallUserId).full_name}</strong>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setEditingCard(null); setShowAddCard(true) }}
            title="New Care Card"
            style={{ background: '#6f8f73', border: 'none', borderRadius: '1rem', cursor: 'pointer', fontSize: '1.5rem', fontWeight: '300', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', color: 'white', lineHeight: 1 }}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            style={{ background: 'white', border: '1px solid #cfd8cc', borderRadius: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}
          >
            <span style={{ display: 'block', width: '18px', height: '2px', background: '#2f3a34' }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: '#2f3a34' }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: '#2f3a34' }} />
          </button>
        </div>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            data-menu
            style={{ position: 'absolute', top: '5rem', right: '1rem', background: 'white', border: '1px solid #d9e2d6', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: '180px', overflow: 'hidden', zIndex: 200 }}
          >
            <button type="button" onClick={() => { setShowMenu(false); router.push('/how-to') }}
              style={{ width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', borderBottom: '1px solid #e5ede6', textAlign: 'left', cursor: 'pointer', fontFamily: SITE_FONT, fontSize: '0.95rem', color: '#2f3a34', fontWeight: '600' }}>
              How-To Guide
            </button>
            {isAdmin && (
              <button type="button" onClick={() => { setShowMenu(false); router.push('/admin') }}
                style={{ width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', borderBottom: '1px solid #e5ede6', textAlign: 'left', cursor: 'pointer', fontFamily: SITE_FONT, fontSize: '0.95rem', color: '#2f3a34', fontWeight: '600' }}>
                Admin Panel
              </button>
            )}
            <button type="button" onClick={() => { setShowMenu(false); handleSignOut() }}
              style={{ width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: SITE_FONT, fontSize: '0.95rem', color: '#dc2626', fontWeight: '600' }}>
              Sign Out
            </button>
          </div>
        )}

      </div>
    </header>


<div className="tabs-container" style={{ padding: '0 1rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
  <input
    className="search-input"
    type="text"
    placeholder="Search by name or title..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{ padding: '0.6rem 1rem', borderRadius: '2rem', border: '1px solid #d9e2d6', background: 'white', fontSize: '0.95rem', fontFamily: SITE_FONT, color: '#2f3a34', outline: 'none', minWidth: '200px', flex: 1 }}
  />

  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
    <button onClick={() => setActiveTab(activeTab === 'me' ? 'browse' : 'me')} style={tabButtonStyle(activeTab === 'me')}>
  Me ({meCount})
    </button>

    <button
      onClick={() => setActiveTab(activeTab === 'staff' ? 'browse' : 'staff')}
      style={{
        ...tabButtonStyle(activeTab === 'staff'),
        ...(activeTab === 'staff'
          ? { background: '#7c3aed', borderColor: '#7c3aed' }
          : { color: '#7c3aed', borderColor: '#7c3aed' }),
      }}
    >
      Staff ({staffCount})
    </button>

    <button
      onClick={() => setActiveTab(activeTab === 'careteam' ? 'browse' : 'careteam')}
      style={{
        ...tabButtonStyle(activeTab === 'careteam'),
        ...(activeTab === 'careteam'
          ? { background: '#2563eb', borderColor: '#2563eb' }
          : { color: '#2563eb', borderColor: '#2563eb' }),
      }}
    >
      Care Team ({careCount})
    </button>

    <button
      onClick={() => setActiveTab('careteam')}
      style={{
        ...tabButtonStyle(activeTab === 'careteam'),
        ...(activeTab === 'careteam'
          ? { background: '#2563eb', borderColor: '#2563eb' }
          : { color: '#2563eb', borderColor: '#2563eb' }),
      }}
    >
      Care Team ({careCount})
    </button>

    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <select
        style={dropdownStyle}
        value={activeTab === 'completed' ? '__completed__' : activeTab === 'browse' ? categoryFilter : '__browse__'}
        onChange={(e) => {
          if (e.target.value === '__completed__') {
            setActiveTab('completed')
            setCategoryFilter('all')
          } else {
            setActiveTab('browse')
            setCategoryFilter(e.target.value === '__browse__' ? 'all' : e.target.value)
          }
        }}
      >
        <option value="all">All Cards ({activeCards.length})</option>
        {CARE_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label} ({activeCards.filter((c) => c.care_type === type.value).length})
          </option>
        ))}
        <option value="__completed__">Completed ({completedCards.length})</option>
      </select>
      <span style={{ position: 'absolute', right: '0.9rem', pointerEvents: 'none', color: activeTab === 'browse' ? 'white' : '#6f8f73', fontSize: '0.8rem' }}>▾</span>
    </div>
  </div>
</div>

{activeTab === 'thisweek' && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setThisWeekFilter(thisWeekFilter === 'staff' ? 'all' : 'staff')}
            style={{
              background: thisWeekFilter === 'staff' ? '#7c3aed' : 'white',
              border: '1px solid #7c3aed',
              color: thisWeekFilter === 'staff' ? 'white' : '#7c3aed',
              borderRadius: '999px',
              padding: '0.65rem 1.5rem',
              fontSize: '1rem',
              fontWeight: thisWeekFilter === 'staff' ? '700' : '400',
              cursor: 'pointer',
              fontFamily: SITE_FONT,
              transition: 'all 0.15s ease',
            }}
          >
            Staff
          </button>
          <button
            onClick={() => setThisWeekFilter(thisWeekFilter === 'careteam' ? 'all' : 'careteam')}
            style={{
              background: thisWeekFilter === 'careteam' ? '#2563eb' : 'white',
              border: '1px solid #2563eb',
              color: thisWeekFilter === 'careteam' ? 'white' : '#2563eb',
              borderRadius: '999px',
              padding: '0.65rem 1.5rem',
              fontSize: '1rem',
              fontWeight: thisWeekFilter === 'careteam' ? '700' : '400',
              cursor: 'pointer',
              fontFamily: SITE_FONT,
              transition: 'all 0.15s ease',
            }}
          >
            Care Team
          </button>
        </div>
      )}

      <main style={{ padding: '0 1rem 2rem', maxWidth: '1400px', margin: '0 auto' }}></main>

      <main style={{ padding: '0 1rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#5f6b63', fontSize: '1.1rem', fontFamily: SITE_FONT }}>
            Loading care cards...
          </div>
        ) : visibleCards.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#5f6b63', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', border: '1px dashed #d9e2d6', fontFamily: SITE_FONT }}>
            <h3 style={{ marginBottom: '0.5rem', fontFamily: SITE_FONT }}>
              {activeTab === 'completed' ? 'No completed cards yet' : 'No cards yet'}
            </h3>
            <p style={{ fontFamily: SITE_FONT }}>
              {activeTab === 'completed' ? 'Cards marked complete will appear here.' : 'Create your first care card above to get started!'}
            </p>
          </div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {visibleCards.map((card) => (
              <CareCard
                key={card.id}
                card={card}
                onClick={() => openCard(card)}
                profiles={profiles}
              />
            ))}
          </div>
        )}
      </main>

      {showAddCard && (
        <Modal onClose={() => { setShowAddCard(false); setEditingCard(null) }}>
          <CardForm
            initial={editingCard}
            onSave={saveCard}
            onClose={() => { setShowAddCard(false); setEditingCard(null) }}
            profiles={profiles}
            onCallUserId={onCallUserId}
          />
        </Modal>
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          refreshCards={loadCards}
          onEdit={(card) => { setSelectedCard(null); setEditingCard(card); setShowAddCard(true) }}
          profiles={profiles}
          allVisibleCards={visibleCards}
          currentIndex={selectedCardIndex}
          onNavigate={navigateCard}
        />
      )}
      
    </div>
  )
}