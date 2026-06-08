import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const initialForm = {
  email: '',
  password: '',
  username: '',
  teamName: '',
}

function getAuthRedirectUrl() {
  return window.location.origin
}

export default function AuthPanel() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [mode, setMode] = useState('sign-in')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return undefined

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      return
    }

    setProfile(data)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!supabaseConfigured) {
        throw new Error('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      }

      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              username: form.username.trim(),
              team_name: form.teamName.trim(),
            },
          },
        })

        if (signUpError) throw signUpError

        if (data.session?.user) {
          await saveProfile(data.session.user.id)
          setMessage('Account created and profile saved.')
        } else {
          setMessage('Account created. Check your email and confirm the account, then return here and sign in.')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })

        if (signInError) throw signInError
        setMessage('Signed in successfully.')
      }
    } catch (err) {
      if (err.message === 'Email not confirmed') {
        setError('Email not confirmed. Open the confirmation email first, or temporarily turn off Confirm email in Supabase Auth settings while testing.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile(userId = session?.user?.id) {
    if (!userId) throw new Error('You need to be signed in before saving a profile.')

    const username = form.username.trim()
    const teamName = form.teamName.trim()

    if (!teamName) throw new Error('Please enter a fantasy team name.')

    const { data, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: username || null,
        team_name: teamName,
      })
      .select()
      .single()

    if (upsertError) throw upsertError

    setProfile(data)
    setMessage('Profile saved.')
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await saveProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    setError('')
    setMessage('')

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)

    setLoading(false)
  }

  if (!supabaseConfigured) {
    return (
      <section className="auth-panel warning-panel">
        <p className="eyebrow small">Account setup</p>
        <h2>Supabase keys needed</h2>
        <p>
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify to enable sign-up and login.
        </p>
      </section>
    )
  }

  if (session?.user) {
    return (
      <section className="auth-panel">
        <div className="auth-header">
          <div>
            <p className="eyebrow small">Signed in</p>
            <h2>{profile?.team_name || 'Create your fantasy team'}</h2>
            <p className="muted-text">{session.user.email}</p>
          </div>
          <button type="button" className="secondary-button" onClick={signOut} disabled={loading}>
            Sign out
          </button>
        </div>

        {!profile && (
          <form className="auth-form" onSubmit={handleProfileSubmit}>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                placeholder="gavinfc"
              />
            </label>
            <label>
              Fantasy team name
              <input
                value={form.teamName}
                onChange={(event) => updateField('teamName', event.target.value)}
                placeholder="Gavin FC"
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save team profile'}
            </button>
          </form>
        )}

        {profile && (
          <div className="account-card">
            <strong>Team ready:</strong> {profile.team_name}
            {profile.username && <span>Username: {profile.username}</span>}
          </div>
        )}

        {message && <p className="success-box">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    )
  }

  return (
    <section className="auth-panel">
      <div className="auth-header">
        <div>
          <p className="eyebrow small">Player account</p>
          <h2>{mode === 'sign-up' ? 'Create your team' : 'Sign in'}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setError('')
            setMessage('')
            setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')
          }}
        >
          {mode === 'sign-up' ? 'Use existing account' : 'Create account'}
        </button>
      </div>

      <form className="auth-form" onSubmit={handleAuthSubmit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </label>

        {mode === 'sign-up' && (
          <>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                placeholder="gavinfc"
              />
            </label>
            <label>
              Fantasy team name
              <input
                value={form.teamName}
                onChange={(event) => updateField('teamName', event.target.value)}
                placeholder="Gavin FC"
                required
              />
            </label>
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
