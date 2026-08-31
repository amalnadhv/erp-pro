import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function AgedReceivables({ fmtMoney }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, payRes] = await Promise.all([
        supabase.from('invoices').select('id, invoice_no, customer_name, customer_id, grand_total, invoice_date, status, balance'),
        supabase.from('incoming_payments').select('id, invoice_id, amount, payment_date, status').eq('status', 'Approved'),
      ])
      const invoices = (invRes.data || []).filter((i) => i.status !== 'Cancelled')
      const payments = payRes.data || []

      const customerMap: Record<string, any> = {}
      invoices.forEach((inv) => {
        const name = inv.customer_name || 'Unknown'
        if (!customerMap[name]) customerMap[name] = { name, invoices: [], totalOutstanding: 0, aging: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } }
        const paid = payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + (Number(p.amount) || 0), 0)
        const balance = (Number(inv.grand_total) || 0) - paid
        if (balance > 0) {
          const daysDiff = Math.floor((Date.now() - new Date(inv.invoice_date || inv.created_at).getTime()) / 86400000)
          customerMap[name].invoices.push({ ...inv, balance, daysOld: daysDiff })
          customerMap[name].totalOutstanding += balance
          if (daysDiff <= 30) customerMap[name].aging['0-30'] += balance
          else if (daysDiff <= 60) customerMap[name].aging['31-60'] += balance
          else if (daysDiff <= 90) customerMap[name].aging['61-90'] += balance
          else customerMap[name].aging['90+'] += balance
        }
      })

      const result = Object.values(customerMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      setData(result)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const filtered = data.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  const grandTotal = filtered.reduce((s, c) => s + c.totalOutstanding, 0)
  const bucketTotals = {
    '0-30': filtered.reduce((s, c) => s + c.aging['0-30'], 0),
    '31-60': filtered.reduce((s, c) => s + c.aging['31-60'], 0),
    '61-90': filtered.reduce((s, c) => s + c.aging['61-90'], 0),
    '90+': filtered.reduce((s, c) => s + c.aging['90+'], 0),
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || grandTotal === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const padding = { top: 20, right: 20, bottom: 50, left: 70 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    ctx.clearRect(0, 0, w, h)

    const colors = ['#22c55e', '#f59e0b', '#f97316', '#ef4444']
    const labels = ['0-30 days', '31-60 days', '61-90 days', '90+ days']
    const values = [bucketTotals['0-30'], bucketTotals['31-60'], bucketTotals['61-90'], bucketTotals['90+']]

    const maxVal = Math.max(...values, 1)
    const barWidth = chartW / values.length * 0.6
    const gap = chartW / values.length * 0.4

    values.forEach((val, i) => {
      const barH = (val / maxVal) * chartH
      const x = padding.left + i * (barWidth + gap) + gap / 2
      const y = padding.top + chartH - barH

      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0])
      ctx.fill()

      ctx.fillStyle = '#334155'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(fmtMoney(val), x + barWidth / 2, y - 6)

      ctx.fillStyle = '#64748b'
      ctx.font = '10px system-ui'
      ctx.fillText(labels[i], x + barWidth / 2, padding.top + chartH + 20)
    })

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, padding.top + chartH)
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.stroke()
  }, [filtered, grandTotal])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📊 Aged Receivables</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: '0-30 days', value: bucketTotals['0-30'], color: '#22c55e' },
          { label: '31-60 days', value: bucketTotals['31-60'], color: '#f59e0b' },
          { label: '61-90 days', value: bucketTotals['61-90'], color: '#f97316' },
          { label: '90+ days', value: bucketTotals['90+'], color: '#ef4444' },
        ].map((b) => (
          <div key={b.label} style={{ flex: '1 1 120px', padding: 12, borderRadius: 10, border: `2px solid ${b.color}20`, background: `${b.color}08` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: b.color }}>{b.label.toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{fmtMoney(b.value)}</div>
          </div>
        ))}
        <div style={{ flex: '1 1 140px', padding: 12, borderRadius: 10, border: '2px solid #8b5cf6', background: '#f5f3ff' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8b5cf6' }}>TOTAL OUTSTANDING</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{fmtMoney(grandTotal)}</div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ width: '100%', height: 250, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16, background: '#fff' }} />

      <input type="text" placeholder="🔍 Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 12 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>CUSTOMER</th>
              <th className="col-money">0-30</th>
              <th className="col-money">31-60</th>
              <th className="col-money">61-90</th>
              <th className="col-money">90+</th>
              <th className="col-money">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="6" className="empty">No outstanding receivables</td></tr>}
            {filtered.map((c) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="col-money" style={{ color: c.aging['0-30'] > 0 ? '#16a34a' : '#94a3b8' }}>{c.aging['0-30'] > 0 ? fmtMoney(c.aging['0-30']) : '—'}</td>
                <td className="col-money" style={{ color: c.aging['31-60'] > 0 ? '#f59e0b' : '#94a3b8' }}>{c.aging['31-60'] > 0 ? fmtMoney(c.aging['31-60']) : '—'}</td>
                <td className="col-money" style={{ color: c.aging['61-90'] > 0 ? '#f97316' : '#94a3b8' }}>{c.aging['61-90'] > 0 ? fmtMoney(c.aging['61-90']) : '—'}</td>
                <td className="col-money" style={{ color: c.aging['90+'] > 0 ? '#ef4444' : '#94a3b8' }}>{c.aging['90+'] > 0 ? fmtMoney(c.aging['90+']) : '—'}</td>
                <td className="col-money" style={{ fontWeight: 800 }}>{fmtMoney(c.totalOutstanding)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 800, background: '#f8fafc' }}>
              <td>TOTAL</td>
              <td className="col-money">{fmtMoney(bucketTotals['0-30'])}</td>
              <td className="col-money">{fmtMoney(bucketTotals['31-60'])}</td>
              <td className="col-money">{fmtMoney(bucketTotals['61-90'])}</td>
              <td className="col-money">{fmtMoney(bucketTotals['90+'])}</td>
              <td className="col-money" style={{ color: '#8b5cf6' }}>{fmtMoney(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
