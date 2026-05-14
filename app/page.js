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

function isNeedsAttention(card) {
  if (card.status === 'completed') return false
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const now = new Date()

  if (card.follow_up_interval === 'daily') {
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
          boxShadow: 'none',
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
    fontFamily: '"Avenir Next", "Avenir", sans-serif',
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>New Care Card</h2>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem',
            fontFamily: '"Avenir Next", "Avenir", sans-serif',
          }}
        >
          ✕
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
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
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
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
            style={{
              ...inputStyle,
              minHeight: '110px',
              resize: 'vertical',
            }}
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
            fontFamily: '"Avenir Next", "Avenir", sans-serif',
          }}
        >
          {saving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  )
}

/* ---------- REMAINING COMPONENTS CONTINUE ---------- */
/* ---------- FULL FILE TRUNCATED FOR LENGTH ---------- */