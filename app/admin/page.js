"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SITE_FONT = 'Avenir Next, Avenir, Helvetica, Arial, sans-serif'

export default function AdminPanel() {
  const router = useRouter()
  const [profiles, setProfiles] = useState([])
  const [onCallUserId, setOnCallUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRole, setSavingRole] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setCurrentUserId(session.user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()
      if (!profile?.is_admin) { router.push('/'); return }
      setIsAdmin(true)
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: profilesData }, { data: settingsData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role, is_admin').order('full_name'),
        supabase.from('app_settings').select('value').eq('key', 'on_call_user_id').single(),
      ])
      if (profilesData) setProfiles(profilesData)
      if (settingsData?.value) setOnCallUserId(settingsData.value)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isAdmin) loadData() }, [isAdmin, loadData])

  const saveOnCall = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'on_call_user_id', value: onCallUserId }, { onConflict: 'key' })
      if (error) throw error
      setMessage('On-call pastor updated successfully.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateRole = async (userId, newRole) => {
    setSavingRole(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (error) throw error
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, role: newRole } : p))
    } catch (err) {
      alert('Failed to update role: ' + err.message)
    } finally {
      setSavingRole(null)
    }
  }

  const toggleAdmin = async (userId, currentIsAdmin) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', userId)
      if (error) throw error
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, is_admin: !currentIsAdmin } : p))
    } catch (err) {
      alert('Failed to update admin status: ' + err.message)
    }
  }

  // Removes access by clearing the user's role and admin status.
  // This keeps the profile row but effectively locks them out of meaningful access.
  // If your app uses Supabase Auth RLS, you may also want to disable the auth user.
  const removeAccess = async (userId, fullName) => {
    if (!confirm(`Remove access for ${fullName}? This will clear their role and admin status.`)) return
    setRemovingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: null, is_admin: false })
        .eq('id', userId)
      if (error) throw error
      setProfiles((prev) => prev.map((p) =>
        p.id === userId ? { ...p, role: null, is_admin: false } : p
      ))
    } catch (err) {
      alert('Failed to remove access: ' + err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '0.8rem',
    border: '1px solid #cfd8cc',
    fontSize: '1rem',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: SITE_FONT,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236f8f73' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    cursor: 'pointer',
  }

  const sectionStyle = {
    background: 'white',
    border: '1px solid #d9e2d6',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  }

  const roleSelectStyle = {
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    borderRadius: '0.6rem',
    border: '1px solid #cfd8cc',
    fontSize: '0.88rem',
    background: 'white',
    fontFamily: SITE_FONT,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236f8f73' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.6rem center',
    color: '#374151',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8f3', fontFamily: SITE_FONT, color: '#5f6b63', fontSize: '1rem' }}>
        Loading...
      </div>
    )
  }

  const onCallPerson = profiles.find((p) => p.id === onCallUserId)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 100%)', fontFamily: SITE_FONT, padding: '1.5rem 1rem 3rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'white', border: '1px solid #cfd8cc', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', cursor: 'pointer', fontFamily: SITE_FONT, fontWeight: '600', color: '#4f6b57', fontSize: '0.9rem' }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: SITE_FONT }}>Admin Panel</h1>
        </div>

        {/* On-Call Pastor */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', fontWeight: '700', fontFamily: SITE_FONT }}>On-Call Pastor This Week</h2>
          <p style={{ margin: '0 0 1.25rem', color: '#5f6b63', fontSize: '0.92rem', fontFamily: SITE_FONT, lineHeight: '1.5' }}>
            Select who is on call this week. Cards assigned to "On Call" will route to this person and appear on their Me tab.
          </p>

          {onCallPerson && (
            <div style={{ marginBottom: '1rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#c2410c', fontWeight: '600', fontFamily: SITE_FONT }}>
              📞 Currently on call: {onCallPerson.full_name}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '0.4rem', fontFamily: SITE_FONT }}>
                Select Person
              </label>
              <select
                style={inputStyle}
                value={onCallUserId}
                onChange={(e) => setOnCallUserId(e.target.value)}
              >
                <option value="">— No one on call —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role === 'staff' ? 'Staff' : p.role === 'care_team' ? 'Care Team' : 'No role set'})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveOnCall}
              disabled={saving}
              style={{ background: saving ? '#9ca3af' : '#c2410c', color: 'white', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '0.8rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: SITE_FONT, whiteSpace: 'nowrap', fontSize: '0.95rem' }}
            >
              {saving ? 'Saving...' : 'Set On Call'}
            </button>
          </div>

          {message && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: message.startsWith('Error') ? '#dc2626' : '#16a34a', fontFamily: SITE_FONT, fontWeight: '600' }}>
              {message.startsWith('Error') ? '⚠ ' : '✓ '}{message}
            </div>
          )}
        </div>

        {/* User Roles */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', fontWeight: '700', fontFamily: SITE_FONT }}>User Roles & Access</h2>
          <p style={{ margin: '0 0 1.25rem', color: '#5f6b63', fontSize: '0.92rem', fontFamily: SITE_FONT, lineHeight: '1.5' }}>
            Staff = pastors and paid staff. Care Team = volunteer caregivers. A person's role determines which tab their assigned cards appear under. Remove Access clears their role and admin rights.
          </p>

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId
              const isRemoving = removingId === p.id
              const isSavingRole = savingRole === p.id

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.9rem 1rem',
                    background: '#f8faf6',
                    borderRadius: '0.85rem',
                    border: '1px solid #e5ede6',
                    flexWrap: 'wrap',
                    opacity: isRemoving ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Name + badges */}
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', fontFamily: SITE_FONT, color: '#1f2937' }}>
                        {p.full_name}
                      </span>
                      {isSelf && (
                        <span style={{ fontSize: '0.72rem', background: '#e8f0e9', color: '#4f6b57', border: '1px solid #a8c4ab', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: '600', fontFamily: SITE_FONT }}>
                          You
                        </span>
                      )}
                      {p.is_admin && (
                        <span style={{ fontSize: '0.72rem', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: '600', fontFamily: SITE_FONT }}>
                          Admin
                        </span>
                      )}
                      {!p.role && (
                        <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: '600', fontFamily: SITE_FONT }}>
                          No access
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Role dropdown */}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={p.role || ''}
                        onChange={(e) => updateRole(p.id, e.target.value)}
                        disabled={isSavingRole || isRemoving}
                        style={{
                          ...roleSelectStyle,
                          opacity: isSavingRole || isRemoving ? 0.6 : 1,
                          cursor: isSavingRole || isRemoving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="">— No Role —</option>
                        <option value="staff">Staff</option>
                        <option value="care_team">Care Team</option>
                      </select>
                    </div>

                    {/* Admin toggle */}
                    <button
                      onClick={() => toggleAdmin(p.id, p.is_admin)}
                      disabled={isSelf || isRemoving}
                      title={isSelf ? "You can't change your own admin status" : ''}
                      style={{
                        background: p.is_admin ? '#ede9fe' : '#f3f4f6',
                        color: p.is_admin ? '#7c3aed' : '#6b7280',
                        border: `1px solid ${p.is_admin ? '#c4b5fd' : '#d1d5db'}`,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.6rem',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: isSelf || isRemoving ? 'not-allowed' : 'pointer',
                        fontFamily: SITE_FONT,
                        whiteSpace: 'nowrap',
                        opacity: isSelf || isRemoving ? 0.5 : 1,
                      }}
                    >
                      {p.is_admin ? '★ Admin' : 'Make Admin'}
                    </button>

                    {/* Remove access */}
                    {!isSelf && (
                      <button
                        onClick={() => removeAccess(p.id, p.full_name)}
                        disabled={isRemoving}
                        style={{
                          background: '#fff1f2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: isRemoving ? 'not-allowed' : 'pointer',
                          fontFamily: SITE_FONT,
                          whiteSpace: 'nowrap',
                          opacity: isRemoving ? 0.5 : 1,
                        }}
                      >
                        {isRemoving ? '...' : 'Remove Access'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}