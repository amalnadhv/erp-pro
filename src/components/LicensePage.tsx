import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { tenant: any; onTenantUpdate?: (t: any) => void }

const LicensePage = ({ tenant, onTenantUpdate }: Props) => {
  const [plans, setPlans] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Add Credit modal
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [creditAmt, setCreditAmt] = useState('')
  const [creditDesc, setCreditDesc] = useState('')
  const [creditType, setCreditType] = useState<'Credit' | 'Bonus'>('Credit')

  // Promo code
  const [promoCode, setPromoCode] = useState('')

  // Confirm plan change
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null)

  const PROMOS: Record<string, { amount: number; desc: string }> = {
    'WELCOME50': { amount: 50, desc: 'Welcome bonus +AED 50' },
    'LAUNCH100': { amount: 100, desc: 'Launch promo +AED 100' },
    'DEMO200': { amount: 200, desc: 'Demo credit +AED 200' },
  }

  const reload = () => {
    if (!tenant?.id) return
    supabase.from('billing_plans').select('*').order('monthly_price').then(({ data }) => setPlans(data || []))
    const month = new Date().toISOString().slice(0, 7)
    supabase.from('usage_metering').select('*').eq('tenant_id', tenant.id).eq('period_month', month).single().then(({ data }) => setUsage(data))
    supabase.from('tenant_credits').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => setHistory(data || []))
  }

  useEffect(() => { reload() }, [tenant?.id])

  const currentPlan = plans.find((p) => p.name === tenant?.plan_name) || {}
  const creditPct = tenant?.credit_initial > 0 ? (tenant.credit_balance / tenant.credit_initial * 100) : 0
  const barColor = creditPct > 50 ? '#22c55e' : creditPct > 20 ? '#f59e0b' : '#ef4444'
  const daysLeft = tenant?.expires_at ? Math.ceil((new Date(tenant.expires_at).getTime() - Date.now()) / 86400000) : null
  const expiryColor = daysLeft !== null ? (daysLeft > 14 ? '#22c55e' : daysLeft > 0 ? '#f59e0b' : '#ef4444') : '#6b7280'

  // ---- Add Credit ----
  const handleAddCredit = async () => {
    const amt = Number(creditAmt)
    if (!amt || amt <= 0) return
    setBusy(true); setMsg('')
    try {
      const newBal = Number(tenant.credit_balance || 0) + amt
      const { error } = await supabase.from('tenants').update({ credit_balance: newBal, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      if (error) throw error
      await supabase.from('tenant_credits').insert({ tenant_id: tenant.id, amount: amt, balance_after: newBal, tx_type: creditType, description: creditDesc || (creditType === 'Bonus' ? 'Bonus credit' : 'Manual top-up') })
      const updated = { ...tenant, credit_balance: newBal }
      onTenantUpdate?.(updated)
      setCreditAmt(''); setCreditDesc(''); setShowAddCredit(false)
      setMsg(`+AED ${amt.toFixed(2)} credit added!`)
      reload()
    } catch (e: any) { setMsg(e?.message || 'Failed') }
    setBusy(false)
  }

  // ---- Apply Promo ----
  const handlePromo = async () => {
    const promo = PROMOS[promoCode.toUpperCase().trim()]
    if (!promo) { setMsg('Invalid promo code'); return }
    setBusy(true); setMsg('')
    try {
      const newBal = Number(tenant.credit_balance || 0) + promo.amount
      const { error } = await supabase.from('tenants').update({ credit_balance: newBal, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      if (error) throw error
      await supabase.from('tenant_credits').insert({ tenant_id: tenant.id, amount: promo.amount, balance_after: newBal, tx_type: 'Bonus', description: promo.desc })
      const updated = { ...tenant, credit_balance: newBal }
      onTenantUpdate?.(updated)
      setPromoCode('')
      setMsg(`Promo applied! +AED ${promo.amount}`)
      reload()
    } catch (e: any) { setMsg(e?.message || 'Failed') }
    setBusy(false)
  }

  // ---- Change Plan ----
  const handleChangePlan = async (planName: string) => {
    setBusy(true); setMsg(''); setConfirmPlan(null)
    try {
      const newPlan = plans.find((p) => p.name === planName)
      const { error } = await supabase.from('tenants').update({ plan_name: planName, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      if (error) throw error
      // If upgrading to a paid plan, add plan's credit
      if (newPlan && Number(newPlan.credit_amount) > 0) {
        const newBal = Number(tenant.credit_balance || 0) + Number(newPlan.credit_amount)
        await supabase.from('tenants').update({ credit_balance: newBal, credit_initial: newPlan.credit_amount }).eq('id', tenant.id)
        await supabase.from('tenant_credits').insert({ tenant_id: tenant.id, amount: Number(newPlan.credit_amount), balance_after: newBal, tx_type: 'Credit', description: `${planName} plan credit` })
        onTenantUpdate?.({ ...tenant, plan_name: planName, credit_balance: newBal, credit_initial: newPlan.credit_amount })
      } else {
        onTenantUpdate?.({ ...tenant, plan_name: planName })
      }
      setMsg(`Switched to ${planName}!`)
      reload()
    } catch (e: any) { setMsg(e?.message || 'Failed') }
    setBusy(false)
  }

  // ---- Suspend / Reactivate ----
  const toggleSuspend = async () => {
    const newStatus = tenant.status === 'Active' ? 'Suspended' : 'Active'
    if (!confirm(` ${newStatus === 'Suspended' ? 'Suspend' : 'Reactivate'} this tenant?`)) return
    setBusy(true)
    try {
      await supabase.from('tenants').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      onTenantUpdate?.({ ...tenant, status: newStatus })
      setMsg(`Tenant ${newStatus === 'Suspended' ? 'suspended' : 'reactivated'}`)
    } catch (e: any) { setMsg(e?.message || 'Failed') }
    setBusy(false)
  }

  return (
    <div className="doc-workspace" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
      <div className="coa-head"><h3>🔑 License & Subscription</h3></div>
      {msg && <div className="inv-error" style={{ marginTop: 8, background: msg.includes('!') || msg.includes('+') ? '#f0fdf4' : '#fef2f2', borderColor: msg.includes('!') || msg.includes('+') ? '#bbf7d0' : '#fecaca', color: msg.includes('!') || msg.includes('+') ? '#166534' : '#b91c1c' }}>{msg}</div>}

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => setShowAddCredit(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 0, background: 'linear-gradient(135deg,#6a11cb,#2575fc)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>💰 Add Credit</button>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo code" style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 140 }} onKeyDown={(e) => { if (e.key === 'Enter') handlePromo() }} />
          <button className="btn-primary" onClick={handlePromo} disabled={busy || !promoCode} style={{ padding: '8px 14px', borderRadius: 8, border: 0, background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: busy || !promoCode ? 0.5 : 1 }}>Apply</button>
        </div>
        <button onClick={toggleSuspend} style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 8, border: `1px solid ${tenant?.status === 'Active' ? '#fca5a5' : '#86efac'}`, background: tenant?.status === 'Active' ? '#fef2f2' : '#f0fdf4', color: tenant?.status === 'Active' ? '#dc2626' : '#16a34a', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          {tenant?.status === 'Active' ? '⏸ Suspend' : '▶ Reactivate'}
        </button>
      </div>

      {/* Current Plan Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Plan</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6a11cb', fontFamily: "'Bahnschrift',sans-serif", marginTop: 4 }}>{tenant?.plan_name || 'Starter'}</div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
            {Number(currentPlan.monthly_price || 0) === 0 ? 'Free (with credit)' : `AED ${currentPlan.monthly_price}/month`}
          </div>
          {tenant?.expires_at && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: expiryColor + '11', border: `1px solid ${expiryColor}33`, fontSize: 12, color: expiryColor, fontWeight: 600 }}>
              {daysLeft !== null && daysLeft > 0 ? `⏰ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : daysLeft === 0 ? '⚠️ Expires today' : '❌ Expired'}
              <span style={{ fontWeight: 400, marginLeft: 4, color: '#6b7280' }}>({new Date(tenant.expires_at).toLocaleDateString()})</span>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Credit Balance</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: barColor, fontFamily: "'Bahnschrift',sans-serif", marginTop: 4 }}>
            AED {Number(tenant?.credit_balance || 0).toFixed(2)}
          </div>
          <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(creditPct, 0)}%`, borderRadius: 4, background: barColor, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{Number(creditPct).toFixed(0)}% of AED {Number(tenant?.credit_initial || 100).toFixed(0)} remaining</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>This Month Usage</div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 8 }}>
            <div>👥 Users: <b>{usage?.user_count || 0}</b> / {currentPlan.max_users || '-'}</div>
            <div>📦 Storage: <b>{Number(usage?.storage_mb || 0).toFixed(1)} MB</b> / {currentPlan.max_storage_mb ? (currentPlan.max_storage_mb / 1024).toFixed(0) + ' GB' : '-'}</div>
            <div>📄 Transactions: <b>{usage?.transaction_count || 0}</b> / {currentPlan.max_transactions?.toLocaleString() || '-'}</div>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginTop: 16 }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Available Plans</h4>
        <table className="data-grid report-table" style={{ fontSize: 12 }}>
          <thead>
            <tr><th>Plan</th><th>Monthly Price</th><th>Free Credit</th><th>Max Users</th><th>Storage</th><th>Transactions</th><th>Action</th></tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} style={{ background: p.name === tenant?.plan_name ? '#f0fdf4' : undefined }}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td>{Number(p.monthly_price) === 0 ? 'Free' : `AED ${p.monthly_price}`}</td>
                <td>{Number(p.credit_amount) > 0 ? `AED ${p.credit_amount}` : '-'}</td>
                <td>{p.max_users}</td>
                <td>{(p.max_storage_mb / 1024).toFixed(0)} GB</td>
                <td>{p.max_transactions?.toLocaleString()}</td>
                <td>
                  {p.name === tenant?.plan_name ? (
                    <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 12 }}>✓ Current</span>
                  ) : confirmPlan === p.name ? (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Confirm?</span>
                      <button onClick={() => handleChangePlan(p.name)} disabled={busy} style={{ padding: '3px 10px', borderRadius: 6, border: 0, background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>Yes</button>
                      <button onClick={() => setConfirmPlan(null)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmPlan(p.name)} style={{ padding: '4px 12px', borderRadius: 6, border: 0, background: Number(p.monthly_price) > Number(currentPlan.monthly_price || 0) ? '#6a11cb' : '#f59e0b', color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                      {Number(p.monthly_price) > Number(currentPlan.monthly_price || 0) ? '⬆ Upgrade' : '⬇ Switch'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit History */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginTop: 16 }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Credit History</h4>
        {history.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No transactions yet</div>
        ) : (
          <table className="data-grid report-table" style={{ fontSize: 12 }}>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th>Module</th><th>Amount</th><th>Balance After</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  <td>
                    <span style={{ color: h.tx_type === 'Credit' || h.tx_type === 'Bonus' ? '#22c55e' : h.tx_type === 'Debit' ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                      {h.tx_type}
                    </span>
                  </td>
                  <td>{h.description}</td>
                  <td>{h.module || '-'}</td>
                  <td style={{ color: Number(h.amount) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{Number(h.amount) >= 0 ? '+' : ''}{Number(h.amount).toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>AED {Number(h.balance_after).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tenant Info */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginTop: 16, marginBottom: 80 }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Account Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, fontSize: 13 }}>
          <div><span style={{ color: '#6b7280' }}>Company:</span> <b>{tenant?.name}</b></div>
          <div><span style={{ color: '#6b7280' }}>Slug:</span> <b>{tenant?.slug}</b></div>
          <div><span style={{ color: '#6b7280' }}>Status:</span> <b style={{ color: tenant?.status === 'Active' ? '#22c55e' : '#ef4444' }}>{tenant?.status}</b></div>
          <div><span style={{ color: '#6b7280' }}>Currency:</span> <b>{tenant?.currency}</b></div>
          <div><span style={{ color: '#6b7280' }}>Total Used:</span> <b>AED {Number(tenant?.credit_used || 0).toFixed(2)}</b></div>
          <div><span style={{ color: '#6b7280' }}>Created:</span> <b>{tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}</b></div>
          <div><span style={{ color: '#6b7280' }}>Expires:</span> <b style={{ color: expiryColor }}>{tenant?.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'Never'}</b></div>
          <div><span style={{ color: '#6b7280' }}>Days Left:</span> <b style={{ color: expiryColor }}>{daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : 'Unlimited'}</b></div>
        </div>
      </div>

      {/* Add Credit Modal */}
      {showAddCredit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setShowAddCredit(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>💰 Add Credit</h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Type</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['Credit', 'Bonus'].map((t) => (
                <button key={t} onClick={() => setCreditType(t as any)} style={{ padding: '6px 16px', borderRadius: 8, border: creditType === t ? '2px solid #6a11cb' : '1px solid #d1d5db', background: creditType === t ? '#f0fdf4' : '#fff', fontWeight: creditType === t ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
                  {t === 'Credit' ? '💳 Payment Received' : '🎁 Bonus / Promo'}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Amount (AED) *</label>
            <input type="number" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} placeholder="e.g. 100" style={{ width: '100%', padding: '10px 13px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddCredit() }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, marginTop: 12 }}>Description</label>
            <input value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} placeholder="e.g. Invoice #1234, bank transfer" style={{ width: '100%', padding: '10px 13px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} onKeyDown={(e) => { if (e.key === 'Enter') handleAddCredit() }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddCredit(false)} style={{ padding: '9px 22px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddCredit} disabled={busy || !creditAmt} style={{ padding: '9px 22px', border: 0, borderRadius: 8, background: 'linear-gradient(135deg,#6a11cb,#2575fc)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: busy || !creditAmt ? 'default' : 'pointer', opacity: busy || !creditAmt ? 0.5 : 1 }}>
                {busy ? 'Adding…' : '✅ Add Credit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LicensePage
