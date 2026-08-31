import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

const FREQUENCIES = ['Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual']

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface RecurringTemplate {
  id: string | null
  template_name: string
  customer_name: string
  customer_id: string
  frequency: string
  start_date: string
  end_date: string
  next_run_date: string
  items: any[]
  subtotal: number
  vat_percent: number
  vat_amount: number
  grand_total: number
  currency: string
  payment_terms: string
  notes: string
  status: string
  run_count: number
  last_run_date: string
}

const blankTemplate = (): RecurringTemplate => ({
  id: null, template_name: '', customer_name: '', customer_id: '',
  frequency: 'Monthly', start_date: new Date().toISOString().split('T')[0],
  end_date: '', next_run_date: new Date().toISOString().split('T')[0],
  items: [{ name: '', qty: 1, price: 0, discount: 0 }],
  subtotal: 0, vat_percent: 15, vat_amount: 0, grand_total: 0,
  currency: 'AED', payment_terms: 'Net 30', notes: '', status: 'Active', run_count: 0, last_run_date: '',
})

const focusNext = (e: React.KeyboardEvent, addLine?: () => void) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const form = (e.target as HTMLElement).closest('form, [data-form]')
  if (!form) return
  const fields = Array.from(form.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button[data-focus]'))
  const idx = fields.indexOf(e.target as HTMLElement)
  if (idx >= 0 && idx < fields.length - 1) {
    fields[idx + 1].focus()
  } else if (addLine) {
    addLine()
  }
}

