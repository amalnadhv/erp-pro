import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const Login = ({ onLogin }: { onLogin: (user: any, tenant: any) => void }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [fullName, setFullName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogin = async () => {
    setMsg(''); setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data?.user && data?.tenant) {
        onLogin(data.user, data.tenant)
      } else {
        const { data: tu } = await supabase.from('tenant_users').select('*, tenant:tenants(*)').eq('user_id', data.user.id).eq('status', 'Active').single()
        if (tu && tu.tenant) onLogin(data.user, tu.tenant)
        else setMsg('No active company found for this user.')
      }
    } catch (e: any) { setMsg(e?.message || 'Login failed') }
    setBusy(false)
  }

  const handleSignup = async () => {
    setMsg(''); setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, fullName, company })
      if (error) throw error
      if (!data?.user || !data?.tenant) { setMsg('Signup failed. Please try again.'); setBusy(false); return }
      onLogin(data.user, data.tenant)
    } catch (e: any) { setMsg(e?.message || 'Signup failed') }
    setBusy(false)
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); mode === 'login' ? handleLogin() : handleSignup() } }

  const bg = 'linear-gradient(135deg,#6a11cb,#2575fc)'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#eef2f9 30%,#dbeafe 100%)', fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ width: 420, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.12)', overflow: 'hidden' }}>
        <div style={{ background: bg, padding: '32px 32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Bahnschrift',sans-serif" }}>
            Comrade ERP Pro<span style={{ fontSize: 12, verticalAlign: 'super' }}>&reg;</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Start your free trial — $100 credit included'}
          </div>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>
          {msg && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>{msg}</div>}

          {mode === 'signup' && (
            <>
              <label style={lbl}>Company Name *</label>
              <input style={inp} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company name" onKeyDown={handleKey} />
              <label style={lbl}>Full Name</label>
              <input style={inp} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" onKeyDown={handleKey} />
            </>
          )}

          <label style={lbl}>Email *</label>
          <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={handleKey} />

          <label style={lbl}>Password *</label>
          <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" onKeyDown={handleKey} />

          <button
            style={{ width: '100%', padding: '12px 0', marginTop: 20, border: 0, borderRadius: 10, background: bg, color: '#fff', fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
            disabled={busy || !email || !password || (mode === 'signup' && !company)}
            onClick={() => mode === 'login' ? handleLogin() : handleSignup()}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account + $100 Credit'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
            {mode === 'login' ? (
              <>Don't have an account? <span style={{ color: '#6a11cb', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setMode('signup'); setMsg('') }}>Start Free Trial</span></>
            ) : (
              <>Already have an account? <span style={{ color: '#6a11cb', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setMode('login'); setMsg('') }}>Sign In</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, marginTop: 12 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }

export default Login
