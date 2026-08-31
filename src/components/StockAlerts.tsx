import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface StockAlert {
  id: string
  product_id: string
  product_name: string
  product_code: string
  alert_type: 'low_stock' | 'out_of_stock'
  current_qty: number
  reorder_level: number
  warehouse: string
  acknowledged: boolean
  acknowledged_by: string
  email_sent: boolean
  created_at: string
}

export default function StockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [scanResult, setScanResult] = useState('')
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'pending'>('pending')

  const loadAlerts = async () => {
    setLoading(true)
    const { data } = await supabase.from('stock_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => { loadAlerts() }, [])

  const scanStock = async () => {
    setScanning(true); setScanResult('')
    try {
      const { data: products } = await supabase.from('products').select('*')
      const items = products || []
      let lowCount = 0, outCount = 0, newAlerts = 0

      for (const p of items) {
        const qty = Number(p.stock_quantity || 0)
        const reorder = Number(p.reorder_level || 0)
        if (reorder <= 0) continue

        const alertType = qty <= 0 ? 'out_of_stock' : qty <= reorder ? 'low_stock' : null
        if (!alertType) continue

        if (alertType === 'out_of_stock') outCount++
        else lowCount++

        const { data: existing } = await supabase.from('stock_alerts')
          .select('id')
          .eq('product_id', p.id)
          .eq('alert_type', alertType)
          .eq('acknowledged', false)
          .limit(1)

        if (!existing || existing.length === 0) {
          const { error } = await supabase.from('stock_alerts').insert({
            product_id: p.id,
            product_name: p.name,
            product_code: p.code || '',
            alert_type: alertType,
            current_qty: qty,
            reorder_level: reorder,
          })
          if (!error) newAlerts++
        }
      }

      setScanResult(`✅ Scan complete: ${lowCount} low stock, ${outCount} out of stock, ${newAlerts} new alerts created`)
      loadAlerts()
    } catch (err: any) {
      setScanResult('⚠️ Error: ' + (err.message || 'Unknown'))
    }
    setScanning(false)
  }

  const acknowledge = async (id: string) => {
    await supabase.from('stock_alerts').update({
      acknowledged: true,
      acknowledged_by: 'User',
      acknowledged_at: new Date().toISOString(),
    }).eq('id', id)
    loadAlerts()
  }

  const acknowledgeAll = async () => {
    const pending = alerts.filter((a) => !a.acknowledged)
    for (const a of pending) {
      await supabase.from('stock_alerts').update({
        acknowledged: true,
        acknowledged_by: 'User',
        acknowledged_at: new Date().toISOString(),
      }).eq('id', a.id)
    }
    loadAlerts()
  }

  const deleteAlert = async (id: string) => {
    await supabase.from('stock_alerts').delete().eq('id', id)
    loadAlerts()
  }

  const sendAlertEmail = async () => {
    const pending = alerts.filter((a) => !a.acknowledged)
    if (!pending.length) { setScanResult('⚠️ No pending alerts to send'); return }

    const rows = pending.map((a) =>
      `${a.alert_type === 'out_of_stock' ? '🔴 OUT' : '🟡 LOW'} | ${a.product_name} (${a.product_code || '—'}) | Qty: ${a.current_qty} / Reorder: ${a.reorder_level}`
    )

    const html = `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#dc2626">⚠️ Stock Alert Report</h2>
        <p>${pending.length} items need attention</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Status</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Product</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Code</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Current Qty</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Reorder Level</th></tr>
          ${pending.map((a) => `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;color:${a.alert_type === 'out_of_stock' ? '#dc2626' : '#d97706'};font-weight:700">${a.alert_type === 'out_of_stock' ? '🔴 OUT OF STOCK' : '🟡 LOW STOCK'}</td><td style="padding:6px 8px;border:1px solid #e2e8f0">${a.product_name}</td><td style="padding:6px 8px;border:1px solid #e2e8f0">${a.product_code || '—'}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:700">${a.current_qty}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${a.reorder_level}</td></tr>`).join('')}
        </table>
        <p style="margin-top:16px;color:#64748b;font-size:12px">Generated by ERP Pro · ${new Date().toLocaleDateString()}</p>
      </div>
    `

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'admin@company.com',
          subject: `⚠️ Stock Alert: ${pending.length} items low/out of stock`,
          html,
        },
      })
      if (error) throw error

      for (const a of pending) {
        await supabase.from('stock_alerts').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', a.id)
      }
      setScanResult(`✅ Alert email sent for ${pending.length} items`)
      loadAlerts()
    } catch (err: any) {
      setScanResult('⚠️ Email failed: ' + (err.message || 'Configure RESEND_API_KEY in Supabase Edge Functions'))
    }
  }

  const filtered = alerts.filter((a) => {
    if (filter === 'low_stock') return a.alert_type === 'low_stock'
    if (filter === 'out_of_stock') return a.alert_type === 'out_of_stock'
    if (filter === 'pending') return !a.acknowledged
    return true
  })

  const pendingCount = alerts.filter((a) => !a.acknowledged).length
  const outOfStockCount = alerts.filter((a) => a.alert_type === 'out_of_stock' && !a.acknowledged).length
  const lowStockCount = alerts.filter((a) => a.alert_type === 'low_stock' && !a.acknowledged).length

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>⚠️ Stock Alerts</h3>
        <div className="report-controls">
          <button onClick={scanStock} disabled={scanning} style={{ padding: '6px 14px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {scanning ? '⏳ Scanning...' : '🔍 Scan Stock Levels'}
          </button>
          {pendingCount > 0 && (
            <>
              <button onClick={sendAlertEmail} style={{ padding: '6px 14px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                📧 Email Alerts ({pendingCount})
              </button>
              <button onClick={acknowledgeAll} style={{ padding: '6px 14px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✓ Acknowledge All
              </button>
            </>
          )}
        </div>
      </div>

      {scanResult && (
        <div style={{ padding: '8px 14px', borderRadius: 8, background: scanResult.includes('✅') ? '#f0fdf4' : '#fef2f2', color: scanResult.includes('✅') ? '#16a34a' : '#dc2626', marginBottom: 12, fontSize: 12 }}>
          {scanResult}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#ede9fe' : '#fff', border: `1px solid ${filter === 'all' ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{alerts.length}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Alerts</div>
        </div>
        <div onClick={() => setFilter('pending')} style={{ background: filter === 'pending' ? '#fef3c7' : '#fff', border: `1px solid ${filter === 'pending' ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{pendingCount}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Pending</div>
        </div>
        <div onClick={() => setFilter('low_stock')} style={{ background: filter === 'low_stock' ? '#fef3c7' : '#fff', border: `1px solid ${filter === 'low_stock' ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{lowStockCount}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>🟡 Low Stock</div>
        </div>
        <div onClick={() => setFilter('out_of_stock')} style={{ background: filter === 'out_of_stock' ? '#fee2e2' : '#fff', border: `1px solid ${filter === 'out_of_stock' ? '#ef4444' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{outOfStockCount}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>🔴 Out of Stock</div>
        </div>
      </div>

      <div className="grid-wrap">
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>STATUS</th>
              <th>PRODUCT</th>
              <th>CODE</th>
              <th className="col-money">CURRENT QTY</th>
              <th className="col-money">REORDER LEVEL</th>
              <th>SCANNED</th>
              <th>EMAIL</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No stock alerts found. Click "Scan Stock Levels" to check.</td></tr>}
            {!loading && filtered.map((a, i) => (
              <tr key={a.id || i} className={a.acknowledged ? '' : i % 2 ? 'alt' : ''} style={a.acknowledged ? { opacity: 0.5 } : {}}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: a.alert_type === 'out_of_stock' ? '#fef2f2' : '#fef3c7', color: a.alert_type === 'out_of_stock' ? '#dc2626' : '#d97706' }}>
                    {a.alert_type === 'out_of_stock' ? '🔴 OUT' : '🟡 LOW'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{a.product_name}</td>
                <td style={{ fontSize: 11, color: '#64748b' }}>{a.product_code || '—'}</td>
                <td className="col-money" style={{ fontWeight: 700, color: a.current_qty <= 0 ? '#dc2626' : '#d97706' }}>{a.current_qty}</td>
                <td className="col-money">{a.reorder_level}</td>
                <td style={{ fontSize: 11, color: '#94a3b8' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                <td>{a.email_sent ? <span style={{ color: '#10b981', fontSize: 11 }}>✅ Sent</span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>}</td>
                <td>
                  {!a.acknowledged && (
                    <button onClick={() => acknowledge(a.id)} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #10b981', background: '#fff', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 4 }}>
                      ✓ Ack
                    </button>
                  )}
                  <button onClick={() => deleteAlert(a.id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
