import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { tenant: any; onRefresh?: () => void }

const CreditDashboard = ({ tenant, onRefresh }: Props) => {
  const [usage, setUsage] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!tenant?.id) return
    const month = new Date().toISOString().slice(0, 7)
    supabase.from('usage_metering').select('*').eq('tenant_id', tenant.id).eq('period_month', month).single().then(({ data }) => setUsage(data))
    supabase.from('tenant_credits').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setHistory(data || []))
  }, [tenant?.id])

  const pct = tenant?.credit_initial > 0 ? ((tenant.credit_balance / tenant.credit_initial) * 100) : 0
  const barColor = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${barColor}22, ${barColor}11)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining Credit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', fontFamily: "'Bahnschrift',sans-serif" }}>
              {tenant?.currency || 'AED'} {Number(tenant?.credit_balance || 0).toFixed(2)}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Plan: <b>{tenant?.plan_name || 'Starter'}</b></div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{Number(pct).toFixed(0)}% remaining</div>
        </div>
      </div>

      {/* Credit bar */}
      <div style={{ marginTop: 12, height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(pct, 0)}%`, borderRadius: 4, background: barColor, transition: 'width .5s' }} />
      </div>

      {/* Usage stats */}
      {usage && (
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          <span>👥 {usage.user_count} users</span>
          <span>📦 {Number(usage.storage_mb || 0).toFixed(1)} MB</span>
          <span>📄 {usage.transaction_count} transactions</span>
        </div>
      )}

      {/* Expanded history */}
      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Recent Activity</div>
          {history.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>No transactions yet</div>}
          {history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #f9fafb' }}>
              <div>
                <span style={{ color: h.tx_type === 'Credit' || h.tx_type === 'Bonus' ? '#22c55e' : h.tx_type === 'Debit' ? '#ef4444' : '#6b7280', fontWeight: 600, marginRight: 6 }}>
                  {h.tx_type === 'Credit' || h.tx_type === 'Bonus' ? '+' : '-'}{Math.abs(Number(h.amount)).toFixed(2)}
                </span>
                {h.description}
              </div>
              <div style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CreditDashboard
