import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

type ElT = 'label' | 'field' | 'table' | 'image' | 'line'
interface DEl {
  id: string; type: ElT; x: number; y: number; w: number; h: number
  text: string; binding: string; fontSize: number; bold: boolean; align: 'left' | 'center' | 'right'
}

const CANVAS_W = 720
const CANVAS_H = 980
const HEAD_H = 90
const FOOT_H = 90

const PALETTE: { type: ElT; label: string }[] = [
  { type: 'label', label: 'Text Label' },
  { type: 'field', label: 'Data Field' },
  { type: 'table', label: 'Line Items Table' },
  { type: 'image', label: 'Logo / Image' },
  { type: 'line', label: 'Divider Line' },
]

const BINDINGS: string[] = [
  'company_name', 'company_vat', 'company_logo', 'invoice_no', 'invoice_date', 'due_date', 'po_ref',
  'customer_name', 'customer_vat', 'subtotal', 'vat_percent', 'vat_amount', 'grand_total',
  'amount_paid', 'balance', 'notes', 'items',
]

const DOC_TYPES = ['AR Invoice', 'Proforma', 'Delivery Order', 'Quotation', 'Credit Note', 'Purchase Order']

const SAMPLE: any = {
  company_name: 'DEMO COMPANY', company_vat: '300000000000003',
  invoice_no: 'INV-0001', invoice_date: '2026-08-28', due_date: '2026-09-27', po_ref: 'PO-123',
  customer_name: 'Sample Customer LLC', customer_vat: '100000000000003',
  subtotal: 600, vat_percent: 15, vat_amount: 90, grand_total: 690, amount_paid: 0, balance: 690,
  notes: 'Thank you for your business.',
  items: [{ name: 'Sample Widget', qty: 5, price: 120, total: 600 }],
}

const newEl = (type: ElT, x: number, y: number): DEl => ({
  id: 'el-' + Math.random().toString(36).slice(2, 9),
  type, x: Math.round(x), y: Math.round(y),
  w: type === 'table' ? CANVAS_W - 80 : type === 'line' ? CANVAS_W - 80 : 200,
  h: type === 'table' ? 160 : type === 'line' ? 2 : 28,
  text: type === 'label' ? 'Label Text' : type === 'field' ? 'Field' : type === 'image' ? 'LOGO' : '',
  binding: type === 'field' ? 'customer_name' : type === 'table' ? 'items' : type === 'image' ? 'company_logo' : '',
  fontSize: 13, bold: false, align: 'left',
})

const th: React.CSSProperties = { border: '1px solid #cbd5e1', padding: '4px 6px', background: '#f1f5f9', textAlign: 'left' }
const tdc: React.CSSProperties = { border: '1px solid #e2e8f0', padding: '4px 6px' }

