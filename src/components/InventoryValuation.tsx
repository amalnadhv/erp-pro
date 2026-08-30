import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'

const num = (v: any) => Number(v || 0)
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function InventoryValuation() {
  const [products, setProducts] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { (async () => {
    const [p, pi, si] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchase_invoices').select('id, date, items'),
      supabase.from('invoices').select('id, date, items'),
    ])
    setProducts(p.data || [])
    setPurchases(pi.data || [])
    setSales(si.data || [])
    setLoading(false)
  })() }, [])

  const purchaseLayers: any = {}
  for (const inv of purchases) for (const it of (inv.items || [])) {
    const name = (it.name || '').trim(); if (!name) continue
    purchaseLayers[name] = purchaseLayers[name] || []
    purchaseLayers[name].push({ date: inv.date, qty: num(it.qty), cost: num(it.price) })
  }
  const salesQty: any = {}
  for (const inv of sales) for (const it of (inv.items || [])) { const n = (it.name || '').trim(); if (n) salesQty[n] = (salesQty[n] || 0) + num(it.qty) }

  const compute = (prod: any) => {
    const name = (prod.name || '').trim()
    const layers = (purchaseLayers[name] || []).slice().sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
    const totalQty = layers.reduce((s: number, l: any) => s + l.qty, 0)
    const totalCost = layers.reduce((s: number, l: any) => s + l.qty * l.cost, 0)
    const avg = totalQty > 0 ? totalCost / totalQty : num(prod.cost_price)
    const sold = salesQty[name] || 0
    const onHand = num(prod.stock_quantity)
    let rem = sold; const fifoLayers = layers.map((l: any) => ({ ...l })); let fifoCost = 0
    for (const l of fifoLayers) { if (rem <= 0) break; const take = Math.min(rem, l.qty); fifoCost += take * l.cost; rem -= take; l.qty -= take }
    const method = prod.valuation_method === 'FIFO' ? 'FIFO' : 'Weighted Average'
    const openFifo = fifoLayers.filter((l: any) => l.qty > 0)
    const fifoUnit = openFifo.reduce((s: number, l: any) => s + l.qty * l.cost, 0) / Math.max(1, openFifo.reduce((s: number, l: any) => s + l.qty, 0))
    const unitCost = method === 'FIFO' ? (onHand > 0 ? fifoUnit : avg) : avg
    const stockValue = onHand * unitCost
    const cogs = method === 'FIFO' ? fifoCost : sold * avg
    return { code: prod.code, name: prod.name, onHand, method, unitCost, stockValue, cogs }
  }

  const data = products.map(compute)
  const totalValue = data.reduce((s, r) => s + r.stockValue, 0)
  const totalCogs = data.reduce((s, r) => s + r.cogs, 0)

  const cols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'onHand', label: 'On Hand', numeric: true },
    { key: 'method', label: 'Method' },
    { key: 'unitCost', label: 'Unit Cost', numeric: true },
    { key: 'stockValue', label: 'Stock Value', numeric: true },
    { key: 'cogs', label: 'COGS', numeric: true },
  ]
  const rows = data.map((r) => ({
    code: r.code, name: r.name, onHand: r.onHand, method: r.method,
    unitCost: money(r.unitCost), stockValue: money(r.stockValue), cogs: money(r.cogs),
  }))

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📦 Inventory Valuation</h3>
        <div className="report-controls">
          <ShareBar title="Inventory Valuation" columns={cols} rows={rows} meta={{ 'Total Stock Value': money(totalValue), 'Total COGS': money(totalCogs) }} />
        </div>
      </div>
      <div className={`report-balance-bar balanced`}>
        <span>Total Stock Value: <b>{money(totalValue)}</b></span>
        <span>Total COGS: <b>{money(totalCogs)}</b></span>
      </div>
      <div className="report-sections">
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <table className="data-grid report-table">
            <thead>
              <tr>
                <th>CODE</th><th>NAME</th><th className="col-money">ON HAND</th><th>METHOD</th>
                <th className="col-money">UNIT COST</th><th className="col-money">STOCK VALUE</th><th className="col-money">COGS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td>{r.code}</td>
                  <td>{r.name}</td>
                  <td className="col-money">{r.onHand}</td>
                  <td>{r.method}</td>
                  <td className="col-money">{money(r.unitCost)}</td>
                  <td className="col-money">{money(r.stockValue)}</td>
                  <td className="col-money">{money(r.cogs)}</td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={7} className="fa-empty">No products found.</td></tr>}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={4}><b>Totals</b></td>
                <td className="col-money"><b>{money(totalValue / Math.max(1, data.length))}</b></td>
                <td className="col-money"><b>{money(totalValue)}</b></td>
                <td className="col-money"><b>{money(totalCogs)}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
