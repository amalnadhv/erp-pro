import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

const FIELDS = [
  { key: 'date', label: 'Date' },
  { key: 'payee', label: 'Payee' },
  { key: 'amount', label: 'Amount (figures)' },
  { key: 'words', label: 'Amount (words)' },
  { key: 'chequeno', label: 'Cheque No' },
]
const DEF = { date: { x: 150, y: 12 }, payee: { x: 20, y: 38 }, amount: { x: 150, y: 38 }, words: { x: 20, y: 58 }, chequeno: { x: 150, y: 78 } }

export default function ChequeTemplates() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.from('cheque_templates').select('*').order('bank_name')
    setList(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const newForm = () => setForm({ id: null, bank_name: '', leaf_w_mm: 215, leaf_h_mm: 95, bg_url: '', positions: null, is_default: false })
  const edit = (t: any) => setForm({ ...t, positions: t.positions || null })
  const cancel = () => { setForm(null); setMsg('') }

  const upload = async (file: File) => {
    const path = `tpl-${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from('cheques').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setMsg('Upload failed: ' + error.message); return }
    const { data } = supabase.storage.from('cheques').getPublicUrl(path)
    setForm({ ...form, bg_url: data.publicUrl })
  }

  const save = async () => {
    setMsg('')
    if (!form.bank_name) { setMsg('Enter a bank name.'); return }
    const pos = { ...DEF, ...(form.positions || {}) }
    const payload = {
      bank_name: form.bank_name,
      leaf_w_mm: Number(form.leaf_w_mm),
      leaf_h_mm: Number(form.leaf_h_mm),
      bg_url: form.bg_url || null,
      positions: pos,
      is_default: !!form.is_default,
    }
    let err: any = null
    if (form.id) { const { error } = await supabase.from('cheque_templates').update(payload).eq('id', form.id); err = error }
    else { const { error } = await supabase.from('cheque_templates').insert(payload).select(); err = error }
    if (err) { setMsg('Error: ' + err.message); return }
    if (form.is_default) await supabase.from('cheque_templates').update({ is_default: false }).neq('id', form.id || '00000000-0000-0000-0000-000000000000')
    setForm(null); load()
  }

  const del = async (id: string) => { if (!window.confirm('Delete this template?')) return; await supabase.from('cheque_templates').delete().eq('id', id); load() }
  const setDef = async (id: string) => {
    await supabase.from('cheque_templates').update({ is_default: false }).neq('id', id)
    await supabase.from('cheque_templates').update({ is_default: true }).eq('id', id)
    load()
  }

  const pos = { ...DEF, ...(form?.positions || {}) }
  const setPos = (k: string, axis: 'x' | 'y', v: number) => setForm({ ...form, positions: { ...pos, [k]: { ...pos[k], [axis]: v } } })

  if (loading) return <div className="report-wrap"><div className="fa-msg">Loading…</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>🖨 Cheque Templates (per bank)</h3>
        <div className="report-controls">
          {!form && <button className="doc-btn primary" onClick={newForm}>➕ New Template</button>}
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}

      {!form && (
        <table className="data-grid report-table">
          <thead><tr><th>BANK</th><th className="col-money">SIZE (mm)</th><th>BACKGROUND</th><th>DEFAULT</th><th className="noprint"></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>{t.bank_name}</td>
                <td className="col-money">{t.leaf_w_mm} × {t.leaf_h_mm}</td>
                <td>{t.bg_url ? '✅' : '—'}</td>
                <td>{t.is_default ? '⭐' : ''}</td>
                <td className="noprint">
                  <button className="doc-btn sm" onClick={() => edit(t)} style={{ marginRight: 4 }}>Edit</button>
                  {!t.is_default && <button className="doc-btn sm" onClick={() => setDef(t.id)} style={{ marginRight: 4 }}>Set default</button>}
                  <button className="doc-btn sm danger" onClick={() => del(t.id)}>✕</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="fa-empty">No templates yet. Add one per bank/format.</td></tr>}
          </tbody>
        </table>
      )}

      {form && (
        <div className="fa-form noprint" style={{ marginTop: 12 }}>
          <h4>{form.id ? 'Edit' : 'New'} Template — {form.bank_name || '(unnamed)'}</h4>
          <div className="fa-grid">
            <label>Bank Name *<input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. Emirates NBD" /></label>
            <label>Leaf Width (mm)<input type="number" value={form.leaf_w_mm} onChange={(e) => setForm({ ...form, leaf_w_mm: Number(e.target.value) })} /></label>
            <label>Leaf Height (mm)<input type="number" value={form.leaf_h_mm} onChange={(e) => setForm({ ...form, leaf_h_mm: Number(e.target.value) })} /></label>
            <label>Background Image (scanned blank cheque)
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
            </label>
            {form.bg_url && <div style={{ gridColumn: '1 / -1' }}><img src={form.bg_url} alt="bg" style={{ maxWidth: 280, border: '1px solid #ccc' }} /></div>}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Field positions (mm from top-left)</div>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ width: 150 }}>{f.label}</span>
                <label>X<input type="number" style={{ width: 70 }} value={pos[f.key].x} onChange={(e) => setPos(f.key, 'x', Number(e.target.value))} /></label>
                <label>Y<input type="number" style={{ width: 70 }} value={pos[f.key].y} onChange={(e) => setPos(f.key, 'y', Number(e.target.value))} /></label>
              </div>
            ))}
            <label className="toggle-label" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              <span>Make default (used when no bank match)</span>
            </label>
          </div>

          <div className="inv-actions" style={{ marginTop: 12 }}>
            <button className="btn-primary" onClick={save}>💾 Save Template</button>
            <button className="btn-cancel" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
