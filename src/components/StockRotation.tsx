import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function StockRotation({ fmtMoney }: Props) {
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [method, setMethod] = useState('FIFO')

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, code, name, stock_quantity, cost_price, cost_method').order('name'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500),
    ]).then(([pRes, mRes]) => { setProducts(pRes.data || []); setMovements(mRes.data || []); setLoading(false) })
  }, [])

  const productMovements = movements.filter((m) => !selectedProduct || m.product_id === selectedProduct)

  // Calculate cost using selected method
  const calcCost = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId)
    const inMovements = productMovements.filter((m) => m.product_id === prodId && m.movement_type === 'In')
    const outMovements = productMovements.filter((m) => m.product_id === prodId && m.movement_type === 'Out')

    if (method === 'FIFO') {
      // FIFO: first in = first out
      let remainingIn = inMovements.map((m) => ({ qty: Number(m.quantity), cost: Number(m.cost_price || prod?.cost_price || 0) }))
      let totalCost = 0
      let totalQty = 0
      for (const out of outMovements) {
        let need = Number(out.quantity)
        while (need > 0 && remainingIn.length > 0) {
          const batch = remainingIn[0]
          const take = Math.min(need, batch.qty)
          totalCost += take * batch.cost
          totalQty += take
          batch.qty -= take
          need -= take
          if (batch.qty <= 0) remainingIn.shift()
        }
      }
      return totalQty > 0 ? totalCost / totalQty : Number(prod?.cost_price || 0)
    } else {
      // Weighted Average
      let totalValue = 0
      let totalQty = 0
      for (const m of inMovements) {
        totalValue += Number(m.quantity) * Number(m.cost_price || prod?.cost_price || 0)
        totalQty += Number(m.quantity)
      }
      return totalQty > 0 ? totalValue / totalQty : Number(prod?.cost_price || 0)
    }
  }

  const totalStockValue = products.reduce((s, p) => {
    const avgCost = calcCost(p.id)
    return s + (Number(p.stock_quantity) || 0) * avgCost
  }, 0)

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📊 Stock Rotation</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Costing Method
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
            <option value="FIFO">FIFO (First In, First Out)</option>
            <option value="weighted">Weighted Average</option>
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Product
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, minWidth: 200 }}>
            <option value="">All Products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>STOCK VALUE ({method})</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{fmtMoney(totalStockValue)}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PRODUCTS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{products.length}</div>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th className="col-money">STOCK QTY</th>
              <th className="col-money">COST PRICE</th>
              <th className="col-money">{method} COST</th>
              <th className="col-money">STOCK VALUE</th>
              <th>METHOD</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const avgCost = calcCost(p.id)
              const value = (Number(p.stock_quantity) || 0) * avgCost
              return (
                <tr key={p.id}>
                  <td><b>{p.code}</b> — {p.name}</td>
                  <td className="col-money">{Number(p.stock_quantity || 0)}</td>
                  <td className="col-money">{fmtMoney(Number(p.cost_price || 0))}</td>
                  <td className="col-money" style={{ fontWeight: 700, color: '#8b5cf6' }}>{fmtMoney(avgCost)}</td>
                  <td className="col-money" style={{ fontWeight: 700 }}>{fmtMoney(value)}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f5f3ff', color: '#7c3aed' }}>{p.cost_method || 'FIFO'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
