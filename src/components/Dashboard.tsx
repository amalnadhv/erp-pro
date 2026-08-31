import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

const MiniBar = ({ values, color }: { values: number[], color: string }) => {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, background: color, borderRadius: 2, minHeight: 2, opacity: 0.3 + (i / values.length) * 0.7 }} />
      ))}
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Dashboard({ fmtMoney, onNavigate }: { fmtMoney: (n: number) => string, onNavigate?: (page: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString()

        const [invoices, purchases, incoming, outgoing, customers, suppliers, products, journalEntries] = await Promise.all([
          supabase.from('invoices').select('id, grand_total, total_amount, amount_paid, status, created_at, doc_date, customer_name, items'),
          supabase.from('purchase_invoices').select('id, grand_total, subtotal, status, created_at, doc_date, party_name, items'),
          supabase.from('incoming_payments').select('id, amount, payment_date, created_at, status'),
          supabase.from('outgoing_payments').select('id, amount, payment_date, created_at, status'),
          supabase.from('customers').select('id, name'),
          supabase.from('suppliers').select('id, name'),
          supabase.from('products').select('id, name, price, stock_quantity, category'),
          supabase.from('journal_entries').select('id, entry_date, total_debit, total_credit, narration, created_at'),
        ])

        const inv = invoices.data || []
        const pur = purchases.data || []
        const incPay = incoming.data || []
        const outPay = outgoing.data || []
        const cust = customers.data || []
        const supp = suppliers.data || []
        const prod = products.data || []
        const je = journalEntries.data || []

        const totalRevenue = inv.filter((i: any) => i.status === 'Approved').reduce((s: number, i: any) => s + Number(i.grand_total || i.total_amount || 0), 0)
        const totalPurchases = pur.filter((p: any) => p.status === 'Approved').reduce((s: number, p: any) => s + Number(p.grand_total || 0), 0)
        const totalReceived = incPay.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
        const totalPaid = outPay.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

        const receivables = inv.filter((i: any) => i.status === 'Approved').reduce((s: number, i: any) => {
          const paid = Number(i.amount_paid || 0)
          const total = Number(i.grand_total || i.total_amount || 0)
          return s + (total - paid)
        }, 0)
        const payables = pur.filter((p: any) => p.status === 'Approved').reduce((s: number, p: any) => s + Number(p.grand_total || 0), 0)

        const thisMonthInv = inv.filter((i: any) => (i.doc_date || i.created_at || '') >= startOfMonth && i.status === 'Approved')
        const lastMonthInv = inv.filter((i: any) => (i.doc_date || i.created_at || '') >= startOfLastMonth && (i.doc_date || i.created_at || '') <= endOfLastMonth && i.status === 'Approved')
        const thisMonthSales = thisMonthInv.reduce((s: number, i: any) => s + Number(i.grand_total || i.total_amount || 0), 0)
        const lastMonthSales = lastMonthInv.reduce((s: number, i: any) => s + Number(i.grand_total || i.total_amount || 0), 0)
        const salesGrowth = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales * 100) : 0

        const stockValue = prod.reduce((s: number, p: any) => s + Number(p.price || 0) * Number(p.stock_quantity || 0), 0)
        const lowStock = prod.filter((p: any) => Number(p.stock_quantity || 0) <= 5 && Number(p.stock_quantity || 0) > 0).length
        const outOfStock = prod.filter((p: any) => Number(p.stock_quantity || 0) <= 0).length

        const months = []
        const monthlySales = []
        const monthlyPurchases = []
        for (let k = 5; k >= 0; k--) {
          const d = new Date(today.getFullYear(), today.getMonth() - k, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          months.push(d.toLocaleString('en', { month: 'short' }))
          const ms = inv.filter((i: any) => {
            const dd = i.doc_date || i.created_at || ''
            return dd.startsWith(key) && i.status === 'Approved'
          }).reduce((s: number, i: any) => s + Number(i.grand_total || i.total_amount || 0), 0)
          const mp = pur.filter((p: any) => {
            const dd = p.doc_date || p.created_at || ''
            return dd.startsWith(key) && p.status === 'Approved'
          }).reduce((s: number, p: any) => s + Number(p.grand_total || 0), 0)
          monthlySales.push(ms)
          monthlyPurchases.push(mp)
        }

        const topProducts: { name: string, revenue: number, qty: number }[] = []
        const productMap: Record<string, { name: string, revenue: number, qty: number }> = {}
        inv.filter((i: any) => i.status === 'Approved' && i.items).forEach((i: any) => {
          (Array.isArray(i.items) ? i.items : []).forEach((it: any) => {
            const name = it.name || it.product_name || 'Unknown'
            if (!productMap[name]) productMap[name] = { name, revenue: 0, qty: 0 }
            productMap[name].revenue += Number(it.price || 0) * Number(it.qty || 0)
            productMap[name].qty += Number(it.qty || 0)
          })
        })
        Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5).forEach((p) => topProducts.push(p))

        const topCustomers: { name: string, total: number }[] = []
        const custMap: Record<string, number> = {}
        inv.filter((i: any) => i.status === 'Approved').forEach((i: any) => {
          const name = i.customer_name || 'Unknown'
          custMap[name] = (custMap[name] || 0) + Number(i.grand_total || i.total_amount || 0)
        })
        Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, total]) => topCustomers.push({ name, total }))

        const recentJE = je.slice(0, 5)

        setData({
          totalRevenue, totalPurchases, totalReceived, totalPaid,
          receivables, payables,
          thisMonthSales, lastMonthSales, salesGrowth,
          months, monthlySales, monthlyPurchases,
          stockValue, lowStock, outOfStock,
          productCount: prod.length, customerCount: cust.length, supplierCount: supp.length,
          topProducts, topCustomers, recentJE,
          invoiceCount: inv.length, purchaseCount: pur.length,
        })
      } catch (err) { console.error('Dashboard load error:', err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !data.monthlySales) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.parentElement?.offsetWidth || 600
    const H = 220
    canvas.width = W * 2
    canvas.height = H * 2
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, W, H)

    const sales = data.monthlySales || []
    const purchases = data.monthlyPurchases || []
    const labels = data.months || []
    const allVals = [...sales, ...purchases]
    const max = Math.max(...allVals, 1)
    const chartH = H - 50
    const barW = Math.min(30, (W - 80) / (labels.length * 2 + 1))
    const gap = barW + 6

    ctx.font = '10px Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    labels.forEach((lbl: string, i: number) => {
      const x = 50 + i * (gap * 2 + 16)
      const sh = (sales[i] / max) * chartH
      const ph = (purchases[i] / max) * chartH
      const base = H - 30

      const grad1 = ctx.createLinearGradient(x, base - sh, x, base)
      grad1.addColorStop(0, '#8b5cf6')
      grad1.addColorStop(1, '#a78bfa')
      ctx.fillStyle = grad1
      ctx.beginPath()
      ctx.roundRect(x, base - sh, barW, sh, [3, 3, 0, 0])
      ctx.fill()

      const grad2 = ctx.createLinearGradient(x + barW + 3, base - ph, x + barW + 3, base)
      grad2.addColorStop(0, '#f59e0b')
      grad2.addColorStop(1, '#fbbf24')
      ctx.fillStyle = grad2
      ctx.beginPath()
      ctx.roundRect(x + barW + 3, base - ph, barW, ph, [3, 3, 0, 0])
      ctx.fill()

      ctx.fillStyle = '#64748b'
      ctx.fillText(lbl, x + barW + 1, base + 14)
    })

    ctx.fillStyle = '#8b5cf6'
    ctx.fillRect(W - 130, 8, 10, 10)
    ctx.fillStyle = '#1e293b'
    ctx.font = '10px Segoe UI'
    ctx.textAlign = 'left'
    ctx.fillText('Sales', W - 116, 17)

    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(W - 70, 8, 10, 10)
    ctx.fillStyle = '#1e293b'
    ctx.fillText('Purchase', W - 56, 17)
  }, [data])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div>Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Total Revenue', value: fmtMoney(data.totalRevenue || 0), icon: '💰', color: '#8b5cf6', bg: 'linear-gradient(135deg, #ede9fe, #f5f3ff)', sub: `${data.invoiceCount || 0} invoices` },
    { label: 'Total Purchases', value: fmtMoney(data.totalPurchases || 0), icon: '🛒', color: '#f59e0b', bg: 'linear-gradient(135deg, #fef3c7, #fffbeb)', sub: `${data.purchaseCount || 0} invoices` },
    { label: 'Receivables', value: fmtMoney(data.receivables || 0), icon: '📈', color: '#10b981', bg: 'linear-gradient(135deg, #d1fae5, #ecfdf5)', sub: `${data.customerCount || 0} customers`, urgent: (data.receivables || 0) > 0 },
    { label: 'Payables', value: fmtMoney(data.payables || 0), icon: '📉', color: '#ef4444', bg: 'linear-gradient(135deg, #fee2e2, #fef2f2)', sub: `${data.supplierCount || 0} suppliers` },
  ]

  const miniCards = [
    { label: 'Cash Received', value: fmtMoney(data.totalReceived || 0), icon: '💵', color: '#06b6d4' },
    { label: 'Cash Paid', value: fmtMoney(data.totalPaid || 0), icon: '🏦', color: '#8b5cf6' },
    { label: 'Stock Value', value: fmtMoney(data.stockValue || 0), icon: '📦', color: '#f97316' },
    { label: 'Low / Out of Stock', value: `${data.lowStock || 0} / ${data.outOfStock || 0}`, icon: '⚠️', color: '#ef4444' },
  ]

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>📊 Dashboard</h2>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {data.salesGrowth !== 0 && (
            <span style={{ marginLeft: 12, color: data.salesGrowth > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {data.salesGrowth > 0 ? '↑' : '↓'} {Math.abs(data.salesGrowth).toFixed(1)}% vs last month
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: c.bg, borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.sub}</div>
              </div>
              <div style={{ fontSize: 28, opacity: 0.8 }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📊 Sales vs Purchases — Last 6 Months</h4>
          <canvas ref={canvasRef} />
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>🏆 Top Products</h4>
          {data.topProducts?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topProducts.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < data.topProducts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#e2e8f0', color: i < 3 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1e293b' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{p.qty} sold</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>{fmtMoney(p.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No sales data yet</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #ede9fe, #f5f3ff)', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
          <MiniBar values={data.monthlySales || [0]} color="#8b5cf6" />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>This Month Sales</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>{fmtMoney(data.thisMonthSales || 0)}</span>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #d1fae5, #ecfdf5)', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
          <MiniBar values={data.monthlyPurchases || [0]} color="#10b981" />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>This Month Purchases</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmtMoney(data.totalPurchases || 0)}</span>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
          <MiniBar values={[(data.totalReceived || 0), (data.totalPaid || 0)]} color="#f59e0b" />
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Received</span><span style={{ fontWeight: 600, color: '#06b6d4' }}>{fmtMoney(data.totalReceived || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
              <span style={{ color: '#64748b' }}>Paid</span><span style={{ fontWeight: 600, color: '#8b5cf6' }}>{fmtMoney(data.totalPaid || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>👥 Top Customers</h4>
          {data.topCustomers?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topCustomers.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < data.topCustomers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748b' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{fmtMoney(c.total)}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No customer data yet</div>}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📋 Recent Journal Entries</h4>
          {data.recentJE?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.recentJE.map((j: any, i: number) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: i < data.recentJE.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{(j.entry_date || j.created_at || '').slice(0, 10)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{fmtMoney(Number(j.total_debit || 0))}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{j.narration || '—'}</div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No journal entries yet</div>}
        </div>
      </div>
    </div>
  )
}