export default function RecurringInvoices({ fmtMoney }: { fmtMoney: (n: number) => string }) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<RecurringTemplate | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [generating, setGenerating] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    const [t, c] = await Promise.all([
      supabase.from('recurring_invoices').select('*').order('template_name'),
      supabase.from('customers').select('id, name, email'),
    ])
    setTemplates(t.data || [])
    setCustomers(c.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const calcTotals = (items: any[], vatPct: number) => {
    const sub = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0) * (1 - (Number(it.discount) || 0) / 100), 0)
    const vat = sub * (vatPct / 100)
    return { subtotal: sub, vat_amount: vat, grand_total: sub + vat }
  }

  const updateItem = (idx: number, field: string, value: any) => {
    if (!form) return
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    const totals = calcTotals(items, form.vat_percent)
    setForm({ ...form, items, ...totals })
  }

  const addItem = () => {
    if (!form) return
    setForm({ ...form, items: [...form.items, { name: '', qty: 1, price: 0, discount: 0 }] })
    setTimeout(() => {
      if (!formRef.current) return
      const inputs = formRef.current.querySelectorAll('input')
      const lastNew = inputs[inputs.length - 5]
      if (lastNew) lastNew.focus()
    }, 50)
  }

  const removeItem = (idx: number) => {
    if (!form || form.items.length <= 1) return
    const items = form.items.filter((_, i) => i !== idx)
    const totals = calcTotals(items, form.vat_percent)
    setForm({ ...form, items, ...totals })
  }

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const target = e.target as HTMLElement
    const row = target.closest('[data-row]')
    const isItemField = !!row

    if (isItemField) {
      const rowIdx = Number(row?.getAttribute('data-row'))
      const fields = Array.from(row!.querySelectorAll<HTMLElement>('input'))
      const idx = fields.indexOf(target)
      const isLastField = idx === fields.length - 1

      if (isLastField) {
        const lastRow = formRef.current?.querySelector(`[data-row="${(form?.items.length || 1) - 1}"]`)
        const isLastRow = row === lastRow
        if (isLastRow) {
          addItem()
        } else {
          const nextRow = formRef.current?.querySelector(`[data-row="${rowIdx + 1}"] input`)
          if (nextRow) (nextRow as HTMLElement).focus()
        }
      } else {
        fields[idx + 1]?.focus()
      }
    } else {
      const formEl = formRef.current
      if (!formEl) return
      const allFields = Array.from(formEl.querySelectorAll<HTMLElement>('[data-field] input, [data-field] select'))
      const idx = allFields.indexOf(target)
      if (idx >= 0 && idx < allFields.length - 1) {
        allFields[idx + 1]?.focus()
      }
    }
  }

  const save = async () => {
    if (!form?.template_name || !form?.customer_name) { setMsg('⚠️ Enter template name and customer'); return }
    setSaving(true); setMsg('')
    const nextRun = form.next_run_date || new Date().toISOString().split('T')[0]
    const payload = {
      template_name: form.template_name, customer_name: form.customer_name, customer_id: form.customer_id,
      frequency: form.frequency, start_date: form.start_date, end_date: form.end_date || null,
      next_run_date: nextRun, items: form.items, subtotal: form.subtotal, vat_percent: form.vat_percent,
      vat_amount: form.vat_amount, grand_total: form.grand_total, currency: form.currency,
      payment_terms: form.payment_terms, notes: form.notes, status: form.status,
    }
    let err: any = null
    if (form.id) { const { error } = await supabase.from('recurring_invoices').update(payload).eq('id', form.id); err = error }
    else { const { error } = await supabase.from('recurring_invoices').insert(payload); err = error }
    if (err) { setMsg('⚠️ Error: ' + err.message); setSaving(false); return }
    setMsg(form.id ? '✅ Template updated' : '✅ Template created')
    setForm(null); setSaving(false); load()
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'Active' ? 'Paused' : 'Active'
    await supabase.from('recurring_invoices').update({ status: next }).eq('id', id)
    load()
  }

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this recurring template?')) return
    await supabase.from('recurring_invoices').delete().eq('id', id)
    load()
  }

  const generateNow = async (id: string) => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.rpc('generate_recurring_invoice', { p_recurring_id: id })
      if (error) throw error
      setMsg(`✅ Invoice generated: ${data || 'Check invoices list'}`)
      load()
    } catch (err: any) {
      setMsg('⚠️ Generation failed: ' + (err.message || 'Unknown error'))
    }
    setGenerating(false)
  }

  const generateAll = async () => {
    setGenerating(true)
    const today = new Date().toISOString().split('T')[0]
    const due = templates.filter((t) => t.status === 'Active' && t.next_run_date <= today)
    let count = 0
    for (const t of due) {
      try {
        await supabase.rpc('generate_recurring_invoice', { p_recurring_id: t.id })
        count++
      } catch (_) {}
    }
    setMsg(`✅ Generated ${count} invoices from ${due.length} due templates`)
    setGenerating(false); load()
  }

  const dueCount = templates.filter((t) => t.status === 'Active' && t.next_run_date <= new Date().toISOString().split('T')[0]).length

  if (loading) return <div className="report-wrap"><div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading...</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>🔁 Recurring Invoices</h3>
        <div className="report-controls">
          {!form && (
            <>
              <button onClick={() => { setForm(blankTemplate()); setMsg('') }} style={{ padding: '6px 14px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>➕ New Template</button>
              {dueCount > 0 && (
                <button onClick={generateAll} disabled={generating} style={{ padding: '6px 14px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ⚡ Generate Due ({dueCount})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {msg && <div style={{ padding: '8px 14px', borderRadius: 8, background: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', color: msg.includes('✅') ? '#16a34a' : '#dc2626', marginBottom: 12, fontSize: 12 }}>{msg}</div>}

      {!form && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {templates.map((t) => {
            const isDue = t.status === 'Active' && t.next_run_date <= new Date().toISOString().split('T')[0]
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isDue ? '#f59e0b' : '#e2e8f0'}`, padding: 16, position: 'relative' }}>
                {isDue && <span style={{ position: 'absolute', top: 10, right: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>DUE</span>}
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{t.template_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{t.customer_name} · {t.frequency}</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12 }}>
                  <div><span style={{ color: '#94a3b8' }}>Amount:</span> <b style={{ color: '#8b5cf6' }}>{fmtMoney(t.grand_total)}</b></div>
                  <div><span style={{ color: '#94a3b8' }}>Next:</span> <b>{t.next_run_date}</b></div>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                  <span>Run {t.run_count}x</span>
                  {t.last_run_date && <span>· Last: {t.last_run_date}</span>}
                  {t.end_date && <span>· Ends: {t.end_date}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setForm({ ...blankTemplate(), ...t, items: t.items || blankTemplate().items })} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={() => toggleStatus(t.id, t.status)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.status === 'Active' ? '#10b981' : '#f59e0b'}`, background: '#fff', fontSize: 11, cursor: 'pointer', color: t.status === 'Active' ? '#10b981' : '#d97706' }}>
                    {t.status === 'Active' ? '⏸ Pause' : '▶ Resume'}
                  </button>
                  {isDue && <button onClick={() => generateNow(t.id)} disabled={generating} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #8b5cf6', background: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>⚡ Generate</button>}
                  <button onClick={() => deleteTemplate(t.id)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          })}
          {!templates.length && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔁</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No recurring invoice templates</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create a template to auto-generate invoices on a schedule</div>
            </div>
          )}
        </div>
      )}

      {form && (
        <div ref={formRef} data-form onKeyDown={handleFormKeyDown} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 15 }}>{form.id ? '✏️ Edit' : '➕ New'} Recurring Template</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div data-field="template_name">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Template Name *</label>
              <input value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} placeholder="e.g. Office Rent" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
            </div>
            <div data-field="customer">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Customer *</label>
              <select value={form.customer_id} onChange={(e) => {
                const c = customers.find((c) => c.id === e.target.value)
                setForm({ ...form, customer_id: e.target.value, customer_name: c?.name || '' })
              }} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div data-field="frequency">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div data-field="start_date">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => {
                const sd = e.target.value
                const nr = form.next_run_date < sd ? sd : form.next_run_date
                setForm({ ...form, start_date: sd, next_run_date: nr })
              }} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
            </div>
            <div data-field="end_date">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>End Date (optional)</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
            </div>
            <div data-field="next_run_date">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Next Run Date</label>
              <input type="date" value={form.next_run_date} onChange={(e) => setForm({ ...form, next_run_date: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#1e293b' }}>📋 Invoice Items <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>(Enter to advance, Enter on last field adds new line)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 6, fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            <span>DESCRIPTION</span><span>QTY</span><span>PRICE</span><span>DISCOUNT %</span><span></span>
          </div>
          {form.items.map((item, i) => (
            <div key={i} data-row={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 6 }}>
              <input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} placeholder="Item description" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }} />
              <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, 'qty', Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }} />
              <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(i, 'price', Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }} />
              <input type="number" min="0" max="100" value={item.discount} onChange={(e) => updateItem(i, 'discount', Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }} />
              <button onClick={() => removeItem(i)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          ))}
          <button onClick={addItem} data-focus style={{ padding: '4px 12px', borderRadius: 6, border: '1px dashed #8b5cf6', background: '#f5f3ff', color: '#7c3aed', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>+ Add Item</button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div data-field="vat">
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>VAT %</label>
              <input type="number" min="0" max="100" value={form.vat_percent} onChange={(e) => {
                const vp = Number(e.target.value)
                const totals = calcTotals(form.items, vp)
                setForm({ ...form, vat_percent: vp, ...totals })
              }} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Subtotal</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{fmtMoney(form.subtotal)}</div>
            </div>
            <div style={{ background: '#ede9fe', borderRadius: 8, padding: 12, border: '1px solid #c4b5fd' }}>
              <div style={{ fontSize: 11, color: '#6d28d9' }}>Grand Total</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{fmtMoney(form.grand_total)}</div>
              <div style={{ fontSize: 10, color: '#8b5cf6' }}>Incl. VAT {fmtMoney(form.vat_amount)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} data-focus style={{ padding: '10px 20px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : '💾 Save Template'}</button>
            <button onClick={() => setForm(null)} style={{ padding: '10px 16px', borderRadius: 8, background: '#fff', color: '#475569', border: '1px solid #d1d5db', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
