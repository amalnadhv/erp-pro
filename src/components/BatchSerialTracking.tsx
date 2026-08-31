import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function BatchSerialTracking({ fmtMoney }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ product_id: '', batch_no: '', serial_no: '', quantity: 1, cost_price: 0, manufacturing_date: '', expiry_date: '', warehouse: 'Main', reference: '' })

  const load = () => {
    setLoading(true)
    Promise.all([
      supabase.from('batch_serial').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('products').select('id, code, name, cost_price').order('name'),
    ]).then(([bRes, pRes]) => { setItems(bRes.data || []); setProducts(pRes.data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = items.filter((i) => {
    if (filter !== 'All' && i.status !== filter) return false
    if (search && !i.batch_no?.toLowerCase().includes(search.toLowerCase()) && !i.serial_no?.toLowerCase().includes(search.toLowerCase()) && !i.reference?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const save = async () => {
    if (!form.product_id) { alert('Select a product'); return }
    const prod = products.find((p) => p.id === form.product_id)
    await supabase.from('batch_serial').insert({
      product_id: form.product_id, batch_no: form.batch_no, serial_no: form.serial_no,
      quantity: Number(form.quantity) || 1, cost_price: Number(form.cost_price) || 0,
      manufacturing_date: form.manufacturing_date || null, expiry_date: form.expiry_date || null,
      warehouse: form.warehouse, reference: form.reference, status: 'Active',
    })
    // Update product stock
    if (prod) {
      await supabase.from('products').update({ stock_quantity: (Number(prod.stock_quantity || 0) + Number(form.quantity)) }).eq('id', form.product_id)
    }
    setShowForm(false)
    setForm({ product_id: '', batch_no: '', serial_no: '', quantity: 1, cost_price: 0, manufacturing_date: '', expiry_date: '', warehouse: 'Main', reference: '' })
    load()
  }

  const consume = async (item: any, qty: number) => {
    const newQty = Number(item.quantity) - qty
    if (newQty <= 0) {
      await supabase.from('batch_serial').update({ status: 'Consumed', quantity: 0 }).eq('id', item.id)
    } else {
      await supabase.from('batch_serial').update({ quantity: newQty }).eq('id', item.id)
    }
    const prod = products.find((p) => p.id === item.product_id)
    if (prod) await supabase.from('products').update({ stock_quantity: Math.max(0, Number(prod.stock_quantity || 0) - qty) }).eq('id', item.product_id)
    load()
  }

  const counts = { All: items.length, Active: items.filter((i) => i.status === 'Active').length, Consumed: items.filter((i) => i.status === 'Consumed').length, Expired: items.filter((i) => i.status === 'Expired').length }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>🔢 Batch / Serial Tracking</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Batch/Serial</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 14px', borderRadius: 8, border: filter === k ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: filter === k ? '#f5f3ff' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {k} ({v})
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <input type="text" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Add Batch / Serial Number</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Product
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <option value="">Select...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Batch No
              <input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Serial No
              <input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Quantity
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Cost Price
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Mfg Date
              <input type="date" value={form.manufacturing_date} onChange={(e) => setForm({ ...form, manufacturing_date: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Expiry Date
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Warehouse
              <input value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Reference
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="GRN / PO No" style={{ width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} style={{ padding: '7px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>BATCH NO</th>
              <th>SERIAL NO</th>
              <th>PRODUCT</th>
              <th className="col-money">QTY</th>
              <th className="col-money">COST</th>
              <th>MFG DATE</th>
              <th>EXPIRY</th>
              <th>WAREHOUSE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="10" className="empty">No batch/serial records</td></tr>}
            {filtered.map((item) => {
              const prod = products.find((p) => p.id === item.product_id)
              const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date()
              return (
                <tr key={item.id} style={isExpired ? { background: '#fef2f2' } : {}}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{item.batch_no || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.serial_no || '—'}</td>
                  <td>{prod?.name || '—'}</td>
                  <td className="col-money">{Number(item.quantity)}</td>
                  <td className="col-money">{fmtMoney(Number(item.cost_price || 0))}</td>
                  <td>{item.manufacturing_date || '—'}</td>
                  <td>{item.expiry_date || '—'}</td>
                  <td>{item.warehouse}</td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: isExpired ? '#fef2f2' : item.status === 'Active' ? '#dcfce7' : '#f1f5f9', color: isExpired ? '#dc2626' : item.status === 'Active' ? '#16a34a' : '#64748b' }}>
                      {isExpired ? 'Expired' : item.status}
                    </span>
                  </td>
                  <td>
                    {item.status === 'Active' && Number(item.quantity) > 0 && (
                      <button onClick={() => { const q = prompt(`Consume how many? (Available: ${item.quantity})`); if (q) consume(item, Number(q)) }} style={{ padding: '3px 8px', borderRadius: 4, background: '#f59e0b', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Consume</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
