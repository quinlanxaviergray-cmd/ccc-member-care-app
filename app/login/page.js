"use client"

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SITE_FONT = "'Avenir Next', Avenir, Helvetica, Arial, sans-serif"

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if user is approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', data.user.id)
      .single()

    if (!profile?.approved) {
      await supabase.auth.signOut()
      setError('Your account is pending approval. Please check back soon.')
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SITE_FONT, padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header Card */}
        <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '2rem', backdropFilter: 'blur(12px)', marginBottom: '1rem', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', fontFamily: SITE_FONT }}>BurdenBear</h1>
          <div style={{ color: '#5f6b63', marginTop: '0.4rem', fontSize: '1rem', fontStyle: 'italic', fontFamily: SITE_FONT }}>
            "Bear one another's burdens,
            <br />
            and so fulfill the law of Christ." (Gal. 6:2)
          </div>
        </div>

        {/* Login Card */}
        <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>Sign In</h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4f6b57', marginBottom: '0.4rem', fontFamily: SITE_FONT }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cfd8cc', fontSize: '1rem', fontFamily: SITE_FONT, background: '#f4f7f2', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4f6b57', marginBottom: '0.4rem', fontFamily: SITE_FONT }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cfd8cc', fontSize: '1rem', fontFamily: SITE_FONT, background: '#f4f7f2', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.75rem', color: '#dc2626', fontSize: '0.9rem', fontFamily: SITE_FONT }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.9rem', background: loading ? '#9ca3af' : '#6f8f73', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: SITE_FONT, transition: 'all 0.2s ease' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* 👇 Add right here */}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              style={{ marginTop: '0.75rem', width: '100%', padding: '0.9rem', background: 'transparent', color: '#4f6b57', border: '1px solid #cfd8cc', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', fontFamily: SITE_FONT }}
            >
              Request Access
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}