const ScreenDesigner = () => {
  const [templates, setTemplates] = useState<any[]>([])
  const [docType, setDocType] = useState('AR Invoice')
  const [name, setName] = useState('Default Template')
  const [elements, setElements] = useState<DEl[]>([])
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [msg, setMsg] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  const loadTemplates = async () => {
    setLoading(true)
    const { data } = await supabase.from('document_templates').select('*').order('doc_type')
    setTemplates(data || []); setLoading(false)
  }
  useEffect(() => { loadTemplates() }, [])

  const loadOne = async (id: string) => {
    const { data } = await supabase.from('document_templates').select('*').eq('id', id).single()
    if (data) {
      setDocType(data.doc_type); setName(data.name); setElements(data.layout || [])
      setHeader(data.header || ''); setFooter(data.footer || ''); setSelected(null); setMsg('')
    }
  }

  const save = async () => {
    setSaving(true); setMsg('')
    const payload = { doc_type: docType, name, layout: elements, header, footer }
    const existing = templates.find((t) => t.doc_type === docType && t.name === name)
    let err: any = null
    if (existing) { const r = await supabase.from('document_templates').update(payload).eq('id', existing.id); err = r.error }
    else { const r = await supabase.from('document_templates').insert(payload).select(); err = r.error }
    if (err) setMsg('Save failed: ' + err.message)
    else { setMsg('Saved.'); await loadTemplates() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    await supabase.from('document_templates').delete().eq('id', id); loadTemplates()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('type') as ElT
    if (!type) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const el = newEl(type, e.clientX - rect.left - 100, e.clientY - rect.top - 14)
    setElements((p) => [...p, el]); setSelected(el.id)
  }

  const onPointerDownEl = (e: React.PointerEvent, el: DEl) => {
    if (preview) return
    e.stopPropagation()
    const rect = canvasRef.current!.getBoundingClientRect()
    drag.current = { id: el.id, dx: e.clientX - rect.left - el.x, dy: e.clientY - rect.top - el.y }
    setSelected(el.id)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - drag.current.dx
    const y = e.clientY - rect.top - drag.current.dy
    setElements((p) => p.map((el) => el.id === drag.current!.id
      ? { ...el, x: Math.max(0, Math.min(CANVAS_W - el.w, x)), y: Math.max(0, Math.min(CANVAS_H - el.h, y)) }
      : el))
  }
  const onPointerUp = () => { drag.current = null }

  const update = (id: string, patch: Partial<DEl>) => setElements((p) => p.map((el) => el.id === id ? { ...el, ...patch } : el))
  const remove = (id: string) => setElements((p) => p.filter((el) => el.id !== id))

  const valOf = (el: DEl) => el.type === 'field' ? (SAMPLE[el.binding] ?? ('{' + el.binding + '}')) : el.text
  const logoUrl = SAMPLE.company_logo

  const sel = elements.find((e) => e.id === selected) || null

  return (
    <div className="sd-wrap">
      <div className="sd-toolbar">
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</button>
        <button onClick={() => setPreview(!preview)}>{preview ? '✏️ Edit' : '👁 Preview'}</button>
        <button onClick={() => { setElements([]); setHeader(''); setFooter(''); setSelected(null) }}>🗑 Clear</button>
        <span className="sd-msg">{msg}</span>
        <span className="sd-templates">
          Templates: {loading ? '…' : templates.map((t) => (
            <span key={t.id} className="sd-tpl-wrap">
              <button className="sd-tpl" onClick={() => loadOne(t.id)} title="Load">{t.doc_type}/{t.name}</button>
              <button className="sd-tpl-x" onClick={() => del(t.id)} title="Delete">×</button>
            </span>
          ))}
        </span>
      </div>
      <div className="sd-toolbar2">
        <label>Header <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Company name, address, VAT, logo area (top band)" /></label>
        <label>Footer <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Terms, bank details, signature (bottom band)" /></label>
      </div>
      <div className="sd-body">
        <div className="sd-palette">
          <h4>Elements</h4>
          {PALETTE.map((p) => (
            <div key={p.type} className="sd-pal-item" draggable onDragStart={(e) => e.dataTransfer.setData('type', p.type)}>{p.label}</div>
          ))}
          <p className="sd-hint">Drag an element onto the page →</p>
          <p className="sd-hint">Tip: drop a <b>Logo / Image</b> in the top band and bind it to <code>company_logo</code>.</p>
        </div>
        <div
          className="sd-canvas"
          ref={canvasRef}
          style={{ width: CANVAS_W, height: CANVAS_H }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => { if (!preview) setSelected(null) }}
        >
          <div className="sd-band sd-head" style={{ height: HEAD_H }}>{header || 'Header band — company name, logo, address'}</div>
          <div className="sd-page-label">A4 · {docType}</div>
          {elements.map((el) => (
            <div
              key={el.id}
              className={`sd-el sd-${el.type} ${selected === el.id ? 'sd-sel' : ''}`}
              style={{
                left: el.x, top: el.y, width: el.w, height: el.h, fontSize: el.fontSize,
                fontWeight: el.bold ? 700 : 400, textAlign: el.align,
                display: el.type === 'line' ? 'block' : 'flex', alignItems: el.type === 'line' ? undefined : 'center',
              }}
              onPointerDown={(e) => onPointerDownEl(e, el)}
              onClick={(e) => { e.stopPropagation(); if (!preview) setSelected(el.id) }}
            >
              {el.type === 'label' && (el.text || 'Label')}
              {el.type === 'field' && (preview ? String(valOf(el)) : (el.text || el.binding))}
              {el.type === 'image' && (preview
                ? (logoUrl ? <img src={logoUrl} alt="" style={{ maxHeight: '100%', maxWidth: '100%' }} /> : '🖼 ' + el.binding)
                : 'LOGO · ' + (el.binding || 'company_logo'))}
              {el.type === 'line' && <hr style={{ border: 'none', borderTop: '1px solid #94a3b8', width: '100%', margin: 0 }} />}
              {el.type === 'table' && (
                <div className="sd-tbl">
                  {preview ? (
                    <table style={{ width: '100%', fontSize: el.fontSize, borderCollapse: 'collapse' }}>
                      <thead><tr><th style={th}>#</th><th style={th}>Item</th><th style={th}>Qty</th><th style={th}>Price</th><th style={th}>Total</th></tr></thead>
                      <tbody>{(SAMPLE.items || []).map((it: any, i: number) => (
                        <tr key={i}><td style={tdc}>{i + 1}</td><td style={tdc}>{it.name}</td><td style={tdc}>{it.qty}</td><td style={tdc}>{it.price}</td><td style={tdc}>{it.total}</td></tr>
                      ))}</tbody>
                    </table>
                  ) : <span>Line Items Table ({el.binding || 'items'})</span>}
                </div>
              )}
            </div>
          ))}
          <div className="sd-band sd-foot" style={{ height: FOOT_H }}>{footer || 'Footer band — terms, bank, signature'}</div>
        </div>
        <div className="sd-props">
          <h4>Properties</h4>
          {!sel && <p className="sd-hint">Select an element on the page.</p>}
          {sel && (
            <div className="sd-form">
              <label>Type <b>{sel.type}</b></label>
              {sel.type !== 'table' && sel.type !== 'line' && (
                <label>Text <input value={sel.text} onChange={(e) => update(sel.id, { text: e.target.value })} /></label>
              )}
              {sel.type === 'field' && (
                <label>Binding <select value={sel.binding} onChange={(e) => update(sel.id, { binding: e.target.value })}>
                  {BINDINGS.map((b) => <option key={b}>{b}</option>)}
                </select></label>
              )}
              {sel.type === 'image' && (
                <label>Binding <select value={sel.binding} onChange={(e) => update(sel.id, { binding: e.target.value })}>
                  {BINDINGS.filter((b) => b.includes('logo') || b.includes('company')).map((b) => <option key={b}>{b}</option>)}
                </select></label>
              )}
              <label>X <input type="number" value={sel.x} onChange={(e) => update(sel.id, { x: +e.target.value })} /></label>
              <label>Y <input type="number" value={sel.y} onChange={(e) => update(sel.id, { y: +e.target.value })} /></label>
              <label>W <input type="number" value={sel.w} onChange={(e) => update(sel.id, { w: +e.target.value })} /></label>
              <label>H <input type="number" value={sel.h} onChange={(e) => update(sel.id, { h: +e.target.value })} /></label>
              <label>Font <input type="number" value={sel.fontSize} onChange={(e) => update(sel.id, { fontSize: +e.target.value })} /></label>
              <label><input type="checkbox" checked={sel.bold} onChange={(e) => update(sel.id, { bold: e.target.checked })} /> Bold</label>
              <label>Align <select value={sel.align} onChange={(e) => update(sel.id, { align: e.target.value as any })}>
                <option>left</option><option>center</option><option>right</option>
              </select></label>
              <button className="sd-del" onClick={() => remove(sel.id)}>Delete element</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScreenDesigner
