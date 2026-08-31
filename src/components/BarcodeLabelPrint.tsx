import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'
import JsBarcode from 'jsbarcode'

interface Props { fmtMoney: (n: number) => string }

export default function BarcodeLabelPrint({ fmtMoney }: Props) {
  const [products, setProducts] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [labelSize, setLabelSize] = useState('small')
  const [showPrice, setShowPrice] = useState(true)
  const [showSKU, setShowSKU] = useState(true)
  const [copies, setCopies] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('products').select('id, code, name, sku, barcode, price, unit').order('name').then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [])

  const filtered = products.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const selectAll = () => setSelected(filtered.map((p) => p.id))

  const printLabels = () => {
    const items = products.filter((p) => selected.includes(p.id))
    if (!items.length) return

    const sizes: Record<string, { w: number; h: number; cols: number }> = {
      small: { w: 50, h: 30, cols: 5 },
      medium: { w: 60, h: 40, cols: 4 },
      large: { w: 75, h: 50, cols: 3 },
    }
    const s = sizes[labelSize] || sizes.small

    const html = `<!DOCTYPE html><html><head><style>
      @media print { body { margin: 0; } }
      body { font-family: 'Courier New', monospace; margin: 10px; }
      .label-grid { display: flex; flex-wrap: wrap; gap: 4px; }
      .label { border: 1px solid #000; padding: 4px; text-align: center; width: ${s.w}mm; height: ${s.h}mm; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; page-break-inside: avoid; }
      .label .code { font-size: 7px; font-weight: bold; }
      .label .name { font-size: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .label .sku { font-size: 5px; color: #666; }
      .label .price { font-size: 7px; font-weight: bold; }
      .label svg { max-width: 100%; height: auto; }
    </style></head><body>
    <div class="label-grid">
    ${items.flatMap((p) => Array(copies).fill(null).map(() => {
      const barcodeVal = p.barcode || p.sku || p.code || ''
      const canvasId = `bc-${Math.random().toString(36).substr(2, 9)}`
      return `<div class="label">
        <div class="code">${p.code || ''}</div>
        <div class="name">${p.name || ''}</div>
        ${showSKU && p.sku ? `<div class="sku">${p.sku}</div>` : ''}
        <svg id="${canvasId}"></svg>
        ${showPrice ? `<div class="price">${fmtMoney(Number(p.price || 0))}</div>` : ''}
      </div>`
    })).join('')}
    </div>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
    <script>
      document.querySelectorAll('svg').forEach((el) => {
        if (el.id && el.closest('.label')) {
          const code = el.closest('.label').querySelector('.code')?.textContent || '';
          try { JsBarcode(el, code, { format: 'CODE128', width: 1, height: 15, displayValue: false, margin: 0 }); } catch(e) {}
        }
      });
      setTimeout(() => window.print(), 500);
    <\/script></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🏷️ Print Barcode Labels</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '2 1 200px', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
          <option value="small">Small (50×30mm)</option>
          <option value="medium">Medium (60×40mm)</option>
          <option value="large">Large (75×50mm)</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Price
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={showSKU} onChange={(e) => setShowSKU(e.target.checked)} /> SKU
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          Copies: <input type="number" min="1" max="10" value={copies} onChange={(e) => setCopies(Number(e.target.value))} style={{ width: 40, padding: '4px 6px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12 }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={selectAll} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Select All ({filtered.length})</button>
        <button onClick={() => setSelected([])} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
        <span style={{ flex: 1 }} />
        <button onClick={printLabels} disabled={!selected.length} style={{ padding: '8px 20px', borderRadius: 8, background: selected.length ? '#8b5cf6' : '#94a3b8', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: selected.length ? 'pointer' : 'not-allowed' }}>
          🖨️ Print {selected.length} Labels {copies > 1 ? `(${selected.length * copies} total)` : ''}
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} onClick={() => toggle(p.id)} style={{ padding: '10px 12px', borderRadius: 8, border: `2px solid ${selected.includes(p.id) ? '#8b5cf6' : '#e2e8f0'}`, background: selected.includes(p.id) ? '#f5f3ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.code} {p.sku ? `· SKU: ${p.sku}` : ''}</div>
                  {p.barcode && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>BC: {p.barcode}</div>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#8b5cf6' }}>{fmtMoney(Number(p.price || 0))}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
