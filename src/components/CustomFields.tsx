import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props {}

const ENTITY_TYPES = ['Customer', 'Supplier', 'Product', 'Invoice', 'Purchase Invoice', 'Journal Entry', 'Sales Quotation']
const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' },
]

export default function CustomFields({}: Props) {
  const [defs, setDefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('Customer')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ field_name: '', field_label: '', field_type: 'text', is_required: false, default_value: '', options: '' })

  const load = () => {
    setLoading(true)
    supabase.from('custom_field_defs').select('*').order('sort_order').then(({ data }) => { setDefs(data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = defs.filter((d) => d.entity_type === entityFilter)

  const save = async () => {
    if (!form.field_name.trim() || !form.field_label.trim()) { alert('Name and Label are required'); return }
    await supabase.from('custom_field_defs').insert({
      entity_type: entityFilter, field_name: form.field_name.trim().toLowerCase().replace(/\s+/g, '_'),
      field_label: form.field_label, field_type: form.field_type,
      is_required: form.is_required, default_value: form.default_value,
      options: form.options, sort_order: filtered.length,
    })
    setShowForm(false)
    setForm({ field_name: '', field_label: '', field_type: 'text', is_required: false, default_value: '', options: '' })
    load()
  }

  const deleteDef = async (id: string) => {
    if (!confirm('Delete this custom field?')) return
    await supabase.from('custom_field_defs').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🔧 Custom Fields</h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {ENTITY_TYPES.map((e) => (
          <button key={e} onClick={() => setEntityFilter(e)} style={{ padding: '6px 14px', borderRadius: 8, border: entityFilter === e ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: entityFilter === e ? '#f5f3ff' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {e}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12 }}>
        💡 Custom fields let you add your own data fields to any form. Create a field below, then it will appear on the {entityFilter} form automatically.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Field</button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>New Custom Field for {entityFilter}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Field Name (key)
              <input value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} placeholder="e.g. license_expiry" style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Label (display)
              <input value={form.field_label} onChange={(e) => setForm({ ...form, field_label: e.target.value })} placeholder="e.g. License Expiry" style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Type
              <select value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Default Value
              <input value={form.default_value} onChange={(e) => setForm({ ...form, default_value: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            {form.field_type === 'select' && (
              <label style={{ fontSize: 12, fontWeight: 600 }}>Options (comma-separated)
                <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Option1, Option2, Option3" style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </label>
            )}
            <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
              <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} /> Required
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} style={{ padding: '7px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save Field</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead><tr><th>FIELD NAME</th><th>LABEL</th><th>TYPE</th><th>DEFAULT</th><th>OPTIONS</th><th>REQUIRED</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="7" className="empty">No custom fields for {entityFilter}. Click "+ Add Field" to create one.</td></tr>}
            {filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((f) => (
              <tr key={f.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.field_name}</td>
                <td style={{ fontWeight: 600 }}>{f.field_label}</td>
                <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#f1f5f9', color: '#475569' }}>{f.field_type}</span></td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{f.default_value || '—'}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{f.options || '—'}</td>
                <td>{f.is_required ? '✅' : '—'}</td>
                <td><button onClick={() => deleteDef(f.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
