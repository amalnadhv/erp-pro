import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

const Barcode = ({ value }: any) => {
  const s = String(value || '')
  const mods: number[] = []
  for (const ch of s) {
    let n = ch.charCodeAt(0) + 1
    for (let i = 0; i < 6; i++) { mods.push((n % 4) + 1); n = Math.floor(n / 4) + (i + 1) * 7 }
  }
  let cx = 6
  let isBar = true
  const rects: any[] = []
  mods.forEach((w, i) => {
    if (isBar) rects.push(<rect key={i} x={cx} y={0} width={w} height={42} fill="#000" />)
    cx += w
    isBar = !isBar
  })
  return (
    <svg width={cx + 6} height={54} style={{ display: 'block', margin: '0 auto' }}>
      {rects}
      <text x={cx / 2} y={52} textAnchor="middle" fontSize="11" fontFamily="monospace">{value}</text>
    </svg>
  )
}

export default function StockTransfer() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locs, setLocs] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showT, setShowT] = useState(false)
  const [showW, setShowW] = useState(false)
  const [printT, setPrintT] = useState<any>(null)
  const [form, setForm] = useState({ from_wh: '', to_wh: '', notes: '' })
  const [lines, setLines] = useState<{ product_id: string; qty: string }[]>([{ product_id: '', qty: '' }])
  const [whForm, setWhForm] = useState({ name: '', location: '' })

  const priceMap: any = {}
  products.forEach((p) => { priceMap[p.id] = Number(p.price || 0) })

  const load = async () => {
    const [{ data: w }, { data: p }, { data: l }, { data: t }, { data: a }, { data: ti }] = await Promise.all([
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('id,name,stock_quantity,price').order('name'),
      supabase.from('stock_locations').select('*'),
      supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*'),
      supabase.from('stock_transfer_items').select('*'),
    ])
    const itemMap: any = {}
    ;(ti || []).forEach((it: any) => { (itemMap[it.transfer_id] = itemMap[it.transfer_id] || []).push(it) })
    setWarehouses(w || [])
    setProducts(p || [])
    setLocs(l || [])
    setAccounts(a || [])
    setTransfers((t || []).map((x: any) => ({ ...x, _items: itemMap[x.id] || [] })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const locQty = (pid: string, wid: string) => {
    const r = locs.find((x) => x.product_id === pid && x.warehouse_id === wid)
    return r ? Number(r.qty) : 0
  }
  const whName = (id: string) => (warehouses.find((w) => w.id === id)?.name) || '—'
  const linesOf = (t: any) => {
    if (t._items && t._items.length) return t._items
    if (t.product_id) return [{ product_id: t.product_id, product_name: t.product_name, qty: t.qty }]
    return []
  }
  const valueOf = (t: any) => linesOf(t).reduce((s: number, l: any) => s + Number(l.qty) * (priceMap[l.product_id] || 0), 0)

  const ensureAcct = async (name: string, type: string, prefix: string) => {
    const ex = accounts.find((a) => a.name === name && a.type === type)
    if (ex) return ex.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) return data[0].id
    return null
  }
  const postJournal = async (jlines: any[], narration: string, date: string) => {
    const total = jlines.reduce((s, l) => s + Number(l.debit), 0)
    const { data: je } = await supabase.from('journal_entries').insert({ entry_date: date, reference: 'STOCK-TRF', narration, status: 'Posted', total_debit: total, total_credit: total, currency: 'AED' }).select()
    if (!je || !je.length) throw new Error('journal insert failed')
    const jeLines = jlines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
  }

  const addWarehouse = async () => {
    if (!whForm.name) { setMsg('Enter warehouse name.'); return }
    const { error } = await supabase.from('warehouses').insert({ name: whForm.name, location: whForm.location })
    if (error) { setMsg('Error: ' + error.message); return }
    setWhForm({ name: '', location: '' }); setShowW(false); load()
  }

  const updateLine = (i: number, k: string, v: string) => { const nl = [...lines]; nl[i] = { ...nl[i], [k]: v }; setLines(nl) }
  const addLine = () => setLines([...lines, { product_id: '', qty: '' }])
  const removeLine = (i: number) => setLines(lines.filter((_, x) => x !== i))

  const createTransfer = async () => {
    setMsg('')
    if (!form.from_wh || !form.to_wh) { setMsg('Select source and destination warehouses.'); return }
    if (form.from_wh === form.to_wh) { setMsg('Source and destination must differ.'); return }
    const clean = lines.filter((l) => l.product_id && Number(l.qty) > 0)
    if (!clean.length) { setMsg('Add at least one product with a positive quantity.'); return }
    for (const l of clean) {
      if (locQty(l.product_id, form.from_wh) < Number(l.qty)) { setMsg(`Only ${locQty(l.product_id, form.from_wh)} of ${products.find((p) => p.id === l.product_id)?.name} available at ${whName(form.from_wh)}.`); return }
    }
    const { data: hdr, error } = await supabase.from('stock_transfers').insert({
      transfer_no: null, from_wh: form.from_wh, to_wh: form.to_wh, product_id: null, product_name: null, qty: null,
      status: 'Requested', requested_by: whName(form.from_wh), notes: form.notes,
    }).select()
    if (error) { setMsg('Error: ' + error.message); return }
    await supabase.from('stock_transfer_items').insert(clean.map((l) => ({
      transfer_id: hdr[0].id, product_id: l.product_id, product_name: products.find((p) => p.id === l.product_id)?.name || '', qty: Number(l.qty),
    })))
    setForm({ from_wh: '', to_wh: '', notes: '' }); setLines([{ product_id: '', qty: '' }]); setShowT(false); load()
  }

  const adjust = async (pid: string, wid: string, delta: number) => {
    const next = locQty(pid, wid) + delta
    if (next < 0) { setMsg('Not enough stock at ' + whName(wid)); return false }
    const { error } = await supabase.from('stock_locations').upsert(
      { product_id: pid, warehouse_id: wid, qty: next },
      { onConflict: 'product_id,warehouse_id' }
    )
    if (error) { setMsg('Stock error: ' + error.message); return false }
    return true
  }

  const dispatch = async (t: any) => {
    for (const l of linesOf(t)) { const ok = await adjust(l.product_id, t.from_wh, -Number(l.qty)); if (!ok) return }
    try {
      const value = valueOf(t)
      if (value > 0 && accounts.length) {
        const inv = accounts.find((a) => a.name.toLowerCase().includes('inventory') && !a.is_group)
        const git = await ensureAcct('Goods in Transit', 'Asset', 'GIT')
        if (inv && git) await postJournal(
          [{ account_id: git, debit: value, credit: 0, description: `GIT ${t.transfer_no}` }, { account_id: inv.id, debit: 0, credit: value, description: `Inventory out ${t.transfer_no}` }],
          `Stock transfer ${t.transfer_no} dispatched`, new Date().toISOString().slice(0, 10)
        )
      }
    } catch (e: any) { setMsg('Stock dispatched; GL post skipped: ' + (e?.message || e)) }
    await supabase.from('stock_transfers').update({ status: 'Dispatched', dispatched_at: new Date().toISOString(), dispatched_by: whName(t.from_wh) }).eq('id', t.id)
    load()
  }
  const receive = async (t: any) => {
    for (const l of linesOf(t)) { const ok = await adjust(l.product_id, t.to_wh, Number(l.qty)); if (!ok) return }
    try {
      const value = valueOf(t)
      if (value > 0 && accounts.length) {
        const inv = accounts.find((a) => a.name.toLowerCase().includes('inventory') && !a.is_group)
        const git = await ensureAcct('Goods in Transit', 'Asset', 'GIT')
        if (inv && git) await postJournal(
          [{ account_id: inv.id, debit: value, credit: 0, description: `Inventory in ${t.transfer_no}` }, { account_id: git, debit: 0, credit: value, description: `GIT cleared ${t.transfer_no}` }],
          `Stock transfer ${t.transfer_no} received`, new Date().toISOString().slice(0, 10)
        )
      }
    } catch (e: any) { setMsg('Stock received; GL post skipped: ' + (e?.message || e)) }
    await supabase.from('stock_transfers').update({ status: 'Received', received_at: new Date().toISOString(), received_by: whName(t.to_wh) }).eq('id', t.id)
    load()
  }
  const cancel = async (t: any) => {
    if (!window.confirm('Cancel this transfer?')) return
    await supabase.from('stock_transfers').update({ status: 'Cancelled' }).eq('id', t.id)
    load()
  }

  const doPrintT = () => {
    const w: any = window
    const prev = w.onafterprint
    document.body.classList.add('printing-transfer')
    w.onafterprint = () => { document.body.classList.remove('printing-transfer'); w.onafterprint = prev }
    w.print()
  }

  const pending = transfers.filter((t) => t.status === 'Requested')
  const transit = transfers.filter((t) => t.status === 'Dispatched')
  const received = transfers.filter((t) => t.status === 'Received')
  const gitValue = transit.reduce((s, t) => s + valueOf(t), 0)

  if (loading) return <div className="report-wrap"><div className="fa-msg">Loading…</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>🚚 Stock Transfer (Warehouse to Warehouse)</h3>
        <div className="report-controls">
          <button className="doc-btn primary" onClick={() => { setLines([{ product_id: '', qty: '' }]); setShowT(!showT) }}>➕ New Transfer</button>
          <button className="doc-btn" onClick={() => setShowW(!showW)}>🏬 Manage Warehouses</button>
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}

      <div className="fa-msg noprint" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <span>📨 Requests awaiting dispatch: <b>{pending.length}</b></span>
        <span style={{ color: '#b45309' }}>🚚 Goods in Transit: <b>{transit.length}</b></span>
        <span style={{ color: '#15803d' }}>✅ Received: <b>{received.length}</b></span>
      </div>

      {showW && (
        <div className="fa-form noprint" style={{ marginBottom: 12 }}>
          <h4>🏬 Warehouses</h4>
          <div className="fa-grid">
            <label>Name<input value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} placeholder="e.g. Dubai Warehouse" /></label>
            <label>Location<input value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} /></label>
            <button className="doc-btn primary" onClick={addWarehouse}>Add Warehouse</button>
          </div>
          <ul style={{ marginTop: 8 }}>
            {warehouses.map((w) => <li key={w.id}>{w.name}{w.location ? ' — ' + w.location : ''}{w.is_default ? ' (default)' : ''}</li>)}
          </ul>
        </div>
      )}

      {showT && (
        <div className="fa-form noprint" style={{ marginBottom: 12 }}>
          <h4>➕ New Transfer Request</h4>
          <div className="fa-grid">
            <label>From Warehouse
              <select value={form.from_wh} onChange={(e) => setForm({ ...form, from_wh: e.target.value })}>
                <option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label>To Warehouse
              <select value={form.to_wh} onChange={(e) => setForm({ ...form, to_wh: e.target.value })}>
                <option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></label>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Items</div>
            {lines.map((ln, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <select value={ln.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} style={{ flex: 2 }}>
                  <option value="">— Product —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" value={ln.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} placeholder="Qty" style={{ width: 90 }} />
                <span style={{ width: 90, fontSize: 12, color: '#666' }}>Avail: {ln.product_id ? locQty(ln.product_id, form.from_wh) : '—'}</span>
                <button className="doc-btn sm danger" onClick={() => removeLine(i)}>✕</button>
              </div>
            ))}
            <button className="doc-btn sm" onClick={addLine} style={{ marginTop: 4 }}>+ Add Item</button>
          </div>
          <button className="doc-btn primary" onClick={createTransfer} style={{ marginTop: 8 }}>Send Request</button>
        </div>
      )}

      <div className="report-sections">
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <h4>📋 Transfers</h4>
          <table className="data-grid report-table">
            <thead><tr><th>TRANSFER</th><th>FROM</th><th>TO</th><th>PRODUCTS</th><th className="col-money">QTY</th><th>STATUS</th><th>ITEMS</th><th className="noprint"></th></tr></thead>
            <tbody>
              {transfers.map((t) => {
                const ls = linesOf(t)
                const qtyTotal = ls.reduce((s: number, l: any) => s + Number(l.qty), 0)
                const label = ls.length === 1 ? ls[0].product_name : `${ls.length} items`
                return (
                  <tr key={t.id}>
                    <td>{t.transfer_no}</td>
                    <td>{whName(t.from_wh)}</td>
                    <td>{whName(t.to_wh)}</td>
                    <td>{label}</td>
                    <td className="col-money">{qtyTotal}</td>
                    <td><span className={`st-status st-${t.status}`}>{t.status}</span></td>
                    <td>{ls.length}</td>
                    <td className="noprint">
                      <button className="doc-btn sm" onClick={() => setPrintT(t)} style={{ marginRight: 4 }}>🖨 Print</button>
                      {t.status === 'Requested' && (
                        <>
                          <button className="doc-btn sm" onClick={() => dispatch(t)} style={{ marginRight: 4 }}>Dispatch</button>
                          <button className="doc-btn sm danger" onClick={() => cancel(t)}>Cancel</button>
                        </>
                      )}
                      {t.status === 'Dispatched' && <button className="doc-btn sm primary" onClick={() => receive(t)}>Mark Received</button>}
                    </td>
                  </tr>
                )
              })}
              {!transfers.length && <tr><td colSpan={8} className="fa-empty">No transfers yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="report-section" style={{ flexBasis: '100%' }}>
          <h4>🚚 Goods in Transit — Valuation</h4>
          <table className="data-grid report-table">
            <thead><tr><th>TRANSFER</th><th>FROM</th><th>TO</th><th className="col-money">VALUE</th></tr></thead>
            <tbody>
              {transit.map((t) => (
                <tr key={t.id}>
                  <td>{t.transfer_no}</td>
                  <td>{whName(t.from_wh)}</td>
                  <td>{whName(t.to_wh)}</td>
                  <td className="col-money">{valueOf(t).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {!transit.length && <tr><td colSpan={4} className="fa-empty">Nothing in transit.</td></tr>}
              {transit.length > 0 && (
                <tr className="total-row"><td colSpan={3}><b>Total Goods in Transit</b></td><td className="col-money"><b>{gitValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printT && (
        <div className="cheque-overlay">
          <div>
            <div className="transfer-slip">
              <h2 style={{ textAlign: 'center', marginBottom: 4 }}>INTER-WAREHOUSE STOCK TRANSFER</h2>
              <div style={{ textAlign: 'center', color: '#666', marginBottom: 12 }}>
                {printT.transfer_no} &nbsp;|&nbsp; {new Date(printT.requested_at).toLocaleDateString()} &nbsp;|&nbsp; Status: {printT.status}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', width: '50%' }}><b>From:</b> {whName(printT.from_wh)}</td>
                    <td style={{ padding: '4px 0' }}><b>To:</b> {whName(printT.to_wh)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="data-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Product</th><th className="col-money">Quantity</th></tr></thead>
                <tbody>
                  {linesOf(printT).map((l: any, i: number) => <tr key={i}><td>{l.product_name}</td><td className="col-money">{l.qty}</td></tr>)}
                </tbody>
              </table>
              <div style={{ marginTop: 12 }}><b>Notes:</b> {printT.notes || '—'}</div>
              <div style={{ marginTop: 16 }}><Barcode value={printT.transfer_no} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36 }}>
                <div>Dispatched By: ________________<br />{printT.dispatched_by ? '(' + printT.dispatched_by + ')' : ''}</div>
                <div>Received By: ________________<br />{printT.received_by ? '(' + printT.received_by + ')' : ''}</div>
              </div>
            </div>
            <div className="noprint" style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="doc-btn primary" onClick={doPrintT}>🖨 Print</button>
              <button className="doc-btn" onClick={() => setPrintT(null)} style={{ marginLeft: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
