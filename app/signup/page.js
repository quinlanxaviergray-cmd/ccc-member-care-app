"use client"

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SITE_FONT = "'Avenir Next', Avenir, Helvetica, Arial, sans-serif"

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Create the auth user
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Insert into profiles table as unapproved
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      email: email,
      approved: false,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Sign them back out immediately since they need approval
    await supabase.auth.signOut()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SITE_FONT, padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '2rem', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 1rem', fontSize: '2rem', fontWeight: '800', fontFamily: SITE_FONT }}>BurdenBear</h1>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#4f6b57', marginBottom: '0.75rem', fontFamily: SITE_FONT }}>Request Submitted!</div>
            <div style={{ fontSize: '0.95rem', color: '#5f6b63', lineHeight: '1.6', fontFamily: SITE_FONT }}>
              Your account request has been received. An admin will review and approve your access shortly. You'll be able to log in once approved.
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{ marginTop: '1.5rem', width: '100%', padding: '0.9rem', background: '#6f8f73', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: SITE_FONT }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
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

        {/* Signup Card */}
        <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '700', color: '#2f3a34', fontFamily: SITE_FONT }}>Request Access</h2>

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4f6b57', marginBottom: '0.4rem', fontFamily: SITE_FONT }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jane Smith"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cfd8cc', fontSize: '1rem', fontFamily: SITE_FONT, background: '#f4f7f2', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

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
              {loading ? 'Submitting...' : 'Request Access'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{ marginTop: '0.75rem', width: '100%', padding: '0.9rem', background: 'transparent', color: '#4f6b57', border: '1px solid #cfd8cc', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', fontFamily: SITE_FONT }}
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}