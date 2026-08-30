import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../utils/supabaseClient'
import SearchSelect from './SearchSelect'

const money = (n: any) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Production() {
  const [tab, setTab] = useState<'templates' | 'orders'>('templates')
  const [templates, setTemplates] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<any[]>([])
  const [editCosts, setEditCosts] = useState<any[]>([])

  // template form
  const [tf, setTf] = useState({ name: '', output_product_id: '', notes: '' })
  const [tItems, setTItems] = useState<any[]>([{ product_id: '', qty: '' }])
  const [tCosts, setTCosts] = useState<any[]>([{ account_id: '', amount: '', description: '' }])

  // order form
  const [of, setOf] = useState({ template_id: '', qty: '', prod_date: new Date().toISOString().slice(0, 10), notes: '' })

  const pMap = (id: string) => products.find((p) => p.id === id)
  const aMap = (id: string) => accounts.find((a) => a.id === id)

  const load = async () => {
    setLoading(true)
    try {
      const [t, ti, tc, o, oc, oco, p, a] = await Promise.all([
        supabase.from('bom_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('bom_template_items').select('*'),
        supabase.from('bom_template_costs').select('*'),
        supabase.from('production_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('production_components').select('*'),
        supabase.from('production_costs').select('*'),
        supabase.from('products').select('id,code,name,cost_price,stock_quantity,unit'),
        supabase.from('accounts').select('id,code,name,type'),
      ])
      const tpls = (t.data || []).map((x: any) => ({ ...x, items: (ti.data || []).filter((i: any) => i.template_id === x.id), costs: (tc.data || []).filter((c: any) => c.template_id === x.id) }))
      const ords = (o.data || []).map((x: any) => ({ ...x, items: (oc.data || []).filter((i: any) => i.production_id === x.id), costs: (oco.data || []).filter((c: any) => c.production_id === x.id) }))
      setTemplates(tpls); setOrders(ords); setProducts(p.data || []); setAccounts(a.data || [])
    } catch (e: any) { setMsg('Load error: ' + (e?.message || e)) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const ensureAcct = async (name: string, type: string, prefix: string) => {
    const ex = accounts.find((a) => a.name === name && a.type === type)
    if (ex) return ex.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) return data[0].id
    return null
  }
  const postJournal = async (lines: any[], narration: string, date: string) => {
    const total = lines.reduce((s, l) => s + Number(l.debit), 0)
    const { data: je } = await supabase.from('journal_entries').insert({ entry_date: date, reference: 'PROD', narration, status: 'Posted', total_debit: total, total_credit: total, currency: 'AED' }).select()
    if (!je || !je.length) throw new Error('journal insert failed')
    const jeLines = lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
  }

  // ---------- template CRUD ----------
  const setTItem = (i: number, k: string, v: string) => setTItems((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const setTCost = (i: number, k: string, v: string) => setTCosts((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const saveTemplate = async () => {
    setMsg('')
    if (!tf.name || !tf.output_product_id) { setMsg('Enter a name and choose the output product.'); return }
    const cleanItems = tItems.filter((x) => x.product_id && Number(x.qty) > 0)
    const cleanCosts = tCosts.filter((x) => x.account_id && Number(x.amount) > 0)
    const { data: hdr, error } = await supabase.from('bom_templates').insert({ name: tf.name, output_product_id: tf.output_product_id, notes: tf.notes }).select()
    if (error) { setMsg('Error: ' + error.message); return }
    const tid = hdr[0].id
    if (cleanItems.length) await supabase.from('bom_template_items').insert(cleanItems.map((x) => ({ template_id: tid, product_id: x.product_id, qty: Number(x.qty) })))
    if (cleanCosts.length) await supabase.from('bom_template_costs').insert(cleanCosts.map((x) => ({ template_id: tid, account_id: x.account_id, amount: Number(x.amount), description: x.description })))
    setTf({ name: '', output_product_id: '', notes: '' }); setTItems([{ product_id: '', qty: '' }]); setTCosts([{ account_id: '', amount: '', description: '' }])
    load()
  }
  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this BOM template?')) return
    await supabase.from('bom_templates').delete().eq('id', id)
    load()
  }

  // ---------- production order ----------
  const createOrder = async () => {
    setMsg('')
    const tpl = templates.find((t) => t.id === of.template_id)
    if (!tpl) { setMsg('Choose a BOM template.'); return }
    const qty = Number(of.qty)
    if (!(qty > 0)) { setMsg('Enter a quantity greater than 0.'); return }
    const { data: hdr, error } = await supabase.from('production_orders').insert({
      prod_no: null, template_id: tpl.id, output_product_id: tpl.output_product_id, qty, status: 'Draft', prod_date: of.prod_date, notes: of.notes,
    }).select()
    if (error) { setMsg('Error: ' + error.message); return }
    const pid = hdr[0].id
    const comps = (tpl.items || []).map((i: any) => ({ production_id: pid, product_id: i.product_id, qty: Number(i.qty) * qty }))
    const costs = (tpl.costs || []).map((c: any) => ({ production_id: pid, account_id: c.account_id, amount: Number(c.amount) * qty, description: c.description }))
    if (comps.length) await supabase.from('production_components').insert(comps)
    if (costs.length) await supabase.from('production_costs').insert(costs)
    setOf({ template_id: '', qty: '', prod_date: new Date().toISOString().slice(0, 10), notes: '' })
    setTab('orders'); load()
  }

  const setStatus = async (id: string, status: string) => {
    await supabase.from('production_orders').update({ status, ...(status === 'Built' ? { built_at: new Date().toISOString() } : {}) }).eq('id', id)
    load()
  }

  const build = async (order: any) => {
    setMsg('')
    const out = pMap(order.output_product_id)
    if (!out) { setMsg('Output product not found.'); return }
    const comps = order.items || []
    const costs = order.costs || []
    // validate stock
    for (const c of comps) {
      const pr = pMap(c.product_id)
      if (!pr || Number(pr.stock_quantity || 0) < Number(c.qty)) { setMsg(`Not enough stock of ${pr?.name || 'component'} (have ${Number(pr?.stock_quantity || 0)}, need ${Number(c.qty)}).`); return }
    }
    try {
      // consume components
      for (const c of comps) {
        const pr = pMap(c.product_id)!
        const next = Number(pr.stock_quantity) - Number(c.qty)
        await supabase.from('products').update({ stock_quantity: next }).eq('id', c.product_id)
      }
      // add finished + weighted avg cost
      const material = comps.reduce((s: number, c: any) => s + Number(c.qty) * Number(pMap(c.product_id)?.cost_price || 0), 0)
      const costHeads = costs.reduce((s: number, c: any) => s + Number(c.amount), 0)
      const total = material + costHeads
      const oldQty = Number(out.stock_quantity); const oldCost = Number(out.cost_price || 0)
      const newQty = oldQty + Number(order.qty)
      const newCost = newQty > 0 ? (oldQty * oldCost + total) / newQty : 0
      await supabase.from('products').update({ stock_quantity: newQty, cost_price: newCost }).eq('id', out.id)

      if (accounts.length) {
        const inv = await ensureAcct('Inventory', 'Asset', '1300')
        const lines: any[] = [{ account_id: inv, debit: total, credit: 0, description: `Production ${order.prod_no} (${out.name})` }]
        for (const c of comps) {
          if (inv) lines.push({ account_id: inv, debit: 0, credit: Number(c.qty) * Number(pMap(c.product_id)?.cost_price || 0), description: `Material ${pMap(c.product_id)?.name}` })
        }
        for (const c of costs) {
          if (c.account_id) lines.push({ account_id: c.account_id, debit: 0, credit: Number(c.amount), description: c.description || 'Production cost' })
        }
        await postJournal(lines, `Build ${order.prod_no} — ${out.name}`, order.prod_date || new Date().toISOString().slice(0, 10))
      }
    } catch (e: any) { setMsg('Built stock, but GL post failed: ' + (e?.message || e)) }
    await setStatus(order.id, 'Built')
  }

  const cancel = async (order: any) => {
    if (!window.confirm('Cancel this production order?')) return
    await setStatus(order.id, 'Cancelled')
  }

  // edit component/cost quantities on an unbuilt order
  const startEdit = (o: any) => {
    setEditId(o.id)
    setEditItems((o.items || []).map((c: any) => ({ ...c })))
    setEditCosts((o.costs || []).map((c: any) => ({ ...c })))
  }
  const cancelEdit = () => { setEditId(null); setEditItems([]); setEditCosts([]) }
  const setEditItem = (i: number, k: string, v: any) => setEditItems((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const setEditCost = (i: number, k: string, v: any) => setEditCosts((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const saveEdit = async (o: any) => {
    setMsg('')
    try {
      for (const c of editItems) if (c.id) await supabase.from('production_components').update({ qty: Number(c.qty) }).eq('id', c.id)
      for (const c of editCosts) if (c.id) await supabase.from('production_costs').update({ amount: Number(c.amount), description: c.description }).eq('id', c.id)
      setEditId(null); setEditItems([]); setEditCosts([]); load()
    } catch (e: any) { setMsg('Save failed: ' + (e?.message || e)) }
  }

  // copy a BOM template
  const copyTemplate = async (t: any) => {
    setMsg('')
    const { data: hdr, error } = await supabase.from('bom_templates').insert({ name: 'Copy of ' + t.name, output_product_id: t.output_product_id, notes: t.notes }).select()
    if (error) { setMsg('Error: ' + error.message); return }
    const tid = hdr[0].id
    if ((t.items || []).length) await supabase.from('bom_template_items').insert((t.items || []).map((i: any) => ({ template_id: tid, product_id: i.product_id, qty: Number(i.qty) })))
    if ((t.costs || []).length) await supabase.from('bom_template_costs').insert((t.costs || []).map((c: any) => ({ template_id: tid, account_id: c.account_id, amount: Number(c.amount), description: c.description })))
    load()
  }

  // ---------- print ----------
  const printOrder = (order: any) => {
    const out = pMap(order.output_product_id)
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) { setMsg('Allow pop-ups to print.'); return }
    const rows = (order.items || []).map((c: any) => `<tr><td>${pMap(c.product_id)?.code || ''}</td><td>${pMap(c.product_id)?.name || ''}</td><td style="text-align:right">${Number(c.qty)}</td></tr>`).join('')
    const costs = (order.costs || []).map((c: any) => `<tr><td>${aMap(c.account_id)?.name || ''}</td><td>${c.description || ''}</td><td style="text-align:right">${money(c.amount)}</td></tr>`).join('')
    w.document.write(`<html><head><title>Production ${order.prod_no}</title><style>body{font-family:Segoe UI,Arial;padding:24px}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}</style></head><body>
      <h2>🏭 Production Order</h2>
      <p><b>No:</b> ${order.prod_no} &nbsp; <b>Date:</b> ${order.prod_date} &nbsp; <b>Status:</b> ${order.status}</p>
      <p><b>Output:</b> ${out?.name || ''} &nbsp; <b>Qty:</b> ${Number(order.qty)} ${out?.unit || ''}</p>
      <h4>Components</h4><table><thead><tr><th>Code</th><th>Item</th><th style="text-align:right">Qty</th></tr></thead><tbody>${rows}</tbody></table>
      <h4>Cost Heads</h4><table><thead><tr><th>Account</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${costs}</tbody></table>
      <p style="margin-top:16px">${order.notes || ''}</p></body></html>`)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  const badge = (s: string) => {
    const m: any = { Draft: '#64748b', Sent: '#b45309', Received: '#0ea5e9', Built: '#16a34a', Cancelled: '#dc2626' }
    return <span style={{ background: m[s] || '#64748b', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{s}</span>
  }

  if (loading) return <div className="empty">Loading…</div>

  // Enter moves focus to the next input/select (like Tab); buttons keep normal Enter=click
  const onFormKeyDown = (e: any) => {
    if (e.key !== 'Enter') return
    const el = document.activeElement as HTMLElement
    if (!el || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') return
    e.preventDefault()
    const root = e.currentTarget as HTMLElement
    const focusables = Array.from(root.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])'))
      .filter((x) => (x as HTMLElement).offsetParent !== null) as HTMLElement[]
    const i = focusables.indexOf(el)
    if (i > -1 && i < focusables.length - 1) focusables[i + 1].focus()
  }

  return (
    <div className="doc-workspace" onKeyDown={onFormKeyDown}>
      <div className="coa-head">
        <h3>🏭 Production / Bill of Materials</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={tab === 'templates' ? 'btn-primary' : 'btn-cancel'} onClick={() => setTab('templates')}>BOM Templates</button>
          <button className={tab === 'orders' ? 'btn-primary' : 'btn-cancel'} onClick={() => setTab('orders')}>Production Orders</button>
        </div>
      </div>
      {msg && <div className="inv-error" style={{ marginTop: 8 }}>⚠️ {msg}</div>}

      {tab === 'templates' && (
        <div>
          <div className="report-section" style={{ marginTop: 14 }}>
            <h4>➕ New BOM Template</h4>
            <div className="inv-grid coa-form-grid">
              <label>Template Name *<input value={tf.name} onChange={(e) => setTf({ ...tf, name: e.target.value })} placeholder="e.g. Coated Aluminium Bar" /></label>
              <label>Output Product *<SearchSelect options={products} value={tf.output_product_id} onChange={(v) => setTf({ ...tf, output_product_id: v })} getLabel={(p) => (p.code ? p.code + ' — ' : '') + p.name} placeholder="Select finished product" /></label>
            </div>
            <label style={{ display: 'block', marginTop: 8 }}>Notes<textarea rows={2} value={tf.notes} onChange={(e) => setTf({ ...tf, notes: e.target.value })} /></label>

            <h4 style={{ marginTop: 12 }}>Components (per 1 finished unit)</h4>
            <table className="data-grid report-table">
              <thead><tr><th style={{ width: '50%' }}>ITEM</th><th style={{ width: '20%' }}>QTY / UNIT</th><th className="th-actions"></th></tr></thead>
              <tbody>
                {tItems.map((it, i) => (
                  <tr key={i}>
                    <td><SearchSelect options={products} value={it.product_id} onChange={(v) => setTItem(i, 'product_id', v)} getLabel={(p) => (p.code ? p.code + ' — ' : '') + p.name} placeholder="Select component" /></td>
                    <td><input type="number" min="0" step="0.01" value={it.qty} onChange={(e) => setTItem(i, 'qty', e.target.value)} /></td>
                    <td className="td-actions"><button className="act del" onClick={() => setTItems(tItems.filter((_, j) => j !== i))}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-add" style={{ marginTop: 8 }} onClick={() => setTItems([...tItems, { product_id: '', qty: '' }])}>＋ Add Component</button>

            <h4 style={{ marginTop: 12 }}>Cost Heads (per 1 finished unit)</h4>
            <table className="data-grid report-table">
              <thead><tr><th style={{ width: '40%' }}>ACCOUNT</th><th style={{ width: '20%' }}>AMOUNT</th><th style={{ width: '27%' }}>DESCRIPTION</th><th className="th-actions"></th></tr></thead>
              <tbody>
                {tCosts.map((c, i) => (
                  <tr key={i}>
                    <td><SearchSelect options={accounts} value={c.account_id} onChange={(v) => setTCost(i, 'account_id', v)} getLabel={(a) => (a.code ? a.code + ' — ' : '') + a.name} placeholder="Select cost account" /></td>
                    <td><input type="number" min="0" step="0.01" value={c.amount} onChange={(e) => setTCost(i, 'amount', e.target.value)} /></td>
                    <td><input value={c.description} onChange={(e) => setTCost(i, 'description', e.target.value)} placeholder="e.g. Powder Coating" /></td>
                    <td className="td-actions"><button className="act del" onClick={() => setTCosts(tCosts.filter((_, j) => j !== i))}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-add" style={{ marginTop: 8 }} onClick={() => setTCosts([...tCosts, { account_id: '', amount: '', description: '' }])}>＋ Add Cost Head</button>

            <div style={{ marginTop: 12 }}><button className="btn-primary" onClick={saveTemplate}>💾 Save Template</button></div>
          </div>

          <div className="report-section" style={{ marginTop: 18 }}>
            <h4>Saved Templates</h4>
            <table className="data-grid report-table">
              <thead><tr><th>NAME</th><th>OUTPUT</th><th>COMPONENTS</th><th>COST HEADS</th><th className="th-actions"></th></tr></thead>
              <tbody>
                {templates.length === 0 && <tr><td colSpan={5} className="empty">No templates yet</td></tr>}
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{pMap(t.output_product_id)?.name || '—'}</td>
                    <td>{(t.items || []).length}</td>
                    <td>{(t.costs || []).length}</td>
                    <td className="td-actions"><button className="doc-btn" title="Duplicate template" onClick={() => copyTemplate(t)}>⧉ Copy</button> <button className="act del" onClick={() => deleteTemplate(t.id)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div className="report-section" style={{ marginTop: 14 }}>
            <h4>➕ New Production Build</h4>
            <div className="inv-grid coa-form-grid">
              <label>BOM Template *<SearchSelect options={templates} value={of.template_id} onChange={(v) => setOf({ ...of, template_id: v })} getLabel={(t) => t.name + ' → ' + (pMap(t.output_product_id)?.name || '')} placeholder="Select template" /></label>
              <label>Quantity (finished units) *<input type="number" min="0" step="1" value={of.qty} onChange={(e) => setOf({ ...of, qty: e.target.value })} /></label>
              <label>Date<input type="date" value={of.prod_date} onChange={(e) => setOf({ ...of, prod_date: e.target.value })} /></label>
            </div>
            <label style={{ display: 'block', marginTop: 8 }}>Notes<textarea rows={2} value={of.notes} onChange={(e) => setOf({ ...of, notes: e.target.value })} /></label>
            <div style={{ marginTop: 10 }}><button className="btn-primary" onClick={createOrder}>🏭 Create Build Order</button></div>

            {(() => {
              const tpl = templates.find((t) => t.id === of.template_id)
              const q = Number(of.qty) || 0
              if (!tpl || !(q > 0)) return null
              const mat = (tpl.items || []).reduce((s: number, c: any) => s + Number(c.qty) * q * Number(pMap(c.product_id)?.cost_price || 0), 0)
              const ch = (tpl.costs || []).reduce((s: number, c: any) => s + Number(c.amount) * q, 0)
              const tot = mat + ch
              return (
                <div className="je-totals" style={{ marginTop: 12, background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                  <span>Materials: <b>{money(mat)}</b></span>
                  <span>Cost Heads: <b>{money(ch)}</b></span>
                  <span className="grand">Total: <b>{money(tot)}</b></span>
                  <span>Unit Cost: <b>{money(q ? tot / q : 0)}</b></span>
                </div>
              )
            })()}
          </div>

          <div className="report-section" style={{ marginTop: 18 }}>
            <h4>Production Orders</h4>
            <table className="data-grid report-table">
              <thead><tr><th>NO</th><th>DATE</th><th>OUTPUT</th><th className="col-money">QTY</th><th>STATUS</th><th className="th-actions">ACTIONS</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={6} className="empty">No production orders</td></tr>}
                {orders.map((o) => {
                  const out = pMap(o.output_product_id)
                  const items = editId === o.id ? editItems : (o.items || [])
                  const costs = editId === o.id ? editCosts : (o.costs || [])
                  const material = items.reduce((s: number, c: any) => s + Number(c.qty) * Number(pMap(c.product_id)?.cost_price || 0), 0)
                  const costHeads = costs.reduce((s: number, c: any) => s + Number(c.amount), 0)
                  const total = material + costHeads
                  const open = openId === o.id
                  return (
                    <Fragment key={o.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setOpenId(open ? null : o.id)}>
                      <td>{o.prod_no} {open ? '▾' : '▸'}</td>
                      <td>{o.prod_date}</td>
                      <td>{out?.name || '—'}</td>
                      <td className="col-money">{Number(o.qty)}</td>
                      <td>{badge(o.status)}</td>
                      <td className="td-actions">
                        {o.status === 'Draft' && <><button className="doc-btn" title="Send components out (subcontract)" onClick={(e) => { e.stopPropagation(); setStatus(o.id, 'Sent') }}>🚚 Send</button> <button className="btn-primary" onClick={(e) => { e.stopPropagation(); build(o) }}>✅ Build</button></>}
                        {o.status === 'Sent' && <button className="doc-btn" onClick={(e) => { e.stopPropagation(); setStatus(o.id, 'Received') }}>📥 Receive</button>}
                        {o.status === 'Received' && <button className="btn-primary" onClick={(e) => { e.stopPropagation(); build(o) }}>✅ Build</button>}
                        {o.status === 'Built' && <button className="doc-btn" onClick={(e) => { e.stopPropagation(); printOrder(o) }}>🖨 Print</button>}
                        {(o.status === 'Draft' || o.status === 'Sent' || o.status === 'Received') && <button className="act del" title="Cancel" onClick={(e) => { e.stopPropagation(); cancel(o) }}>✕</button>}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} style={{ background: '#f8fafc' }}>
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <div>
                              <h5 style={{ margin: '4px 0' }}>Components {editId === o.id && <em style={{ fontWeight: 400, fontSize: 12 }}>(editing)</em>}</h5>
                              <table className="data-grid report-table" style={{ minWidth: 320 }}>
                                <thead><tr><th>Item</th><th className="col-money">Qty</th><th className="col-money">Cost</th></tr></thead>
                                <tbody>
                                  {items.map((c: any, i: number) => (
                                    <tr key={i}><td>{pMap(c.product_id)?.name || '—'}</td>
                                      <td className="col-money">{editId === o.id
                                        ? <input type="number" step="0.01" min="0" value={c.qty} style={{ width: 80 }} onChange={(e) => setEditItem(i, 'qty', e.target.value)} />
                                        : Number(c.qty)}</td>
                                      <td className="col-money">{money(Number(c.qty) * Number(pMap(c.product_id)?.cost_price || 0))}</td>
                                    </tr>
                                  ))}
                                  {!items.length && <tr><td colSpan={3} className="empty">None</td></tr>}
                                </tbody>
                              </table>
                            </div>
                            <div>
                              <h5 style={{ margin: '4px 0' }}>Cost Heads</h5>
                              <table className="data-grid report-table" style={{ minWidth: 320 }}>
                                <thead><tr><th>Account</th><th>Desc</th><th className="col-money">Amount</th></tr></thead>
                                <tbody>
                                  {costs.map((c: any, i: number) => (
                                    <tr key={i}><td>{aMap(c.account_id)?.name || '—'}</td>
                                      <td>{editId === o.id
                                        ? <input value={c.description || ''} style={{ width: 120 }} onChange={(e) => setEditCost(i, 'description', e.target.value)} />
                                        : (c.description || '')}</td>
                                      <td className="col-money">{editId === o.id
                                        ? <input type="number" step="0.01" min="0" value={c.amount} style={{ width: 90 }} onChange={(e) => setEditCost(i, 'amount', e.target.value)} />
                                        : money(Number(c.amount))}</td>
                                    </tr>
                                  ))}
                                  {!costs.length && <tr><td colSpan={3} className="empty">None</td></tr>}
                                </tbody>
                              </table>
                            </div>
                            <div className="je-totals" style={{ alignSelf: 'flex-end' }}>
                              <span>Materials: <b>{money(material)}</b></span>
                              <span>Cost Heads: <b>{money(costHeads)}</b></span>
                              <span className="grand">Total: <b>{money(total)}</b></span>
                              <span>Unit Cost: <b>{money(Number(o.qty) ? total / Number(o.qty) : 0)}</b></span>
                              {o.status !== 'Built' && (
                                <div style={{ marginTop: 6 }}>
                                  {editId === o.id
                                    ? <><button className="btn-primary" onClick={() => saveEdit(o)}>💾 Save</button> <button className="doc-btn" onClick={cancelEdit}>Cancel</button></>
                                    : <button className="doc-btn" onClick={() => startEdit(o)}>✎ Edit Quantities</button>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Build posts: Dr Inventory (finished) = materials + cost heads; Cr Inventory (each component); Cr each cost-head account. Finished item cost is updated as a weighted average.</p>
          </div>
        </div>
      )}
    </div>
  )
}
