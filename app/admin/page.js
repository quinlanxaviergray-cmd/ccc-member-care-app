"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SITE_FONT = "'Avenir Next', Avenir, Helvetica, Arial, sans-serif"

export default function Admin() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingUsers, setPendingUsers] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setSession(session)

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
    })
  }, [])

const loadUsers = useCallback(async () => {
  setLoading(true)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    setPendingUsers(data.filter((u) => u.status === 'pending'))
    setActiveUsers(data.filter((u) => u.status === 'active'))
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin, loadUsers])

const approveUser = async (id) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true, status: 'active' })
      .eq('id', id)
    if (error) throw error
    await loadUsers()
  } catch (err) {
    alert(err.message)
  }
}

const denyUser = async (id) => {
  if (!confirm('Deny this user? They will not be able to access the app.')) return
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false, status: 'denied' })
      .eq('id', id)
    if (error) throw error
    await loadUsers()
  } catch (err) {
    alert(err.message)
  }
}

const removeAccess = async (id) => {
  if (!confirm('Remove access for this user? They will no longer be able to log in.')) return
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false, status: 'denied' })
      .eq('id', id)
    if (error) throw error
    await loadUsers()
  } catch (err) {
    alert(err.message)
  }
}

  if (!isAdmin) return null

  const cardStyle = {
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid #d9e2d6',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    backdropFilter: 'blur(12px)',
    marginBottom: '1rem',
    fontFamily: SITE_FONT,
  }

  const buttonStyle = (color) => ({
    padding: '0.5rem 1rem',
    background: color,
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: SITE_FONT,
  })

  const userRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f4f7f2',
    borderRadius: '0.75rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
    fontFamily: SITE_FONT,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', fontFamily: SITE_FONT, padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ ...cardStyle, textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', fontFamily: SITE_FONT }}>BurdenBear</h1>
          <div style={{ color: '#5f6b63', marginTop: '0.25rem', fontSize: '0.95rem', fontFamily: SITE_FONT }}>Admin Panel</div>
        </div>

        <button
          onClick={() => router.push('/')}
          style={{ ...buttonStyle('#6f8f73'), marginBottom: '1.5rem' }}
        >
          ← Back to Dashboard
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#5f6b63', padding: '2rem', fontFamily: SITE_FONT }}>Loading users...</div>
        ) : error ? (
          <div style={{ color: '#dc2626', padding: '1rem', fontFamily: SITE_FONT }}>{error}</div>
        ) : (
          <>
            {/* Pending Users */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>
                Pending Approval ({pendingUsers.length})
              </h2>
              {pendingUsers.length === 0 ? (
                <div style={{ color: '#5f6b63', fontStyle: 'italic', fontFamily: SITE_FONT }}>No pending requests.</div>
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.id} style={userRowStyle}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>{user.full_name || 'No name'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#5f6b63', fontFamily: SITE_FONT }}>{user.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => approveUser(user.id)} style={buttonStyle('#4f6b57')}>Approve</button>
                      <button onClick={() => denyUser(user.id)} style={buttonStyle('#dc2626')}>Deny</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Active Users */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>
                Active Users ({activeUsers.length})
              </h2>
              {activeUsers.length === 0 ? (
                <div style={{ color: '#5f6b63', fontStyle: 'italic', fontFamily: SITE_FONT }}>No active users.</div>
              ) : (
                activeUsers.map((user) => (
                  <div key={user.id} style={userRowStyle}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>{user.full_name || 'No name'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#5f6b63', fontFamily: SITE_FONT }}>{user.email}</div>
                    </div>
                    <button onClick={() => removeAccess(user.id)} style={buttonStyle('#dc2626')}>Remove Access</button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}