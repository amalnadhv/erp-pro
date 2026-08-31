import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function InventoryMovementReport({ fmtMoney }: Props) {
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [warehouses, setWarehouses] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, code, name, stock_quantity, warehouse').order('name'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500),
    ]).then(([pRes, mRes]) => {
      setProducts(pRes.data || [])
      setMovements(mRes.data || [])
      const whs = [...new Set((mRes.data || []).map((m: any) => m.warehouse).filter(Boolean))]
      setWarehouses(whs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProduct) { setMovements([]); return }
    setLoading(true)
    supabase.from('stock_movements').select('*').eq('product_id', selectedProduct).order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setMovements(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedProduct])

  const filtered = movements.filter((m) => {
    if (dateFrom && (m.movement_date || m.created_at || '').slice(0, 10) < dateFrom) return false
    if (dateTo && (m.movement_date || m.created_at || '').slice(0, 10) > dateTo) return false
    if (warehouse && m.warehouse !== warehouse) return false
    return true
  })

  const totalIn = filtered.filter((m) => m.movement_type === 'In').reduce((s, m) => s + (Number(m.quantity) || 0), 0)
  const totalOut = filtered.filter((m) => m.movement_type === 'Out').reduce((s, m) => s + (Number(m.quantity) || 0), 0)
  const netMovement = totalIn - totalOut

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📦 Inventory Movement Report</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ flex: '2 1 250px', fontSize: 12, fontWeight: 600 }}>
          Product
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="">All Products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>)}
          </select>
        </label>
        <label style={{ flex: '1 1 120px', fontSize: 12, fontWeight: 600 }}>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </label>
        <label style={{ flex: '1 1 120px', fontSize: 12, fontWeight: 600 }}>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </label>
        <label style={{ flex: '1 1 150px', fontSize: 12, fontWeight: 600 }}>
          Warehouse
          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>STOCK IN</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{totalIn}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>STOCK OUT</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>{totalOut}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>NET MOVEMENT</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{netMovement >= 0 ? '+' : ''}{netMovement}</div>
        </div>
      </div>

      {selectedProduct && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CURRENT STOCK</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
              {products.find((p) => p.id === selectedProduct)?.stock_quantity || 0}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>MOVEMENT #</th>
              <th>PRODUCT</th>
              <th>TYPE</th>
              <th className="col-money">QTY</th>
              <th>WAREHOUSE</th>
              <th>REFERENCE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="7" className="empty">No movements found</td></tr>}
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>{(m.movement_date || m.created_at || '').slice(0, 10)}</td>
                <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{m.movement_no || '—'}</td>
                <td>{m.item_name || m.product_name || '—'}</td>
                <td>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: m.movement_type === 'In' ? '#dcfce7' : '#fef2f2', color: m.movement_type === 'In' ? '#16a34a' : '#dc2626' }}>
                    {m.movement_type || '—'}
                  </span>
                </td>
                <td className="col-money" style={{ fontWeight: 600, color: m.movement_type === 'In' ? '#16a34a' : '#dc2626' }}>
                  {m.movement_type === 'In' ? '+' : '-'}{Number(m.quantity) || 0}
                </td>
                <td>{m.warehouse || '—'}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{m.reference || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
        Showing {filtered.length} movements
      </div>
    </div>
  )
}
